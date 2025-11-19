import { PoolClient } from "pg";
import { pool } from "../config/database";

export enum LoadStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  AWAITING_ESCROW = "AWAITING_ESCROW",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum LoadOfferStatus {
  PENDING = "PENDING",
  WITHDRAWN = "WITHDRAWN",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
  ACCEPTED = "ACCEPTED",
}

export enum TripStatus {
  PENDING_ESCROW = "PENDING_ESCROW",
  READY_TO_START = "READY_TO_START",
  IN_PROGRESS = "IN_PROGRESS",
  DELIVERED_AWAITING_CONFIRMATION = "DELIVERED_AWAITING_CONFIRMATION",
  DELIVERED_CONFIRMED = "DELIVERED_CONFIRMED",
  DISPUTED = "DISPUTED",
  CLOSED = "CLOSED",
}

export enum PaymentStatus {
  AWAITING_FUNDING = "AWAITING_FUNDING",
  ESCROW_FUNDED = "ESCROW_FUNDED",
  RELEASED_TO_HAULER = "RELEASED_TO_HAULER",
  REFUNDED_TO_SHIPPER = "REFUNDED_TO_SHIPPER",
  SPLIT_BETWEEN_PARTIES = "SPLIT_BETWEEN_PARTIES",
  CANCELLED = "CANCELLED",
}

export enum DisputeStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  RESOLVED_RELEASE_TO_HAULER = "RESOLVED_RELEASE_TO_HAULER",
  RESOLVED_REFUND_TO_SHIPPER = "RESOLVED_REFUND_TO_SHIPPER",
  RESOLVED_SPLIT = "RESOLVED_SPLIT",
  CANCELLED = "CANCELLED",
}

type DbStatusMap<T extends string> = Record<string, T>;

const LOAD_STATUS_DB_TO_APP: DbStatusMap<LoadStatus> = {
  draft: LoadStatus.DRAFT,
  DRAFT: LoadStatus.DRAFT,
  posted: LoadStatus.PUBLISHED,
  PUBLISHED: LoadStatus.PUBLISHED,
  matched: LoadStatus.AWAITING_ESCROW,
  MATCHED: LoadStatus.AWAITING_ESCROW,
  awaiting_escrow: LoadStatus.AWAITING_ESCROW,
  AWAITING_ESCROW: LoadStatus.AWAITING_ESCROW,
  in_transit: LoadStatus.IN_TRANSIT,
  IN_TRANSIT: LoadStatus.IN_TRANSIT,
  delivered: LoadStatus.DELIVERED,
  DELIVERED: LoadStatus.DELIVERED,
  completed: LoadStatus.COMPLETED,
  COMPLETED: LoadStatus.COMPLETED,
  cancelled: LoadStatus.CANCELLED,
  CANCELLED: LoadStatus.CANCELLED,
};

const LOAD_STATUS_APP_TO_DB: Record<LoadStatus, string> = {
  [LoadStatus.DRAFT]: "draft",
  [LoadStatus.PUBLISHED]: "posted",
  [LoadStatus.AWAITING_ESCROW]: "AWAITING_ESCROW",
  [LoadStatus.IN_TRANSIT]: "in_transit",
  [LoadStatus.DELIVERED]: "DELIVERED",
  [LoadStatus.COMPLETED]: "completed",
  [LoadStatus.CANCELLED]: "cancelled",
};

const TRIP_STATUS_DB_TO_APP: DbStatusMap<TripStatus> = {
  planned: TripStatus.PENDING_ESCROW,
  PENDING_ESCROW: TripStatus.PENDING_ESCROW,
  assigned: TripStatus.READY_TO_START,
  READY_TO_START: TripStatus.READY_TO_START,
  en_route: TripStatus.IN_PROGRESS,
  IN_PROGRESS: TripStatus.IN_PROGRESS,
  completed: TripStatus.CLOSED,
  COMPLETED: TripStatus.CLOSED,
  cancelled: TripStatus.CLOSED,
  CANCELLED: TripStatus.CLOSED,
  DELIVERED_AWAITING_CONFIRMATION: TripStatus.DELIVERED_AWAITING_CONFIRMATION,
  delivered_awaiting_confirmation: TripStatus.DELIVERED_AWAITING_CONFIRMATION,
  DELIVERED_CONFIRMED: TripStatus.DELIVERED_CONFIRMED,
  delivered_confirmed: TripStatus.DELIVERED_CONFIRMED,
  DISPUTED: TripStatus.DISPUTED,
  disputed: TripStatus.DISPUTED,
  CLOSED: TripStatus.CLOSED,
};

