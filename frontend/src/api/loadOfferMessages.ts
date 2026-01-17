import { API_BASE_URL } from "../lib/api";

const LOAD_OFFER_MESSAGES_BASE = `${API_BASE_URL}/api/load-offer-messages`;

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

function buildHeaders(method: string, hasJsonBody = true): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export interface LoadOfferThread {
  id: number;
  offer_id: number;
  load_id: number;
  shipper_user_id: number;
  hauler_user_id: number;
  is_active: boolean;
  first_message_sent: boolean;
  created_at: string;
  updated_at: string;
  load_title?: string;
  hauler_name?: string;
  shipper_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  shipper_last_read_at?: string | null;
  hauler_last_read_at?: string | null;
  offer_amount?: string;
  offer_currency?: string;
  offer_status?: string;
}

export interface LoadOfferMessage {
  id: number;
  thread_id: number;
  sender_user_id: number;
  sender_role: string;
  message: string;
  attachments: any[];
  created_at: string;
  sender_name?: string;
}

export async function fetchUserLoadOfferThreads(): Promise<LoadOfferThread[]> {
  const response = await fetch(`${LOAD_OFFER_MESSAGES_BASE}/threads`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch threads (${response.status}): ${text}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.threads || [];
}

export async function fetchLoadOfferThreadById(threadId: number): Promise<LoadOfferThread> {
  const response = await fetch(`${LOAD_OFFER_MESSAGES_BASE}/threads/${threadId}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch thread (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.thread || data;
}

export async function fetchLoadOfferThreadByOfferId(offerId: number): Promise<LoadOfferThread> {
  const response = await fetch(`${LOAD_OFFER_MESSAGES_BASE}/threads/by-offer/${offerId}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch thread (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.thread || data;
}

export async function fetchLoadOfferThreadMessages(threadId: number): Promise<LoadOfferMessage[]> {
  const response = await fetch(`${LOAD_OFFER_MESSAGES_BASE}/threads/${threadId}/messages`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch messages (${response.status}): ${text}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.messages || [];
}

export async function sendLoadOfferMessage(
  threadId: number,
  message: string,
  attachments?: any[]
): Promise<LoadOfferMessage> {
  const response = await fetch(`${LOAD_OFFER_MESSAGES_BASE}/threads/${threadId}/messages`, {
    method: "POST",
    headers: buildHeaders("POST", true),
    body: JSON.stringify({ message, attachments: attachments || [] }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to send message (${response.status}): ${text}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    console.error("Expected JSON response but got:", contentType, text);
    throw new Error(`Invalid response format: expected JSON but got ${contentType}`);
  }

  const data = await response.json();
  
  // Backend returns the message object directly, not wrapped in { message: ... }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    // Check if it's already a message object (has id, thread_id, etc.)
    if (data.id && data.thread_id !== undefined) {
      return data as LoadOfferMessage;
    }
    // Otherwise check if it's wrapped in a message property
    if (data.message && typeof data.message === "object") {
      return data.message as LoadOfferMessage;
    }
  }
  
  console.error("Unexpected response format:", data);
  throw new Error("Invalid message response format");
}
