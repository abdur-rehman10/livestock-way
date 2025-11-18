import { PoolClient, QueryResult } from "pg";
import { pool } from "../config/database";

const DEFAULT_COMMISSION_PERCENT = 10;

type DbClient = PoolClient | null;

interface CreatePaymentArgs {
  tripId: number;
  loadId?: number | null;
  shipperUserId: number;
  haulerUserId: number;
  amount: number;
  currency?: string;
  client?: PoolClient;
}

type PaymentStatus =
  | "PENDING_FUNDING"
  | "FUNDED"
  | "RELEASED"
  | string;

const DB_TO_PHASE_STATUS: Record<string, PaymentStatus> = {
  pending: "PENDING_FUNDING",
  pending_funding: "PENDING_FUNDING",
  in_escrow: "FUNDED",
  funded: "FUNDED",
  released: "RELEASED",
};

const PHASE_TO_DB_STATUS: Record<string, string> = {
  PENDING_FUNDING: "pending",
  FUNDED: "in_escrow",
  RELEASED: "released",
};

function runQuery(text: string, params: any[], client?: DbClient) {
  if (client) {
    return client.query(text, params);
  }
  return pool.query(text, params);
}

function mapStatusFromDb(status?: string | null): PaymentStatus {
  if (!status) return "PENDING_FUNDING";
  return DB_TO_PHASE_STATUS[status] || status.toUpperCase();
}

export interface PaymentRecord {
  id: number;
  trip_id: number | null;
  load_id: number | null;
  payer_id: string | null;
  payer_role: string;
  payee_id: string | null;
  payee_role: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string | null;
  released_at: string | null;
  platform_commission_amount: number;
  commission_percent: number;
  hauler_payout_amount: number;
  pickup_location?: string | null;
  dropoff_location?: string | null;
}

export function mapPaymentRow(row: any): PaymentRecord {
  const status = mapStatusFromDb(row.status);
  const commissionAmount = Number(row.commission_amount ?? 0);
  const commissionPercent = row.commission_bps
    ? Number(row.commission_bps) / 100
    : DEFAULT_COMMISSION_PERCENT;
  const amount = Number(row.amount ?? 0);
  const haulerPayout = amount - commissionAmount;

  return {
    id: Number(row.id),
    trip_id: row.trip_id ? Number(row.trip_id) : null,
    load_id: row.load_id ? Number(row.load_id) : null,
    payer_id: row.payer_user_id ? String(row.payer_user_id) : null,
    payer_role: "shipper",
    payee_id: row.payee_user_id ? String(row.payee_user_id) : null,
    payee_role: "hauler",
    amount,
    currency: row.currency || "USD",
    status,
    created_at: row.created_at,
    updated_at: row.updated_at || null,
    released_at: status === "RELEASED" ? row.updated_at || null : null,
    platform_commission_amount: commissionAmount,
    commission_percent: commissionPercent,
    hauler_payout_amount: haulerPayout,
    pickup_location: row.pickup_location_text || row.pickup_location || null,
    dropoff_location: row.dropoff_location_text || row.dropoff_location || null,
  };
}

export async function createPaymentForTrip(args: CreatePaymentArgs) {
  const {
    tripId,
    loadId,
    shipperUserId,
    haulerUserId,
    amount,
    currency = "USD",
    client,
  } = args;

  const commissionAmount = Number(
    ((amount * DEFAULT_COMMISSION_PERCENT) / 100).toFixed(2)
  );
  const commissionBps = DEFAULT_COMMISSION_PERCENT * 100;

  const result = await runQuery(
    `
    INSERT INTO payments (
      load_id,
      trip_id,
      payer_user_id,
      payee_user_id,
      amount,
      currency,
      status,
      commission_amount,
      commission_bps,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
    RETURNING *
    `,
    [
      loadId ?? null,
      tripId,
      shipperUserId,
      haulerUserId,
      amount,
      currency,
      PHASE_TO_DB_STATUS.PENDING_FUNDING,
      commissionAmount,
      commissionBps,
    ],
    client ?? null
  );

  return mapPaymentRow(result.rows[0]);
}

export async function getPaymentById(
  paymentId: number,
  client?: PoolClient
) {
  const result = await runQuery(
    `SELECT * FROM payments WHERE id = $1`,
    [paymentId],
    client ?? null
  );
  if (result.rowCount === 0) return null;
  return mapPaymentRow(result.rows[0]);
}

export async function getPaymentByTripId(
  tripId: number,
  client?: PoolClient
) {
  const result = await runQuery(
    `
    SELECT *
    FROM payments
    WHERE trip_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [tripId],
    client ?? null
  );
  if (result.rowCount === 0) return null;
  return mapPaymentRow(result.rows[0]);
}

export async function fundPayment(
  paymentId: number,
  client?: PoolClient
) {
  const result = await runQuery(
    `
    UPDATE payments
    SET status = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [paymentId, PHASE_TO_DB_STATUS.FUNDED],
    client ?? null
  );
  if (result.rowCount === 0) return null;
  return mapPaymentRow(result.rows[0]);
}

export async function releasePayment(
  paymentId: number,
  client?: PoolClient
) {
  const result = await runQuery(
    `
    UPDATE payments
    SET status = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [paymentId, PHASE_TO_DB_STATUS.RELEASED],
    client ?? null
  );
  if (result.rowCount === 0) return null;
  return mapPaymentRow(result.rows[0]);
}