const TRIP_STATUS_APP_TO_DB: Record<TripStatus, string> = {
  [TripStatus.PENDING_ESCROW]: "PENDING_ESCROW",
  [TripStatus.READY_TO_START]: "READY_TO_START",
  [TripStatus.IN_PROGRESS]: "IN_PROGRESS",
  [TripStatus.DELIVERED_AWAITING_CONFIRMATION]: "DELIVERED_AWAITING_CONFIRMATION",
  [TripStatus.DELIVERED_CONFIRMED]: "DELIVERED_CONFIRMED",
  [TripStatus.DISPUTED]: "DISPUTED",
  [TripStatus.CLOSED]: "CLOSED",
};

const PAYMENT_STATUS_DB_TO_APP: DbStatusMap<PaymentStatus> = {
  pending: PaymentStatus.AWAITING_FUNDING,
  pending_funding: PaymentStatus.AWAITING_FUNDING,
  AWAITING_FUNDING: PaymentStatus.AWAITING_FUNDING,
  in_escrow: PaymentStatus.ESCROW_FUNDED,
  ESCROW_FUNDED: PaymentStatus.ESCROW_FUNDED,
  released: PaymentStatus.RELEASED_TO_HAULER,
  RELEASED_TO_HAULER: PaymentStatus.RELEASED_TO_HAULER,
  refunded: PaymentStatus.REFUNDED_TO_SHIPPER,
  REFUNDED_TO_SHIPPER: PaymentStatus.REFUNDED_TO_SHIPPER,
  SPLIT_BETWEEN_PARTIES: PaymentStatus.SPLIT_BETWEEN_PARTIES,
  failed: PaymentStatus.CANCELLED,
  CANCELLED: PaymentStatus.CANCELLED,
};

const PAYMENT_STATUS_APP_TO_DB: Record<PaymentStatus, string> = {
  [PaymentStatus.AWAITING_FUNDING]: "AWAITING_FUNDING",
  [PaymentStatus.ESCROW_FUNDED]: "ESCROW_FUNDED",
  [PaymentStatus.RELEASED_TO_HAULER]: "RELEASED_TO_HAULER",
  [PaymentStatus.REFUNDED_TO_SHIPPER]: "REFUNDED_TO_SHIPPER",
  [PaymentStatus.SPLIT_BETWEEN_PARTIES]: "SPLIT_BETWEEN_PARTIES",
  [PaymentStatus.CANCELLED]: "CANCELLED",
};

function mapLoadStatusFromDb(value: string | null): LoadStatus {
  if (!value) return LoadStatus.DRAFT;
  return LOAD_STATUS_DB_TO_APP[value] ?? LoadStatus.DRAFT;
}

function mapTripStatusFromDb(value: string | null): TripStatus {
  if (!value) return TripStatus.PENDING_ESCROW;
  return TRIP_STATUS_DB_TO_APP[value] ?? TripStatus.PENDING_ESCROW;
}

function mapTripStatusToDb(status: TripStatus): string {
  return TRIP_STATUS_APP_TO_DB[status] ?? "PENDING_ESCROW";
}

function mapLoadStatusToDb(status: LoadStatus): string {
  return LOAD_STATUS_APP_TO_DB[status] ?? "draft";
}

function mapPaymentStatusFromDb(value: string | null): PaymentStatus {
  if (!value) return PaymentStatus.AWAITING_FUNDING;
  return PAYMENT_STATUS_DB_TO_APP[value] ?? PaymentStatus.AWAITING_FUNDING;
}

function mapPaymentStatusToDb(status: PaymentStatus): string {
  return PAYMENT_STATUS_APP_TO_DB[status] ?? "AWAITING_FUNDING";
}

export interface LoadRecord {
  id: string;
  shipper_id: string;
  shipper_user_id: string;
  status: LoadStatus;
  currency: string | null;
  asking_amount: string | null;
  awarded_offer_id: string | null;
}

