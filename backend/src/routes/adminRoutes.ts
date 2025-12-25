import { Router } from "express";
import { pool } from "../config/database";
import authRequired from "../middlewares/auth";
import { requireRoles } from "../middlewares/rbac";
import { auditRequest } from "../middlewares/auditLogger";
import {
  validateCompanyPricingInput,
  validateIndividualPricingInput,
} from "../utils/pricing";

function normalizeStatus(value?: string) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  switch (normalized) {
    case "pending":
      return "pending";
    case "verified":
    case "active":
      return "active";
    case "rejected":
    case "suspended":
      return "suspended";
    default:
      return null;
  }
}

function normalizeRole(value?: string) {
  return value ? value.toLowerCase() : null;
}

function isMissingTableError(error: any) {
  return error?.code === "42P01";
}

async function runStatsQuery<T>(sql: string, fallback: T): Promise<T> {
  try {
    const { rows } = await pool.query(sql);
    return (rows[0] as T) ?? fallback;
  } catch (error: any) {
    if (isMissingTableError(error)) {
      console.warn("admin stats missing table for query", sql.slice(0, 60));
      return fallback;
    }
    throw error;
  }
}

const router = Router();

router.use(
  authRequired,
  requireRoles(["super-admin"], { allowSuperAdminOverride: false })
);

router.get("/stats", async (_req, res) => {
  try {
    const [
      usersStats,
      loadStats,
      tripStats,
      paymentStats,
      kycStats,
      disputeStats,
      supportStats,
    ] = await Promise.all([
      runStatsQuery(
        `
          SELECT
            COUNT(*)::int AS total_users,
            COUNT(*) FILTER (WHERE lower(account_status::text) = 'pending')::int AS pending_users,
            COUNT(*) FILTER (WHERE lower(account_status::text) = 'active')::int AS verified_users,
            COUNT(*) FILTER (WHERE lower(user_type::text) LIKE 'hauler%')::int AS haulers,
            COUNT(*) FILTER (WHERE lower(user_type::text) LIKE 'shipper%')::int AS shippers,
            COUNT(*) FILTER (WHERE lower(user_type::text) LIKE 'stakeholder%')::int AS stakeholders
          FROM app_users
        `,
        {
          total_users: 0,
          pending_users: 0,
          verified_users: 0,
          haulers: 0,
          shippers: 0,
          stakeholders: 0,
        }
      ),
      runStatsQuery(
        `
          SELECT
            COUNT(*)::int AS total_loads,
            COUNT(*) FILTER (WHERE lower(status::text) = 'posted')::int AS open_loads,
            COUNT(*) FILTER (
              WHERE lower(status::text) = ANY(
                ARRAY['matched','in_transit','awaiting_escrow','awaiting_funding','pending_escrow']
              )
            )::int AS active_loads
          FROM loads
          WHERE is_deleted = FALSE
        `,
        {
          total_loads: 0,
          open_loads: 0,
          active_loads: 0,
        }
      ),
      runStatsQuery(
        `
          SELECT
            COUNT(*)::int AS total_trips,
            COUNT(*) FILTER (
              WHERE lower(status::text) = ANY(
                ARRAY['planned','assigned','en_route','in_progress','pending_escrow','awaiting_escrow']
              )
            )::int AS active_trips,
            COUNT(*) FILTER (
              WHERE lower(status::text) = ANY(
                ARRAY['completed','closed','delivered','delivered_confirmed']
              )
            )::int AS completed_trips
          FROM trips
        `,
        {
          total_trips: 0,
          active_trips: 0,
          completed_trips: 0,
        }
      ),
      runStatsQuery(
        `
          SELECT
            COALESCE(SUM(amount),0)::numeric AS total_volume,
            COUNT(*) FILTER (
              WHERE lower(status::text) = ANY(
                ARRAY['pending','pending_funding','awaiting_funding','in_escrow','escrow_funded']
              )
            )::int AS escrow_payments,
            COUNT(*) FILTER (
              WHERE lower(status::text) = ANY(
                ARRAY['released','released_to_hauler','released_hauler','refunded_to_shipper']
              )
            )::int AS released_payments
          FROM payments
        `,
        {
          total_volume: "0",
          escrow_payments: 0,
          released_payments: 0,
        }
      ),
      runStatsQuery(
        `
          SELECT
            COUNT(*) FILTER (
              WHERE lower(status::text) = ANY(ARRAY['pending','pending_verification','submitted'])
            )::int AS pending_kyc,
            COUNT(*) FILTER (
              WHERE lower(status::text) = ANY(ARRAY['approved','verified'])
            )::int AS approved_kyc
          FROM kyc_requests
        `,
        { pending_kyc: 0, approved_kyc: 0 }
      ),
      runStatsQuery(
        `
          SELECT
            COUNT(*)::int AS total_disputes,
            COUNT(*) FILTER (WHERE status IN ('open','under_review'))::int AS open_disputes
          FROM payment_disputes
        `,
        { total_disputes: 0, open_disputes: 0 }
      ),
      runStatsQuery(
        `
          SELECT
            COUNT(*)::int AS total_tickets,
            COUNT(*) FILTER (WHERE status = 'open')::int AS open_tickets,
            COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_tickets
          FROM support_tickets
        `,
        { total_tickets: 0, open_tickets: 0, closed_tickets: 0 }
      ),
    ]);

    return res.json({
      users: usersStats,
      loads: loadStats,
      trips: tripStats,
      payments: paymentStats,
      kyc: kycStats,
      disputes: disputeStats,
      support: supportStats,
    });
  } catch (error) {
    console.error("admin stats error", error);
    return res.status(500).json({ message: "Failed to load stats" });
  }
});

