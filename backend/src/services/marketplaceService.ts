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

export enum BookingStatus {
  REQUESTED = "REQUESTED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
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
  assigned_to_user_id?: string | null;
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

export interface TruckAvailabilityRecord {
  id: string;
  hauler_id: string;
  truck_id: string | null;
  origin_location_text: string;
  destination_location_text: string | null;
  available_from: string;
  available_until: string | null;
  capacity_headcount: number | null;
  capacity_weight_kg: string | null;
  allow_shared: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoadBookingRecord {
  id: string;
  load_id: string;
  hauler_id: string;
  shipper_id: string;
  offer_id: string | null;
  truck_availability_id: string | null;
  requested_headcount: number | null;
  requested_weight_kg: string | null;
  offered_amount: string | null;
  offered_currency: string | null;
  status: BookingStatus;
  notes: string | null;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TruckChatRecord {
  id: string;
  truck_availability_id: string;
  shipper_id: string;
  load_id: string | null;
  status: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TruckChatMessageRecord {
  id: string;
  chat_id: string;
  sender_user_id: string;
  sender_role: string;
  message: string | null;
  attachments: any[];
  created_at: string;
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

export async function getLatestOfferForHauler(
  loadId: string,
  haulerId: string
): Promise<LoadOfferRecord | null> {
  const result = await pool.query<LoadOfferRecord>(
    `
      SELECT *
      FROM load_offers
      WHERE load_id = $1
        AND hauler_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [loadId, haulerId]
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

export interface HaulerSummary {
  id: string;
  name: string | null;
  fleet_count: number;
  driver_count: number;
  completed_trips: number;
  rating: number | null;
}

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

function mapTruckAvailabilityRow(row: any): TruckAvailabilityRecord {
  return {
    id: row.id,
    hauler_id: row.hauler_id,
    truck_id: row.truck_id ?? null,
    origin_location_text: row.origin_location_text,
    destination_location_text: row.destination_location_text ?? null,
    available_from: row.available_from,
    available_until: row.available_until ?? null,
    capacity_headcount:
      row.capacity_headcount === null || row.capacity_headcount === undefined
        ? null
        : Number(row.capacity_headcount),
    capacity_weight_kg: row.capacity_weight_kg ?? null,
    allow_shared: row.allow_shared ?? true,
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapBookingRow(row: any): LoadBookingRecord {
  return {
    id: row.id,
    load_id: row.load_id,
    hauler_id: row.hauler_id,
    shipper_id: row.shipper_id,
    offer_id: row.offer_id ?? null,
    truck_availability_id: row.truck_availability_id ?? null,
    requested_headcount:
      row.requested_headcount === null || row.requested_headcount === undefined
        ? null
        : Number(row.requested_headcount),
    requested_weight_kg: row.requested_weight_kg ?? null,
    offered_amount: row.offered_amount ?? null,
    offered_currency: row.offered_currency ?? null,
    status: (row.status as BookingStatus) ?? BookingStatus.REQUESTED,
    notes: row.notes ?? null,
    created_by_user_id: row.created_by_user_id,
    updated_by_user_id: row.updated_by_user_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapTruckChatRow(row: any): TruckChatRecord {
  return {
    id: row.id,
    truck_availability_id: row.truck_availability_id,
    shipper_id: row.shipper_id,
    load_id: row.load_id ?? null,
    status: row.status,
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapTruckChatMessageRow(row: any): TruckChatMessageRecord {
  return {
    id: row.id,
    chat_id: row.chat_id,
    sender_user_id: row.sender_user_id,
    sender_role: row.sender_role,
    message: row.message ?? null,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    created_at: row.created_at,
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
             l.awarded_offer_id::text AS awarded_offer_id,
             l.assigned_to_user_id::text AS assigned_to_user_id
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

export async function getTruckAvailabilityById(id: string): Promise<TruckAvailabilityRecord | null> {
  const result = await pool.query(
    `
      SELECT
        id::text,
        hauler_id::text,
        truck_id::text,
        origin_location_text,
        destination_location_text,
        available_from,
        available_until,
        capacity_headcount,
        capacity_weight_kg::text,
        allow_shared,
        notes,
        created_at,
        updated_at
      FROM truck_availability
      WHERE id = $1
        AND is_active = TRUE
    `,
    [id]
  );
  return result.rows[0] ? mapTruckAvailabilityRow(result.rows[0]) : null;
}

export async function listTruckAvailability(options: {
  haulerId?: string;
  originSearch?: string;
  limit?: number;
} = {}): Promise<TruckAvailabilityRecord[]> {
  const clauses = ["is_active = TRUE"];
  const params: any[] = [];
  let idx = 1;
  if (options.haulerId) {
    clauses.push(`hauler_id = $${idx++}`);
    params.push(options.haulerId);
  }
  if (options.originSearch) {
    clauses.push(`origin_location_text ILIKE $${idx++}`);
    params.push(`%${options.originSearch}%`);
  }
  const limit = options.limit ?? 50;
  params.push(limit);
  const result = await pool.query(
    `
      SELECT
        id::text,
        hauler_id::text,
        truck_id::text,
        origin_location_text,
        destination_location_text,
        available_from,
        available_until,
        capacity_headcount,
        capacity_weight_kg::text,
        allow_shared,
        notes,
        created_at,
        updated_at
      FROM truck_availability
      WHERE ${clauses.join(" AND ")}
      ORDER BY available_from ASC
      LIMIT $${idx}
    `,
    params
  );
  return result.rows.map(mapTruckAvailabilityRow);
}

export interface CreateTruckAvailabilityInput {
  haulerId: string;
  truckId?: string | null;
  origin: string;
  destination?: string | null;
  availableFrom: string;
  availableUntil?: string | null;
  capacityHeadcount?: number | null;
  capacityWeightKg?: number | null;
  allowShared?: boolean;
  notes?: string | null;
}

export async function createTruckAvailability(input: CreateTruckAvailabilityInput): Promise<TruckAvailabilityRecord> {
  if (!input.origin.trim()) {
    throw new Error("Origin is required");
  }
  if (input.truckId) {
    const conflict = await pool.query(
      `
        SELECT 1
        FROM trips
        WHERE truck_id = $1
          AND status NOT IN ($2,$3,$4)
        LIMIT 1
      `,
      [input.truckId, mapTripStatusToDb(TripStatus.DELIVERED_CONFIRMED), mapTripStatusToDb(TripStatus.CLOSED), "completed"]
    );
    if (conflict.rowCount) {
      throw new Error("Truck is currently assigned to an active trip.");
    }
  }
  const result = await pool.query(
    `
      INSERT INTO truck_availability (
        hauler_id,
        truck_id,
        origin_location_text,
        destination_location_text,
        available_from,
        available_until,
        capacity_headcount,
        capacity_weight_kg,
        allow_shared,
        notes
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
      RETURNING
        id::text,
        hauler_id::text,
        truck_id::text,
        origin_location_text,
        destination_location_text,
        available_from,
        available_until,
        capacity_headcount,
        capacity_weight_kg::text,
        allow_shared,
        notes,
        created_at,
        updated_at
    `,
    [
      input.haulerId,
      input.truckId ?? null,
      input.origin,
      input.destination ?? null,
      input.availableFrom,
      input.availableUntil ?? null,
      input.capacityHeadcount ?? null,
      input.capacityWeightKg ?? null,
      input.allowShared ?? true,
      input.notes ?? null,
    ]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create truck availability");
  }
  return mapTruckAvailabilityRow(row);
}

export async function updateTruckAvailability(
  id: string,
  patch: Partial<CreateTruckAvailabilityInput> & { isActive?: boolean }
): Promise<TruckAvailabilityRecord | null> {
  const sets: string[] = [];
  const values: any[] = [];
  if (patch.origin !== undefined) {
    sets.push(`origin_location_text = $${sets.length + 2}`);
    values.push(patch.origin);
  }
  if (patch.destination !== undefined) {
    sets.push(`destination_location_text = $${sets.length + 2}`);
    values.push(patch.destination);
  }
  if (patch.availableFrom !== undefined) {
    sets.push(`available_from = $${sets.length + 2}`);
    values.push(patch.availableFrom);
  }
  if (patch.availableUntil !== undefined) {
    sets.push(`available_until = $${sets.length + 2}`);
    values.push(patch.availableUntil);
  }
  if (patch.capacityHeadcount !== undefined) {
    sets.push(`capacity_headcount = $${sets.length + 2}`);
    values.push(patch.capacityHeadcount);
  }
  if (patch.capacityWeightKg !== undefined) {
    sets.push(`capacity_weight_kg = $${sets.length + 2}`);
    values.push(patch.capacityWeightKg);
  }
  if (patch.allowShared !== undefined) {
    sets.push(`allow_shared = $${sets.length + 2}`);
    values.push(patch.allowShared);
  }
  if (patch.truckId !== undefined) {
    sets.push(`truck_id = $${sets.length + 2}`);
    values.push(patch.truckId);
  }
  if (patch.notes !== undefined) {
    sets.push(`notes = $${sets.length + 2}`);
    values.push(patch.notes);
  }
  if (patch.isActive !== undefined) {
    sets.push(`is_active = $${sets.length + 2}`);
    values.push(patch.isActive);
  }
  if (sets.length === 0) {
    return getTruckAvailabilityById(id);
  }
  sets.push(`updated_at = NOW()`);
  const result = await pool.query(
    `
      UPDATE truck_availability
      SET ${sets.join(", ")}
      WHERE id = $1
      RETURNING
        id::text,
        hauler_id::text,
        truck_id::text,
        origin_location_text,
        destination_location_text,
        available_from,
        available_until,
        capacity_headcount,
        capacity_weight_kg::text,
        allow_shared,
        notes,
        created_at,
        updated_at
    `,
    [id, ...values]
  );
  const row = result.rows[0];
  return row ? mapTruckAvailabilityRow(row) : null;
}

export async function getTruckChatById(id: string): Promise<TruckChatRecord | null> {
  const result = await pool.query(
    `
      SELECT
        id::text,
        truck_availability_id::text,
        shipper_id::text,
        load_id::text,
        status::text,
        created_by_user_id::text,
        created_at,
        updated_at
      FROM truck_availability_chats
      WHERE id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapTruckChatRow(result.rows[0]) : null;
}

export async function getTruckChatForShipper(
  availabilityId: string,
  shipperId: string,
  loadId?: string | null
): Promise<TruckChatRecord | null> {
  const clauses = ["truck_availability_id = $1", "shipper_id = $2"];
  const params: any[] = [availabilityId, shipperId];
  if (loadId) {
    clauses.push("load_id = $3");
    params.push(loadId);
  }
  const result = await pool.query(
    `
      SELECT
        id::text,
        truck_availability_id::text,
        shipper_id::text,
        load_id::text,
        status::text,
        created_by_user_id::text,
        created_at,
        updated_at
      FROM truck_availability_chats
      WHERE ${clauses.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT 1
    `,
    params
  );
  return result.rows[0] ? mapTruckChatRow(result.rows[0]) : null;
}

export async function createTruckChat(params: {
  availabilityId: string;
  shipperId: string;
  loadId?: string | null;
  createdByUserId: string;
}): Promise<TruckChatRecord> {
  const existing = await getTruckChatForShipper(params.availabilityId, params.shipperId, params.loadId);
  if (existing) {
    return existing;
  }
  const result = await pool.query(
    `
      INSERT INTO truck_availability_chats (
        truck_availability_id,
        shipper_id,
        load_id,
        created_by_user_id
      )
      VALUES (
        $1,$2,$3,$4
      )
      RETURNING
        id::text,
        truck_availability_id::text,
        shipper_id::text,
        load_id::text,
        status::text,
        created_by_user_id::text,
        created_at,
        updated_at
    `,
    [
      params.availabilityId,
      params.shipperId,
      params.loadId ?? null,
      params.createdByUserId,
    ]
  );
  if (!result.rows[0]) {
    throw new Error("Failed to create truck chat");
  }
  return mapTruckChatRow(result.rows[0]);
}

export async function createTruckChatMessage(params: {
  chatId: string;
  senderUserId: string;
  senderRole: string;
  message?: string | null;
  attachments?: unknown[];
}): Promise<TruckChatMessageRecord> {
  const result = await pool.query(
    `
      INSERT INTO truck_availability_messages (
        chat_id,
        sender_user_id,
        sender_role,
        message,
        attachments
      )
      VALUES (
        $1,$2,$3,$4,$5
      )
      RETURNING
        id::text,
        chat_id::text,
        sender_user_id::text,
        sender_role,
        message,
        attachments,
        created_at
    `,
    [
      params.chatId,
      params.senderUserId,
      params.senderRole,
      params.message ?? null,
      JSON.stringify(params.attachments ?? []),
    ]
  );
  if (!result.rows[0]) {
    throw new Error("Failed to create chat message");
  }
  return mapTruckChatMessageRow(result.rows[0]);
}

export async function listTruckChatMessages(chatId: string): Promise<TruckChatMessageRecord[]> {
  const result = await pool.query(
    `
      SELECT
        id::text,
        chat_id::text,
        sender_user_id::text,
        sender_role,
        message,
        attachments,
        created_at
      FROM truck_availability_messages
      WHERE chat_id = $1
      ORDER BY created_at ASC
    `,
    [chatId]
  );
  return result.rows.map(mapTruckChatMessageRow);
}

async function getLoadDetails(loadId: string) {
  const result = await pool.query(
    `
      SELECT
        l.id,
        l.shipper_id,
        l.shipper_id::text AS shipper_id_text,
        l.animal_count,
        l.estimated_weight_kg,
        l.price_offer_amount,
        l.price_currency,
        l.assigned_to_user_id
      FROM loads l
      WHERE l.id = $1
    `,
    [loadId]
  );
  return result.rows[0] ?? null;
}

async function loadHasActiveBooking(loadId: string): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM load_bookings
      WHERE load_id = $1
        AND status IN ($2,$3)
      LIMIT 1
    `,
    [loadId, BookingStatus.REQUESTED, BookingStatus.ACCEPTED]
  );
  return (result.rowCount ?? 0) > 0;
}

function ensureNumeric(value: any): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num;
}

export async function createBookingFromOffer(params: {
  offerId: string;
  shipperUserId: string;
  notes?: string;
}): Promise<LoadBookingRecord> {
  const offer = await getLoadOfferById(params.offerId);
  if (!offer) {
    throw new Error("Offer not found.");
  }
  const loadDetails = await getLoadDetails(offer.load_id);
  if (!loadDetails) {
    throw new Error("Load not found.");
  }
  const load = await getLoadById(offer.load_id);
  if (!load) {
    throw new Error("Load not found");
  }
  if (load.shipper_user_id !== params.shipperUserId) {
    throw new Error("You can only request bookings for your own load.");
  }
  if (load.status !== LoadStatus.PUBLISHED && load.status !== LoadStatus.AWAITING_ESCROW) {
    throw new Error("Load is not open for new bookings.");
  }
  if (await loadHasActiveBooking(offer.load_id)) {
    throw new Error("Load already has an active booking.");
  }
  const requestedHeadcount = ensureNumeric(loadDetails.animal_count);
  const insert = await pool.query(
    `
      INSERT INTO load_bookings (
        load_id,
        hauler_id,
        shipper_id,
        offer_id,
        requested_headcount,
        requested_weight_kg,
        offered_amount,
        offered_currency,
        status,
        notes,
        created_by_user_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
      RETURNING *
    `,
    [
      offer.load_id,
      offer.hauler_id,
      load.shipper_id,
      offer.id,
      requestedHeadcount,
      loadDetails.estimated_weight_kg ?? null,
      offer.offered_amount,
      offer.currency,
      BookingStatus.REQUESTED,
      params.notes ?? null,
      params.shipperUserId,
    ]
  );
  return mapBookingRow(insert.rows[0]);
}

async function ensureTruckCapacity(
  availabilityId: string,
  requestedHeadcount: number | null
) {
  if (!requestedHeadcount) return;
  const availability = await getTruckAvailabilityById(availabilityId);
  if (!availability || availability.capacity_headcount == null) {
    return;
  }
  const current = await pool.query(
    `
      SELECT COALESCE(SUM(COALESCE(requested_headcount,0)),0)::int AS total
      FROM load_bookings
      WHERE truck_availability_id = $1
        AND status IN ($2,$3)
    `,
    [availabilityId, BookingStatus.REQUESTED, BookingStatus.ACCEPTED]
  );
  const used = Number(current.rows[0]?.total ?? 0);
  if (used + requestedHeadcount > availability.capacity_headcount) {
    throw new Error("Truck does not have enough remaining capacity.");
  }
}

export async function createBookingForAvailability(params: {
  truckAvailabilityId: string;
  loadId: string;
  shipperId: string;
  shipperUserId: string;
  requestedHeadcount?: number | null;
  requestedWeightKg?: number | null;
  offeredAmount?: number | null;
  offeredCurrency?: string | null;
  notes?: string | null;
}): Promise<LoadBookingRecord> {
  const availability = await getTruckAvailabilityById(params.truckAvailabilityId);
  if (!availability) {
    throw new Error("Truck availability not found.");
  }
  const requestedHeadcount =
    params.requestedHeadcount ??
    ensureNumeric((await getLoadDetails(params.loadId))?.animal_count) ??
    null;
  await ensureTruckCapacity(params.truckAvailabilityId, requestedHeadcount);
  const insert = await pool.query(
    `
      INSERT INTO load_bookings (
        load_id,
        hauler_id,
        shipper_id,
        truck_availability_id,
        requested_headcount,
        requested_weight_kg,
        offered_amount,
        offered_currency,
        status,
        notes,
        created_by_user_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
      RETURNING *
    `,
    [
      params.loadId,
      availability.hauler_id,
      params.shipperId,
      params.truckAvailabilityId,
      requestedHeadcount,
      params.requestedWeightKg ?? null,
      params.offeredAmount ?? null,
      params.offeredCurrency ?? "USD",
      BookingStatus.REQUESTED,
      params.notes ?? null,
      params.shipperUserId,
    ]
  );
  return mapBookingRow(insert.rows[0]);
}

export async function getBookingById(id: string): Promise<LoadBookingRecord | null> {
  const result = await pool.query(`SELECT * FROM load_bookings WHERE id = $1`, [id]);
  return result.rows[0] ? mapBookingRow(result.rows[0]) : null;
}

export async function listBookingsForHauler(haulerId: string): Promise<LoadBookingRecord[]> {
  const result = await pool.query(
    `SELECT * FROM load_bookings WHERE hauler_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [haulerId]
  );
  return result.rows.map(mapBookingRow);
}

export async function listBookingsForShipper(shipperId: string): Promise<LoadBookingRecord[]> {
  const result = await pool.query(
    `SELECT * FROM load_bookings WHERE shipper_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [shipperId]
  );
  return result.rows.map(mapBookingRow);
}

async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  userId?: string
): Promise<LoadBookingRecord | null> {
  const result = await pool.query(
    `
      UPDATE load_bookings
      SET status = $2,
          updated_by_user_id = $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [bookingId, status, userId ?? null]
  );
  return result.rows[0] ? mapBookingRow(result.rows[0]) : null;
}

async function createTripFromTruckBooking(
  booking: LoadBookingRecord
): Promise<{ trip: TripRecord; payment: PaymentRecord }> {
  const availability = await getTruckAvailabilityById(booking.truck_availability_id!);
  if (!availability) {
    throw new Error("Truck availability not found");
  }
  const loadRow = await getLoadById(booking.load_id);
  if (!loadRow) {
    throw new Error("Load not found");
  }
  const shipperUserId = loadRow.shipper_user_id;
  const haulerUserQuery = await pool.query(`SELECT user_id::text FROM haulers WHERE id = $1`, [
    availability.hauler_id,
  ]);
  const haulerUserId = haulerUserQuery.rows[0]?.user_id;
  if (!haulerUserId) {
    throw new Error("Hauler user profile not found");
  }
  const amount = booking.offered_amount
    ? Number(booking.offered_amount)
    : Number(
        (await getLoadDetails(booking.load_id))?.price_offer_amount ?? 0
      );
  if (!amount || amount <= 0) {
    throw new Error("Booking amount required");
  }

  const tripResult = await pool.query<TripRow>(
    `
      INSERT INTO trips (
        load_id,
        hauler_id,
        truck_id,
        status
      )
      VALUES (
        $1,$2,$3,$4
      )
      RETURNING *
    `,
    [
      booking.load_id,
      booking.hauler_id,
      availability.truck_id,
      mapTripStatusToDb(TripStatus.PENDING_ESCROW),
    ]
  );
  const tripRow = tripResult.rows[0];
  if (!tripRow) {
    throw new Error("Failed to create trip");
  }
  const trip = mapTripRow(tripRow);
  const paymentResult = await pool.query<PaymentRow>(
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
      booking.load_id,
      shipperUserId,
      haulerUserId,
      amount,
      booking.offered_currency ?? "USD",
      mapPaymentStatusToDb(PaymentStatus.AWAITING_FUNDING),
    ]
  );
  const paymentRow = paymentResult.rows[0];
  if (!paymentRow) {
    throw new Error("Failed to create payment");
  }
  const payment = mapPaymentRow(paymentRow);
  await pool.query(
    `
      UPDATE loads
      SET awarded_offer_id = NULL,
          status = $2,
          assigned_to_user_id = $3,
          assigned_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `,
    [booking.load_id, mapLoadStatusToDb(LoadStatus.AWAITING_ESCROW), haulerUserId]
  );
  return { trip, payment };
}

export async function respondToBooking(params: {
  bookingId: string;
  actor: "SHIPPER" | "HAULER";
  action: "ACCEPT" | "REJECT";
  actingUserId: string;
}): Promise<{
  booking: LoadBookingRecord;
  trip?: TripRecord;
  payment?: PaymentRecord;
}> {
  const booking = await getBookingById(params.bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (params.action === "REJECT") {
    const updated = await updateBookingStatus(booking.id, BookingStatus.REJECTED, params.actingUserId);
    if (!updated) throw new Error("Failed to update booking");
    return { booking: updated };
  }

  if (booking.status !== BookingStatus.REQUESTED) {
    throw new Error("Booking is not pending");
  }
  let trip: TripRecord | undefined;
  let payment: PaymentRecord | undefined;

  if (booking.offer_id) {
    const offer = await getLoadOfferById(booking.offer_id);
    if (!offer) throw new Error("Offer not found for booking");
    const loadRow = await getLoadById(booking.load_id);
    if (!loadRow) throw new Error("Load not found");
    const result = await acceptOfferAndCreateTrip({
      offerId: offer.id,
      loadId: offer.load_id,
      haulerId: offer.hauler_id,
      shipperId: loadRow.shipper_id,
      shipperUserId: loadRow.shipper_user_id,
      haulerUserId: offer.created_by_user_id,
      amount: Number(offer.offered_amount),
      currency: offer.currency,
    });
    trip = result.trip;
    payment = result.payment;
  } else if (booking.truck_availability_id) {
    const result = await createTripFromTruckBooking(booking);
    trip = result.trip;
    payment = result.payment;
  } else {
    throw new Error("Booking is missing source information");
  }

  const updated = await updateBookingStatus(booking.id, BookingStatus.ACCEPTED, params.actingUserId);
  if (!updated) {
    throw new Error("Failed to update booking");
  }
  return { booking: updated, trip, payment };
}

export interface UpdateOfferDetailsInput {
  offeredAmount?: number;
  currency?: string;
  message?: string | null;
  expiresAt?: string | null;
}

export async function updateOfferDetails(
  offerId: string,
  patch: UpdateOfferDetailsInput
): Promise<LoadOfferRecord | null> {
  const sets: string[] = [];
  const values: any[] = [];

  if (patch.offeredAmount !== undefined) {
    sets.push(`offered_amount = $${values.length + 2}`);
    values.push(patch.offeredAmount);
  }
  if (patch.currency !== undefined) {
    sets.push(`currency = $${values.length + 2}`);
    values.push(patch.currency);
  }
  if (patch.message !== undefined) {
    sets.push(`message = $${values.length + 2}`);
    values.push(patch.message);
  }
  if (patch.expiresAt !== undefined) {
    sets.push(`expires_at = $${values.length + 2}`);
    values.push(patch.expiresAt);
  }

  if (sets.length === 0) {
    return getLoadOfferById(offerId);
  }

  sets.push(`updated_at = NOW()`);

  const result = await pool.query<LoadOfferRecord>(
    `
      UPDATE load_offers
      SET ${sets.join(", ")}
      WHERE id = $1
      RETURNING *
    `,
    [offerId, ...values]
  );
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

  async function ensureTruckId(): Promise<string> {
    const existing = await client.query(
      `
        SELECT id::text
        FROM trucks
        WHERE hauler_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [params.haulerId]
    );
    if (existing.rowCount && existing.rows[0]?.id) {
      return existing.rows[0].id;
    }
    const inserted = await client.query(
      `
        INSERT INTO trucks (
          hauler_id,
          plate_number,
          truck_type,
          status,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          'mixed_livestock',
          'active',
          NOW(),
          NOW()
        )
        RETURNING id::text
      `,
      [params.haulerId, `AUTO-${Date.now()}`]
    );
    return inserted.rows[0].id;
  }

  async function ensureDriverId(): Promise<string | null> {
    const existing = await client.query(
      `
        SELECT id::text
        FROM drivers
        WHERE hauler_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [params.haulerId]
    );
    if (existing.rowCount && existing.rows[0]?.id) {
      return existing.rows[0].id;
    }
    const inserted = await client.query(
      `
        INSERT INTO drivers (
          hauler_id,
          full_name,
          status,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          'active',
          NOW(),
          NOW()
        )
        RETURNING id::text
      `,
      [params.haulerId, `Auto Driver ${params.haulerUserId ?? ""}`]
    );
    return inserted.rows[0]?.id ?? null;
  }

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

    const truckId = await ensureTruckId();
    const driverId = await ensureDriverId();

    const tripResult = await client.query<TripRow>(
      `
        INSERT INTO trips (
          load_id,
          hauler_id,
          truck_id,
          driver_id,
          status
        )
        VALUES (
          $1,$2,$3,$4,$5
        )
        RETURNING *
      `,
      [
        params.loadId,
        params.haulerId,
        truckId,
        driverId,
        mapTripStatusToDb(TripStatus.PENDING_ESCROW),
      ]
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
            assigned_to_user_id = $3,
            assigned_at = NOW(),
            updated_at = NOW()
        WHERE id = $4
      `,
      [
        params.offerId,
        mapLoadStatusToDb(LoadStatus.AWAITING_ESCROW),
        params.haulerUserId,
        params.loadId,
      ]
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
        offer_id,
        sender_user_id,
        sender_role,
        text,
        attachments
      )
      VALUES (
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

export async function offerHasShipperMessage(offerId: string): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM load_offer_messages
      WHERE offer_id = $1
        AND UPPER(sender_role) LIKE 'SHIPPER%'
      LIMIT 1
    `,
    [offerId]
  );
  return (result.rowCount ?? 0) > 0;
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

export async function getHaulerSummary(haulerId: string): Promise<HaulerSummary | null> {
  const result = await pool.query(
    `
      SELECT
        h.id::text,
        COALESCE(h.legal_name, u.full_name) AS name,
        (
          SELECT COUNT(*) FROM trucks t WHERE t.hauler_id = h.id
        )::int AS fleet_count,
        (
          SELECT COUNT(*) FROM drivers d WHERE d.hauler_id = h.id
        )::int AS driver_count,
        (
          SELECT COUNT(*) FROM trips tr WHERE tr.hauler_id = h.id
        )::int AS completed_trips
      FROM haulers h
      LEFT JOIN app_users u ON u.id = h.user_id
      WHERE h.id = $1
    `,
    [haulerId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name ?? null,
    fleet_count: Number(row.fleet_count ?? 0),
    driver_count: Number(row.driver_count ?? 0),
    completed_trips: Number(row.completed_trips ?? 0),
    rating: null,
  };
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
