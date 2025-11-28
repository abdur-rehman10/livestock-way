import { API_BASE_URL } from "../lib/api";

function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("token");
}

function authHeaders(headers: Record<string, string> = {}) {
  const token = getAuthToken();
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

export interface KycDocumentRecord {
  id: number;
  doc_type: string;
  file_url: string;
  uploaded_at: string;
}

export interface KycRequestRecord {
  id: number;
  user_id: number;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
  full_name?: string | null;
  email?: string | null;
  user_type?: string | null;
  documents: KycDocumentRecord[];
}

export async function uploadKycDocument(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const response = await authFetch("/api/uploads/kyc", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to upload document");
  }
  const data = await response.json();
  return { url: data.url as string };
}

export async function submitKycRequest(documents: Array<{ doc_type: string; file_url: string }>) {
  const response = await authFetch("/api/kyc/requests", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ documents }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to submit KYC");
  }
  return (await response.json()) as KycRequestRecord;
}

export async function fetchMyKycRequest(): Promise<KycRequestRecord | null> {
  const response = await authFetch("/api/kyc/requests/me");
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to load KYC status");
  }
  return (await response.json()) as KycRequestRecord | null;
}

export async function listKycRequests(status?: string): Promise<KycRequestRecord[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await authFetch(`/api/kyc/requests${params}`);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to load KYC requests");
  }
  return (await response.json()) as KycRequestRecord[];
}

export async function reviewKycRequest(
  id: number,
  status: "approved" | "rejected",
  review_notes?: string
): Promise<KycRequestRecord> {
  const response = await authFetch(`/api/kyc/requests/${id}/review`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status, review_notes }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to update KYC request");
  }
  return (await response.json()) as KycRequestRecord;
}