router.get("/earnings", async (_req, res) => {
  try {
    const earningsStatsResult = await pool.query<{
      total_commission: string | null;
      last_30_days: string | null;
      avg_commission: string | null;
      fee_payments: number | null;
    }>(`
      SELECT
        COALESCE(SUM(commission_amount), 0)::numeric::text AS total_commission,
        COALESCE(SUM(commission_amount)
          FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)::numeric::text AS last_30_days,
        COALESCE(AVG(commission_amount), 0)::numeric::text AS avg_commission,
        COUNT(*) FILTER (WHERE commission_amount IS NOT NULL)::int AS fee_payments
      FROM payments
    `);

    const earningsItemsResult = await pool.query(
      `
        SELECT
          p.id,
          p.trip_id,
          p.load_id,
          p.amount,
          p.currency,
          p.status,
          p.commission_amount,
          p.commission_bps,
          p.created_at,
          p.updated_at,
          t.status AS trip_status,
          t.hauler_id,
          l.title,
          l.pickup_location_text,
          l.dropoff_location_text,
          l.species,
          COALESCE(h.legal_name, hu.full_name) AS hauler_name,
          COALESCE(s.farm_name, su.full_name) AS shipper_name
        FROM payments p
        LEFT JOIN trips t ON t.id = p.trip_id
        LEFT JOIN loads l ON l.id = p.load_id
        LEFT JOIN haulers h ON t.hauler_id = h.id
        LEFT JOIN app_users hu ON h.user_id = hu.id
        LEFT JOIN shippers s ON l.shipper_id = s.id
        LEFT JOIN app_users su ON s.user_id = su.id
        WHERE p.commission_amount IS NOT NULL
        ORDER BY p.created_at DESC
        LIMIT 200
      `
    );

    const statsRow = earningsStatsResult.rows[0] ?? {
      total_commission: "0",
      last_30_days: "0",
      avg_commission: "0",
      fee_payments: 0,
    };

    const items = earningsItemsResult.rows.map((row) => ({
      payment_id: String(row.id),
      trip_id: row.trip_id ? String(row.trip_id) : null,
      load_id: row.load_id ? String(row.load_id) : null,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      commission_amount: row.commission_amount,
      commission_bps: row.commission_bps,
      created_at: row.created_at,
      updated_at: row.updated_at,
      trip_status: row.trip_status,
      hauler_name: row.hauler_name ?? null,
      shipper_name: row.shipper_name ?? null,
      route: row.pickup_location_text && row.dropoff_location_text
        ? `${row.pickup_location_text} → ${row.dropoff_location_text}`
        : row.title || null,
      species: row.species ?? null,
    }));

    return res.json({
      stats: {
        total_commission: statsRow.total_commission ?? "0",
        last_30_days: statsRow.last_30_days ?? "0",
        avg_commission: statsRow.avg_commission ?? "0",
        fee_payments: statsRow.fee_payments ?? 0,
      },
      items,
    });
  } catch (error) {
    console.error("admin earnings error", error);
    return res.status(500).json({ message: "Failed to load platform earnings" });
  }
});

