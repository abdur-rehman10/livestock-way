import { API_BASE_URL } from "../lib/api";

const JOB_MESSAGES_BASE = `${API_BASE_URL}/api/job-messages`;

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

export interface JobApplicationThread {
  id: number;
  job_id: number;
  application_id: number;
  job_poster_user_id: number;
  applicant_user_id: number;
  is_active: boolean;
  first_message_sent: boolean;
  created_at: string;
  updated_at: string;
  job_title?: string;
  applicant_name?: string;
  job_poster_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  job_poster_last_read_at?: string | null;
  applicant_last_read_at?: string | null;
}

export interface JobApplicationMessage {
  id: number;
  thread_id: number;
  sender_user_id: number;
  sender_role: string;
  message: string;
  attachments: any[];
  created_at: string;
  sender_name?: string;
}

export async function fetchUserThreads(): Promise<JobApplicationThread[]> {
  const response = await fetch(`${JOB_MESSAGES_BASE}/threads`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch threads (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.threads;
}

export async function fetchThreadById(threadId: number): Promise<JobApplicationThread> {
  const response = await fetch(`${JOB_MESSAGES_BASE}/threads/${threadId}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch thread (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.thread;
}

export async function fetchThreadByJobAndApplication(
  jobId: number,
  applicationId: number
): Promise<JobApplicationThread> {
  const response = await fetch(`${JOB_MESSAGES_BASE}/threads/by-job/${jobId}/${applicationId}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch thread (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.thread;
}

export async function fetchThreadMessages(threadId: number): Promise<JobApplicationMessage[]> {
  const response = await fetch(`${JOB_MESSAGES_BASE}/threads/${threadId}/messages`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch messages (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.messages;
}

export async function sendMessage(
  threadId: number,
  message: string,
  attachments?: any[]
): Promise<JobApplicationMessage> {
  const response = await fetch(`${JOB_MESSAGES_BASE}/threads/${threadId}/messages`, {
    method: "POST",
    headers: buildHeaders("POST", true),
    body: JSON.stringify({ message, attachments }),
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
      return data as JobApplicationMessage;
    }
    // Otherwise check if it's wrapped in a message property
    if (data.message && typeof data.message === "object") {
      return data.message as JobApplicationMessage;
    }
  }
  
  console.error("Unexpected response format:", data);
  throw new Error("Invalid message response format");
}
