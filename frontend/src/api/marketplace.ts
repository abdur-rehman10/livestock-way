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
}

export interface TripEnvelope {
  trip: TripRecord;
  load: { id: string; title?: string; status: string };
  payment: PaymentRecord | null;
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