router.get("/pricing/hauler-individual", async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM pricing_configs
        WHERE target_user_type = 'HAULER_INDIVIDUAL' AND is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `
    );
    return res.json(result.rows[0] ?? null);
  } catch (error) {
    console.error("admin pricing individual get error", error);
    return res.status(500).json({ message: "Failed to load individual pricing" });
  }
});

router.put("/pricing/hauler-individual", async (req, res) => {
  try {
    const { monthly_price } = validateIndividualPricingInput(
      req.user?.user_type,
      req.body?.monthly_price
    );

    const existing = await pool.query(
      `SELECT id FROM pricing_configs WHERE target_user_type = 'HAULER_INDIVIDUAL' AND is_active = TRUE LIMIT 1`
    );

    if (existing.rowCount) {
      const updated = await pool.query(
        `
          UPDATE pricing_configs
          SET monthly_price = $1, updated_at = NOW(), is_active = TRUE
          WHERE id = $2
          RETURNING *
        `,
        [monthly_price, existing.rows[0].id]
      );
      return res.json(updated.rows[0]);
    }

    await pool.query("BEGIN");
    await pool.query(
      `UPDATE pricing_configs SET is_active = FALSE WHERE target_user_type = 'HAULER_INDIVIDUAL'`
    );
    const inserted = await pool.query(
      `
        INSERT INTO pricing_configs (target_user_type, monthly_price, is_active)
        VALUES ('HAULER_INDIVIDUAL', $1, TRUE)
        RETURNING *
      `,
      [monthly_price]
    );
    await pool.query("COMMIT");
    return res.status(201).json(inserted.rows[0]);
  } catch (error: any) {
    await pool.query("ROLLBACK").catch(() => null);
    const message = error?.message || "Failed to update individual pricing";
    const status =
      message.includes("super admins") || message.includes("positive number")
        ? 400
        : 500;
    if (status === 500) console.error("admin pricing individual put error", error);
    return res.status(status).json({ message });
  }
});

router.get("/pricing/hauler-company", async (_req, res) => {
  try {
    const configResult = await pool.query(
      `
        SELECT *
        FROM pricing_configs
        WHERE target_user_type = 'HAULER_COMPANY' AND is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `
    );
    const config = configResult.rows[0] ?? null;
    const tiers = config
      ? (
          await pool.query(
            `
              SELECT *
              FROM pricing_company_tiers
              WHERE pricing_config_id = $1
              ORDER BY sort_order ASC, id ASC
            `,
            [config.id]
          )
        ).rows
      : [];
    return res.json({ config, tiers });
  } catch (error) {
    console.error("admin pricing company get error", error);
    return res.status(500).json({ message: "Failed to load company pricing" });
  }
});

router.put("/pricing/hauler-company", async (req, res) => {
  try {
    const validatedTiers = validateCompanyPricingInput(req.user?.user_type, req.body?.tiers || []);

    await pool.query("BEGIN");
    let config = await pool.query(
      `
        SELECT *
        FROM pricing_configs
        WHERE target_user_type = 'HAULER_COMPANY' AND is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `
    );

    if (!config.rowCount) {
      config = await pool.query(
        `
          INSERT INTO pricing_configs (target_user_type, is_active)
          VALUES ('HAULER_COMPANY', TRUE)
          RETURNING *
        `
      );
    }
    const configId = config.rows[0].id;

    await pool.query(
      `DELETE FROM pricing_company_tiers WHERE pricing_config_id = $1`,
      [configId]
    );

    if (validatedTiers.length > 0) {
      const values: any[] = [];
      const placeholders: string[] = [];
      validatedTiers.forEach((tier, idx) => {
        values.push(
          configId,
          tier.name,
          tier.min_vehicles,
          tier.max_vehicles,
          tier.monthly_price,
          tier.sales_form_link,
          tier.sort_order ?? idx,
          tier.is_enterprise
        );
        const base = idx * 8;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
        );
      });
      await pool.query(
        `
          INSERT INTO pricing_company_tiers (
            pricing_config_id,
            name,
            min_vehicles,
            max_vehicles,
            monthly_price,
            sales_form_link,
            sort_order,
            is_enterprise
          ) VALUES ${placeholders.join(", ")}
        `,
        values
      );
    }

    await pool.query(
      `UPDATE pricing_configs SET updated_at = NOW(), is_active = TRUE WHERE id = $1`,
      [configId]
    );

    const tiers = (
      await pool.query(
        `
          SELECT *
          FROM pricing_company_tiers
          WHERE pricing_config_id = $1
          ORDER BY sort_order ASC, id ASC
        `,
        [configId]
      )
    ).rows;

    await pool.query("COMMIT");
    return res.json({ config: config.rows[0], tiers });
  } catch (error: any) {
    await pool.query("ROLLBACK").catch(() => null);
    const message = error?.message || "Failed to update company pricing";
    const status =
      message.includes("super admins") ||
      message.includes("Maximum of 4 tiers") ||
      message.includes("Tier ranges must not overlap") ||
      message.includes("Tier") ||
      message.includes("Enterprise tier") ||
      message.includes("sales_form_link")
        ? 400
        : 500;
    if (status === 500) console.error("admin pricing company put error", error);
    return res.status(status).json({ message });
  }
});

router.get("/users", async (req, res) => {
  try {
    const status = normalizeStatus(req.query.status as string | undefined);
    const role = normalizeRole(req.query.role as string | undefined);

    const result = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.phone_number,
          u.user_type,
          u.account_status,
          u.company_name,
          u.created_at,
          COALESCE((
            SELECT COUNT(*)
            FROM loads l
            JOIN shippers s ON s.id = l.shipper_id
            WHERE s.user_id = u.id
          ), 0)::int AS loads_posted,
          COALESCE((
            SELECT COUNT(*)
            FROM trips t
            JOIN haulers h ON h.id = t.hauler_id
            WHERE h.user_id = u.id
          ), 0)::int AS trips_managed,
          COALESCE((
            SELECT COUNT(*)
            FROM payments p
            WHERE p.payer_user_id::text = u.id::text
               OR p.payee_user_id::text = u.id::text
          ), 0)::int AS payments_touching
        FROM app_users u
        WHERE ($1::text IS NULL OR lower(u.account_status::text) = $1)
          AND ($2::text IS NULL OR lower(u.user_type::text) = $2)
        ORDER BY u.created_at DESC
        LIMIT 200
      `,
      [status, role]
    );

    return res.json({ items: result.rows });
  } catch (error) {
    console.error("admin users error", error);
    return res.status(500).json({ message: "Failed to load users" });
  }
});

