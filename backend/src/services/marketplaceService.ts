import { PoolClient } from "pg";
import { pool } from "../config/database";
import { assertEscrowEnabled } from "../utils/escrowGuard";

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
  NOT_APPLICABLE = "NOT_APPLICABLE",
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

export type PaymentMode = "ESCROW" | "DIRECT";
export type HaulerSubscriptionStatus = "NONE" | "ACTIVE" | "CANCELED" | "EXPIRED";
export type HaulerSubscriptionLifecycleStatus = "PENDING" | "ACTIVE" | "CANCELED" | "EXPIRED";
export type HaulerSubscriptionPlanType = "INDIVIDUAL";

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
  NOT_APPLICABLE: PaymentStatus.NOT_APPLICABLE,
};

const PAYMENT_STATUS_APP_TO_DB: Record<PaymentStatus, string> = {
  [PaymentStatus.AWAITING_FUNDING]: "AWAITING_FUNDING",
  [PaymentStatus.ESCROW_FUNDED]: "ESCROW_FUNDED",
  [PaymentStatus.RELEASED_TO_HAULER]: "RELEASED_TO_HAULER",
  [PaymentStatus.REFUNDED_TO_SHIPPER]: "REFUNDED_TO_SHIPPER",
  [PaymentStatus.SPLIT_BETWEEN_PARTIES]: "SPLIT_BETWEEN_PARTIES",
  [PaymentStatus.CANCELLED]: "CANCELLED",
  [PaymentStatus.NOT_APPLICABLE]: "NOT_APPLICABLE",
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
  is_external?: boolean;
  assigned_to_user_id?: string | null;
  payment_mode?: PaymentMode;
  direct_payment_disclaimer_accepted_at?: string | null;
  direct_payment_disclaimer_version?: string | null;
}