export interface LoadOfferRecord {
  id: string;
  load_id: string;
  hauler_id: string;
  created_by_user_id: string;
  offered_amount: string;
  currency: string;
  message: string | null;
  status: LoadOfferStatus;
  expires_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getLoadOfferById(
  offerId: string
): Promise<LoadOfferRecord | null> {
  const result = await pool.query<LoadOfferRecord>(
    `
      SELECT *
      FROM load_offers
      WHERE id = $1
    `,
    [offerId]
  );
  return result.rows[0] ?? null;
}

export interface TripRecord {
  id: string;
  load_id: string;
  hauler_id: string | null;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  status: TripStatus;
  started_at: string | null;
  delivered_at: string | null;
  delivered_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  load_id: string | null;
  trip_id: string | null;
  payer_user_id: string | null;
  payee_user_id: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  auto_release_at: string | null;
  external_provider: string | null;
  external_intent_id: string | null;
  external_charge_id: string | null;
  is_escrow: boolean;
  created_at: string;
  updated_at: string;
}

export interface DisputeRecord {
  id: string;
  trip_id: string;
  payment_id: string;
  opened_by_user_id: string;
  opened_by_role: string;
  status: DisputeStatus;
  reason_code: string;
  description: string | null;
  requested_action: string | null;
  resolution_type: string | null;
  resolution_amount_to_hauler: string | null;
  resolution_amount_to_shipper: string | null;
  resolved_by_user_id: string | null;
  opened_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

type LoadRow = {
  id: string;
  shipper_id: string;
  shipper_user_id: string;
  status: string | null;
  currency: string | null;
  asking_amount: string | null;
  awarded_offer_id: string | null;
};

function mapLoadRow(row: LoadRow): LoadRecord {
  return {
    ...row,
    status: mapLoadStatusFromDb(row.status),
  };
}

type TripRow = {
  id: string;
  load_id: string;
  hauler_id: string | null;
  driver_id: string | null;
  truck_id: string | null;
  status: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  delivered_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapTripRow(row: TripRow): TripRecord {
  return {
    id: row.id,
    load_id: row.load_id,
    hauler_id: row.hauler_id,
    assigned_driver_id: row.driver_id,
    assigned_vehicle_id: row.truck_id,
    status: mapTripStatusFromDb(row.status),
    started_at: row.actual_start_time,
    delivered_at: row.actual_end_time,
    delivered_confirmed_at: row.delivered_confirmed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

type PaymentRow = {
  id: string;
  load_id: string | null;
  trip_id: string | null;
  payer_user_id: string | null;
  payee_user_id: string | null;
  amount: string;
  currency: string;
  status: string | null;
  auto_release_at: string | null;
  external_provider: string | null;
  external_intent_id: string | null;
  external_charge_id: string | null;
  is_escrow: boolean;
  created_at: string;
  updated_at: string;
};

function mapPaymentRow(row: PaymentRow): PaymentRecord {
  return {
    ...row,
    status: mapPaymentStatusFromDb(row.status),
  };
}

type DisputeRow = {
  id: string;
  trip_id: string;
  payment_id: string;
  opened_by_user_id: string;
  opened_by_role: string;
  status: string | null;
  reason_code: string;
  description: string | null;
  requested_action: string | null;
  resolution_type: string | null;
  resolution_amount_to_hauler: string | null;
  resolution_amount_to_shipper: string | null;
  resolved_by_user_id: string | null;
  opened_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapDisputeRow(row: DisputeRow): DisputeRecord {
  return {
    ...row,
    status: (row.status as DisputeStatus) ?? DisputeStatus.OPEN,
  };
}

export interface CreateLoadOfferInput {
  loadId: string;
  haulerId: string;
  createdByUserId: string;
  offeredAmount: number;
  currency?: string;
  message?: string;
  expiresAt?: string;
}

export async function getLoadById(loadId: string): Promise<LoadRecord | null> {
  const result = await pool.query<LoadRow>(
    `
      SELECT l.id::text,
             l.shipper_id::text AS shipper_id,
             s.user_id::text    AS shipper_user_id,
             l.status::text     AS status,
             l.asking_currency  AS currency,
             l.asking_amount::text AS asking_amount,
             l.awarded_offer_id::text AS awarded_offer_id
      FROM loads l
      JOIN shippers s ON s.id = l.shipper_id
      WHERE l.id = $1
    `,
    [loadId]
  );
  const row = result.rows[0];
  return row ? mapLoadRow(row) : null;
}

export async function createLoadOffer(input: CreateLoadOfferInput): Promise<LoadOfferRecord> {
  const { loadId, haulerId, createdByUserId, offeredAmount, currency, message, expiresAt } =
    input;

  const result = await pool.query<LoadOfferRecord>(
    `
      INSERT INTO load_offers (
        load_id,
        hauler_id,
        created_by_user_id,
        offered_amount,
        currency,
        message,
        expires_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7
      )
      RETURNING *
    `,
    [
      loadId,
      haulerId,
      createdByUserId,
      offeredAmount,
      currency ?? "USD",
      message ?? null,
      expiresAt ?? null,
    ]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create load offer");
  }
  return row;
}

export async function listLoadOffers(
  loadId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ items: LoadOfferRecord[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const itemsQuery = pool.query<LoadOfferRecord>(
    `
      SELECT *
      FROM load_offers
      WHERE load_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [loadId, limit, offset]
  );

  const countQuery = pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM load_offers WHERE load_id = $1`,
    [loadId]
  );

  const [itemsResult, countResult] = await Promise.all([itemsQuery, countQuery]);
  return {
    items: itemsResult.rows,
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}

export async function updateOfferStatus(
  offerId: string,
  status: LoadOfferStatus,
  patch: Partial<LoadOfferRecord> = {}
): Promise<LoadOfferRecord | null> {
  const fields = ["status"];
  const values: any[] = [status];

  if (patch.accepted_at) {
    fields.push("accepted_at");
    values.push(patch.accepted_at);
  }
  if (patch.rejected_at) {
    fields.push("rejected_at");
    values.push(patch.rejected_at);
  }

  const sets = fields
    .map((field, idx) => `${field} = $${idx + 2}`)
    .concat("updated_at = NOW()");

  const query = `
    UPDATE load_offers
    SET ${sets.join(",")}
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query<LoadOfferRecord>(query, [offerId, ...values]);
  return result.rows[0] ?? null;
}

export async function expireOtherOffers(loadId: string, acceptedOfferId: string, client?: PoolClient) {
  const runner = client ?? pool;
  await runner.query(
    `
      UPDATE load_offers
      SET status = $1,
          updated_at = NOW()
      WHERE load_id = $2
        AND id <> $3
        AND status = $4
    `,
    [LoadOfferStatus.EXPIRED, loadId, acceptedOfferId, LoadOfferStatus.PENDING]
  );
}

export async function acceptOfferAndCreateTrip(params: {
  offerId: string;
  loadId: string;
  haulerId: string;
  shipperId: string;
  shipperUserId: string;
  haulerUserId: string;
  amount: number;
  currency: string;
}): Promise<{ trip: TripRecord; payment: PaymentRecord }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE load_offers
        SET status = $1,
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
      `,
      [LoadOfferStatus.ACCEPTED, params.offerId]
    );

    await expireOtherOffers(params.loadId, params.offerId, client);

    const tripResult = await client.query<TripRow>(
      `
        INSERT INTO trips (
          load_id,
          hauler_id,
          status
        )
        VALUES (
          $1,$2,$3
        )
        RETURNING *
      `,
      [params.loadId, params.haulerId, mapTripStatusToDb(TripStatus.PENDING_ESCROW)]
    );
    const tripRow = tripResult.rows[0];
    if (!tripRow) {
      throw new Error("Failed to create trip");
    }
    const trip = mapTripRow(tripRow);

    const paymentResult = await client.query<PaymentRow>(
      `
        INSERT INTO payments (
          trip_id,
          load_id,
          payer_user_id,
          payee_user_id,
          amount,
          currency,
          status,
          is_escrow
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,true
        )
        RETURNING *
      `,
      [
        trip.id,
        params.loadId,
        params.shipperUserId,
        params.haulerUserId,
        params.amount,
        params.currency,
        mapPaymentStatusToDb(PaymentStatus.AWAITING_FUNDING),
      ]
    );
    const paymentRow = paymentResult.rows[0];
    if (!paymentRow) {
      throw new Error("Failed to create payment");
    }
    const payment = mapPaymentRow(paymentRow);

    await client.query(
      `
        UPDATE loads
        SET awarded_offer_id = $1,
            status = $2,
            updated_at = NOW()
        WHERE id = $3
      `,
      [params.offerId, mapLoadStatusToDb(LoadStatus.AWAITING_ESCROW), params.loadId]
    );

    await client.query("COMMIT");
    return { trip, payment };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface CreateOfferMessageInput {
  offerId: string;
  senderUserId: string;
  senderRole: string;
  text?: string;
  attachments?: unknown[];
}

export async function createOfferMessage(input: CreateOfferMessageInput) {
  const result = await pool.query(
    `
      INSERT INTO load_offer_messages (
        id,
        offer_id,
        sender_user_id,
        sender_role,
        text,
        attachments
      )
      VALUES (
        gen_random_uuid(),
        $1,$2,$3,$4,$5
      )
      RETURNING *
    `,
    [
      input.offerId,
      input.senderUserId,
      input.senderRole,
      input.text ?? null,
      JSON.stringify(input.attachments ?? []),
    ]
  );
  return result.rows[0];
}

export async function listOfferMessages(offerId: string) {
  const result = await pool.query(
    `
      SELECT *
      FROM load_offer_messages
      WHERE offer_id = $1
      ORDER BY created_at ASC
    `,
    [offerId]
  );
  return result.rows;
}

export async function getTripById(tripId: string): Promise<TripRecord | null> {
  const result = await pool.query<TripRow>(
    `
      SELECT id::text,
             load_id::text,
             hauler_id::text,
             driver_id::text,
             truck_id::text,
             status::text,
             actual_start_time,
             actual_end_time,
             delivered_confirmed_at,
             created_at,
             updated_at
      FROM trips
      WHERE id = $1
    `,
    [tripId]
  );
  const row = result.rows[0];
  return row ? mapTripRow(row) : null;
}

export async function getTripAndLoad(
  tripId: string
): Promise<{ trip: TripRecord; load: LoadRecord } | null> {
  const trip = await getTripById(tripId);
  if (!trip) return null;
  const load = await getLoadById(trip.load_id);
  if (!load) return null;
  return { trip, load };
}

export interface UpdateTripAssignmentInput {
  tripId: string;
  driverId?: string | null;
  vehicleId?: string | null;
}

export async function updateTripAssignment(input: UpdateTripAssignmentInput): Promise<TripRecord | null> {
  const sets: string[] = [];
  const values: any[] = [];

  if (input.driverId !== undefined) {
    sets.push(`driver_id = $${sets.length + 1}`);
    values.push(input.driverId);
  }
  if (input.vehicleId !== undefined) {
    sets.push(`truck_id = $${sets.length + 1}`);
    values.push(input.vehicleId);
  }
  if (sets.length === 0) {
    return null;
  }

  const query = `
    UPDATE trips
    SET ${sets.join(", ")}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING *
  `;

  const result = await pool.query<TripRow>(query, [...values, input.tripId]);
  const row = result.rows[0];
  return row ? mapTripRow(row) : null;
}

export async function driverBelongsToHauler(driverId: string, haulerId: string): Promise<boolean> {
  if (!driverId || !haulerId) return false;
  const result = await pool.query(
    `SELECT 1 FROM drivers WHERE id = $1 AND hauler_id = $2`,
    [driverId, haulerId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function vehicleBelongsToHauler(vehicleId: string, haulerId: string): Promise<boolean> {
  if (!vehicleId || !haulerId) return false;
  const result = await pool.query(
    `SELECT 1 FROM trucks WHERE id = $1 AND hauler_id = $2`,
    [vehicleId, haulerId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function driverMatchesUser(driverId: string | null, userId?: string): Promise<boolean> {
  if (!driverId || !userId) return false;
  const result = await pool.query(
    `SELECT 1 FROM drivers WHERE id = $1 AND user_id = $2`,
    [driverId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateTripStatus(
  tripId: string,
  status: TripStatus,
  patch: Partial<TripRecord> = {}
): Promise<TripRecord | null> {
  const sets = [`status = $1`, `updated_at = NOW()`];
  const values: any[] = [mapTripStatusToDb(status)];
  if (patch.started_at !== undefined) {
    sets.push(`actual_start_time = $${sets.length + 1}`);
    values.push(patch.started_at);
  }
  if (patch.delivered_at !== undefined) {
    sets.push(`actual_end_time = $${sets.length + 1}`);
    values.push(patch.delivered_at);
  }
  if (patch.delivered_confirmed_at !== undefined) {
    sets.push(`delivered_confirmed_at = $${sets.length + 1}`);
    values.push(patch.delivered_confirmed_at);
  }

  const result = await pool.query<TripRow>(
    `UPDATE trips SET ${sets.join(", ")} WHERE id = $${values.length + 1} RETURNING *`,
    [...values, tripId]
  );
  const row = result.rows[0];
  return row ? mapTripRow(row) : null;
}

export async function updateLoadStatus(
  loadId: string,
  status: LoadStatus,
  client?: PoolClient
): Promise<LoadRecord | null> {
  const runner = client ?? pool;
  const result = await runner.query<LoadRow>(
    `
      UPDATE loads
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id::text,
                shipper_id::text,
                (SELECT user_id::text FROM shippers WHERE id = loads.shipper_id) AS shipper_user_id,
                status::text,
                asking_currency,
                asking_amount::text,
                awarded_offer_id::text
    `,
    [loadId, mapLoadStatusToDb(status)]
  );
  const row = result.rows[0];
  return row ? mapLoadRow(row) : null;
}

export interface EscrowIntentInput {
  tripId: string;
  provider: string;
  externalIntentId: string;
}

export async function attachEscrowPaymentIntent(input: EscrowIntentInput): Promise<PaymentRecord | null> {
  const result = await pool.query<PaymentRow>(
    `
      UPDATE payments
      SET status = $1,
          external_provider = $2,
          external_intent_id = $3,
          updated_at = NOW()
      WHERE trip_id = $4
      RETURNING *
    `,
    [
      mapPaymentStatusToDb(PaymentStatus.AWAITING_FUNDING),
      input.provider,
      input.externalIntentId,
      input.tripId,
    ]
  );
  const row = result.rows[0];
  return row ? mapPaymentRow(row) : null;
}

export async function markPaymentFunded(tripId: string): Promise<PaymentRecord | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const paymentResult = await client.query<PaymentRow>(
      `
        UPDATE payments
        SET status = $1,
            updated_at = NOW()
        WHERE trip_id = $2
        RETURNING *
      `,
      [mapPaymentStatusToDb(PaymentStatus.ESCROW_FUNDED), tripId]
    );
    const paymentRow = paymentResult.rows[0] ?? null;
    const payment = paymentRow ? mapPaymentRow(paymentRow) : null;

    if (payment) {
      await client.query(
        `
          UPDATE trips
          SET status = $1,
              updated_at = NOW()
          WHERE id = $2
            AND status = $3
        `,
        [
          mapTripStatusToDb(TripStatus.READY_TO_START),
          tripId,
          mapTripStatusToDb(TripStatus.PENDING_ESCROW),
        ]
      );
    }

    await client.query("COMMIT");

    return payment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export interface ScheduleAutoReleaseInput {
  tripId: string;
  releaseAt: string;
}

export async function scheduleAutoRelease(input: ScheduleAutoReleaseInput): Promise<PaymentRecord | null> {
  const result = await pool.query<PaymentRow>(
    `
      UPDATE payments
      SET auto_release_at = $1,
          updated_at = NOW()
      WHERE trip_id = $2
        AND status = $3
      RETURNING *
    `,
    [input.releaseAt, input.tripId, mapPaymentStatusToDb(PaymentStatus.ESCROW_FUNDED)]
  );
  const row = result.rows[0];
  return row ? mapPaymentRow(row) : null;
}

export async function getPaymentForTrip(tripId: string): Promise<PaymentRecord | null> {
  const result = await pool.query<PaymentRow>(
    `
      SELECT *
      FROM payments
      WHERE trip_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [tripId]
  );
  const row = result.rows[0];
  return row ? mapPaymentRow(row) : null;
}

export async function getPaymentById(paymentId: string): Promise<PaymentRecord | null> {
  const result = await pool.query<PaymentRow>(
    `
      SELECT *
      FROM payments
      WHERE id = $1
    `,
    [paymentId]
  );
  const row = result.rows[0];
  return row ? mapPaymentRow(row) : null;
}

export async function getPaymentByIntentId(intentId: string): Promise<PaymentRecord | null> {
  const result = await pool.query<PaymentRow>(
    `
      SELECT *
      FROM payments
      WHERE external_intent_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [intentId]
  );
  const row = result.rows[0];
  return row ? mapPaymentRow(row) : null;
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  patch: Partial<PaymentRecord> = {}
): Promise<PaymentRecord | null> {
  const sets = ["status = $2", "updated_at = NOW()"];
  const values: any[] = [paymentId, mapPaymentStatusToDb(status)];

  if (patch.external_charge_id !== undefined) {
    sets.push(`external_charge_id = $${values.length + 1}`);
    values.push(patch.external_charge_id);
  }
  if (patch.auto_release_at !== undefined) {
    sets.push(`auto_release_at = $${values.length + 1}`);
    values.push(patch.auto_release_at);
  }

  const result = await pool.query<PaymentRow>(
    `
      UPDATE payments
      SET ${sets.join(", ")}
      WHERE id = $1
      RETURNING *
    `,
    values
  );

  const row = result.rows[0];
  return row ? mapPaymentRow(row) : null;
}

export async function clearAutoReleaseForPayment(paymentId: string): Promise<PaymentRecord | null> {
  const result = await pool.query<PaymentRow>(
    `
      UPDATE payments
      SET auto_release_at = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [paymentId]
  );
  const row = result.rows[0];
  return row ? mapPaymentRow(row) : null;
}

async function updatePaymentTripLoadWithinClient(
  client: PoolClient,
  paymentId: string,
  paymentStatus: PaymentStatus,
  options: { tripStatus?: TripStatus; loadStatus?: LoadStatus } = {}
): Promise<{ payment: PaymentRecord; trip: TripRecord | null; load: LoadRecord | null }> {
  const paymentResult = await client.query<PaymentRow>(
    `
      UPDATE payments
      SET status = $1,
          auto_release_at = NULL,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [mapPaymentStatusToDb(paymentStatus), paymentId]
  );
  const paymentRow = paymentResult.rows[0];
  if (!paymentRow) {
    throw new Error("PAYMENT_NOT_FOUND");
  }
  const payment = mapPaymentRow(paymentRow);

  let trip: TripRecord | null = null;
  if (payment.trip_id && options.tripStatus) {
    const tripResult = await client.query<TripRow>(
      `
        UPDATE trips
        SET status = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [mapTripStatusToDb(options.tripStatus), payment.trip_id]
    );
    const tripRow = tripResult.rows[0];
    trip = tripRow ? mapTripRow(tripRow) : null;
  }

  let load: LoadRecord | null = null;
  if (payment.load_id && options.loadStatus) {
    const loadResult = await client.query<LoadRow>(
      `
        UPDATE loads
        SET status = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id::text,
                  shipper_id::text,
                  (SELECT user_id::text FROM shippers WHERE id = loads.shipper_id) AS shipper_user_id,
                  status::text,
                  asking_currency,
                  asking_amount::text,
                  awarded_offer_id::text
      `,
      [payment.load_id, mapLoadStatusToDb(options.loadStatus)]
    );
    const loadRow = loadResult.rows[0];
    load = loadRow ? mapLoadRow(loadRow) : null;
  }

  return { payment, trip, load };
}

export async function finalizePaymentLifecycle(params: {
  paymentId: string;
  paymentStatus: PaymentStatus;
  tripStatus?: TripStatus;
  loadStatus?: LoadStatus;
}): Promise<{ payment: PaymentRecord; trip: TripRecord | null; load: LoadRecord | null }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lifecycleOptions: { tripStatus?: TripStatus; loadStatus?: LoadStatus } = {};
    if (params.tripStatus) {
      lifecycleOptions.tripStatus = params.tripStatus;
    }
    if (params.loadStatus) {
      lifecycleOptions.loadStatus = params.loadStatus;
    }
    const result = await updatePaymentTripLoadWithinClient(
      client,
      params.paymentId,
      params.paymentStatus,
      lifecycleOptions
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function autoReleaseReadyPayments(): Promise<
  Array<{ payment: PaymentRecord; trip: TripRecord | null; load: LoadRecord | null }>
> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const candidates = await client.query<PaymentRow>(
      `
        SELECT *
        FROM payments p
        WHERE p.status = $1
          AND p.auto_release_at IS NOT NULL
          AND p.auto_release_at <= NOW()
          AND NOT EXISTS (
            SELECT 1
            FROM payment_disputes d
            WHERE d.payment_id = p.id
              AND d.status IN ($2,$3)
          )
        FOR UPDATE SKIP LOCKED
      `,
      [
        mapPaymentStatusToDb(PaymentStatus.ESCROW_FUNDED),
        DisputeStatus.OPEN,
        DisputeStatus.UNDER_REVIEW,
      ]
    );

    const updates: Array<{ payment: PaymentRecord; trip: TripRecord | null; load: LoadRecord | null }> = [];
    for (const row of candidates.rows) {
      const result = await updatePaymentTripLoadWithinClient(client, row.id, PaymentStatus.RELEASED_TO_HAULER, {
        tripStatus: TripStatus.CLOSED,
        loadStatus: LoadStatus.COMPLETED,
      });
      updates.push(result);
    }

    await client.query("COMMIT");
    return updates;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resolveDisputeLifecycle(params: {
  disputeId: string;
  disputeStatus: DisputeStatus;
  paymentStatus: PaymentStatus;
  resolvedBy: string;
  resolutionAmounts?: {
    amountToHauler?: string | null;
    amountToShipper?: string | null;
  };
}): Promise<{ dispute: DisputeRecord; payment: PaymentRecord; trip: TripRecord | null; load: LoadRecord | null }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const disputeResult = await client.query<DisputeRow>(
      `
        UPDATE payment_disputes
        SET status = $2,
            resolution_type = $3,
            resolution_amount_to_hauler = $4,
            resolution_amount_to_shipper = $5,
            resolved_by_user_id = $6,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        params.disputeId,
        params.disputeStatus,
        params.disputeStatus,
        params.resolutionAmounts?.amountToHauler ?? null,
        params.resolutionAmounts?.amountToShipper ?? null,
        params.resolvedBy,
      ]
    );
    const disputeRow = disputeResult.rows[0];
    if (!disputeRow) {
      throw new Error("DISPUTE_NOT_FOUND");
    }
    const dispute = mapDisputeRow(disputeRow);

    const lifecycle = await updatePaymentTripLoadWithinClient(
      client,
      dispute.payment_id,
      params.paymentStatus,
      { tripStatus: TripStatus.CLOSED, loadStatus: LoadStatus.COMPLETED }
    );

    await client.query("COMMIT");
    return { dispute, ...lifecycle };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export interface CreateDisputeInput {
  tripId: string;
  paymentId: string;
  openedByUserId: string;
  openedByRole: string;
  reasonCode: string;
  description?: string;
  requestedAction?: string;
}

export async function createPaymentDispute(input: CreateDisputeInput): Promise<DisputeRecord> {
  const result = await pool.query<DisputeRow>(
    `
      INSERT INTO payment_disputes (
        trip_id,
        payment_id,
        opened_by_user_id,
        opened_by_role,
        status,
        reason_code,
        description,
        requested_action
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7
      )
      RETURNING *
    `,
    [
      input.tripId,
      input.paymentId,
      input.openedByUserId,
      input.openedByRole,
      DisputeStatus.OPEN,
      input.reasonCode,
      input.description ?? null,
      input.requestedAction ?? null,
    ]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create dispute");
  }
  return mapDisputeRow(row);
}

export async function listDisputesByTrip(tripId: string): Promise<DisputeRecord[]> {
  const result = await pool.query<DisputeRow>(
    `
      SELECT *
      FROM payment_disputes
      WHERE trip_id = $1
      ORDER BY created_at DESC
    `,
    [tripId]
  );
  return result.rows.map(mapDisputeRow);
}

export async function listDisputesByPayment(
  paymentId: string,
  statuses?: DisputeStatus[]
): Promise<DisputeRecord[]> {
  const clauses = ["payment_id = $1"];
  const values: any[] = [paymentId];
  if (statuses && statuses.length > 0) {
    clauses.push(`status = ANY($2)`);
    values.push(statuses);
  }
  const result = await pool.query<DisputeRow>(
    `
      SELECT *
      FROM payment_disputes
      WHERE ${clauses.join(" AND ")}
      ORDER BY created_at DESC
    `,
    values
  );
  return result.rows.map(mapDisputeRow);
}

export async function getDisputeById(disputeId: string): Promise<DisputeRecord | null> {
  const result = await pool.query<DisputeRow>(
    `
      SELECT *
      FROM payment_disputes
      WHERE id = $1
    `,
    [disputeId]
  );
  const row = result.rows[0];
  return row ? mapDisputeRow(row) : null;
}

export async function addDisputeMessage(input: {
  disputeId: string;
  senderUserId: string;
  senderRole: string;
  text?: string;
  attachments?: unknown[];
}) {
  const result = await pool.query(
    `
      INSERT INTO dispute_messages (
        id,
        dispute_id,
        sender_user_id,
        sender_role,
        text,
        attachments
      )
      VALUES (
        gen_random_uuid(),
        $1,$2,$3,$4,$5
      )
      RETURNING *
    `,
    [
      input.disputeId,
      input.senderUserId,
      input.senderRole,
      input.text ?? null,
      JSON.stringify(input.attachments ?? []),
    ]
  );
  return result.rows[0];
}

export async function listDisputeMessages(disputeId: string) {
  const result = await pool.query(
    `
      SELECT *
      FROM dispute_messages
      WHERE dispute_id = $1
      ORDER BY created_at ASC
    `,
    [disputeId]
  );
  return result.rows;
}

export async function updateDisputeStatus(
  disputeId: string,
  status: DisputeStatus,
  patch: Partial<DisputeRecord> = {}
) {
  const sets = ["status = $2", "updated_at = NOW()"];
  const values: any[] = [disputeId, status];

  if (patch.resolution_type !== undefined) {
    sets.push(`resolution_type = $${values.length + 1}`);
    values.push(patch.resolution_type);
  }
  if (patch.resolution_amount_to_hauler !== undefined) {
    sets.push(`resolution_amount_to_hauler = $${values.length + 1}`);
    values.push(patch.resolution_amount_to_hauler);
  }
  if (patch.resolution_amount_to_shipper !== undefined) {
    sets.push(`resolution_amount_to_shipper = $${values.length + 1}`);
    values.push(patch.resolution_amount_to_shipper);
  }
  if (patch.resolved_by_user_id !== undefined) {
    sets.push(`resolved_by_user_id = $${values.length + 1}`);
    values.push(patch.resolved_by_user_id);
  }
  if (patch.resolved_at !== undefined) {
    sets.push(`resolved_at = $${values.length + 1}`);
    values.push(patch.resolved_at);
  }

  const result = await pool.query<DisputeRow>(
    `
      UPDATE payment_disputes
      SET ${sets.join(", ")}
      WHERE id = $1
      RETURNING *
    `,
    values
  );

  const row = result.rows[0];
  return row ? mapDisputeRow(row) : null;
}
