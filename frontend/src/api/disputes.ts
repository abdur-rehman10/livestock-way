import { API_BASE_URL } from "../lib/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

function authHeaders(headers: HeadersInit = {}, json = true) {
  const h = new Headers(headers);
  if (json && !h.has("Content-Type")) {
    h.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token && !h.has("Authorization")) {
    h.set("Authorization", `Bearer ${token}`);
  }
  return h;
}

async function disputeRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: authHeaders(options.headers, options.body instanceof Blob ? false : true),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Dispute request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_user_id: string;
  sender_role: string;
  recipient_role?: string | null;
  text: string | null;
  attachments?: unknown[];
  created_at: string;
}

export async function fetchDisputeMessages(disputeId: string) {
  return disputeRequest<{ items: DisputeMessage[] }>(
    `/api/marketplace/disputes/${disputeId}/messages`
  );
}

export async function sendDisputeMessage(
  disputeId: string,
  payload: { text: string; recipientRole?: string }
) {
  return disputeRequest<{ message: DisputeMessage }>(
    `/api/marketplace/disputes/${disputeId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        text: payload.text,
        recipient_role: payload.recipientRole,
      }),
    }
  );
}

export async function startDisputeReview(disputeId: string) {
  return disputeRequest(`/api/marketplace/admin/disputes/${disputeId}/start-review`, {
    method: "POST",
  });
}

export async function resolveDisputeReleaseToHauler(disputeId: string) {
  return disputeRequest(`/api/marketplace/admin/disputes/${disputeId}/resolve-release`, {
    method: "POST",
  });
}

export async function resolveDisputeRefundToShipper(disputeId: string) {
  return disputeRequest(`/api/marketplace/admin/disputes/${disputeId}/resolve-refund`, {
    method: "POST",
  });
}

export async function resolveDisputeSplit(
  disputeId: string,
  amountToHauler: number,
  amountToShipper: number
) {
  return disputeRequest(`/api/marketplace/admin/disputes/${disputeId}/resolve-split`, {
    method: "POST",
    body: JSON.stringify({
      amount_to_hauler: amountToHauler,
      amount_to_shipper: amountToShipper,
    }),
  });
}