export interface LoadOfferRecord {
  id: string;
  load_id: string;
  hauler_id: string;
  created_by_user_id: string;
  offered_amount: string;
  currency: string;
  message: string | null;
  chat_enabled_by_shipper?: boolean | null;
  chat_enabled_by_hauler?: boolean | null;
  status: LoadOfferStatus;
  expires_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  payment_mode?: PaymentMode;
  direct_payment_disclaimer_accepted_at?: string | null;
  direct_payment_disclaimer_version?: string | null;
  truck_id?: string | null;
  truck?: {
    id: string;
    plate_number: string;
    truck_type: string;
    truck_name: string | null;
    capacity: number | null;
    species_supported: string | null;
  } | null;
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
  capacity_weight_kg: number | null;
  allow_shared: boolean;
  notes: string | null;
  post_link?: string | null;
  external_contact_email?: string | null;
  external_contact_phone?: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  is_active: boolean;
  is_external?: boolean;
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
  payment_mode?: PaymentMode;
  direct_payment_disclaimer_accepted_at?: string | null;
  direct_payment_disclaimer_version?: string | null;
  status: BookingStatus;
  notes: string | null;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ContractStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "LOCKED";

export interface ContractRecord {
  id: string;
  load_id: string;
  offer_id: string | null;
  booking_id: string | null;
  shipper_id: string;
  hauler_id: string;
  status: ContractStatus;
  price_amount: string | null;
  price_type: string | null;
  payment_method: string | null;
  payment_schedule: string | null;
  contract_payload: Record<string, unknown>;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  locked_at: string | null;
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
  chat_enabled_by_shipper?: boolean | null;
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

export interface ShipperTripSummary {
  trip: TripRecord;
  load: {
    id: string;
    shipper_id: string;
    species: string | null;
    animal_count: number | null;
    pickup_location_text: string | null;
    dropoff_location_text: string | null;
    price_offer_amount: string | null;
    price_currency: string | null;
    pickup_window_start: string | null;
    pickup_window_end: string | null;
    delivery_window_start: string | null;
    delivery_window_end: string | null;
    pickup_lat: number | null;
    pickup_lng: number | null;
    dropoff_lat: number | null;
    dropoff_lng: number | null;
  };
  contract: ContractRecord | null;
  hauler: { id: string; name: string | null; phone: string | null } | null;
  shipper: { id: string; name: string | null; phone: string | null } | null;
  driver: { id: string; name: string | null; phone: string | null } | null;
  truck: { id: string; plate_number: string | null; truck_type: string | null } | null;
  payment_status: string | null;
  route_plan_id: string | null;
  latest_location: {
    lat: number;
    lng: number;
    recorded_at: string;
  } | null;
}

export interface HaulerTripSummary extends ShipperTripSummary {}

export interface TruckChatSummary {
  chat: TruckChatRecord;
  availability: {
    origin_location_text: string;
    destination_location_text: string | null;
    capacity_headcount: number | null;
  };
  booking: {
    id: string;
    status: string | null;
    offered_amount: number | null;
    offered_currency: string | null;
    hauler_id: string | null;
  } | null;
  last_message: TruckChatMessageRecord | null;
}

export async function getLoadOfferById(
  offerId: string
): Promise<LoadOfferRecord | null> {
  const result = await pool.query(
    `
      SELECT lo.*,
             l.payment_mode                           AS load_payment_mode,
             l.direct_payment_disclaimer_accepted_at  AS load_direct_payment_disclaimer_accepted_at,
             l.direct_payment_disclaimer_version      AS load_direct_payment_disclaimer_version,
             t.id::text                               AS truck_id_from_truck,
             t.plate_number                           AS truck_plate_number,
             t.truck_type                             AS truck_truck_type,
             t.notes                                  AS truck_notes,
             t.capacity_weight_kg                     AS truck_capacity
      FROM load_offers lo
      LEFT JOIN loads l ON l.id = lo.load_id
      LEFT JOIN trucks t ON t.id = lo.truck_id
      WHERE lo.id = $1
    `,
    [offerId]
  );
  return result.rows[0] ? mapOfferRow(result.rows[0]) : null;
}

export async function getLatestOfferForHauler(
  loadId: string,
  haulerId: string
): Promise<LoadOfferRecord | null> {
  const result = await pool.query(
    `
      SELECT lo.*,
             l.payment_mode                           AS load_payment_mode,
             l.direct_payment_disclaimer_accepted_at  AS load_direct_payment_disclaimer_accepted_at,
             l.direct_payment_disclaimer_version      AS load_direct_payment_disclaimer_version,
             t.id::text                               AS truck_id_from_truck,
             t.plate_number                           AS truck_plate_number,
             t.truck_type                             AS truck_truck_type,
             t.notes                                  AS truck_notes,
             t.capacity_weight_kg                     AS truck_capacity
      FROM load_offers lo
      LEFT JOIN loads l ON l.id = lo.load_id
      LEFT JOIN trucks t ON t.id = lo.truck_id
      WHERE lo.load_id = $1
        AND lo.hauler_id = $2
      ORDER BY lo.created_at DESC
      LIMIT 1
    `,
    [loadId, haulerId]
  );
  return result.rows[0] ? mapOfferRow(result.rows[0]) : null;
}

export interface TripRecord {
  id: string;
  load_id: string;
  hauler_id: string | null;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  truck_availability_id: string | null;
  status: TripStatus;
  payment_mode: PaymentMode;
  direct_payment_disclaimer_accepted_at: string | null;
  direct_payment_disclaimer_version: string | null;
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

export type DirectPaymentMethod = "CASH" | "BANK_TRANSFER" | "OTHER";

export interface TripDirectPaymentRecord {
  id: string;
  trip_id: string;
  received_amount: string;
  received_payment_method: DirectPaymentMethod;
  received_reference: string | null;
  received_at: string;
  created_at: string;
  updated_at: string;
}

export async function upsertDirectPaymentReceipt(
  input: {
    tripId: string;
    receivedAmount: number;
    paymentMethod: DirectPaymentMethod;
    reference?: string | null;
    receivedAt?: string | null;
  },
  client: PoolClient | null = null
): Promise<TripDirectPaymentRecord> {
  const runner = client ?? pool;
  const result = await runner.query(
    `
      INSERT INTO trip_direct_payments (
        trip_id,
        received_amount,
        received_payment_method,
        received_reference,
        received_at,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,COALESCE($5, NOW()), NOW(), NOW())
      ON CONFLICT (trip_id)
      DO UPDATE SET
        received_amount = EXCLUDED.received_amount,
        received_payment_method = EXCLUDED.received_payment_method,
        received_reference = EXCLUDED.received_reference,
        received_at = EXCLUDED.received_at,
        updated_at = NOW()
      RETURNING *
    `,
    [
      input.tripId,
      input.receivedAmount,
      input.paymentMethod,
      input.reference ?? null,
      input.receivedAt ?? null,
    ]
  );
  return mapTripDirectPaymentRow(result.rows[0]);
}

type LoadRow = {
  id: string;
  shipper_id: string;
  shipper_user_id: string;
  status: string | null;
  currency: string | null;
  asking_amount: string | null;
  awarded_offer_id: string | null;
  is_external?: boolean | null;
  payment_mode?: string | null;
  direct_payment_disclaimer_accepted_at?: string | null;
  direct_payment_disclaimer_version?: string | null;
};

export interface HaulerSummary {
  id: string;
  name: string | null;
  fleet_count: number;
  driver_count: number;
  completed_trips: number;
  hauler_type?: string | null;
  free_trip_used: boolean;
  free_trip_used_at: string | null;
  subscription_status: HaulerSubscriptionStatus;
  subscription_current_period_end: string | null;
  rating: number | null;
}

export type HaulerSubscriptionPaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface HaulerSubscriptionRecord {
  id: string;
  hauler_id: string;
  plan_type: HaulerSubscriptionPlanType;
  status: HaulerSubscriptionLifecycleStatus;
  billing_cycle: "MONTHLY" | "YEARLY";
  monthly_price: number;
  price_per_month: number;
  charged_amount: number;
  currency: string;
  started_at: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface HaulerSubscriptionPaymentRecord {
  id: string;
  subscription_id: string;
  amount: number;
  paid_amount: number;
  billing_cycle: "MONTHLY" | "YEARLY";
  currency: string;
  provider: string;
  provider_ref: string | null;
  status: HaulerSubscriptionPaymentStatus;
  created_at: string;
  updated_at: string;
}

export function assertFreeTripEligibility(meta: {
  haulerType?: string | null;
  subscriptionStatus?: string | null;
  freeTripUsed?: boolean | null;
  hasActiveTrip: boolean;
}) {
  const type = (meta.haulerType ?? "").toString().trim().toUpperCase();
  if (type !== "INDIVIDUAL") return;
  const subscription = (meta.subscriptionStatus ?? "NONE").toString().trim().toUpperCase();
  if (subscription === "ACTIVE") return;
  const freeTripUsed = Boolean(meta.freeTripUsed);
  if (freeTripUsed || meta.hasActiveTrip) {
    const err = new Error("Free trip already used or active trip exists. Upgrade required.");
    (err as any).status = 402;
    (err as any).code = "SUBSCRIPTION_REQUIRED";
    throw err;
  }
}

export function shouldConsumeFreeTrip(meta: {
  haulerType?: string | null;
  subscriptionStatus?: string | null;
  freeTripUsed?: boolean | null;
}) {
  const type = (meta.haulerType ?? "").toString().trim().toUpperCase();
  if (type !== "INDIVIDUAL") return false;
  const subscription = (meta.subscriptionStatus ?? "NONE").toString().trim().toUpperCase();
  if (subscription === "ACTIVE") return false;
  return !Boolean(meta.freeTripUsed);
}

export interface HaulerDriverRecord {
  id: string;
  full_name: string | null;
  status: string | null;
  phone_number?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;
}

export interface HaulerVehicleRecord {
  id: string;
  plate_number: string | null;
  truck_type: string | null;
  status: string | null;
}

export function mapLoadRow(row: LoadRow): LoadRecord {
  return {
    ...row,
    is_external: row.is_external ?? false,
    status: mapLoadStatusFromDb(row.status),
    payment_mode:
      (row.payment_mode as PaymentMode | null | undefined) === "DIRECT" ? "DIRECT" : "ESCROW",
    direct_payment_disclaimer_accepted_at: row.direct_payment_disclaimer_accepted_at ?? null,
    direct_payment_disclaimer_version: row.direct_payment_disclaimer_version ?? null,
  };
}

type TripRow = {
  id: string;
  load_id: string;
  hauler_id: string | null;
  driver_id: string | null;
  truck_id: string | null;
  truck_availability_id?: string | null;
  status: string | null;
  payment_mode?: string | null;
  load_payment_mode?: string | null;
  direct_payment_disclaimer_accepted_at?: string | null;
  load_direct_payment_disclaimer_accepted_at?: string | null;
  direct_payment_disclaimer_version?: string | null;
  load_direct_payment_disclaimer_version?: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  delivered_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapTripRow(row: TripRow): TripRecord {
  return {
    id: row.id,
    load_id: row.load_id,
    hauler_id: row.hauler_id,
    assigned_driver_id: row.driver_id,
    assigned_vehicle_id: row.truck_id,
    truck_availability_id: row.truck_availability_id ?? null,
    status: mapTripStatusFromDb(row.status),
    payment_mode:
      (row.payment_mode as PaymentMode | null | undefined) === "DIRECT" ||
      (row.load_payment_mode as PaymentMode | null | undefined) === "DIRECT"
        ? "DIRECT"
        : "ESCROW",
    direct_payment_disclaimer_accepted_at:
      row.direct_payment_disclaimer_accepted_at ??
      row.load_direct_payment_disclaimer_accepted_at ??
      null,
    direct_payment_disclaimer_version:
      row.direct_payment_disclaimer_version ??
      row.load_direct_payment_disclaimer_version ??
      null,
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
    capacity_weight_kg:
      row.capacity_weight_kg === null || row.capacity_weight_kg === undefined
        ? null
        : Number(row.capacity_weight_kg),
    allow_shared: row.allow_shared ?? true,
    notes: row.notes ?? null,
    post_link: row.post_link ?? null,
    external_contact_email: row.external_contact_email ?? null,
    external_contact_phone: row.external_contact_phone ?? null,
    origin_lat:
      row.origin_lat === null || row.origin_lat === undefined
        ? null
        : Number(row.origin_lat),
    origin_lng:
      row.origin_lng === null || row.origin_lng === undefined
        ? null
        : Number(row.origin_lng),
    destination_lat:
      row.destination_lat === null || row.destination_lat === undefined
        ? null
        : Number(row.destination_lat),
    destination_lng:
      row.destination_lng === null || row.destination_lng === undefined
        ? null
        : Number(row.destination_lng),
    is_active: row.is_active ?? true,
    is_external: row.is_external ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseTruckNotes(raw: string | null): { truck_name?: string | null; species_supported?: string | null } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        truck_name: parsed.truck_name ?? null,
        species_supported: parsed.species_supported ?? null,
      };
    }
  } catch {
    // not JSON, return empty
  }
  return {};
}

export function mapOfferRow(row: any): LoadOfferRecord {
  const modeSource =
    row.payment_mode ??
    row.load_payment_mode ??
    row.load_paymentmode ??
    null;
  const truckId = row.truck_id ? String(row.truck_id) : (row.truck_id_from_truck ? String(row.truck_id_from_truck) : null);
  let truck = null;
  if (truckId && row.truck_plate_number) {
    const truckMeta = parseTruckNotes(row.truck_notes ?? null);
    truck = {
      id: truckId,
      plate_number: row.truck_plate_number,
      truck_type: row.truck_truck_type,
      truck_name: truckMeta.truck_name ?? null,
      capacity: row.truck_capacity ? Number(row.truck_capacity) : null,
      species_supported: truckMeta.species_supported ?? null,
    };
  }
  return {
    id: row.id,
    load_id: row.load_id,
    hauler_id: row.hauler_id,
    created_by_user_id: row.created_by_user_id,
    offered_amount: row.offered_amount,
    currency: row.currency,
    message: row.message ?? null,
    chat_enabled_by_shipper: row.chat_enabled_by_shipper ?? null,
    chat_enabled_by_hauler: row.chat_enabled_by_hauler ?? null,
    status: row.status as LoadOfferStatus,
    expires_at: row.expires_at ?? null,
    accepted_at: row.accepted_at ?? null,
    rejected_at: row.rejected_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    payment_mode: (modeSource as PaymentMode | null | undefined) === "DIRECT" ? "DIRECT" : "ESCROW",
    direct_payment_disclaimer_accepted_at:
      row.direct_payment_disclaimer_accepted_at ??
      row.load_direct_payment_disclaimer_accepted_at ??
      null,
    direct_payment_disclaimer_version:
      row.direct_payment_disclaimer_version ??
      row.load_direct_payment_disclaimer_version ??
      null,
    truck_id: truckId,
    truck: truck,
  };
}

// Only treat truly active trips as blocking when assigning a truck.
const ACTIVE_TRIP_STATUS_VALUES: string[] = [
  mapTripStatusToDb(TripStatus.IN_PROGRESS).toLowerCase(),
  mapTripStatusToDb(TripStatus.DISPUTED).toLowerCase(),
  "in_progress",
];

const ACTIVE_TRIP_STATUS_VALUES_FOR_FREE_TRIAL: string[] = [
  mapTripStatusToDb(TripStatus.PENDING_ESCROW),
  mapTripStatusToDb(TripStatus.READY_TO_START),
  mapTripStatusToDb(TripStatus.IN_PROGRESS),
  mapTripStatusToDb(TripStatus.DELIVERED_AWAITING_CONFIRMATION),
  mapTripStatusToDb(TripStatus.DELIVERED_CONFIRMED),
  mapTripStatusToDb(TripStatus.DISPUTED),
  "planned",
  "assigned",
  "en_route",
  "pending_escrow",
  "ready_to_start",
  "delivered_awaiting_confirmation",
  "delivered_confirmed",
  "in_progress",
  "disputed",
].map((s) => s.toLowerCase());

function toNumericId(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

async function truckHasBlockingTrip(truckId: string | null, options: { ignoreTripId?: string } = {}) {
  const numericTruckId = toNumericId(truckId);
  if (numericTruckId === null) return false;
  const params: any[] = [numericTruckId, ACTIVE_TRIP_STATUS_VALUES];
  let clause = "";
  const numericTripId = toNumericId(options.ignoreTripId ?? null);
  if (numericTripId !== null) {
    clause = `AND id <> $${params.length + 1}`;
    params.push(numericTripId);
  }
  const result = await pool.query(
    `
      SELECT 1
      FROM trips
      WHERE truck_id = $1
        AND LOWER(status::text) = ANY($2)
        ${clause}
      LIMIT 1
    `,
    params
  );
  return (result.rowCount ?? 0) > 0;
}

async function truckHasActiveAvailability(
  truckId: string | null,
  options: { ignoreAvailabilityId?: string } = {}
) {
  const numericTruckId = toNumericId(truckId);
  if (numericTruckId === null) return false;
  const params: any[] = [numericTruckId];
  let clause = "";
  const numericAvailabilityId = toNumericId(options.ignoreAvailabilityId ?? null);
  if (numericAvailabilityId !== null) {
    clause = `AND id <> $2`;
    params.push(numericAvailabilityId);
  }
  const result = await pool.query(
    `
      SELECT 1
      FROM truck_availability
      WHERE truck_id = $1
        AND is_active = TRUE
        ${clause}
      LIMIT 1
    `,
    params
  );
  return (result.rowCount ?? 0) > 0;
}

async function ensureTruckAvailableForListing(
  truckId: string | null | undefined,
  haulerId: string,
  options: { ignoreAvailabilityId?: string } = {}
) {
  if (!truckId) {
    throw new Error("Select the specific truck you want to post.");
  }
  const ownsTruck = await vehicleBelongsToHauler(truckId, haulerId);
  if (!ownsTruck) {
    throw new Error("Truck not found for this hauler.");
  }
  if (await truckHasBlockingTrip(truckId)) {
    throw new Error("Truck is currently assigned to an active trip.");
  }
  if (await truckHasActiveAvailability(truckId, options)) {
    throw new Error("Truck already has an active availability listing.");
  }
}

async function ensureTruckAvailableForTrip(truckId: string | null) {
  if (!truckId) {
    throw new Error("Truck must be assigned before creating the trip.");
  }
  if (await truckHasBlockingTrip(truckId)) {
    throw new Error("Truck is already assigned to another active trip.");
  }
}

async function refreshTruckAvailabilityState(availabilityId: string) {
  const numericAvailabilityId = toNumericId(availabilityId);
  if (numericAvailabilityId === null) return;
  const availabilityResult = await pool.query(
    `
      SELECT
        id,
        truck_id::text,
        allow_shared,
        capacity_headcount,
        capacity_weight_kg,
        available_until,
        is_active
      FROM truck_availability
      WHERE id = $1
    `,
    [numericAvailabilityId]
  );
  const availability = availabilityResult.rows[0];
  if (!availability) {
    return;
  }

  let shouldStayActive = true;
  const now = Date.now();

  if (availability.available_until && new Date(availability.available_until).getTime() < now) {
    shouldStayActive = false;
  }

  if (shouldStayActive && (await truckHasBlockingTrip(availability.truck_id))) {
    shouldStayActive = false;
  }

  if (shouldStayActive) {
    const usage = await pool.query(
      `
        SELECT
          COALESCE(
            SUM(
              CASE WHEN status IN ($2,$3)
                THEN COALESCE(requested_headcount,0)
                ELSE 0
              END
            ),
            0
          )::numeric AS total_headcount,
          COALESCE(
            SUM(
              CASE WHEN status IN ($2,$3)
                THEN COALESCE(requested_weight_kg,0)
                ELSE 0
              END
            ),
            0
          )::numeric AS total_weight,
          COUNT(*) FILTER (WHERE status IN ($2,$3))::int AS active_count,
          COUNT(*) FILTER (WHERE status = $3)::int AS accepted_count
        FROM load_bookings
        WHERE truck_availability_id = $1
      `,
      [numericAvailabilityId, BookingStatus.REQUESTED, BookingStatus.ACCEPTED]
    );
    const usageRow = usage.rows[0] ?? {
      total_headcount: 0,
      total_weight: 0,
      active_count: 0,
      accepted_count: 0,
    };
    const usedHeadcount = Number(usageRow.total_headcount ?? 0);
    const usedWeight = Number(usageRow.total_weight ?? 0);
    const activeCount = Number(usageRow.active_count ?? 0);
    const acceptedCount = Number(usageRow.accepted_count ?? 0);

    if (!availability.allow_shared && activeCount > 0) {
      shouldStayActive = false;
    }
    if (acceptedCount > 0) {
      shouldStayActive = false;
    }
    if (
      availability.capacity_headcount !== null &&
      availability.capacity_headcount !== undefined &&
      usedHeadcount >= Number(availability.capacity_headcount)
    ) {
      shouldStayActive = false;
    }
    if (
      availability.capacity_weight_kg !== null &&
      availability.capacity_weight_kg !== undefined &&
      usedWeight >= Number(availability.capacity_weight_kg)
    ) {
      shouldStayActive = false;
    }
  }

  if (availability.is_active !== shouldStayActive) {
    await pool.query(
      `
        UPDATE truck_availability
        SET is_active = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [numericAvailabilityId, shouldStayActive]
    );
  }
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
    payment_mode:
      (row.payment_mode as PaymentMode | null | undefined) === "DIRECT" ? "DIRECT" : "ESCROW",
    direct_payment_disclaimer_accepted_at: row.direct_payment_disclaimer_accepted_at ?? null,
    direct_payment_disclaimer_version: row.direct_payment_disclaimer_version ?? null,
    created_by_user_id: row.created_by_user_id,
    updated_by_user_id: row.updated_by_user_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapContractRow(row: any): ContractRecord {
  return {
    id: row.id,
    load_id: row.load_id,
    offer_id: row.offer_id ?? null,
    booking_id: row.booking_id ?? null,
    shipper_id: row.shipper_id,
    hauler_id: row.hauler_id,
    status: (row.status as ContractStatus) ?? "DRAFT",
    price_amount: row.price_amount ?? null,
    price_type: row.price_type ?? null,
    payment_method: row.payment_method ?? null,
    payment_schedule: row.payment_schedule ?? null,
    contract_payload: row.contract_payload ?? {},
    sent_at: row.sent_at ?? null,
    accepted_at: row.accepted_at ?? null,
    rejected_at: row.rejected_at ?? null,
    locked_at: row.locked_at ?? null,
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
    chat_enabled_by_shipper: row.chat_enabled_by_shipper ?? null,
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

export function mapTripDirectPaymentRow(row: any): TripDirectPaymentRecord {
  return {
    id: String(row.id),
    trip_id: String(row.trip_id),
    received_amount: String(row.received_amount),
    received_payment_method:
      (row.received_payment_method as DirectPaymentMethod) ?? "OTHER",
    received_reference: row.received_reference ?? null,
    received_at: row.received_at,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
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
  truckId?: string | null;
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
             l.assigned_to_user_id::text AS assigned_to_user_id,
             l.is_external,
             l.payment_mode,
             l.direct_payment_disclaimer_accepted_at,
             l.direct_payment_disclaimer_version
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
  const { loadId, haulerId, createdByUserId, offeredAmount, currency, message, expiresAt, truckId } =
    input;

  if (!truckId) {
    throw new Error("Please add truck or route first.");
  }

  // Check if load already has a contract (if contract exists, load is already assigned)
  const hasContract = await pool.query(
    `
      SELECT 1
      FROM contracts
      WHERE load_id = $1
      LIMIT 1
    `,
    [loadId]
  );
  if (hasContract.rowCount && hasContract.rowCount > 0) {
    throw new Error("This load already has a contract. Only one hauler can be assigned to a load at a time.");
  }

  // Verify truck belongs to hauler
  const truckCheck = await pool.query(
    `SELECT id FROM trucks WHERE id = $1 AND hauler_id = $2`,
    [truckId, haulerId]
  );
  if (truckCheck.rowCount === 0) {
    throw new Error("Truck not found or does not belong to you");
  }

  const result = await pool.query<LoadOfferRecord>(
    `
      INSERT INTO load_offers (
        load_id,
        hauler_id,
        created_by_user_id,
        offered_amount,
        currency,
        message,
        expires_at,
        truck_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8
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
      truckId,
    ]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create load offer");
  }
  const hydrated = await getLoadOfferById(row.id);
  
  // If there's a message, create the first chat message from the hauler
  // Thread is created automatically via database trigger
  if (message && message.trim()) {
    try {
      // Get thread_id for this offer (created via trigger)
      const threadResult = await pool.query(
        "SELECT id FROM load_offer_threads WHERE offer_id = $1 LIMIT 1",
        [row.id]
      );
      
      const threadId = threadResult.rows[0]?.id ? Number(threadResult.rows[0].id) : null;
      
      if (threadId) {
        // Insert message directly (bypassing first message restriction since this is the application message)
        await pool.query(
          `
          INSERT INTO load_offer_messages (
            thread_id,
            offer_id,
            sender_user_id,
            sender_role,
            text,
            attachments
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            threadId,
            row.id,
            Number(createdByUserId),
            "hauler",
            message.trim(),
            JSON.stringify([]),
          ]
        );
        
        // Update thread: keep first_message_sent = FALSE until shipper responds
        // (Trigger sets it to TRUE, but we override it back to FALSE since this is the hauler's application message)
        await pool.query(
          "UPDATE load_offer_threads SET updated_at = NOW(), first_message_sent = FALSE WHERE id = $1",
          [threadId]
        );
      }
    } catch (err) {
      // Log error but don't fail the offer creation if message creation fails
      console.error("Failed to create initial offer message:", err);
    }
  }
  
  return hydrated ?? row;
}

export async function listLoadOffers(
  loadId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ items: LoadOfferRecord[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const itemsQuery = pool.query<LoadOfferRecord>(
    `
      SELECT lo.*,
             l.payment_mode                           AS load_payment_mode,
             l.direct_payment_disclaimer_accepted_at  AS load_direct_payment_disclaimer_accepted_at,
             l.direct_payment_disclaimer_version      AS load_direct_payment_disclaimer_version,
             t.id::text                               AS truck_id_from_truck,
             t.plate_number                           AS truck_plate_number,
             t.truck_type                             AS truck_truck_type,
             t.notes                                  AS truck_notes,
             t.capacity_weight_kg                     AS truck_capacity
      FROM load_offers lo
      JOIN loads l ON l.id = lo.load_id
      LEFT JOIN trucks t ON t.id = lo.truck_id
      WHERE lo.load_id = $1
      ORDER BY lo.created_at DESC
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
    items: itemsResult.rows.map(mapOfferRow),
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
  const updated = result.rows[0] ?? null;
  if (!updated) return null;
  const hydrated = await getLoadOfferById(updated.id);
  return hydrated ?? updated;
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
        capacity_weight_kg,
        allow_shared,
        notes,
        external_contact_email,
        external_contact_phone,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        is_active,
        is_external,
        post_link,
        created_at,
        updated_at
      FROM truck_availability
      WHERE id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapTruckAvailabilityRow(result.rows[0]) : null;
}

export async function listTruckAvailability(options: {
  haulerId?: string;
  originSearch?: string;
  near?: { lat: number; lng: number; radiusKm: number };
  limit?: number;
} = {}): Promise<TruckAvailabilityRecord[]> {
  const clauses = ["COALESCE(is_active, TRUE) = TRUE"];
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
  if (options.near) {
    const { lat, lng, radiusKm } = options.near;
    const clampedLat = Math.max(-90, Math.min(90, lat));
    const clampedLng = Math.max(-180, Math.min(180, lng));
    const latDelta = Math.min(radiusKm / 111, 180);
    const lngDenominator = Math.max(Math.cos((clampedLat * Math.PI) / 180), 0.0001);
    const lngDelta = Math.min(radiusKm / (111 * lngDenominator), 360);
    clauses.push(`origin_lat IS NOT NULL AND origin_lng IS NOT NULL`);
    clauses.push(`origin_lat BETWEEN $${idx++} AND $${idx++}`);
    params.push(clampedLat - latDelta, clampedLat + latDelta);
    clauses.push(`origin_lng BETWEEN $${idx++} AND $${idx++}`);
    params.push(clampedLng - lngDelta, clampedLng + lngDelta);
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
        capacity_weight_kg,
        allow_shared,
        notes,
        external_contact_email,
        external_contact_phone,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        is_active,
        is_external,
        post_link,
        created_at,
        updated_at
      FROM truck_availability
      WHERE ${clauses.join(" AND ")}
      ORDER BY created_at DESC
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
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
}

export async function createTruckAvailability(input: CreateTruckAvailabilityInput): Promise<TruckAvailabilityRecord> {
  if (!input.origin.trim()) {
    throw new Error("Origin is required");
  }
  const availableFromDate = new Date(input.availableFrom);
  if (Number.isNaN(availableFromDate.getTime())) {
    throw new Error("Available from must be a valid date.");
  }
  let availableUntilIso: string | null = null;
  if (input.availableUntil) {
    const untilDate = new Date(input.availableUntil);
    if (Number.isNaN(untilDate.getTime())) {
      throw new Error("Available until must be a valid date.");
    }
    if (untilDate.getTime() < availableFromDate.getTime()) {
      throw new Error("Available until must be after the start date.");
    }
    availableUntilIso = untilDate.toISOString();
  }
  const availableFromIso = availableFromDate.toISOString();
  const normalizedHeadcount =
    input.capacityHeadcount === undefined || input.capacityHeadcount === null
      ? null
      : Number(input.capacityHeadcount);
  if (normalizedHeadcount !== null && normalizedHeadcount <= 0) {
    throw new Error("Capacity headcount must be greater than zero.");
  }
  const normalizedWeight =
    input.capacityWeightKg === undefined || input.capacityWeightKg === null
      ? null
      : Number(input.capacityWeightKg);
  if (normalizedWeight !== null && normalizedWeight <= 0) {
    throw new Error("Capacity weight must be greater than zero.");
  }
  const originLatRaw = parseCoordinate("Origin latitude", input.originLat, -90, 90);
  const originLngRaw = parseCoordinate("Origin longitude", input.originLng, -180, 180);
  if (
    (originLatRaw !== undefined && originLngRaw === undefined) ||
    (originLngRaw !== undefined && originLatRaw === undefined)
  ) {
    throw new Error("Origin latitude and longitude must both be provided.");
  }
  const destinationLatRaw = parseCoordinate("Destination latitude", input.destinationLat, -90, 90);
  const destinationLngRaw = parseCoordinate("Destination longitude", input.destinationLng, -180, 180);
  if (
    (destinationLatRaw !== undefined && destinationLngRaw === undefined) ||
    (destinationLngRaw !== undefined && destinationLatRaw === undefined)
  ) {
    throw new Error("Destination latitude and longitude must both be provided.");
  }
  const originLat = originLatRaw === undefined ? null : originLatRaw;
  const originLng = originLngRaw === undefined ? null : originLngRaw;
  const destinationLat = destinationLatRaw === undefined ? null : destinationLatRaw;
  const destinationLng = destinationLngRaw === undefined ? null : destinationLngRaw;
  await ensureTruckAvailableForListing(input.truckId, input.haulerId);
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
    const bookingUsage = await pool.query(
      `
        SELECT
          COALESCE(SUM(COALESCE(lb.requested_headcount,0)),0)::int AS total_headcount,
          COALESCE(SUM(COALESCE(lb.requested_weight_kg,0)),0)::numeric AS total_weight,
          COUNT(*)::int AS active_count
        FROM load_bookings lb
        JOIN truck_availability ta ON ta.id = lb.truck_availability_id
        WHERE ta.truck_id = $1
          AND ta.is_active = TRUE
          AND lb.status IN ($2,$3)
      `,
      [input.truckId, BookingStatus.REQUESTED, BookingStatus.ACCEPTED]
    );
    const usedHeadcount = Number(bookingUsage.rows[0]?.total_headcount ?? 0);
    const usedWeight = Number(bookingUsage.rows[0]?.total_weight ?? 0);
    const bookingCount = Number(bookingUsage.rows[0]?.active_count ?? 0);
    if (normalizedHeadcount !== null && usedHeadcount > normalizedHeadcount) {
      throw new Error("Existing bookings already exceed the headcount capacity for this truck.");
    }
    if (normalizedWeight !== null && usedWeight > normalizedWeight) {
      throw new Error("Existing bookings already exceed the weight capacity for this truck.");
    }
    if ((input.allowShared ?? true) === false && bookingCount > 0) {
      throw new Error("This truck already has active bookings and cannot be marked exclusive.");
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
        notes,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        is_active
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
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
        capacity_weight_kg,
        allow_shared,
        notes,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        is_active,
        created_at,
        updated_at
    `,
    [
      input.haulerId,
      input.truckId ?? null,
      input.origin,
      input.destination ?? null,
      availableFromIso,
      availableUntilIso,
      normalizedHeadcount,
      normalizedWeight,
      input.allowShared ?? true,
      input.notes ?? null,
      originLat,
      originLng,
      destinationLat,
      destinationLng,
      true,
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
  const availabilityResult = await pool.query(
    `
      SELECT
        hauler_id::text AS hauler_id,
        truck_id::text AS truck_id,
        available_from,
        available_until
      FROM truck_availability
      WHERE id = $1
    `,
    [id]
  );
  const existingAvailability = availabilityResult.rows[0];
  if (!existingAvailability) {
    return null;
  }
  const sets: string[] = [];
  const values: any[] = [];
  const normalizedHeadcount =
    patch.capacityHeadcount === undefined
      ? undefined
      : patch.capacityHeadcount === null
      ? null
      : Number(patch.capacityHeadcount);
  if (normalizedHeadcount !== undefined && normalizedHeadcount !== null && normalizedHeadcount <= 0) {
    throw new Error("Capacity headcount must be greater than zero.");
  }
  const normalizedWeight =
    patch.capacityWeightKg === undefined
      ? undefined
      : patch.capacityWeightKg === null
      ? null
      : Number(patch.capacityWeightKg);
  if (normalizedWeight !== undefined && normalizedWeight !== null && normalizedWeight <= 0) {
    throw new Error("Capacity weight must be greater than zero.");
  }
  const originLatRaw = parseCoordinate("Origin latitude", patch.originLat, -90, 90);
  const originLngRaw = parseCoordinate("Origin longitude", patch.originLng, -180, 180);
  if (
    (patch.originLat !== undefined && patch.originLng === undefined) ||
    (patch.originLng !== undefined && patch.originLat === undefined)
  ) {
    throw new Error("Origin latitude and longitude must both be provided.");
  }
  const destinationLatRaw = parseCoordinate("Destination latitude", patch.destinationLat, -90, 90);
  const destinationLngRaw = parseCoordinate("Destination longitude", patch.destinationLng, -180, 180);
  if (
    (patch.destinationLat !== undefined && patch.destinationLng === undefined) ||
    (patch.destinationLng !== undefined && patch.destinationLat === undefined)
  ) {
    throw new Error("Destination latitude and longitude must both be provided.");
  }
  let nextAvailableFromIso =
    existingAvailability.available_from instanceof Date
      ? existingAvailability.available_from.toISOString()
      : existingAvailability.available_from ?? null;
  if (patch.availableFrom !== undefined) {
    const parsed = new Date(patch.availableFrom);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Available from must be a valid date.");
    }
    nextAvailableFromIso = parsed.toISOString();
    sets.push(`available_from = $${sets.length + 2}`);
    values.push(nextAvailableFromIso);
  }
  if (patch.availableUntil !== undefined) {
    let normalized: string | null = null;
    if (patch.availableUntil !== null) {
      const parsed = new Date(patch.availableUntil);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("Available until must be a valid date.");
      }
      if (nextAvailableFromIso && new Date(nextAvailableFromIso).getTime() > parsed.getTime()) {
        throw new Error("Available until must be after the start date.");
      }
      normalized = parsed.toISOString();
    }
    sets.push(`available_until = $${sets.length + 2}`);
    values.push(normalized);
  }
  if (patch.origin !== undefined) {
    sets.push(`origin_location_text = $${sets.length + 2}`);
    values.push(patch.origin);
  }
  if (patch.destination !== undefined) {
    sets.push(`destination_location_text = $${sets.length + 2}`);
    values.push(patch.destination);
  }
  if (patch.capacityHeadcount !== undefined) {
    sets.push(`capacity_headcount = $${sets.length + 2}`);
    values.push(normalizedHeadcount);
  }
  if (patch.capacityWeightKg !== undefined) {
    sets.push(`capacity_weight_kg = $${sets.length + 2}`);
    values.push(normalizedWeight);
  }
  if (patch.allowShared !== undefined) {
    sets.push(`allow_shared = $${sets.length + 2}`);
    values.push(patch.allowShared);
  }
  if (patch.truckId !== undefined) {
    if (patch.truckId === null) {
      throw new Error("Truck must be specified.");
    }
    if (patch.truckId !== existingAvailability.truck_id) {
      await ensureTruckAvailableForListing(patch.truckId, existingAvailability.hauler_id, {
        ignoreAvailabilityId: id,
      });
    }
    sets.push(`truck_id = $${sets.length + 2}`);
    values.push(patch.truckId);
  }
  if (patch.notes !== undefined) {
    sets.push(`notes = $${sets.length + 2}`);
    values.push(patch.notes);
  }
  if (patch.originLat !== undefined) {
    const normalized = originLatRaw ?? null;
    sets.push(`origin_lat = $${sets.length + 2}`);
    values.push(normalized);
  }
  if (patch.originLng !== undefined) {
    const normalized = originLngRaw ?? null;
    sets.push(`origin_lng = $${sets.length + 2}`);
    values.push(normalized);
  }
  if (patch.destinationLat !== undefined) {
    const normalized = destinationLatRaw ?? null;
    sets.push(`destination_lat = $${sets.length + 2}`);
    values.push(normalized);
  }
  if (patch.destinationLng !== undefined) {
    const normalized = destinationLngRaw ?? null;
    sets.push(`destination_lng = $${sets.length + 2}`);
    values.push(normalized);
  }
  if (patch.isActive === true) {
    await ensureTruckAvailableForListing(
      patch.truckId ?? existingAvailability.truck_id,
      existingAvailability.hauler_id,
      { ignoreAvailabilityId: id }
    );
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
        capacity_weight_kg,
        allow_shared,
        notes,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        is_active,
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
        chat_enabled_by_shipper,
        created_at,
        updated_at
      FROM truck_availability_chats
      WHERE id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapTruckChatRow(result.rows[0]) : null;
}

export async function updateTruckChatPermissions(
  chatId: string,
  patch: { chatEnabledByShipper?: boolean }
): Promise<TruckChatRecord | null> {
  const sets: string[] = [];
  const values: any[] = [];
  if (patch.chatEnabledByShipper !== undefined) {
    sets.push(`chat_enabled_by_shipper = $${values.length + 2}`);
    values.push(patch.chatEnabledByShipper);
  }
  if (sets.length === 0) {
    return getTruckChatById(chatId);
  }
  sets.push(`updated_at = NOW()`);
  const result = await pool.query(
    `
      UPDATE truck_availability_chats
      SET ${sets.join(", ")}
      WHERE id = $1
      RETURNING *
    `,
    [chatId, ...values]
  );
  const row = result.rows[0];
  return row ? mapTruckChatRow(row) : null;
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
        chat_enabled_by_shipper,
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
        created_by_user_id,
        chat_enabled_by_shipper
      )
      VALUES (
        $1,$2,$3,$4,$5
      )
      RETURNING
        id::text,
        truck_availability_id::text,
        shipper_id::text,
        load_id::text,
        status::text,
        created_by_user_id::text,
        chat_enabled_by_shipper,
        created_at,
        updated_at
    `,
    [
      params.availabilityId,
      params.shipperId,
      params.loadId ?? null,
      params.createdByUserId,
      false,
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

function mapSummaryRow(row: any): TruckChatSummary {
  const chat = mapTruckChatRow(row);
  const booking =
    row.booking_id
      ? {
          id: String(row.booking_id),
          status: row.booking_status ?? null,
          offered_amount:
            row.booking_offered_amount === null || row.booking_offered_amount === undefined
              ? null
              : Number(row.booking_offered_amount),
          offered_currency: row.booking_offered_currency ?? null,
          hauler_id: row.booking_hauler_id ? String(row.booking_hauler_id) : null,
        }
      : null;
  let lastMessage: TruckChatMessageRecord | null = null;
  if (row.last_message_id) {
    lastMessage = mapTruckChatMessageRow({
      id: row.last_message_id,
      chat_id: chat.id,
      sender_user_id: row.last_message_sender_user_id,
      sender_role: row.last_message_sender_role,
      message: row.last_message_text,
      attachments: row.last_message_attachments,
      created_at: row.last_message_created_at,
    });
  }
  return {
    chat,
    availability: {
      origin_location_text: row.origin_location_text,
      destination_location_text: row.destination_location_text ?? null,
      capacity_headcount:
        row.capacity_headcount === null || row.capacity_headcount === undefined
          ? null
          : Number(row.capacity_headcount),
    },
    booking,
    last_message: lastMessage,
  };
}

export async function listTruckChatsForHauler(haulerId: string): Promise<TruckChatSummary[]> {
  const result = await pool.query(
    `
      SELECT
        c.id::text,
        c.truck_availability_id::text,
        c.shipper_id::text,
        c.load_id::text,
        c.status::text,
        c.created_by_user_id::text,
        c.chat_enabled_by_shipper,
        c.created_at,
        c.updated_at,
        ta.origin_location_text,
        ta.destination_location_text,
        ta.capacity_headcount,
        lb.id::text AS booking_id,
        lb.status AS booking_status,
        lb.offered_amount AS booking_offered_amount,
        lb.offered_currency AS booking_offered_currency,
        lb.hauler_id::text AS booking_hauler_id,
        lm.id::text AS last_message_id,
        lm.sender_user_id::text AS last_message_sender_user_id,
        lm.sender_role AS last_message_sender_role,
        lm.message AS last_message_text,
        lm.attachments AS last_message_attachments,
        lm.created_at AS last_message_created_at
      FROM truck_availability_chats c
      JOIN truck_availability ta ON ta.id = c.truck_availability_id
      LEFT JOIN LATERAL (
        SELECT
          b.id,
          b.status,
          b.offered_amount,
          b.offered_currency,
          b.hauler_id
        FROM load_bookings b
        WHERE b.truck_availability_id = c.truck_availability_id
          AND b.load_id = c.load_id
          AND b.hauler_id = $1
        ORDER BY b.created_at DESC
        LIMIT 1
      ) lb ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          m.id::text,
          m.sender_user_id::text,
          m.sender_role,
          m.message,
          m.attachments,
          m.created_at
        FROM truck_availability_messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON TRUE
      WHERE ta.hauler_id = $1
      ORDER BY c.updated_at DESC
      LIMIT 100
    `,
    [haulerId]
  );
  return result.rows.map(mapSummaryRow);
}

export async function listTruckChatsForShipper(shipperId: string): Promise<TruckChatSummary[]> {
  const result = await pool.query(
    `
      SELECT
        c.id::text,
        c.truck_availability_id::text,
        c.shipper_id::text,
        c.load_id::text,
        c.status::text,
        c.created_by_user_id::text,
        c.chat_enabled_by_shipper,
        c.created_at,
        c.updated_at,
        ta.origin_location_text,
        ta.destination_location_text,
        ta.capacity_headcount,
        lb.id::text AS booking_id,
        lb.status AS booking_status,
        lb.offered_amount AS booking_offered_amount,
        lb.offered_currency AS booking_offered_currency,
        lb.hauler_id::text AS booking_hauler_id,
        lm.id::text AS last_message_id,
        lm.sender_user_id::text AS last_message_sender_user_id,
        lm.sender_role AS last_message_sender_role,
        lm.message AS last_message_text,
        lm.attachments AS last_message_attachments,
        lm.created_at AS last_message_created_at
      FROM truck_availability_chats c
      JOIN truck_availability ta ON ta.id = c.truck_availability_id
      LEFT JOIN LATERAL (
        SELECT
          b.id,
          b.status,
          b.offered_amount,
          b.offered_currency,
          b.hauler_id
        FROM load_bookings b
        WHERE b.truck_availability_id = c.truck_availability_id
          AND b.load_id = c.load_id
          AND b.shipper_id = $1
        ORDER BY b.created_at DESC
        LIMIT 1
      ) lb ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          m.id::text,
          m.sender_user_id::text,
          m.sender_role,
          m.message,
          m.attachments,
          m.created_at
        FROM truck_availability_messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON TRUE
      WHERE c.shipper_id = $1
      ORDER BY c.updated_at DESC
      LIMIT 100
    `,
    [shipperId]
  );
  return result.rows.map(mapSummaryRow);
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

async function loadHasAcceptedContract(loadId: string): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM contracts
      WHERE load_id = $1
        AND status IN ('ACCEPTED', 'LOCKED')
      LIMIT 1
    `,
    [loadId]
  );
  return (result.rowCount ?? 0) > 0;
}

function ensureNumeric(value: any): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num;
}

function parseCoordinate(
  label: string,
  value: number | string | null | undefined,
  min: number,
  max: number
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`${label} must be a valid number.`);
  }
  if (num < min || num > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
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
  // Check if load has an accepted/locked contract - if so, no more bookings allowed
  if (await loadHasAcceptedContract(offer.load_id)) {
    throw new Error("This load already has an accepted contract. No new bookings can be created.");
  }
  const requestedHeadcount = ensureNumeric(loadDetails.animal_count);
  const requestedWeight = ensureNumeric(loadDetails.estimated_weight_kg);
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
        created_by_user_id,
        payment_mode,
        direct_payment_disclaimer_accepted_at,
        direct_payment_disclaimer_version
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )
      RETURNING *
    `,
    [
      offer.load_id,
      offer.hauler_id,
      load.shipper_id,
      offer.id,
      requestedHeadcount,
      requestedWeight,
      offer.offered_amount,
      offer.currency,
      BookingStatus.REQUESTED,
      params.notes ?? null,
      params.shipperUserId,
      load.payment_mode ?? "ESCROW",
      load.direct_payment_disclaimer_accepted_at ?? null,
      load.direct_payment_disclaimer_version ?? null,
    ]
  );
  return mapBookingRow(insert.rows[0]);
}

async function ensureTruckCapacity(
  availability: TruckAvailabilityRecord,
  requestedHeadcount: number | null,
  requestedWeightKg: number | null
) {
  const needsHeadcountCheck =
    requestedHeadcount !== null &&
    requestedHeadcount !== undefined &&
    availability.capacity_headcount !== null &&
    availability.capacity_headcount !== undefined;
  const needsWeightCheck =
    requestedWeightKg !== null &&
    requestedWeightKg !== undefined &&
    availability.capacity_weight_kg !== null &&
    availability.capacity_weight_kg !== undefined;
  if (!availability.allow_shared || needsHeadcountCheck || needsWeightCheck) {
    const current = await pool.query(
      `
        SELECT
          COALESCE(SUM(COALESCE(requested_headcount,0)),0)::int AS total_headcount,
          COALESCE(SUM(COALESCE(requested_weight_kg,0)),0)::numeric AS total_weight,
          COUNT(*)::int AS active_count
        FROM load_bookings
        WHERE truck_availability_id = $1
          AND status IN ($2,$3)
      `,
      [availability.id, BookingStatus.REQUESTED, BookingStatus.ACCEPTED]
    );
    const usedHeadcount = Number(current.rows[0]?.total_headcount ?? 0);
    const usedWeight = Number(current.rows[0]?.total_weight ?? 0);
    const activeCount = Number(current.rows[0]?.active_count ?? 0);
    if (!availability.allow_shared && activeCount > 0) {
      throw new Error("This truck is exclusive and already has a pending booking.");
    }
    if (needsHeadcountCheck) {
      const headcountToAdd = Number(requestedHeadcount ?? 0);
      if (usedHeadcount + headcountToAdd > Number(availability.capacity_headcount)) {
        throw new Error("Truck does not have enough remaining headcount capacity.");
      }
    }
    if (needsWeightCheck) {
      const weightToAdd = Number(requestedWeightKg ?? 0);
      if (usedWeight + weightToAdd > Number(availability.capacity_weight_kg)) {
        throw new Error("Truck does not have enough remaining weight capacity.");
      }
    }
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
  if (!availability.is_active) {
    throw new Error("This truck listing is no longer active.");
  }
  if (!availability.truck_id) {
    throw new Error(
      "Hauler must attach a specific truck to this listing before bookings can be requested."
    );
  }
  await ensureTruckAvailableForTrip(availability.truck_id);
  // Check if load has an accepted/locked contract - if so, no more bookings allowed
  if (await loadHasAcceptedContract(params.loadId)) {
    throw new Error("This load already has an accepted contract. No new bookings can be created.");
  }
  let loadDetails: Awaited<ReturnType<typeof getLoadDetails>> | null = null;
  async function ensureLoadDetailsFetched() {
    if (!loadDetails) {
      loadDetails = await getLoadDetails(params.loadId);
      if (!loadDetails) {
        throw new Error("Load not found.");
      }
    }
    return loadDetails;
  }
  let requestedHeadcount = params.requestedHeadcount ?? null;
  if (requestedHeadcount === null || requestedHeadcount === undefined) {
    const details = await ensureLoadDetailsFetched();
    requestedHeadcount = ensureNumeric(details?.animal_count);
  }
  let requestedWeight = params.requestedWeightKg ?? null;
  if (requestedWeight === null || requestedWeight === undefined) {
    const details = await ensureLoadDetailsFetched();
    requestedWeight = ensureNumeric(details?.estimated_weight_kg);
  }
  await ensureTruckCapacity(availability, requestedHeadcount ?? null, requestedWeight ?? null);
  const load = await getLoadById(params.loadId);
  if (!load) throw new Error("Load not found");
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
        created_by_user_id,
        payment_mode,
        direct_payment_disclaimer_accepted_at,
        direct_payment_disclaimer_version
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )
      RETURNING *
    `,
    [
      params.loadId,
      availability.hauler_id,
      params.shipperId,
      params.truckAvailabilityId,
      requestedHeadcount,
      requestedWeight,
      params.offeredAmount ?? null,
      params.offeredCurrency ?? "USD",
      BookingStatus.REQUESTED,
      params.notes ?? null,
      params.shipperUserId,
      load.payment_mode ?? "ESCROW",
      load.direct_payment_disclaimer_accepted_at ?? null,
      load.direct_payment_disclaimer_version ?? null,
    ]
  );
  const bookingRow = mapBookingRow(insert.rows[0]);
  await refreshTruckAvailabilityState(params.truckAvailabilityId);
  
  // If there are notes, create the first chat message from the shipper
  // Thread is created automatically via database trigger
  if (params.notes && params.notes.trim()) {
    try {
      // Get thread for this booking (created via trigger)
      const threadQuery = await pool.query(
        `SELECT id FROM truck_booking_threads WHERE booking_id = $1 LIMIT 1`,
        [bookingRow.id]
      );
      
      const threadId = threadQuery.rows[0]?.id ? Number(threadQuery.rows[0].id) : null;
      
      if (threadId) {
        // Insert message directly (bypassing first message restriction since this is the application message)
        await pool.query(
          `
          INSERT INTO truck_booking_messages (
            thread_id,
            booking_id,
            sender_user_id,
            sender_role,
            text,
            attachments
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            threadId,
            bookingRow.id,
            Number(params.shipperUserId),
            "shipper",
            params.notes.trim(),
            JSON.stringify([]),
          ]
        );
        
        // Update thread: keep first_message_sent = FALSE until hauler responds
        // (Trigger sets it to TRUE, but we override it back to FALSE since this is the shipper's application message)
        await pool.query(
          "UPDATE truck_booking_threads SET updated_at = NOW(), first_message_sent = FALSE WHERE id = $1",
          [threadId]
        );
      }
    } catch (err) {
      // Log error but don't fail the booking creation if message creation fails
      console.error("Failed to create initial booking message:", err);
    }
  }
  
  return bookingRow;
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

export async function getContractById(id: string): Promise<ContractRecord | null> {
  const result = await pool.query(`SELECT * FROM contracts WHERE id = $1`, [id]);
  return result.rows[0] ? mapContractRow(result.rows[0]) : null;
}

export async function getContractByOfferId(offerId: string): Promise<ContractRecord | null> {
  const result = await pool.query(
    `SELECT * FROM contracts WHERE offer_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [offerId]
  );
  return result.rows[0] ? mapContractRow(result.rows[0]) : null;
}

export async function listContractsForShipper(
  shipperId: string,
  filters: { loadId?: string; offerId?: string; bookingId?: string; status?: ContractStatus } = {}
): Promise<ContractRecord[]> {
  const clauses: string[] = ["shipper_id = $1"];
  const values: Array<string | null> = [shipperId];
  let idx = 2;
  if (filters.loadId) {
    clauses.push(`load_id = $${idx++}`);
    values.push(filters.loadId);
  }
  if (filters.offerId) {
    clauses.push(`offer_id = $${idx++}`);
    values.push(filters.offerId);
  }
  if (filters.bookingId) {
    clauses.push(`booking_id = $${idx++}`);
    values.push(filters.bookingId);
  }
  if (filters.status) {
    clauses.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  const result = await pool.query(
    `SELECT * FROM contracts WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC`,
    values
  );
  return result.rows.map(mapContractRow);
}

export async function listContractsForHauler(
  haulerId: string,
  filters: { loadId?: string; offerId?: string; bookingId?: string; status?: ContractStatus } = {}
): Promise<ContractRecord[]> {
  const clauses: string[] = ["hauler_id = $1"];
  const values: Array<string | null> = [haulerId];
  let idx = 2;
  if (filters.loadId) {
    clauses.push(`load_id = $${idx++}`);
    values.push(filters.loadId);
  }
  if (filters.offerId) {
    clauses.push(`offer_id = $${idx++}`);
    values.push(filters.offerId);
  }
  if (filters.bookingId) {
    clauses.push(`booking_id = $${idx++}`);
    values.push(filters.bookingId);
  }
  if (filters.status) {
    clauses.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  const result = await pool.query(
    `SELECT * FROM contracts WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC`,
    values
  );
  return result.rows.map(mapContractRow);
}

export async function listContractsForHaulerByTruckAvailability(
  haulerId: string,
  truckAvailabilityId?: string
): Promise<Array<ContractRecord & { booking_truck_availability_id: string | null }>> {
  let query = `
    SELECT 
      c.*,
      lb.truck_availability_id::text AS booking_truck_availability_id
    FROM contracts c
    LEFT JOIN load_bookings lb ON lb.id = c.booking_id
    WHERE c.hauler_id = $1
      AND c.status IN ('ACCEPTED', 'LOCKED')
  `;
  const values: Array<string> = [haulerId];
  if (truckAvailabilityId) {
    query += ` AND lb.truck_availability_id = $2`;
    values.push(truckAvailabilityId);
  }
  query += ` ORDER BY c.created_at DESC`;
  const result = await pool.query(query, values);
  return result.rows.map((row) => ({
    ...mapContractRow(row),
    booking_truck_availability_id: row.booking_truck_availability_id ?? null,
  }));
}

type ShipperTripRow = {
  id: string;
  load_id: string;
  hauler_id: string | null;
  truck_id: string | null;
  driver_id: string | null;
  status: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  delivered_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  load_shipper_id: string;
  load_species: string | null;
  load_animal_count: number | null;
  load_pickup_location_text: string | null;
  load_dropoff_location_text: string | null;
  load_price_offer_amount: string | null;
  load_price_currency: string | null;
  load_pickup_window_start: string | null;
  load_pickup_window_end: string | null;
  load_delivery_window_start: string | null;
  load_delivery_window_end: string | null;
  load_pickup_lat: string | number | null;
  load_pickup_lng: string | number | null;
  load_dropoff_lat: string | number | null;
  load_dropoff_lng: string | number | null;
  load_payment_mode: string | null;
  load_direct_payment_disclaimer_accepted_at: string | null;
  load_direct_payment_disclaimer_version: string | null;
  contract_id: string | null;
  contract_offer_id: string | null;
  contract_booking_id: string | null;
  contract_shipper_id: string | null;
  contract_hauler_id: string | null;
  contract_status: string | null;
  contract_price_amount: string | null;
  contract_price_type: string | null;
  contract_payment_method: string | null;
  contract_payment_schedule: string | null;
  contract_payload: Record<string, unknown> | null;
  contract_sent_at: string | null;
  contract_accepted_at: string | null;
  contract_rejected_at: string | null;
  contract_locked_at: string | null;
  contract_created_by_user_id: string | null;
  contract_updated_by_user_id: string | null;
  contract_created_at: string | null;
  contract_updated_at: string | null;
  hauler_name: string | null;
  hauler_phone: string | null;
  shipper_name: string | null;
  shipper_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  truck_plate_number: string | null;
  truck_type: string | null;
  payment_status: string | null;
  route_plan_id: string | null;
  latest_lat: string | number | null;
  latest_lng: string | number | null;
  latest_recorded_at: string | null;
};

export async function listTripsForShipper(shipperId: string): Promise<ShipperTripSummary[]> {
  const result = await pool.query<ShipperTripRow>(
    `
      SELECT
        t.id,
        t.load_id,
        t.hauler_id,
        t.truck_id,
        t.driver_id,
        t.status,
        t.actual_start_time,
        t.actual_end_time,
        t.delivered_confirmed_at,
        t.created_at,
        t.updated_at,
        l.shipper_id::text AS load_shipper_id,
        l.species AS load_species,
        l.animal_count AS load_animal_count,
        l.pickup_location_text AS load_pickup_location_text,
        l.dropoff_location_text AS load_dropoff_location_text,
        l.price_offer_amount::text AS load_price_offer_amount,
        l.price_currency AS load_price_currency,
        l.pickup_window_start AS load_pickup_window_start,
        l.pickup_window_end AS load_pickup_window_end,
        l.delivery_window_start AS load_delivery_window_start,
        l.delivery_window_end AS load_delivery_window_end,
        l.pickup_lat AS load_pickup_lat,
        l.pickup_lng AS load_pickup_lng,
        l.dropoff_lat AS load_dropoff_lat,
        l.dropoff_lng AS load_dropoff_lng,
        l.payment_mode AS load_payment_mode,
        l.direct_payment_disclaimer_accepted_at AS load_direct_payment_disclaimer_accepted_at,
        l.direct_payment_disclaimer_version AS load_direct_payment_disclaimer_version,
        c.id AS contract_id,
        c.offer_id AS contract_offer_id,
        c.booking_id AS contract_booking_id,
        c.shipper_id::text AS contract_shipper_id,
        c.hauler_id::text AS contract_hauler_id,
        c.status AS contract_status,
        c.price_amount::text AS contract_price_amount,
        c.price_type AS contract_price_type,
        c.payment_method AS contract_payment_method,
        c.payment_schedule AS contract_payment_schedule,
        c.contract_payload AS contract_payload,
        c.sent_at AS contract_sent_at,
        c.accepted_at AS contract_accepted_at,
        c.rejected_at AS contract_rejected_at,
        c.locked_at AS contract_locked_at,
        c.created_by_user_id::text AS contract_created_by_user_id,
        c.updated_by_user_id::text AS contract_updated_by_user_id,
        c.created_at AS contract_created_at,
        c.updated_at AS contract_updated_at,
        hu.full_name AS hauler_name,
        hu.phone_number AS hauler_phone,
        su.full_name AS shipper_name,
        su.phone_number AS shipper_phone,
        d.full_name AS driver_name,
        d.phone_number AS driver_phone,
        tr.plate_number AS truck_plate_number,
        tr.truck_type AS truck_type,
        pay.status AS payment_status,
        trp.id AS route_plan_id,
        loc.latitude AS latest_lat,
        loc.longitude AS latest_lng,
        loc.recorded_at AS latest_recorded_at
      FROM trips t
      JOIN loads l ON l.id = t.load_id
      LEFT JOIN shippers s ON s.id = $1
      LEFT JOIN app_users su ON su.id = s.user_id
      LEFT JOIN haulers h ON h.id = t.hauler_id
      LEFT JOIN app_users hu ON hu.id = h.user_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      LEFT JOIN trucks tr ON tr.id = t.truck_id
      LEFT JOIN LATERAL (
        SELECT status
        FROM payments p
        WHERE p.trip_id = t.id
        ORDER BY p.created_at DESC
        LIMIT 1
      ) pay ON true
      LEFT JOIN LATERAL (
        SELECT id
        FROM trip_route_plans trp
        WHERE trp.trip_id = t.id
        ORDER BY trp.created_at DESC
        LIMIT 1
      ) trp ON true
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, recorded_at
        FROM trip_locations
        WHERE trip_id = t.id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) loc ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM contracts c
        WHERE (
          c.load_id = l.id
          OR EXISTS (
            SELECT 1
            FROM trip_loads tl
            WHERE tl.trip_id = t.id
              AND tl.load_id = c.load_id
          )
        )
          AND c.status IN ('ACCEPTED', 'LOCKED')
          AND (
            c.shipper_id = $1
            OR EXISTS (
              SELECT 1
              FROM trip_loads tl2
              JOIN loads l3 ON l3.id = tl2.load_id
              WHERE tl2.trip_id = t.id
                AND tl2.load_id = c.load_id
                AND l3.shipper_id = $1
            )
          )
        ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
        LIMIT 1
      ) c ON true
      WHERE (
        l.shipper_id = $1
        OR EXISTS (
          SELECT 1
          FROM trip_loads tl
          JOIN loads l2 ON l2.id = tl.load_id
          WHERE tl.trip_id = t.id
            AND l2.shipper_id = $1
        )
      )
        AND c.id IS NOT NULL
        AND UPPER(t.status::text) IN (
          'PENDING_ESCROW',
          'READY_TO_START',
          'IN_PROGRESS',
          'DELIVERED_AWAITING_CONFIRMATION',
          'DELIVERED_CONFIRMED',
          'DISPUTED',
          'CLOSED'
        )
      ORDER BY t.created_at DESC
    `,
    [shipperId]
  );

  return result.rows.map((row) => {
    const trip = mapTripRow({
      id: row.id,
      load_id: row.load_id,
      hauler_id: row.hauler_id,
      driver_id: row.driver_id,
      truck_id: row.truck_id,
      status: row.status,
      payment_mode: null,
      load_payment_mode: row.load_payment_mode,
      direct_payment_disclaimer_accepted_at: null,
      load_direct_payment_disclaimer_accepted_at: row.load_direct_payment_disclaimer_accepted_at,
      direct_payment_disclaimer_version: null,
      load_direct_payment_disclaimer_version: row.load_direct_payment_disclaimer_version,
      actual_start_time: row.actual_start_time,
      actual_end_time: row.actual_end_time,
      delivered_confirmed_at: row.delivered_confirmed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });

    const contract: ContractRecord | null = row.contract_id
      ? {
          id: row.contract_id,
          load_id: row.load_id,
          offer_id: row.contract_offer_id,
          booking_id: row.contract_booking_id,
          shipper_id: row.contract_shipper_id ?? row.load_shipper_id,
          hauler_id: row.contract_hauler_id ?? row.hauler_id ?? "",
          status: (row.contract_status as ContractStatus) ?? "ACCEPTED",
          price_amount: row.contract_price_amount,
          price_type: row.contract_price_type,
          payment_method: row.contract_payment_method,
          payment_schedule: row.contract_payment_schedule,
          contract_payload: row.contract_payload ?? {},
          sent_at: row.contract_sent_at,
          accepted_at: row.contract_accepted_at,
          rejected_at: row.contract_rejected_at,
          locked_at: row.contract_locked_at,
          created_by_user_id: row.contract_created_by_user_id ?? "",
          updated_by_user_id: row.contract_updated_by_user_id ?? null,
          created_at: row.contract_created_at ?? row.created_at,
          updated_at: row.contract_updated_at ?? row.updated_at,
        }
      : null;

    return {
      trip,
      load: {
        id: row.load_id,
        shipper_id: row.load_shipper_id,
        species: row.load_species,
        animal_count:
          row.load_animal_count === null || row.load_animal_count === undefined
            ? null
            : Number(row.load_animal_count),
        pickup_location_text: row.load_pickup_location_text,
        dropoff_location_text: row.load_dropoff_location_text,
        price_offer_amount: row.load_price_offer_amount,
        price_currency: row.load_price_currency,
        pickup_window_start: row.load_pickup_window_start,
        pickup_window_end: row.load_pickup_window_end,
        delivery_window_start: row.load_delivery_window_start,
        delivery_window_end: row.load_delivery_window_end,
        pickup_lat:
          row.load_pickup_lat === null || row.load_pickup_lat === undefined
            ? null
            : Number(row.load_pickup_lat),
        pickup_lng:
          row.load_pickup_lng === null || row.load_pickup_lng === undefined
            ? null
            : Number(row.load_pickup_lng),
        dropoff_lat:
          row.load_dropoff_lat === null || row.load_dropoff_lat === undefined
            ? null
            : Number(row.load_dropoff_lat),
        dropoff_lng:
          row.load_dropoff_lng === null || row.load_dropoff_lng === undefined
            ? null
            : Number(row.load_dropoff_lng),
      },
      contract,
      hauler: row.hauler_id
        ? { id: row.hauler_id, name: row.hauler_name, phone: row.hauler_phone }
        : null,
      shipper: { id: shipperId, name: row.shipper_name, phone: row.shipper_phone },
      driver: row.driver_id
        ? { id: row.driver_id, name: row.driver_name, phone: row.driver_phone }
        : null,
      truck: row.truck_id
        ? {
            id: row.truck_id,
            plate_number: row.truck_plate_number,
            truck_type: row.truck_type,
          }
        : null,
      payment_status: row.payment_status,
      route_plan_id: row.route_plan_id ? String(row.route_plan_id) : null,
      latest_location:
        row.latest_lat !== null && row.latest_lat !== undefined &&
        row.latest_lng !== null && row.latest_lng !== undefined &&
        row.latest_recorded_at
          ? {
              lat: Number(row.latest_lat),
              lng: Number(row.latest_lng),
              recorded_at: row.latest_recorded_at,
            }
          : null,
    };
  });
}

export async function listTripsForHauler(haulerId: string): Promise<HaulerTripSummary[]> {
  // Only show actual trips, not confirmed contracts without trips
  const result = await pool.query<ShipperTripRow>(
    `
      SELECT
          t.id::text,
          t.load_id::text,
          t.hauler_id::text,
          COALESCE(t.truck_id::text, NULL::text) AS truck_id,
          COALESCE(t.driver_id::text, NULL::text) AS driver_id,
          COALESCE(t.truck_availability_id::text, NULL::text) AS truck_availability_id,
          t.status,
          t.actual_start_time,
          t.actual_end_time,
          t.delivered_confirmed_at,
          t.created_at,
          t.updated_at,
          l.shipper_id::text AS load_shipper_id,
          l.species AS load_species,
          l.animal_count AS load_animal_count,
          l.pickup_location_text AS load_pickup_location_text,
          l.dropoff_location_text AS load_dropoff_location_text,
          l.price_offer_amount::text AS load_price_offer_amount,
          l.price_currency AS load_price_currency,
          l.pickup_window_start AS load_pickup_window_start,
          l.pickup_window_end AS load_pickup_window_end,
          l.delivery_window_start AS load_delivery_window_start,
          l.delivery_window_end AS load_delivery_window_end,
          l.pickup_lat AS load_pickup_lat,
          l.pickup_lng AS load_pickup_lng,
          l.dropoff_lat AS load_dropoff_lat,
          l.dropoff_lng AS load_dropoff_lng,
          l.payment_mode AS load_payment_mode,
          l.direct_payment_disclaimer_accepted_at AS load_direct_payment_disclaimer_accepted_at,
          l.direct_payment_disclaimer_version AS load_direct_payment_disclaimer_version,
          c.id AS contract_id,
          c.offer_id AS contract_offer_id,
          c.booking_id AS contract_booking_id,
          c.shipper_id::text AS contract_shipper_id,
          c.hauler_id::text AS contract_hauler_id,
          c.status AS contract_status,
          c.price_amount::text AS contract_price_amount,
          c.price_type AS contract_price_type,
          c.payment_method AS contract_payment_method,
          c.payment_schedule AS contract_payment_schedule,
          c.contract_payload AS contract_payload,
          c.sent_at AS contract_sent_at,
          c.accepted_at AS contract_accepted_at,
          c.rejected_at AS contract_rejected_at,
          c.locked_at AS contract_locked_at,
          c.created_by_user_id::text AS contract_created_by_user_id,
          c.updated_by_user_id::text AS contract_updated_by_user_id,
          c.created_at AS contract_created_at,
          c.updated_at AS contract_updated_at,
          hu.full_name AS hauler_name,
          hu.phone_number AS hauler_phone,
          su.full_name AS shipper_name,
          su.phone_number AS shipper_phone,
          d.full_name AS driver_name,
          d.phone_number AS driver_phone,
          tr.plate_number AS truck_plate_number,
          tr.truck_type AS truck_type,
          pay.status AS payment_status,
          trp.id AS route_plan_id,
          loc.latitude AS latest_lat,
          loc.longitude AS latest_lng,
          loc.recorded_at AS latest_recorded_at
        FROM trips t
        JOIN loads l ON l.id = t.load_id
        JOIN shippers s ON s.id = l.shipper_id
        JOIN app_users su ON su.id = s.user_id
        LEFT JOIN haulers h ON h.id = t.hauler_id
        LEFT JOIN app_users hu ON hu.id = h.user_id
        LEFT JOIN drivers d ON d.id = t.driver_id
        LEFT JOIN trucks tr ON tr.id = t.truck_id
        LEFT JOIN LATERAL (
          SELECT status
          FROM payments p
          WHERE p.trip_id = t.id
          ORDER BY p.created_at DESC
          LIMIT 1
        ) pay ON true
        LEFT JOIN LATERAL (
          SELECT id
          FROM trip_route_plans trp
          WHERE trp.trip_id = t.id
          ORDER BY trp.created_at DESC
          LIMIT 1
        ) trp ON true
        LEFT JOIN LATERAL (
          SELECT latitude, longitude, recorded_at
          FROM trip_locations
          WHERE trip_id = t.id
          ORDER BY recorded_at DESC
          LIMIT 1
        ) loc ON true
        LEFT JOIN LATERAL (
          SELECT *
          FROM contracts c
          WHERE c.load_id = l.id
            AND c.status IN ('ACCEPTED', 'LOCKED')
          ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
          LIMIT 1
        ) c ON true
        WHERE t.hauler_id = $1
          AND c.id IS NOT NULL
          AND UPPER(t.status::text) IN (
            'PENDING_ESCROW',
            'READY_TO_START',
            'IN_PROGRESS',
            'DELIVERED_AWAITING_CONFIRMATION',
            'DELIVERED_CONFIRMED',
            'DISPUTED',
            'CLOSED'
          )
      ORDER BY t.created_at DESC
    `,
    [haulerId]
  );

  return result.rows.map((row) => {
    const trip = mapTripRow({
      id: row.id,
      load_id: row.load_id,
      hauler_id: row.hauler_id,
      driver_id: row.driver_id,
      truck_id: row.truck_id,
      truck_availability_id: (row as any).truck_availability_id ?? null,
      status: row.status,
      payment_mode: null,
      load_payment_mode: row.load_payment_mode,
      direct_payment_disclaimer_accepted_at: null,
      load_direct_payment_disclaimer_accepted_at: row.load_direct_payment_disclaimer_accepted_at,
      direct_payment_disclaimer_version: null,
      load_direct_payment_disclaimer_version: row.load_direct_payment_disclaimer_version,
      actual_start_time: row.actual_start_time,
      actual_end_time: row.actual_end_time,
      delivered_confirmed_at: row.delivered_confirmed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });

    const contract: ContractRecord | null = row.contract_id
      ? {
          id: row.contract_id,
          load_id: row.load_id,
          offer_id: row.contract_offer_id,
          booking_id: row.contract_booking_id,
          shipper_id: row.contract_shipper_id ?? row.load_shipper_id,
          hauler_id: row.contract_hauler_id ?? row.hauler_id ?? "",
          status: (row.contract_status as ContractStatus) ?? "ACCEPTED",
          price_amount: row.contract_price_amount,
          price_type: row.contract_price_type,
          payment_method: row.contract_payment_method,
          payment_schedule: row.contract_payment_schedule,
          contract_payload: row.contract_payload ?? {},
          sent_at: row.contract_sent_at,
          accepted_at: row.contract_accepted_at,
          rejected_at: row.contract_rejected_at,
          locked_at: row.contract_locked_at,
          created_by_user_id: row.contract_created_by_user_id ?? "",
          updated_by_user_id: row.contract_updated_by_user_id ?? null,
          created_at: row.contract_created_at ?? row.created_at,
          updated_at: row.contract_updated_at ?? row.updated_at,
        }
      : null;

    return {
      trip,
      load: {
        id: row.load_id,
        shipper_id: row.load_shipper_id,
        species: row.load_species,
        animal_count:
          row.load_animal_count === null || row.load_animal_count === undefined
            ? null
            : Number(row.load_animal_count),
        pickup_location_text: row.load_pickup_location_text,
        dropoff_location_text: row.load_dropoff_location_text,
        price_offer_amount: row.load_price_offer_amount,
        price_currency: row.load_price_currency,
        pickup_window_start: row.load_pickup_window_start,
        pickup_window_end: row.load_pickup_window_end,
        delivery_window_start: row.load_delivery_window_start,
        delivery_window_end: row.load_delivery_window_end,
        pickup_lat:
          row.load_pickup_lat === null || row.load_pickup_lat === undefined
            ? null
            : Number(row.load_pickup_lat),
        pickup_lng:
          row.load_pickup_lng === null || row.load_pickup_lng === undefined
            ? null
            : Number(row.load_pickup_lng),
        dropoff_lat:
          row.load_dropoff_lat === null || row.load_dropoff_lat === undefined
            ? null
            : Number(row.load_dropoff_lat),
        dropoff_lng:
          row.load_dropoff_lng === null || row.load_dropoff_lng === undefined
            ? null
            : Number(row.load_dropoff_lng),
      },
      contract,
      hauler: row.hauler_id
        ? { id: row.hauler_id, name: row.hauler_name, phone: row.hauler_phone }
        : null,
      shipper: { id: row.load_shipper_id, name: row.shipper_name, phone: row.shipper_phone },
      driver: row.driver_id
        ? { id: row.driver_id, name: row.driver_name, phone: row.driver_phone }
        : null,
      truck: row.truck_id
        ? {
            id: row.truck_id,
            plate_number: row.truck_plate_number,
            truck_type: row.truck_type,
          }
        : null,
      payment_status: row.payment_status,
      route_plan_id: row.route_plan_id ? String(row.route_plan_id) : null,
      latest_location:
        row.latest_lat !== null && row.latest_lat !== undefined &&
        row.latest_lng !== null && row.latest_lng !== undefined &&
        row.latest_recorded_at
          ? {
              lat: Number(row.latest_lat),
              lng: Number(row.latest_lng),
              recorded_at: row.latest_recorded_at,
            }
          : null,
    };
  });
}

export async function createContract(params: {
  loadId: string;
  offerId: string | null;
  bookingId?: string | null;
  shipperId: string;
  haulerId: string;
  status?: ContractStatus;
  priceAmount?: number | null;
  priceType?: string | null;
  paymentMethod?: string | null;
  paymentSchedule?: string | null;
  contractPayload?: Record<string, unknown>;
  createdByUserId: string;
}): Promise<ContractRecord> {
  const status = params.status ?? "DRAFT";
  const sentAt = status === "SENT" ? new Date().toISOString() : null;
  const result = await pool.query(
    `
      INSERT INTO contracts (
        load_id,
        offer_id,
        booking_id,
        shipper_id,
        hauler_id,
        status,
        price_amount,
        price_type,
        payment_method,
        payment_schedule,
        contract_payload,
        sent_at,
        created_by_user_id,
        updated_by_user_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )
      RETURNING *
    `,
    [
      params.loadId,
      params.offerId ?? null,
      params.bookingId ?? null,
      params.shipperId,
      params.haulerId,
      status,
      params.priceAmount ?? null,
      params.priceType ?? null,
      params.paymentMethod ?? null,
      params.paymentSchedule ?? null,
      params.contractPayload ?? {},
      sentAt,
      params.createdByUserId,
      params.createdByUserId,
    ]
  );
  return mapContractRow(result.rows[0]);
}

export async function updateContract(params: {
  contractId: string;
  status?: ContractStatus;
  priceAmount?: number | null;
  priceType?: string | null;
  paymentMethod?: string | null;
  paymentSchedule?: string | null;
  contractPayload?: Record<string, unknown>;
  updatedByUserId: string;
}): Promise<ContractRecord | null> {
  const existing = await getContractById(params.contractId);
  if (!existing) return null;
  if (["ACCEPTED", "REJECTED", "LOCKED"].includes(existing.status)) {
    throw new Error("Contract is locked and cannot be edited.");
  }
  const nextStatus = params.status ?? existing.status;
  const result = await pool.query(
    `
      UPDATE contracts
      SET status = $2,
          price_amount = $3,
          price_type = $4,
          payment_method = $5,
          payment_schedule = $6,
          contract_payload = $7,
          updated_by_user_id = $8,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      params.contractId,
      nextStatus,
      params.priceAmount ?? existing.price_amount ?? null,
      params.priceType ?? existing.price_type ?? null,
      params.paymentMethod ?? existing.payment_method ?? null,
      params.paymentSchedule ?? existing.payment_schedule ?? null,
      params.contractPayload ?? existing.contract_payload ?? {},
      params.updatedByUserId,
    ]
  );
  return result.rows[0] ? mapContractRow(result.rows[0]) : null;
}

export async function markContractSent(params: {
  contractId: string;
  updatedByUserId: string;
}): Promise<ContractRecord | null> {
  const result = await pool.query(
    `
      UPDATE contracts
      SET status = 'SENT',
          sent_at = NOW(),
          updated_by_user_id = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [params.contractId, params.updatedByUserId]
  );
  return result.rows[0] ? mapContractRow(result.rows[0]) : null;
}

export async function acceptContract(params: {
  contractId: string;
  actingUserId: string;
}): Promise<{
  contract: ContractRecord;
  booking: LoadBookingRecord;
  trip: TripRecord | null;
  payment: PaymentRecord | null;
}> {
  const contract = await getContractById(params.contractId);
  if (!contract) {
    throw new Error("Contract not found");
  }
  if (["ACCEPTED", "REJECTED", "LOCKED"].includes(contract.status)) {
    throw new Error("Contract is already finalized.");
  }
  
  const load = await getLoadById(contract.load_id);
  if (!load) {
    throw new Error("Load not found.");
  }

  // Handle contracts linked to bookings (truck bookings) - check this FIRST
  // This allows multiple contracts to be accepted without subscription checks
  if (contract.booking_id) {
    const existingBooking = await getBookingById(contract.booking_id);
    if (!existingBooking) {
      throw new Error("Booking not found for contract.");
    }
    if (existingBooking.status !== BookingStatus.REQUESTED) {
      throw new Error("Booking is not in REQUESTED status.");
    }
    
    // If booking has truck_availability_id, use truck booking flow (skip subscription check)
    if (existingBooking.truck_availability_id) {
      const amount = Number(contract.price_amount ?? existingBooking.offered_amount ?? 0);
      if (!amount || Number.isNaN(amount) || amount <= 0) {
        throw new Error("Contract amount is invalid.");
      }
      
      const paymentModeSelection = load.payment_mode
        ? {
            paymentMode: load.payment_mode,
            directDisclaimerAt: load.direct_payment_disclaimer_accepted_at ?? null,
            directDisclaimerVersion: load.direct_payment_disclaimer_version ?? null,
          }
        : undefined;
      
      // Check if a trip already exists for this truck_availability_id
      const existingTrip = await pool.query(
        `
          SELECT id
          FROM trips
          WHERE truck_availability_id = $1
            AND status NOT IN ($2, $3)
          LIMIT 1
        `,
        [
          existingBooking.truck_availability_id,
          mapTripStatusToDb(TripStatus.DELIVERED_CONFIRMED),
          mapTripStatusToDb(TripStatus.CLOSED),
        ]
      );
      if (existingTrip.rows.length > 0) {
        throw new Error(
          "A trip has already been created for this truck/route listing. You cannot accept additional contracts once a trip is created."
        );
      }
      
      // For truck bookings, don't create trip immediately
      // Trip will be created later via "Create New Trip" feature which can combine multiple contracts
      const trip: TripRecord | null = null;
      const payment: PaymentRecord | null = null;
      
      // Update booking status to ACCEPTED
      const updatedBooking = await updateBookingStatus(
        existingBooking.id,
        BookingStatus.ACCEPTED,
        params.actingUserId
      );
      if (!updatedBooking) {
        throw new Error("Failed to update booking status.");
      }
      
      // Refresh truck availability if needed
      await refreshTruckAvailabilityState(existingBooking.truck_availability_id);
      
      // Update contract
      const updatedContract = await pool.query(
        `
          UPDATE contracts
          SET status = 'ACCEPTED',
              accepted_at = NOW(),
              locked_at = NOW(),
              updated_by_user_id = $2,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [contract.id, params.actingUserId]
      );
      
      return {
        contract: mapContractRow(updatedContract.rows[0]),
        booking: updatedBooking,
        trip,
        payment,
      };
    }
  }

  // Handle contracts linked to offers (only if not a truck booking)
  // But first, check if there's a booking with truck_availability_id for this load
  if (contract.offer_id) {
    // Check if there's an active booking with truck_availability_id for this load
    // If so, we should treat it as a truck booking, not an offer-based contract
    const truckBookingCheck = await pool.query(
      `
        SELECT id, truck_availability_id, status
        FROM load_bookings
        WHERE load_id = $1
          AND truck_availability_id IS NOT NULL
          AND status = $2
        LIMIT 1
      `,
      [contract.load_id, BookingStatus.REQUESTED]
    );
    
    if (truckBookingCheck.rows.length > 0) {
      // This is actually a truck booking, not a pure offer-based contract
      // Update the contract to link it to the booking
      const bookingId = truckBookingCheck.rows[0].id;
      await pool.query(
        `
          UPDATE contracts
          SET booking_id = $1
          WHERE id = $2
        `,
        [bookingId, contract.id]
      );
      // Refresh contract to get updated booking_id
      const updatedContract = await getContractById(contract.id);
      if (updatedContract && updatedContract.booking_id) {
        // Recursively call acceptContract with the updated contract
        // But we need to avoid infinite recursion, so let's handle it inline
        const existingBooking = await getBookingById(updatedContract.booking_id);
        if (existingBooking && existingBooking.truck_availability_id) {
          // Use truck booking flow
          const amount = Number(updatedContract.price_amount ?? existingBooking.offered_amount ?? 0);
          if (!amount || Number.isNaN(amount) || amount <= 0) {
            throw new Error("Contract amount is invalid.");
          }
          
          const paymentModeSelection = load.payment_mode
            ? {
                paymentMode: load.payment_mode,
                directDisclaimerAt: load.direct_payment_disclaimer_accepted_at ?? null,
                directDisclaimerVersion: load.direct_payment_disclaimer_version ?? null,
              }
            : undefined;
          
          // Check if a trip already exists for this truck_availability_id
          const existingTrip = await pool.query(
            `
              SELECT id
              FROM trips
              WHERE truck_availability_id = $1
                AND status NOT IN ($2, $3)
              LIMIT 1
            `,
            [
              existingBooking.truck_availability_id,
              mapTripStatusToDb(TripStatus.DELIVERED_CONFIRMED),
              mapTripStatusToDb(TripStatus.CLOSED),
            ]
          );
          if (existingTrip.rows.length > 0) {
            throw new Error(
              "A trip has already been created for this truck/route listing. You cannot accept additional contracts once a trip is created."
            );
          }
          
          const trip: TripRecord | null = null;
          const payment: PaymentRecord | null = null;
          
          // Update booking status to ACCEPTED
          const updatedBookingRecord = await updateBookingStatus(
            existingBooking.id,
            BookingStatus.ACCEPTED,
            params.actingUserId
          );
          if (!updatedBookingRecord) {
            throw new Error("Failed to update booking status.");
          }
          
          // Refresh truck availability if needed
          await refreshTruckAvailabilityState(existingBooking.truck_availability_id);
          
          // Update contract
          const finalContract = await pool.query(
            `
              UPDATE contracts
              SET status = 'ACCEPTED',
                  accepted_at = NOW(),
                  locked_at = NOW(),
                  booking_id = $2,
                  updated_by_user_id = $3,
                  updated_at = NOW()
              WHERE id = $1
              RETURNING *
            `,
            [contract.id, existingBooking.id, params.actingUserId]
          );
          
          return {
            contract: mapContractRow(finalContract.rows[0]),
            booking: updatedBookingRecord,
            trip,
            payment,
          };
        }
      }
    }
    
    if (await loadHasActiveBooking(contract.load_id)) {
      throw new Error("Load already has an active booking.");
    }
    const offer = await getLoadOfferById(contract.offer_id);
    if (!offer) {
      throw new Error("Offer not found for contract.");
    }
    
    // Check if this offer's truck is associated with an active truck availability listing
    // If yes, this is a truck booking scenario - skip subscription check and trip creation
    const truckAvailabilityCheck = await pool.query(
      `
        SELECT id, truck_id
        FROM truck_availability
        WHERE hauler_id = $1
          AND truck_id = $2
          AND is_active = TRUE
        LIMIT 1
      `,
      [offer.hauler_id, offer.truck_id]
    );
    
    if (truckAvailabilityCheck.rows.length > 0 && offer.truck_id) {
      // This is a truck booking scenario - accept contract without creating trip
      // Check if a trip already exists for this truck_availability_id
      const truckAvailabilityId = truckAvailabilityCheck.rows[0].id;
      const existingTrip = await pool.query(
        `
          SELECT id
          FROM trips
          WHERE truck_availability_id = $1
            AND status NOT IN ($2, $3)
          LIMIT 1
        `,
        [
          truckAvailabilityId,
          mapTripStatusToDb(TripStatus.DELIVERED_CONFIRMED),
          mapTripStatusToDb(TripStatus.CLOSED),
        ]
      );
      if (existingTrip.rows.length > 0) {
        throw new Error(
          "A trip has already been created for this truck/route listing. You cannot accept additional contracts once a trip is created."
        );
      }
      
      // Find or create booking for this truck availability
      let booking = await pool.query(
        `
          SELECT *
          FROM load_bookings
          WHERE load_id = $1
            AND truck_availability_id = $2
            AND status = $3
          LIMIT 1
        `,
        [contract.load_id, truckAvailabilityId, BookingStatus.REQUESTED]
      );
      
      let bookingRecord: LoadBookingRecord;
      if (booking.rows.length > 0) {
        bookingRecord = mapBookingRow(booking.rows[0]);
      } else {
        // Create a booking for this truck availability
        const amount = Number(contract.price_amount ?? offer.offered_amount);
        const newBooking = await pool.query(
          `
            INSERT INTO load_bookings (
              load_id,
              hauler_id,
              shipper_id,
              truck_availability_id,
              offer_id,
              offered_amount,
              offered_currency,
              status,
              notes,
              created_by_user_id,
              payment_mode,
              direct_payment_disclaimer_accepted_at,
              direct_payment_disclaimer_version
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
          `,
          [
            contract.load_id,
            offer.hauler_id,
            load.shipper_id,
            truckAvailabilityId,
            offer.id,
            amount,
            offer.currency,
            BookingStatus.REQUESTED,
            "Created from offer",
            offer.created_by_user_id,
            load.payment_mode ?? "ESCROW",
            load.direct_payment_disclaimer_accepted_at ?? null,
            load.direct_payment_disclaimer_version ?? null,
          ]
        );
        bookingRecord = mapBookingRow(newBooking.rows[0]);
      }
      
      // Update contract to link to booking
      await pool.query(
        `
          UPDATE contracts
          SET booking_id = $1
          WHERE id = $2
        `,
        [bookingRecord.id, contract.id]
      );
      
      // Accept the booking
      const updatedBooking = await updateBookingStatus(
        bookingRecord.id,
        BookingStatus.ACCEPTED,
        params.actingUserId
      );
      if (!updatedBooking) {
        throw new Error("Failed to update booking status.");
      }
      
      // Update contract
      const updatedContract = await pool.query(
        `
          UPDATE contracts
          SET status = 'ACCEPTED',
              accepted_at = NOW(),
              locked_at = NOW(),
              booking_id = $2,
              updated_by_user_id = $3,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [contract.id, bookingRecord.id, params.actingUserId]
      );
      
      const trip: TripRecord | null = null;
      const payment: PaymentRecord | null = null;
      
      return {
        contract: mapContractRow(updatedContract.rows[0]),
        booking: updatedBooking,
        trip,
        payment,
      };
    }
    
    // Regular offer-based flow (with subscription check)
    const amount = Number(contract.price_amount ?? offer.offered_amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      throw new Error("Contract amount is invalid.");
    }
    const paymentModeSelection = load.payment_mode
      ? {
          paymentMode: load.payment_mode,
          directDisclaimerAt: load.direct_payment_disclaimer_accepted_at ?? null,
          directDisclaimerVersion: load.direct_payment_disclaimer_version ?? null,
        }
      : undefined;
    const { trip, payment } = await acceptOfferAndCreateTrip({
      offerId: offer.id,
      loadId: offer.load_id,
      haulerId: offer.hauler_id,
      shipperId: load.shipper_id,
      shipperUserId: load.shipper_user_id,
      haulerUserId: offer.created_by_user_id,
      amount,
      currency: offer.currency,
      ...(paymentModeSelection ? { paymentModeSelection } : {}),
    });
    const loadDetails = await getLoadDetails(offer.load_id);
    const requestedHeadcount = ensureNumeric(loadDetails?.animal_count);
    const requestedWeight = ensureNumeric(loadDetails?.estimated_weight_kg);
    const bookingInsert = await pool.query(
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
          created_by_user_id,
          updated_by_user_id,
          payment_mode,
          direct_payment_disclaimer_accepted_at,
          direct_payment_disclaimer_version
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
        )
        RETURNING *
      `,
      [
        offer.load_id,
        offer.hauler_id,
        load.shipper_id,
        offer.id,
        requestedHeadcount,
        requestedWeight,
        amount,
        offer.currency,
        BookingStatus.ACCEPTED,
        "Accepted via contract",
        contract.created_by_user_id,
        params.actingUserId,
        load.payment_mode ?? "ESCROW",
        load.direct_payment_disclaimer_accepted_at ?? null,
        load.direct_payment_disclaimer_version ?? null,
      ]
    );
    const booking = mapBookingRow(bookingInsert.rows[0]);
    const updatedContract = await pool.query(
      `
        UPDATE contracts
        SET status = 'ACCEPTED',
            accepted_at = NOW(),
            locked_at = NOW(),
            booking_id = $2,
            updated_by_user_id = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [contract.id, booking.id, params.actingUserId]
    );
    return {
      contract: mapContractRow(updatedContract.rows[0]),
      booking,
      trip,
      payment,
    };
  }
  
  // Handle contracts linked to bookings (non-truck bookings - those without truck_availability_id)
  // Truck bookings are already handled above with early return
  if (contract.booking_id) {
    const existingBooking = await getBookingById(contract.booking_id);
    if (!existingBooking) {
      throw new Error("Booking not found for contract.");
    }
    if (existingBooking.status !== BookingStatus.REQUESTED) {
      throw new Error("Booking is not in REQUESTED status.");
    }
    
    const amount = Number(contract.price_amount ?? existingBooking.offered_amount ?? 0);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      throw new Error("Contract amount is invalid.");
    }
    
    const paymentModeSelection = load.payment_mode
      ? {
          paymentMode: load.payment_mode,
          directDisclaimerAt: load.direct_payment_disclaimer_accepted_at ?? null,
          directDisclaimerVersion: load.direct_payment_disclaimer_version ?? null,
        }
      : undefined;
    
    let trip: TripRecord | null;
    let payment: PaymentRecord | null;
    
    // If booking has an offer_id, use offer-based flow (applies subscription checks)
    if (existingBooking.offer_id) {
      const offer = await getLoadOfferById(existingBooking.offer_id);
      if (!offer) {
        throw new Error("Offer not found for booking.");
      }
      const result = await acceptOfferAndCreateTrip({
        offerId: offer.id,
        loadId: offer.load_id,
        haulerId: offer.hauler_id,
        shipperId: load.shipper_id,
        shipperUserId: load.shipper_user_id,
        haulerUserId: offer.created_by_user_id,
        amount: Number(offer.offered_amount),
        currency: offer.currency,
        ...(paymentModeSelection ? { paymentModeSelection } : {}),
      });
      trip = result.trip;
      payment = result.payment;
    } else {
      throw new Error("Booking is missing source information.");
    }
    
    // Update booking status to ACCEPTED
    const updatedBooking = await updateBookingStatus(
      existingBooking.id,
      BookingStatus.ACCEPTED,
      params.actingUserId
    );
    if (!updatedBooking) {
      throw new Error("Failed to update booking status.");
    }
    
    // Update contract
    const updatedContract = await pool.query(
      `
        UPDATE contracts
        SET status = 'ACCEPTED',
            accepted_at = NOW(),
            locked_at = NOW(),
            updated_by_user_id = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [contract.id, params.actingUserId]
    );
    
    return {
      contract: mapContractRow(updatedContract.rows[0]),
      booking: updatedBooking,
      trip,
      payment,
    };
  }
  
  // If contract has neither offer_id nor booking_id, throw error
  throw new Error("Contract must be linked to either an offer or a booking.");
}

export async function rejectContract(params: {
  contractId: string;
  actingUserId: string;
}): Promise<ContractRecord | null> {
  const result = await pool.query(
    `
      UPDATE contracts
      SET status = 'REJECTED',
          rejected_at = NOW(),
          updated_by_user_id = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [params.contractId, params.actingUserId]
  );
  return result.rows[0] ? mapContractRow(result.rows[0]) : null;
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
  booking: LoadBookingRecord,
  paymentModeSelection?: {
    paymentMode: PaymentMode;
    directDisclaimerAt: string | null;
    directDisclaimerVersion: string | null;
  }
): Promise<{ trip: TripRecord; payment: PaymentRecord }> {
  const availability = await getTruckAvailabilityById(booking.truck_availability_id!);
  if (!availability) {
    throw new Error("Truck availability not found");
  }
  
  // Check if a trip already exists for this truck_availability_id
  // Once a trip is created, no more trips can be created for this truck/route
  if (booking.truck_availability_id) {
    const existingTrip = await pool.query(
      `
        SELECT id
        FROM trips
        WHERE truck_availability_id = $1
          AND status NOT IN ($2, $3)
        LIMIT 1
      `,
      [
        booking.truck_availability_id,
        mapTripStatusToDb(TripStatus.DELIVERED_CONFIRMED),
        mapTripStatusToDb(TripStatus.CLOSED),
      ]
    );
    if (existingTrip.rows.length > 0) {
      throw new Error(
        "A trip has already been created for this truck/route listing. You cannot create additional trips once a trip is created."
      );
    }
  }
  
  await ensureTruckAvailableForTrip(availability.truck_id);
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

  const paymentMode = paymentModeSelection?.paymentMode ?? "ESCROW";
  const isEscrow = paymentMode !== "DIRECT";
  // Payments are automatically funded when contracts are created
  const tripStatus = TripStatus.READY_TO_START;
  const paymentStatus = isEscrow
    ? PaymentStatus.ESCROW_FUNDED
    : PaymentStatus.NOT_APPLICABLE;

  const tripResult = await pool.query<TripRow>(
    `
      INSERT INTO trips (
        load_id,
        hauler_id,
        truck_id,
        truck_availability_id,
        status,
        payment_mode,
        direct_payment_disclaimer_accepted_at,
        direct_payment_disclaimer_version
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      RETURNING *
    `,
    [
      booking.load_id,
      booking.hauler_id,
      availability.truck_id,
      booking.truck_availability_id,
      mapTripStatusToDb(tripStatus),
      paymentMode,
      paymentMode === "DIRECT" ? paymentModeSelection?.directDisclaimerAt ?? null : null,
      paymentMode === "DIRECT" ? paymentModeSelection?.directDisclaimerVersion ?? null : null,
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
        $1,$2,$3,$4,$5,$6,$7,$8
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
      mapPaymentStatusToDb(paymentStatus),
      isEscrow,
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
  await refreshTruckAvailabilityState(availability.id);
  return { trip, payment };
}

export async function createMultiLoadTripFromListing(params: {
  truckAvailabilityId: string;
  haulerId: string;
  haulerUserId: string;
  contractIds: string[];
  driverId?: string | null;
  pickupDateTime: string;
  deliveryDateTime: string;
  tripTitle?: string | null;
  routeMode?: "fastest" | "shortest" | "avoid-tolls";
  autoRestStops?: boolean;
}): Promise<{ trip: TripRecord; tripLoads: Array<{ id: string; load_id: string; contract_id: string | null; booking_id: string | null }> }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validate truck availability
    const availability = await getTruckAvailabilityById(params.truckAvailabilityId);
    if (!availability) {
      throw new Error("Truck availability not found");
    }
    if (availability.hauler_id !== params.haulerId) {
      throw new Error("Truck availability does not belong to this hauler");
    }
    if (!availability.truck_id) {
      throw new Error("Truck availability must have a truck assigned");
    }

    // Validate contracts
    if (params.contractIds.length === 0) {
      throw new Error("At least one contract must be selected");
    }
    const contracts = await Promise.all(
      params.contractIds.map((id) => getContractById(id))
    );
    const invalidContracts = contracts.filter((c) => !c || c.hauler_id !== params.haulerId || (c.status !== "ACCEPTED" && c.status !== "LOCKED"));
    if (invalidContracts.length > 0) {
      throw new Error("One or more contracts are invalid or not accepted");
    }

    // Get loads and bookings for contracts
    const loads: LoadRecord[] = [];
    const bookings: LoadBookingRecord[] = [];
    for (const contract of contracts) {
      if (!contract) continue;
      const load = await getLoadById(contract.load_id);
      if (!load) {
        throw new Error(`Load not found for contract ${contract.id}`);
      }
      loads.push(load);
      if (contract.booking_id) {
        const booking = await getBookingById(contract.booking_id);
        if (booking && booking.truck_availability_id === params.truckAvailabilityId) {
          bookings.push(booking);
        }
      }
    }

    // Calculate total capacity and validate (warn but don't block)
    let totalHeadcount = 0;
    let totalWeight = 0;
    for (const load of loads) {
      const loadDetails = await getLoadDetails(load.id);
      if (loadDetails?.animal_count) {
        totalHeadcount += Number(loadDetails.animal_count);
      }
      if (loadDetails?.estimated_weight_kg) {
        totalWeight += Number(loadDetails.estimated_weight_kg);
      }
    }
    const capacityWarning: string[] = [];
    if (availability.capacity_headcount && totalHeadcount > availability.capacity_headcount) {
      capacityWarning.push(`Total headcount (${totalHeadcount}) exceeds truck capacity (${availability.capacity_headcount})`);
    }
    if (availability.capacity_weight_kg && totalWeight > Number(availability.capacity_weight_kg)) {
      capacityWarning.push(`Total weight (${totalWeight} kg) exceeds truck capacity (${availability.capacity_weight_kg} kg)`);
    }

    // Validate that we have at least one load
    if (loads.length === 0) {
      throw new Error("No loads found for selected contracts");
    }

    // Determine payment mode (use first load's payment mode, or default to ESCROW)
    const paymentMode = loads[0]?.payment_mode ?? "ESCROW";
    const isEscrow = paymentMode !== "DIRECT";
    const tripStatus = TripStatus.READY_TO_START; // Multi-load trips start as READY_TO_START (scheduled)
    
    // Create trip with first load as primary
    const primaryLoad = loads[0];
    if (!primaryLoad) {
      throw new Error("Primary load is required");
    }
    const tripResult = await client.query<TripRow>(
      `
        INSERT INTO trips (
          load_id,
          hauler_id,
          truck_id,
          driver_id,
          truck_availability_id,
          status,
          payment_mode,
          planned_start_time,
          planned_end_time,
          direct_payment_disclaimer_accepted_at,
          direct_payment_disclaimer_version
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
        RETURNING *
      `,
      [
        primaryLoad.id,
        params.haulerId,
        availability.truck_id,
        params.driverId ?? null,
        params.truckAvailabilityId,
        mapTripStatusToDb(tripStatus),
        paymentMode,
        params.pickupDateTime,
        params.deliveryDateTime,
        paymentMode === "DIRECT" ? primaryLoad.direct_payment_disclaimer_accepted_at ?? null : null,
        paymentMode === "DIRECT" ? primaryLoad.direct_payment_disclaimer_version ?? null : null,
      ]
    );
    const tripRow = tripResult.rows[0];
    if (!tripRow) {
      throw new Error("Failed to create trip");
    }
    const trip = mapTripRow(tripRow);

    // Create trip_loads entries for all loads
    const tripLoads: Array<{ id: string; load_id: string; contract_id: string | null; booking_id: string | null }> = [];
    for (let i = 0; i < loads.length; i++) {
      const load = loads[i];
      if (!load) {
        throw new Error(`Load at index ${i} is undefined`);
      }
      const contract = contracts[i];
      const booking = contract?.booking_id ? bookings.find((b) => b.id === contract.booking_id) : null;
      const tripLoadResult = await client.query(
        `
          INSERT INTO trip_loads (
            trip_id,
            load_id,
            contract_id,
            booking_id,
            sequence_order
          )
          VALUES ($1,$2,$3,$4,$5)
          RETURNING id::text, load_id::text, contract_id::text, booking_id::text
        `,
        [trip.id, load.id, contract?.id ?? null, booking?.id ?? null, i]
      );
      tripLoads.push({
        id: tripLoadResult.rows[0].id,
        load_id: tripLoadResult.rows[0].load_id,
        contract_id: tripLoadResult.rows[0].contract_id,
        booking_id: tripLoadResult.rows[0].booking_id,
      });
    }

    // Create payments for each load (if escrow)
    if (isEscrow) {
      for (let i = 0; i < loads.length; i++) {
        const load = loads[i];
        if (!load) {
          throw new Error(`Load at index ${i} is undefined`);
        }
        const contract = contracts[i];
        if (!contract) continue;
        const shipperUserId = load.shipper_user_id;
        // Use contract price_amount first, then load's asking_amount as fallback
        const amount = Number(contract.price_amount ?? load.asking_amount ?? 0);
        if (amount > 0) {
          await client.query<PaymentRow>(
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
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
              trip.id,
              load.id,
              shipperUserId,
              params.haulerUserId,
              amount,
              load.currency ?? "USD",
              mapPaymentStatusToDb(PaymentStatus.ESCROW_FUNDED),
              true,
            ]
          );
        }
      }
    }

    // Update loads status
    for (const load of loads) {
      await client.query(
        `
          UPDATE loads
          SET status = $2,
              assigned_to_user_id = $3,
              assigned_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `,
        [load.id, mapLoadStatusToDb(LoadStatus.AWAITING_ESCROW), params.haulerUserId]
      );
    }

    // Create notifications for all stakeholders
    const stakeholderUserIds = new Set<string>();
    for (const load of loads) {
      stakeholderUserIds.add(load.shipper_user_id);
    }
    stakeholderUserIds.add(params.haulerUserId);
    if (params.driverId) {
      const driverQuery = await client.query(`SELECT user_id::text FROM drivers WHERE id = $1`, [params.driverId]);
      if (driverQuery.rows[0]?.user_id) {
        stakeholderUserIds.add(driverQuery.rows[0].user_id);
      }
    }

    // Create in-app notifications
    for (const userId of stakeholderUserIds) {
      await client.query(
        `
          INSERT INTO notifications (
            user_id,
            channel,
            template_code,
            payload_json,
            status
          )
          VALUES ($1, 'in_app', 'trip_created', $2, 'queued')
        `,
        [
          userId,
          JSON.stringify({
            trip_id: trip.id,
            trip_title: params.tripTitle ?? `Multi-load trip #${trip.id}`,
            loads_count: loads.length,
            pickup_date: params.pickupDateTime,
            delivery_date: params.deliveryDateTime,
          }),
        ]
      );
    }

    // Send email notifications if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (smtpHost && smtpUser && smtpPass) {
      for (const userId of stakeholderUserIds) {
        const userQuery = await client.query(`SELECT email FROM app_users WHERE id = $1`, [userId]);
        const email = userQuery.rows[0]?.email;
        if (email) {
          await client.query(
            `
              INSERT INTO notifications (
                user_id,
                channel,
                template_code,
                payload_json,
                status
              )
              VALUES ($1, 'email', 'trip_created', $2, 'queued')
            `,
            [
              userId,
              JSON.stringify({
                trip_id: trip.id,
                trip_title: params.tripTitle ?? `Multi-load trip #${trip.id}`,
                loads_count: loads.length,
                pickup_date: params.pickupDateTime,
                delivery_date: params.deliveryDateTime,
                recipient_email: email,
              }),
            ]
          );
        }
      }
    }

