import { Router, Request, Response } from "express";
import authRequired from "../middlewares/auth";
import { requireRoles, normalizeRole } from "../middlewares/rbac";
import { ensureHaulerProfile } from "../utils/profileHelpers";
import { pool } from "../config/database";
import { HaulerSubscriptionStatus } from "../services/marketplaceService";
import { PoolClient } from "pg";

export type HaulerSubscriptionPayload = {
  hauler_type: "INDIVIDUAL" | "COMPANY";
  free_trip_used: boolean;
  free_trip_used_at: string | null;
  subscription_status: HaulerSubscriptionStatus;
  subscription_current_period_end: string | null;
  current_individual_monthly_price: number | null;
  monthly_price?: number | null;
  yearly_price?: number | null;
  yearly_note?: string | null;
  billing_cycle?: "MONTHLY" | "YEARLY" | null;
  note?: string;
};

export function normalizeHaulerType(value?: string | null): "INDIVIDUAL" | "COMPANY" {
  const normalized = (value ?? "company").toString().trim().toUpperCase();
  return normalized === "INDIVIDUAL" ? "INDIVIDUAL" : "COMPANY";
}

export function normalizeSubscriptionStatus(value?: string | null): HaulerSubscriptionStatus {
  const normalized = (value ?? "NONE").toString().trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "CANCELED" || normalized === "EXPIRED") {
    return normalized;
  }
  return "NONE";
}

export function assertHaulerUser(user?: { user_type?: string | null }) {
  const role = normalizeRole(user?.user_type);
  if (!role || !role.startsWith("hauler")) {
    const err = new Error("Only haulers can access subscription");
    (err as any).status = 403;
    throw err;
  }
}

export function mapHaulerSubscriptionResponse(
  row: {
    hauler_type?: string | null;
    free_trip_used?: boolean | null;
    free_trip_used_at?: string | null;
    subscription_status?: string | null;
    subscription_current_period_end?: string | null;
    billing_cycle?: string | null;
    sub_status?: string | null;
    sub_current_period_end?: string | null;
  },
  individualPrice: number | null
): HaulerSubscriptionPayload {
  const haulerType = normalizeHaulerType(row.hauler_type);
  const resolvedStatus = row.sub_status ?? row.subscription_status;
  const resolvedPeriodEnd = row.sub_current_period_end ?? row.subscription_current_period_end;
  const resolvedBilling = row.billing_cycle ?? null;
  return {
    hauler_type: haulerType,
    free_trip_used: Boolean(row.free_trip_used),
    free_trip_used_at: row.free_trip_used_at ?? null,
    subscription_status: normalizeSubscriptionStatus(resolvedStatus),
    subscription_current_period_end: resolvedPeriodEnd ?? null,
    current_individual_monthly_price: individualPrice,
    monthly_price: individualPrice,
    yearly_price: individualPrice !== null ? Number((individualPrice * 10).toFixed(2)) : null,
    yearly_note: "2 months free (12 months access)",
    billing_cycle: resolvedBilling as "MONTHLY" | "YEARLY" | null,
    ...(haulerType === "COMPANY"
      ? { note: "Company subscription plan not implemented yet." }
      : {}),
  };
}

export function assertIndividualHaulerType(haulerType: "INDIVIDUAL" | "COMPANY") {
  if (haulerType !== "INDIVIDUAL") {
    const err = new Error("Only individual haulers can subscribe.");
    (err as any).status = 400;
    throw err;
  }
}

export function assertPricingConfigPresent(monthlyPrice: number | null | undefined) {
  if (monthlyPrice === null || monthlyPrice === undefined || Number.isNaN(Number(monthlyPrice))) {
    const err = new Error("Individual pricing configuration is missing. Please contact support.");
    (err as any).status = 400;
    throw err;
  }
}

export function computeNextPeriodEnd(
  base: Date = new Date(),
  billingCycle: "MONTHLY" | "YEARLY" = "MONTHLY"
): Date {
  const next = new Date(base.getTime());
  if (billingCycle === "YEARLY") {
    next.setMonth(next.getMonth() + 12);
  } else {
    next.setDate(next.getDate() + 30);
  }
  return next;
}

export function resolveBillingCycle(input?: string | null): "MONTHLY" | "YEARLY" {
  const normalized = (input ?? "MONTHLY").toString().trim().toUpperCase();
  return normalized === "YEARLY" ? "YEARLY" : "MONTHLY";
}

export function computeChargeAndPeriod(params: {
  monthlyPrice: number;
  billingCycle: "MONTHLY" | "YEARLY";
  startDate?: Date;
}): { chargedAmount: number; periodEnd: Date } {
  const start = params.startDate ?? new Date();
  const chargedAmount =
    params.billingCycle === "YEARLY"
      ? Number((params.monthlyPrice * 10).toFixed(2))
      : params.monthlyPrice;
  const periodEnd = computeNextPeriodEnd(start, params.billingCycle);
  return { chargedAmount, periodEnd };
}

