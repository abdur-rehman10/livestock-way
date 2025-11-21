import { API_BASE_URL } from "../lib/api";

const MARKETPLACE_BASE = `${API_BASE_URL}/api/marketplace`;

type HttpMethod = "GET" | "POST" | "PATCH";

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
  status: LoadOfferStatus;
  expires_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
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

export interface TripRecord {
  id: string;
  load_id: string;
  hauler_id: string | null;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  status: string;
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
  is_escrow: boolean;
  created_at: string;
  updated_at: string;
  external_provider?: string | null;
  external_intent_id?: string | null;
  external_charge_id?: string | null;
}

export interface TripEnvelope {
  trip: TripRecord;
  load: { id: string; title?: string; status: string };
  payment: PaymentRecord | null;
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
  capacity_weight_kg: string | null;
  allow_shared: boolean;
  notes: string | null;
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

export async function fetchLoadOffers(loadId: string, page = 1, pageSize = 20) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  }).toString();
  return marketplaceRequest<{ items: LoadOffer[]; total: number; page: number; pageSize: number }>(
    `/loads/${loadId}/offers?${query}`
  );
}

export async function createLoadOfferRequest(loadId: string, payload: {
  offered_amount: number;
  currency?: string;
  message?: string;
  expires_at?: string | null;
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

export async function fetchTruckAvailability(params: { origin?: string; scope?: "mine" } = {}) {
  const query = new URLSearchParams();
  if (params.origin) query.set("origin", params.origin);
  if (params.scope) query.set("scope", params.scope);
  return marketplaceRequest<{ items: TruckAvailability[] }>(`/truck-board?${query.toString()}`);
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
}) {
  return marketplaceRequest<{ availability: TruckAvailability }>(`/truck-board`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTruckAvailabilityEntry(
  id: string,
  payload: Partial<{
    origin_location_text: string;
    destination_location_text: string | null;
    available_from: string;
    available_until: string | null;
    capacity_headcount: number | null;
    capacity_weight_kg: number | null;
    allow_shared: boolean;
    notes: string | null;
    is_active: boolean;
  }>
) {
  return marketplaceRequest<{ availability: TruckAvailability | null }>(`/truck-board/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
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
