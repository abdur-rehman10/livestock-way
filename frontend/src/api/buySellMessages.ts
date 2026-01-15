import { API_BASE_URL } from "../lib/api";

const BUY_SELL_MESSAGES_BASE = `${API_BASE_URL}/api/buy-sell-messages`;

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

export interface BuySellApplicationThread {
  id: number;
  listing_id: number;
  application_id: number;
  listing_poster_user_id: number;
  applicant_user_id: number;
  is_active: boolean;
  first_message_sent: boolean;
  created_at: string;
  updated_at: string;
  listing_title?: string;
  applicant_name?: string;
  listing_poster_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  listing_poster_last_read_at?: string | null;
  applicant_last_read_at?: string | null;
}

export interface BuySellApplicationMessage {
  id: number;
  thread_id: number;
  sender_user_id: number;
  sender_role: string;
  message: string;
  attachments: any[];
  created_at: string;
  sender_name?: string;
}

export async function fetchUserBuySellThreads(): Promise<BuySellApplicationThread[]> {
  const response = await fetch(`${BUY_SELL_MESSAGES_BASE}/threads`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch threads (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.threads;
}

export async function fetchBuySellThreadById(threadId: number): Promise<BuySellApplicationThread> {
  const response = await fetch(`${BUY_SELL_MESSAGES_BASE}/threads/${threadId}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch thread (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.thread;
}

export async function fetchBuySellThreadByListingAndApplication(
  listingId: number,
  applicationId: number
): Promise<BuySellApplicationThread> {
  const response = await fetch(`${BUY_SELL_MESSAGES_BASE}/threads/by-listing/${listingId}/${applicationId}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch thread (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.thread;
}

export async function fetchBuySellThreadMessages(threadId: number): Promise<BuySellApplicationMessage[]> {
  const response = await fetch(`${BUY_SELL_MESSAGES_BASE}/threads/${threadId}/messages`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch messages (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.messages;
}

export async function sendBuySellMessage(
  threadId: number,
  message: string,
  attachments?: any[]
): Promise<BuySellApplicationMessage> {
  const response = await fetch(`${BUY_SELL_MESSAGES_BASE}/threads/${threadId}/messages`, {
    method: "POST",
    headers: buildHeaders("POST", true),
    body: JSON.stringify({ message, attachments }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to send message (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.message;
}