export function isSubscriptionActive(status?: string | null, periodEnd?: string | null) {
  const normalized = (status ?? "").toString().trim().toUpperCase();
  if (normalized !== "ACTIVE") return false;
  if (!periodEnd) return true;
  const endDate = new Date(periodEnd);
  return endDate.getTime() > Date.now();
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const router = Router();
router.use(authRequired);

router.get(
  "/subscription",
  requireRoles(["hauler"]),
  async (req: Request, res: Response) => {
    try {
      assertHaulerUser(req.user as any);
      const userId = (req.user as any)?.id ? Number((req.user as any).id) : null;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const haulerId = await ensureHaulerProfile(userId);
      const haulerResult = await pool.query(
        `
          SELECT
            hauler_type,
            free_trip_used,
            free_trip_used_at,
            subscription_status,
            subscription_current_period_end,
            sub.billing_cycle,
            sub.status AS sub_status,
            sub.current_period_end AS sub_current_period_end
          FROM haulers
          LEFT JOIN LATERAL (
            SELECT billing_cycle, status, current_period_end
            FROM hauler_subscriptions
            WHERE hauler_id = haulers.id
            ORDER BY started_at DESC
            LIMIT 1
          ) sub ON TRUE
          WHERE id = $1
          LIMIT 1
        `,
        [haulerId]
      );

      if (!haulerResult.rowCount) {
        return res.status(404).json({ message: "Hauler profile not found" });
      }

      const pricingResult = await pool.query(
        `
          SELECT monthly_price
          FROM pricing_configs
          WHERE target_user_type = 'HAULER_INDIVIDUAL'
            AND is_active = TRUE
          ORDER BY updated_at DESC
          LIMIT 1
        `
      );

      const individualPrice =
        pricingResult.rowCount && pricingResult.rows[0]?.monthly_price !== null
          ? Number(pricingResult.rows[0].monthly_price)
          : null;

      const payload = mapHaulerSubscriptionResponse(haulerResult.rows[0], individualPrice);
      return res.json(payload);
    } catch (err: any) {
      const status = err?.status ?? 500;
      if (status === 403 || status === 401) {
        return res.status(status).json({ message: err?.message ?? "Forbidden" });
      }
      console.error("Error in GET /api/hauler/subscription:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.post(
  "/subscription/subscribe",
  requireRoles(["hauler"]),
  async (req: Request, res: Response) => {
    try {
      assertHaulerUser(req.user as any);
      const userId = (req.user as any)?.id ? Number((req.user as any).id) : null;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const haulerId = await ensureHaulerProfile(userId);
      const haulerRowResult = await pool.query(
        `
          SELECT
            id,
            hauler_type,
            free_trip_used,
            free_trip_used_at,
            subscription_status,
            subscription_current_period_end
          FROM haulers
          WHERE id = $1
          LIMIT 1
        `,
        [haulerId]
      );
      if (!haulerRowResult.rowCount) {
        return res.status(404).json({ message: "Hauler profile not found" });
      }

      const haulerRow = haulerRowResult.rows[0];
      const haulerType = normalizeHaulerType(haulerRow.hauler_type);
      assertIndividualHaulerType(haulerType);
      if (isSubscriptionActive(haulerRow.subscription_status, haulerRow.subscription_current_period_end)) {
        return res.status(409).json({ message: "Already subscribed" });
      }

      const pricingResult = await pool.query(
        `
          SELECT monthly_price
          FROM pricing_configs
          WHERE target_user_type = 'HAULER_INDIVIDUAL'
            AND is_active = TRUE
          ORDER BY updated_at DESC
          LIMIT 1
        `
      );

      const monthlyPrice =
        pricingResult.rowCount && pricingResult.rows[0]?.monthly_price !== null
          ? Number(pricingResult.rows[0].monthly_price)
          : null;
      assertPricingConfigPresent(monthlyPrice);
      const currency = "USD";
      const billingCycle = resolveBillingCycle(req.body?.billing_cycle);
      const pricePerMonth = monthlyPrice as number;
      const { chargedAmount, periodEnd } = computeChargeAndPeriod({
        monthlyPrice: pricePerMonth,
        billingCycle,
      });

      const subscription = await withTransaction(async (client) => {
        const startedAt = new Date();
        const subInsert = await client.query(
          `
            INSERT INTO hauler_subscriptions (
              hauler_id,
              plan_type,
              status,
              billing_cycle,
              monthly_price,
              price_per_month,
              charged_amount,
            currency,
            started_at,
            current_period_end
          )
          VALUES ($1, 'INDIVIDUAL', 'ACTIVE', $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `,
          [
            haulerId,
            billingCycle,
            monthlyPrice,
            pricePerMonth,
            chargedAmount,
            currency,
            startedAt.toISOString(),
            periodEnd.toISOString(),
          ]
        );
        const subscriptionRow = subInsert.rows[0];

        await client.query(
          `
            INSERT INTO hauler_subscription_payments (
              subscription_id,
              amount,
              paid_amount,
              currency,
              provider,
              provider_ref,
              billing_cycle,
              status
            )
            VALUES ($1, $2, $3, $4, 'MANUAL_TEST', NULL, $5, 'PAID')
          `,
          [subscriptionRow.id, chargedAmount, chargedAmount, currency, billingCycle]
        );

        await client.query(
          `
            UPDATE haulers
            SET subscription_status = 'ACTIVE',
                subscription_current_period_end = $1
            WHERE id = $2
          `,
          [periodEnd.toISOString(), haulerId]
        );

        return {
          subscription_current_period_end: periodEnd.toISOString(),
        };
      });

      const refreshedHauler = await pool.query(
        `
          SELECT
            hauler_type,
            free_trip_used,
            free_trip_used_at,
            subscription_status,
            subscription_current_period_end
          FROM haulers
          WHERE id = $1
        `,
        [haulerId]
      );

      const payload = mapHaulerSubscriptionResponse(
        refreshedHauler.rows[0],
        monthlyPrice as number
      );
      payload.subscription_current_period_end =
        subscription.subscription_current_period_end ?? payload.subscription_current_period_end;

      return res.json(payload);
    } catch (err: any) {
      const status = err?.status ?? 500;
      if (status === 400 || status === 401 || status === 403) {
        return res.status(status).json({ message: err?.message ?? "Bad request" });
      }
      console.error("Error in POST /api/hauler/subscription/subscribe:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