router.patch(
  "/users/:id/status",
  auditRequest("admin:user-status", (req) => `user:${req.params.id}`),
  async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (Number.isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user id" });
      }
      const status = normalizeStatus(req.body?.status);
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const result = await pool.query(
        `
          UPDATE app_users
          SET account_status = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING id, full_name, email, account_status, user_type
        `,
        [status, userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json({ user: result.rows[0] });
    } catch (error) {
      console.error("admin user status error", error);
      return res.status(500).json({ message: "Failed to update user" });
    }
  }
);

router.get("/support-tickets", async (req, res) => {
  try {
    const status = normalizeStatus(req.query.status as string | undefined);
    try {
      const result = await pool.query(
        `
          SELECT
            id,
            user_id,
            user_role,
            subject,
            message,
            priority,
            status,
            resolution_notes,
            resolved_by_user_id,
            resolved_at,
            created_at
          FROM support_tickets
          WHERE ($1::text IS NULL OR status = $1)
          ORDER BY created_at DESC
          LIMIT 200
        `,
        [status]
      );
      return res.json({ items: result.rows });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        console.warn("support_tickets table missing; returning empty list");
        return res.json({ items: [] });
      }
      throw error;
    }
  } catch (error) {
    console.error("admin support list error", error);
    return res.status(500).json({ message: "Failed to load support tickets" });
  }
});

