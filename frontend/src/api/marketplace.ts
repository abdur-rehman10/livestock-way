import { API_BASE_URL } from "../lib/api";

const MARKETPLACE_BASE = `${API_BASE_URL}/api/marketplace`;
const HAULER_BASE = `${API_BASE_URL}/api/hauler`;

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

function buildHeaders(method: HttpMethod, headers?: HeadersInit, hasJsonBody = true) {
  const finalHeaders = new Headers(headers ?? {});
  finalHeaders.set("Accept", "application/json");
  if (hasJsonBody && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  const token = getAuthToken();
  if (token && !finalHeaders.has("Authorization")) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }
  return finalHeaders;
}

async function marketplaceRequest<T>(
  path: string,
  options: RequestInit & { method?: HttpMethod } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const hasJsonBody = !!options.body && typeof options.body === "string";
  const response = await fetch(`${MARKETPLACE_BASE}${path}`, {
    ...options,
    method,
    headers: buildHeaders(method, options.headers, hasJsonBody),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Marketplace request failed (${response.status})`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function haulerRequest<T>(
  path: string,
  options: RequestInit & { method?: HttpMethod } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const hasJsonBody = !!options.body && typeof options.body === "string";
  const response = await fetch(`${HAULER_BASE}${path}`, {
    ...options,
    method,
    headers: buildHeaders(method, options.headers, hasJsonBody),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Hauler request failed (${response.status})`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export type LoadOfferStatus =
  | "PENDING"
  | "WITHDRAWN"
  | "REJECTED"
  | "EXPIRED"
  | "ACCEPTED";

export interface LoadOffer {
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
   payment_mode?: "ESCROW" | "DIRECT";
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

export interface OfferMessage {
  id: string;
  offer_id: string;
  sender_user_id: string;
  sender_role: string;
  text: string | null;
  attachments: unknown[];
  created_at: string;
}

export interface HaulerOfferSummary {
  offer_id?: string | null;
  load_id: string;
  status: LoadOfferStatus;
  offered_amount: string;
  currency: string;
  created_at: string;
  last_message_at?: string | null;
  chat_enabled_by_shipper?: boolean | null;
  chat_enabled_by_hauler?: boolean | null;
}

export interface TripRecord {
  id: string;
  load_id: string;
  hauler_id: string | null;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  status: string;
  payment_mode?: "ESCROW" | "DIRECT";
  direct_payment_disclaimer_accepted_at?: string | null;
  direct_payment_disclaimer_version?: string | null;
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
  status: string;
  auto_release_at: string | null;
  payment_mode?: "ESCROW" | "DIRECT";
  is_escrow: boolean;
  created_at: string;
  updated_at: string;
  external_provider?: string | null;
  external_intent_id?: string | null;
  external_charge_id?: string | null;
}

export interface TripEnvelopeLoad {
  id: string;
  status: string;
  title?: string | null;
  awarded_offer_id?: string | null;
  shipper_id?: string | null;
}

export interface TripEnvelope {
  trip: TripRecord | null;
  load: TripEnvelopeLoad;
  payment: PaymentRecord | null;
  direct_payment?: {
    id: string;
    trip_id: string;
    received_amount: string;
    received_payment_method: "CASH" | "BANK_TRANSFER" | "OTHER";
    received_reference: string | null;
    received_at: string;
  } | null;
}

export interface HaulerDriverOption {
  id: string;
  full_name: string | null;
  status: string | null;
  phone_number?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;
}

export interface HaulerVehicleOption {
  id: string;
  plate_number: string | null;
  truck_type: string | null;
  status: string | null;
  truck_name?: string | null;
}

export interface TruckAvailability {
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
  is_active?: boolean;
  is_external?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ContractStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "LOCKED";

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
  contract: {
    id: string;
    status: ContractStatus;
    price_amount: string | null;
    price_type: string | null;
    payment_method: string | null;
    payment_schedule: string | null;
    contract_payload: Record<string, unknown>;
  } | null;
  hauler: { id: string; name: string | null; phone: string | null } | null;
  shipper: { id: string; name: string | null; phone: string | null } | null;
  driver: { id: string; name: string | null; phone: string | null } | null;
  truck: { id: string; plate_number: string | null; truck_type: string | null } | null;
  payment_status: string | null;
  route_plan_id: string | null;
  latest_location: { lat: number; lng: number; recorded_at: string } | null;
}

export interface HaulerTripSummary extends ShipperTripSummary {}

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

export async function fetchContracts(filters: {
  load_id?: string;
  offer_id?: string;
  booking_id?: string;
  status?: ContractStatus;
} = {}) {
  const params = new URLSearchParams();
  if (filters.load_id) params.set("load_id", filters.load_id);
  if (filters.offer_id) params.set("offer_id", filters.offer_id);
  if (filters.booking_id) params.set("booking_id", filters.booking_id);
  if (filters.status) params.set("status", filters.status);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return marketplaceRequest<{ items: ContractRecord[] }>(`/contracts${suffix}`);
}

export async function fetchContract(contractId: string) {
  return marketplaceRequest<{ contract: ContractRecord }>(`/contracts/${contractId}`);
}

export async function createContract(payload: {
  load_id?: string;
  offer_id?: string;
  booking_id?: string;
  status?: "DRAFT" | "SENT";
  price_amount?: number | null;
  price_type?: string | null;
  payment_method?: string | null;
  payment_schedule?: string | null;
  contract_payload?: Record<string, unknown>;
}) {
  return marketplaceRequest<{ contract: ContractRecord }>(`/contracts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateContract(contractId: string, payload: {
  price_amount?: number | null;
  price_type?: string | null;
  payment_method?: string | null;
  payment_schedule?: string | null;
  contract_payload?: Record<string, unknown>;
}) {
  return marketplaceRequest<{ contract: ContractRecord }>(`/contracts/${contractId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function sendContract(contractId: string) {
  return marketplaceRequest<{ contract: ContractRecord }>(`/contracts/${contractId}/send`, {
    method: "POST",
  });
}

export async function acceptContract(contractId: string) {
  return marketplaceRequest<{
    contract: ContractRecord;
    booking: LoadBooking;
    trip?: TripRecord;
    payment?: PaymentRecord;
  }>(`/contracts/${contractId}/accept`, {
    method: "POST",
  });
}

export async function rejectContract(contractId: string) {
  return marketplaceRequest<{ contract: ContractRecord }>(`/contracts/${contractId}/reject`, {
    method: "POST",
  });
}

export async function fetchShipperTrips() {
  return marketplaceRequest<{ items: ShipperTripSummary[] }>(`/shipper/trips`);
}

export async function fetchHaulerTrips() {
  return marketplaceRequest<{ items: HaulerTripSummary[] }>(`/hauler/trips`);
}

export interface LoadBooking {
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
  status: string;
  notes: string | null;
  payment_mode?: "ESCROW" | "DIRECT";
  created_at: string;
  updated_at: string;
}

export interface DisputeRecord {
  id: string;
  trip_id: string;
  payment_id: string;
  status: string;
  reason_code: string;
  description: string | null;
  requested_action: string | null;
  opened_at: string;
  resolved_at: string | null;
}

export interface TruckChat {
  id: string;
  truck_availability_id: string;
  shipper_id: string;
  load_id: string | null;
  status: string;
  chat_enabled_by_shipper?: boolean | null;
}

export interface TruckChatMessage {
  id: string;
  chat_id: string;
  sender_user_id: string;
  sender_role: string;
  message: string | null;
  attachments: any[];
  created_at: string;
}

export interface TruckChatSummary {
  chat: TruckChat;
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
  last_message: TruckChatMessage | null;
}

export type IndividualPackageCode = "FREE" | "PAID";

export interface IndividualPackage {
  id: string | number;
  code: IndividualPackageCode;
  name: string;
  description: string | null;
  features: {
    feature_list?: string[];
    trip_tracking_limit?: number;
    documents_validation_limit?: number;
    outside_trips_limit?: number;
    trips_unlimited?: boolean;
    [key: string]: any;
  };
}

export interface IndividualPackagesResponse {
  packages: IndividualPackage[];
  paid_monthly_price: number | null;
  paid_yearly_price: number | null;
  currency: string | null;
}

export async function fetchPublicIndividualPackages(): Promise<IndividualPackagesResponse> {
  const response = await fetch(`${API_BASE_URL}/api/pricing/individual-packages`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed (${response.status})`);
  }
  const payload = await response.json();
  return {
    packages: payload?.packages ?? [],
    paid_monthly_price:
      payload?.paid_monthly_price !== undefined ? payload.paid_monthly_price : null,
    paid_yearly_price:
      payload?.paid_yearly_price !== undefined ? payload.paid_yearly_price : null,
    currency: payload?.currency ?? null,
  };
}

export async function fetchLoadOffers(loadId: string, page = 1, pageSize = 20) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  }).toString();
  return marketplaceRequest<{ items: LoadOffer[]; total: number; page: number; pageSize: number }>(
    `/loads/${loadId}/offers?${query}`
  );
}

export async function fetchHaulerOfferSummaries() {
  return marketplaceRequest<{ items: HaulerOfferSummary[] }>(
    `/hauler/offers/summary`
  );
}

export async function fetchShipperOfferCount() {
  return marketplaceRequest<{ count: number }>(`/shipper/offers/count`);
}

export async function createLoadOfferRequest(loadId: string, payload: {
  offered_amount: number;
  currency?: string;
  message?: string;
  expires_at?: string | null;
  truck_id?: string;
}) {
  return marketplaceRequest<{ offer: LoadOffer }>(`/loads/${loadId}/offers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateLoadOffer(offerId: string, payload: {
  offered_amount?: number;
  currency?: string;
  message?: string | null;
  expires_at?: string | null;
  chat_enabled_by_shipper?: boolean;
  chat_enabled_by_hauler?: boolean;
}) {
  return marketplaceRequest<{ offer: LoadOffer }>(`/load-offers/${offerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function withdrawOffer(offerId: string) {
  return marketplaceRequest<{ offer: LoadOffer }>(`/load-offers/${offerId}/withdraw`, {
    method: "POST",
  });
}

export async function rejectOffer(offerId: string) {
  return marketplaceRequest<{ offer: LoadOffer }>(`/load-offers/${offerId}/reject`, {
    method: "POST",
  });
}

export async function acceptOffer(offerId: string) {
  return marketplaceRequest<{ offer: LoadOffer; trip: TripRecord; payment: PaymentRecord }>(
    `/load-offers/${offerId}/accept`,
    { method: "POST" }
  );
}

export async function fetchOfferMessages(offerId: string) {
  return marketplaceRequest<{ items: OfferMessage[] }>(`/load-offers/${offerId}/messages`);
}

export async function postOfferMessage(offerId: string, payload: { text?: string; attachments?: unknown[] }) {
  return marketplaceRequest<{ message: OfferMessage }>(`/load-offers/${offerId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchTrip(tripId: string) {
  return marketplaceRequest<TripEnvelope>(`/trips/${tripId}`);
}

export async function fetchTripByLoadId(loadId: string | number) {
  return marketplaceRequest<TripEnvelope>(`/loads/${loadId}/trip`);
}

export async function fetchHaulerDrivers() {
  return marketplaceRequest<{ items: HaulerDriverOption[] }>(`/hauler/drivers`);
}

export async function fetchHaulerVehicles() {
  return marketplaceRequest<{ items: HaulerVehicleOption[] }>(`/hauler/vehicles`);
}

export async function createEscrowPaymentIntent(
  tripId: string,
  payload: { provider?: string; payment_method_id?: string; save_payment_method?: boolean } = {}
) {
  return marketplaceRequest<{ payment: PaymentRecord; client_secret: string | null }>(
    `/trips/${tripId}/escrow/payment-intent`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function triggerPaymentWebhook(intentId: string, event: "payment_succeeded" | "payment_failed") {
  return marketplaceRequest<{ ok: boolean }>(`/webhooks/payment-provider`, {
    method: "POST",
    body: JSON.stringify({ external_intent_id: intentId, event }),
  });
}

export async function assignTripDriver(tripId: string | number, driverId: string | number) {
  return marketplaceRequest<{ trip: TripRecord }>(`/trips/${tripId}/assign-driver`, {
    method: "PATCH",
    body: JSON.stringify({ driver_id: driverId }),
  });
}

export async function assignTripVehicle(tripId: string | number, vehicleId: string | number) {
  return marketplaceRequest<{ trip: TripRecord }>(`/trips/${tripId}/assign-vehicle`, {
    method: "PATCH",
    body: JSON.stringify({ vehicle_id: vehicleId }),
  });
}

export async function startMarketplaceTrip(tripId: string | number) {
  return marketplaceRequest<{ trip: TripRecord; load: { id: string } }>(`/trips/${tripId}/start`, {
    method: "POST",
  });
}

export async function markMarketplaceTripDelivered(
  tripId: string | number,
  payload?: {
    received_amount?: number;
    received_payment_method?: "CASH" | "BANK_TRANSFER" | "OTHER";
    received_reference?: string | null;
    received_at?: string | null;
  }
) {
  return marketplaceRequest<{ trip: TripRecord; load: { id: string } }>(
    `/trips/${tripId}/mark-delivered`,
    { method: "POST", body: payload ? JSON.stringify(payload) : undefined }
  );
}

export async function confirmMarketplaceTripDelivery(tripId: string | number) {
  return marketplaceRequest<{ trip: TripRecord; load: { id: string } }>(
    `/trips/${tripId}/confirm-delivery`,
    { method: "POST" }
  );
}

export async function fetchTruckAvailability(
  params: { origin?: string; scope?: "mine"; nearLat?: number; nearLng?: number; radiusKm?: number } = {}
) {
  const query = new URLSearchParams();
  if (params.origin) query.set("origin", params.origin);
  if (params.scope) query.set("scope", params.scope);
  if (params.nearLat !== undefined && params.nearLng !== undefined) {
    query.set("near_lat", String(params.nearLat));
    query.set("near_lng", String(params.nearLng));
    if (params.radiusKm) {
      query.set("radius_km", String(params.radiusKm));
    }
  }
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return marketplaceRequest<{ items: TruckAvailability[] }>(`/truck-board${suffix}`);
}

export async function createTruckAvailabilityEntry(payload: {
  truck_id?: string | null;
  origin_location_text: string;
  destination_location_text?: string | null;
  available_from: string;
  available_until?: string | null;
  capacity_headcount?: number | null;
  capacity_weight_kg?: number | null;
  allow_shared?: boolean;
  notes?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
}) {
  return marketplaceRequest<{ availability: TruckAvailability }>(`/truck-board`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTruckAvailabilityEntry(
  id: string,
  payload: Partial<{
    truck_id: string | null;
    origin_location_text: string;
    destination_location_text: string | null;
    available_from: string;
    available_until: string | null;
    capacity_headcount: number | null;
    capacity_weight_kg: number | null;
    allow_shared: boolean;
    notes: string | null;
    is_active: boolean;
    origin_lat: number | null;
    origin_lng: number | null;
    destination_lat: number | null;
    destination_lng: number | null;
  }>
) {
  return marketplaceRequest<{ availability: TruckAvailability | null }>(`/truck-board/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTruckAvailabilityEntry(id: string) {
  return marketplaceRequest<{ availability: TruckAvailability | null }>(`/truck-board/${id}`, {
    method: "DELETE",
  });
}

export async function requestBookingForOffer(offerId: string, payload: { notes?: string } = {}) {
  return marketplaceRequest<{ booking: LoadBooking }>(`/load-offers/${offerId}/bookings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestBookingForTruckListing(
  availabilityId: string,
  payload: {
    load_id: number | string;
    requested_headcount?: number | null;
    requested_weight_kg?: number | null;
    offered_amount?: number | null;
    offered_currency?: string | null;
    notes?: string | null;
  }
) {
  return marketplaceRequest<{ booking: LoadBooking }>(`/truck-board/${availabilityId}/bookings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchBookings() {
  return marketplaceRequest<{ items: LoadBooking[] }>(`/bookings`);
}

export async function respondToBooking(bookingId: string, action: "accept" | "reject") {
  const path =
    action === "accept" ? `/bookings/${bookingId}/accept` : `/bookings/${bookingId}/reject`;
  return marketplaceRequest<{ booking: LoadBooking }>(path, { method: "POST" });
}

export async function createTripDispute(
  tripId: string | number,
  payload: { reason_code: string; description?: string; requested_action?: string }
) {
  return marketplaceRequest<{ dispute: DisputeRecord }>(`/trips/${tripId}/disputes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchTripDisputes(tripId: string | number) {
  return marketplaceRequest<{ items: DisputeRecord[] }>(`/trips/${tripId}/disputes`);
}

export async function cancelDispute(disputeId: string | number) {
  return marketplaceRequest<{ dispute: DisputeRecord }>(`/disputes/${disputeId}/cancel`, {
    method: "POST",
  });
}

export async function startTruckChat(
  availabilityId: string,
  payload: { load_id?: string | number; message?: string; attachments?: unknown[] }
) {
  return marketplaceRequest<{ chat: TruckChat; message: TruckChatMessage | null }>(
    `/truck-board/${availabilityId}/chat`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function sendTruckChatMessage(
  chatId: string,
  payload: { message?: string; attachments?: unknown[] }
) {
  return marketplaceRequest<{ message: TruckChatMessage }>(
    `/truck-chats/${chatId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchTruckChatMessages(chatId: string) {
  return marketplaceRequest<{ items: TruckChatMessage[] }>(`/truck-chats/${chatId}/messages`);
}

export async function fetchTruckChats() {
  return marketplaceRequest<{ items: TruckChatSummary[] }>(`/truck-chats`);
}

export async function updateTruckChat(
  chatId: string,
  payload: { chat_enabled_by_shipper: boolean }
) {
  return marketplaceRequest<{ chat: TruckChat }>(`/truck-chats/${chatId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface HaulerSummary {
  id: string;
  name: string | null;
  fleet_count: number;
  driver_count: number;
  completed_trips: number;
  rating: number | null;
}

export async function fetchHaulerSummary(haulerId: string) {
  return marketplaceRequest<{ summary: HaulerSummary }>(
    `/haulers/${haulerId}/summary`
  );
}

export type HaulerType = "INDIVIDUAL" | "COMPANY";

export interface HaulerSubscriptionState {
  hauler_type: HaulerType;
  free_trip_used: boolean;
  free_trip_used_at: string | null;
  subscription_status: "NONE" | "ACTIVE" | "CANCELED" | "EXPIRED";
  subscription_current_period_end: string | null;
  current_individual_monthly_price: number | null;
  monthly_price?: number | null;
  yearly_price?: number | null;
  billing_cycle?: "MONTHLY" | "YEARLY" | null;
  individual_plan_code?: string | null;
  note?: string;
}

export async function fetchHaulerSubscription() {
  return haulerRequest<HaulerSubscriptionState>(`/subscription`);
}

export async function subscribeHauler(payload?: { billing_cycle?: "MONTHLY" | "YEARLY" }) {
  return haulerRequest<HaulerSubscriptionState>(
    `/subscription/subscribe`,
    {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }
  );
}