    // Emit WebSocket events
    const { emitEvent, SOCKET_EVENTS } = require("../socket");
    for (const userId of stakeholderUserIds) {
      emitEvent(
        SOCKET_EVENTS.TRIP_UPDATED,
        { trip, loads: loads.map((l) => ({ id: l.id, shipper_id: l.shipper_id })) },
        [`user-${userId}`]
      );
    }

    await client.query("COMMIT");
    return { trip, tripLoads };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function respondToBooking(params: {
  bookingId: string;
  actor: "SHIPPER" | "HAULER";
  action: "ACCEPT" | "REJECT";
  actingUserId: string;
  paymentModeSelection?: {
    paymentMode: PaymentMode;
    directDisclaimerAt: string | null;
    directDisclaimerVersion: string | null;
  } | null;
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
    if (booking.truck_availability_id) {
      await refreshTruckAvailabilityState(booking.truck_availability_id);
    }
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
    const bookingPaymentSelection =
      params.paymentModeSelection ||
      (booking.payment_mode
        ? {
            paymentMode: booking.payment_mode,
            directDisclaimerAt: booking.direct_payment_disclaimer_accepted_at ?? null,
            directDisclaimerVersion: booking.direct_payment_disclaimer_version ?? null,
          }
        : loadRow.payment_mode
        ? {
            paymentMode: loadRow.payment_mode,
            directDisclaimerAt: loadRow.direct_payment_disclaimer_accepted_at ?? null,
            directDisclaimerVersion: loadRow.direct_payment_disclaimer_version ?? null,
          }
        : null);
    const result = await acceptOfferAndCreateTrip({
      offerId: offer.id,
      loadId: offer.load_id,
      haulerId: offer.hauler_id,
      shipperId: loadRow.shipper_id,
      shipperUserId: loadRow.shipper_user_id,
      haulerUserId: offer.created_by_user_id,
      amount: Number(offer.offered_amount),
      currency: offer.currency,
      ...(bookingPaymentSelection ? { paymentModeSelection: bookingPaymentSelection } : {}),
    });
    trip = result.trip;
    payment = result.payment;
  } else if (booking.truck_availability_id) {
    const loadRow = await getLoadById(booking.load_id);
    const result = await createTripFromTruckBooking(
      booking,
      (
        params.paymentModeSelection ||
        (booking.payment_mode
          ? {
              paymentMode: booking.payment_mode,
              directDisclaimerAt: booking.direct_payment_disclaimer_accepted_at ?? null,
              directDisclaimerVersion: booking.direct_payment_disclaimer_version ?? null,
            }
          : loadRow?.payment_mode
          ? {
              paymentMode: loadRow.payment_mode,
              directDisclaimerAt: loadRow.direct_payment_disclaimer_accepted_at ?? null,
              directDisclaimerVersion: loadRow.direct_payment_disclaimer_version ?? null,
            }
          : null)
      ) || undefined
    );
    trip = result.trip;
    payment = result.payment;
  } else {
    throw new Error("Booking is missing source information");
  }

  const updated = await updateBookingStatus(booking.id, BookingStatus.ACCEPTED, params.actingUserId);
  if (!updated) {
    throw new Error("Failed to update booking");
  }
  if (booking.truck_availability_id) {
    await refreshTruckAvailabilityState(booking.truck_availability_id);
  }
  return { booking: updated, trip, payment };
}

export interface UpdateOfferDetailsInput {
  offeredAmount?: number;
  currency?: string;
  message?: string | null;
  expiresAt?: string | null;
  chatEnabledByShipper?: boolean;
  chatEnabledByHauler?: boolean;
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
  if (patch.chatEnabledByShipper !== undefined) {
    sets.push(`chat_enabled_by_shipper = $${values.length + 2}`);
    values.push(patch.chatEnabledByShipper);
  }
  if (patch.chatEnabledByHauler !== undefined) {
    sets.push(`chat_enabled_by_hauler = $${values.length + 2}`);
    values.push(patch.chatEnabledByHauler);
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
  const updated = result.rows[0] ?? null;
  if (!updated) return null;
  const hydrated = await getLoadOfferById(updated.id);
  return hydrated ?? updated;
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

async function haulerHasActiveTrip(
  haulerId: string,
  client?: PoolClient
): Promise<boolean> {
  const runner = client ?? pool;
  const result = await runner.query(
    `
      SELECT 1
      FROM trips
      WHERE hauler_id = $1
        AND LOWER(status::text) = ANY($2)
      LIMIT 1
    `,
    [haulerId, ACTIVE_TRIP_STATUS_VALUES_FOR_FREE_TRIAL]
  );
  return (result.rowCount ?? 0) > 0;
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
  paymentModeSelection?: {
    paymentMode: PaymentMode;
    directDisclaimerAt: string | null;
    directDisclaimerVersion: string | null;
  };
}): Promise<{ trip: TripRecord; payment: PaymentRecord }> {
  const client = await pool.connect();
  const paymentMode = params.paymentModeSelection?.paymentMode ?? "ESCROW";
  const isEscrow = paymentMode !== "DIRECT";
  // Payments are automatically funded when contracts/trips are created
  const tripStatus = TripStatus.READY_TO_START;
  const paymentStatus = isEscrow
    ? PaymentStatus.ESCROW_FUNDED
    : PaymentStatus.NOT_APPLICABLE;

  async function ensureTruckId(): Promise<string> {
    const truckRows = (
      await client.query(
        `
          SELECT id::text
          FROM trucks
          WHERE hauler_id = $1
            AND status <> 'inactive'
          ORDER BY updated_at DESC
        `,
        [params.haulerId]
      )
    ).rows;
    if (truckRows.length === 0) {
      throw new Error("No trucks found for this hauler. Please add a truck before accepting loads.");
    }
    // Only mark trucks as busy if they have active trips
    // Having a truck in truck_availability doesn't make it busy - it's available for booking!
    const busyTripRows = await client.query(
      `
        SELECT DISTINCT truck_id::text AS truck_id
        FROM trips
        WHERE truck_id IS NOT NULL
          AND hauler_id = $1
          AND status = ANY($2)
      `,
      [params.haulerId, ACTIVE_TRIP_STATUS_VALUES]
    );
    const busySet = new Set<string>();
    busyTripRows.rows.forEach((row) => {
      if (row?.truck_id) busySet.add(row.truck_id);
    });
    const available = truckRows.find((row) => row?.id && !busySet.has(row.id));
    if (!available?.id) {
      throw new Error(
        "All trucks are currently assigned to active trips. Please wait for trips to complete or update your fleet availability."
      );
    }
    await ensureTruckAvailableForTrip(available.id);
    return available.id;
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

    const haulerMetaResult = await client.query(
      `
        SELECT hauler_type, free_trip_used, subscription_status
        FROM haulers
        WHERE id = $1
        LIMIT 1
      `,
      [params.haulerId]
    );
    if (!haulerMetaResult.rowCount) {
      throw new Error("Hauler profile not found");
    }
    const haulerMeta = haulerMetaResult.rows[0];
    const hasActiveTrip = await haulerHasActiveTrip(params.haulerId, client);
    assertFreeTripEligibility({
      haulerType: haulerMeta.hauler_type,
      subscriptionStatus: haulerMeta.subscription_status,
      freeTripUsed: haulerMeta.free_trip_used,
      hasActiveTrip,
    });

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
        status,
        payment_mode,
        direct_payment_disclaimer_accepted_at,
        direct_payment_disclaimer_version
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      RETURNING *
    `,
    [
      params.loadId,
      params.haulerId,
      truckId,
      driverId,
      mapTripStatusToDb(tripStatus),
      paymentMode,
      paymentMode === "DIRECT" ? params.paymentModeSelection?.directDisclaimerAt ?? null : null,
      paymentMode === "DIRECT" ? params.paymentModeSelection?.directDisclaimerVersion ?? null : null,
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
        $1,$2,$3,$4,$5,$6,$7,$8
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
      mapPaymentStatusToDb(paymentStatus),
      isEscrow,
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

    if (
      (haulerMeta.hauler_type ?? "").toString().trim().toUpperCase() === "INDIVIDUAL" &&
      (haulerMeta.subscription_status ?? "").toString().trim().toUpperCase() !== "ACTIVE"
    ) {
      await client.query(
        `
          UPDATE haulers
          SET free_trip_used = TRUE,
              free_trip_used_at = COALESCE(free_trip_used_at, NOW())
          WHERE id = $1
        `,
        [params.haulerId]
      );
    }

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
  // Get thread_id for this offer
  const threadResult = await pool.query(
    "SELECT id FROM load_offer_threads WHERE offer_id = $1 LIMIT 1",
    [input.offerId]
  );
  
  const threadId = threadResult.rows[0]?.id ? Number(threadResult.rows[0].id) : null;
  
  const result = await pool.query(
    `
      INSERT INTO load_offer_messages (
        thread_id,
        offer_id,
        sender_user_id,
        sender_role,
        text,
        attachments
      )
      VALUES (
        $1,$2,$3,$4,$5,$6
      )
      RETURNING *
    `,
    [
      threadId,
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
      SELECT t.id::text,
             t.load_id::text,
             t.hauler_id::text,
             t.driver_id::text,
             t.truck_id::text,
             t.status::text,
             t.payment_mode::text,
             l.payment_mode::text        AS load_payment_mode,
             t.direct_payment_disclaimer_accepted_at,
             t.direct_payment_disclaimer_version,
             l.direct_payment_disclaimer_accepted_at AS load_direct_payment_disclaimer_accepted_at,
             l.direct_payment_disclaimer_version     AS load_direct_payment_disclaimer_version,
             t.actual_start_time,
             t.actual_end_time,
             t.delivered_confirmed_at,
             t.created_at,
             t.updated_at
      FROM trips t
      LEFT JOIN loads l ON l.id = t.load_id
      WHERE t.id = $1
    `,
    [tripId]
  );
  const row = result.rows[0];
  return row ? mapTripRow(row) : null;
}

export async function getLatestTripForLoad(loadId: string): Promise<TripRecord | null> {
  const result = await pool.query<TripRow>(
    `
      SELECT
        t.id::text,
        t.load_id::text,
        t.hauler_id::text,
        t.driver_id::text,
        t.truck_id::text,
        t.status::text,
        t.payment_mode::text,
        l.payment_mode::text        AS load_payment_mode,
        t.direct_payment_disclaimer_accepted_at,
        t.direct_payment_disclaimer_version,
        l.direct_payment_disclaimer_accepted_at AS load_direct_payment_disclaimer_accepted_at,
        l.direct_payment_disclaimer_version     AS load_direct_payment_disclaimer_version,
        t.actual_start_time,
        t.actual_end_time,
        t.delivered_confirmed_at,
        t.created_at,
        t.updated_at
      FROM trips t
      LEFT JOIN loads l ON l.id = t.load_id
      WHERE t.load_id = $1
      ORDER BY t.created_at DESC
      LIMIT 1
    `,
    [loadId]
  );
  const row = result.rows[0];
  return row ? mapTripRow(row) : null;
}

export async function getDirectPaymentForTrip(
  tripId: string,
  client: PoolClient | null = null
): Promise<TripDirectPaymentRecord | null> {
  const runner = client ?? pool;
  const result = await runner.query(
    `
      SELECT *
      FROM trip_direct_payments
      WHERE trip_id = $1
      LIMIT 1
    `,
    [tripId]
  );
  return result.rows[0] ? mapTripDirectPaymentRow(result.rows[0]) : null;
}

export async function getTripAndLoad(
  tripId: string
): Promise<{ trip: TripRecord; load: LoadRecord; direct_payment: TripDirectPaymentRecord | null } | null> {
  const trip = await getTripById(tripId);
  if (!trip) return null;
  const load = await getLoadById(trip.load_id);
  if (!load) return null;
  const direct_payment = trip.payment_mode === "DIRECT" ? await getDirectPaymentForTrip(trip.id) : null;
  return { trip, load, direct_payment };
}

export async function getTripContextByLoadId(
  loadId: string
): Promise<{ trip: TripRecord | null; load: LoadRecord; payment: PaymentRecord | null; direct_payment: TripDirectPaymentRecord | null }> {
  const load = await getLoadById(loadId);
  if (!load) {
    throw new Error("Load not found");
  }
  const trip = await getLatestTripForLoad(loadId);
  const payment = trip ? await getPaymentForTrip(trip.id) : null;
  const direct_payment =
    trip && trip.payment_mode === "DIRECT" ? await getDirectPaymentForTrip(trip.id) : null;
  return { trip, load, payment, direct_payment };
}

export async function listDriversForHauler(haulerId: string): Promise<HaulerDriverRecord[]> {
  const result = await pool.query(
    `
      SELECT
        id::text,
        full_name,
        phone_number,
        license_number,
        license_expiry::text,
        status
      FROM drivers
      WHERE hauler_id = $1
      ORDER BY full_name ASC
    `,
    [haulerId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    full_name: row.full_name ?? null,
    status: row.status ?? null,
    phone_number: row.phone_number ?? null,
    license_number: row.license_number ?? null,
    license_expiry: row.license_expiry ?? null,
  }));
}

export async function listVehiclesForHauler(haulerId: string): Promise<HaulerVehicleRecord[]> {
  const result = await pool.query(
    `
      SELECT id::text, plate_number, truck_type, status
      FROM trucks
      WHERE hauler_id = $1
      ORDER BY created_at DESC
    `,
    [haulerId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    plate_number: row.plate_number ?? null,
    truck_type: row.truck_type ?? null,
    status: row.status ?? null,
  }));
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

function fallbackTimestamp(value: string | number | Date | null | undefined) {
  const date =
    value === null || value === undefined
      ? new Date()
      : value instanceof Date
      ? value
      : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export async function updateTripStatus(
  tripId: string,
  status: TripStatus,
  patch: Partial<TripRecord> = {}
): Promise<TripRecord | null> {
  const sets = [`status = $1`, `updated_at = NOW()`];
  const values: any[] = [mapTripStatusToDb(status)];
  if (patch.started_at !== undefined) {
    sets.push(`actual_start_time = NOW()`);
  }
  if (patch.delivered_at !== undefined) {
    sets.push(`actual_end_time = NOW()`);
  }
  if (patch.delivered_confirmed_at !== undefined) {
    sets.push(`delivered_confirmed_at = NOW()`);
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
  const trip = await getTripById(input.tripId);
  assertEscrowEnabled({ trip });
  if (trip?.payment_mode && trip.payment_mode !== "ESCROW") {
    throw new Error("PAYMENT_MODE_IMMUTABLE");
  }
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

    const trip = await getTripById(tripId);
    assertEscrowEnabled({ trip });
    if (trip?.payment_mode && trip.payment_mode !== "ESCROW") {
      throw new Error("PAYMENT_MODE_IMMUTABLE");
    }

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
  const trip = await getTripById(input.tripId);
  assertEscrowEnabled({ trip });
  if (trip?.payment_mode && trip.payment_mode !== "ESCROW") {
    throw new Error("PAYMENT_MODE_IMMUTABLE");
  }
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
  const existing = await getPaymentById(paymentId);
  if (existing) {
    const trip = existing.trip_id ? await getTripById(existing.trip_id) : null;
    assertEscrowEnabled({ trip, payment: existing });
    if (trip?.payment_mode && trip.payment_mode !== "ESCROW") {
      throw new Error("PAYMENT_MODE_IMMUTABLE");
    }
  }
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
  const existing = await getPaymentById(paymentId);
  if (existing) {
    const trip = existing.trip_id ? await getTripById(existing.trip_id) : null;
    assertEscrowEnabled({ trip, payment: existing });
    if (trip?.payment_mode && trip.payment_mode !== "ESCROW") {
      throw new Error("PAYMENT_MODE_IMMUTABLE");
    }
  }
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
  const paymentExisting = await getPaymentById(params.paymentId);
  const tripExisting = paymentExisting?.trip_id ? await getTripById(paymentExisting.trip_id) : null;
  assertEscrowEnabled({ trip: tripExisting ?? null, payment: paymentExisting ?? null });
  if (tripExisting?.payment_mode && tripExisting.payment_mode !== "ESCROW") {
    throw new Error("PAYMENT_MODE_IMMUTABLE");
  }

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
        h.hauler_type,
        h.free_trip_used,
        h.free_trip_used_at,
        h.subscription_status,
        h.subscription_current_period_end,
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
    hauler_type: row.hauler_type ?? null,
    fleet_count: Number(row.fleet_count ?? 0),
    driver_count: Number(row.driver_count ?? 0),
    completed_trips: Number(row.completed_trips ?? 0),
    free_trip_used: Boolean(row.free_trip_used),
    free_trip_used_at: row.free_trip_used_at ?? null,
    subscription_status: (row.subscription_status ?? "NONE") as HaulerSubscriptionStatus,
    subscription_current_period_end: row.subscription_current_period_end ?? null,
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
      const trip = row.trip_id ? await getTripById(row.trip_id) : null;
      assertEscrowEnabled({ trip, payment: mapPaymentRow(row) });
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
    const existingPayment = await getPaymentById(dispute.payment_id);
    const trip = dispute.trip_id ? await getTripById(dispute.trip_id) : null;
    assertEscrowEnabled({ trip, payment: existingPayment ?? null });

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
        $1,$2,$3,$4,$5,$6,$7,$8
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
  recipientRole?: string | null;
  text?: string;
  attachments?: unknown[];
}) {
  const result = await pool.query(
    `
      INSERT INTO dispute_messages (
        dispute_id,
        sender_user_id,
        sender_role,
        recipient_role,
        text,
        attachments
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `,
    [
      input.disputeId,
      input.senderUserId,
      input.senderRole,
      input.recipientRole ?? "ALL",
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