router.patch(
  "/support-tickets/:id/status",
  auditRequest("admin:support-update", (req) => `support_ticket:${req.params.id}`),
  async (req, res) => {
    try {
      const ticketId = Number(req.params.id);
      if (Number.isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket id" });
      }
      const status = normalizeStatus(req.body?.status);
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const notes =
        typeof req.body?.resolution_notes === "string"
          ? req.body.resolution_notes
          : null;
      const result = await pool.query(
        `
          UPDATE support_tickets
          SET status = $1,
              resolution_notes = COALESCE($2, resolution_notes),
              resolved_by_user_id = $3,
              resolved_at = CASE
                WHEN $1 = 'closed' THEN NOW()
                ELSE resolved_at
              END
          WHERE id = $4
          RETURNING *
        `,
        [
          status,
          notes,
          req.user?.id ?? null,
          ticketId,
        ]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      return res.json({ ticket: result.rows[0] });
    } catch (error: any) {
      if (isMissingTableError(error)) {
        return res.status(400).json({ message: "Support tickets table is not configured" });
      }
      console.error("admin support update error", error);
      return res.status(500).json({ message: "Failed to update ticket" });
    }
  }
);

router.get("/support-tickets/:ticketId/messages", async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    if (Number.isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket id" });
    }
    const ticketResult = await pool.query(
      `SELECT id FROM support_tickets WHERE id = $1`,
      [ticketId]
    );
    if (ticketResult.rowCount === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    const messages = await pool.query(
      `
        SELECT id,
               ticket_id,
               sender_user_id,
               sender_role,
               message,
               attachments,
               created_at
        FROM support_ticket_messages
        WHERE ticket_id = $1
        ORDER BY created_at ASC
      `,
      [ticketId]
    );
    return res.json({ items: messages.rows });
  } catch (error) {
    console.error("admin support messages error", error);
    return res.status(500).json({ message: "Failed to load ticket messages" });
  }
});

router.post(
  "/support-tickets/:ticketId/messages",
  auditRequest("admin:support-message", (req) => `support_ticket:${req.params.ticketId}`),
  async (req, res) => {
    try {
      const ticketId = Number(req.params.ticketId);
      if (Number.isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket id" });
      }
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      const ticketResult = await pool.query(
        `SELECT id FROM support_tickets WHERE id = $1`,
        [ticketId]
      );
      if (ticketResult.rowCount === 0) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const authUserId = req.user?.id ? Number(req.user.id) : null;
      const inserted = await pool.query(
        `
          INSERT INTO support_ticket_messages (
            ticket_id,
            sender_user_id,
            sender_role,
            message,
            attachments
          )
          VALUES ($1,$2,$3,$4,$5)
          RETURNING id, ticket_id, sender_user_id, sender_role, message, attachments, created_at
        `,
        [
          ticketId,
          authUserId ?? null,
          req.user?.user_type ?? "super_admin",
          message,
          JSON.stringify(req.body?.attachments ?? []),
        ]
      );
      return res.status(201).json({ message: inserted.rows[0] });
    } catch (error) {
      console.error("admin add support message error", error);
      return res.status(500).json({ message: "Failed to add message" });
    }
  }
);

router.get("/disputes", async (req, res) => {
  try {
    const status = normalizeStatus(req.query.status as string | undefined);
    const result = await pool.query(
      `
        SELECT
          d.*,
          p.amount,
          p.currency,
          t.status AS trip_status,
          t.payment_mode,
          l.title AS load_title
        FROM payment_disputes d
        LEFT JOIN payments p ON p.id = d.payment_id
        LEFT JOIN trips t ON t.id = d.trip_id
        LEFT JOIN loads l ON l.id = t.load_id
        WHERE ($1::text IS NULL OR d.status = $1)
          AND (t.payment_mode IS NULL OR t.payment_mode <> 'DIRECT')
        ORDER BY d.created_at DESC
        LIMIT 200
      `,
      [status]
    );
    return res.json({ items: result.rows });
  } catch (error) {
    console.error("admin disputes list error", error);
    return res.status(500).json({ message: "Failed to load disputes" });
  }
});

export default router;
