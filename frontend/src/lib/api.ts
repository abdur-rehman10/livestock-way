import type { Payment } from "./types";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export interface Load {
  id: number;
  title: string;
  species: string;
  quantity: number;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  offer_price: string | null;
  status: "open" | "assigned" | "in_transit" | "delivered";
  created_by: string | null;
  created_at: string;
  assigned_to?: string | null;
  assigned_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  epod_url?: string | null;
}

export interface CreateLoadPayload {
  title: string;
  species: string;
  quantity: number;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  offer_price?: number | null;
  created_by?: string | null;
}

export async function fetchLoads(): Promise<Load[]> {
  const response = await fetch(`${API_BASE_URL}/api/loads`);
  if (!response.ok) {
    throw new Error(`Failed to fetch loads (status ${response.status})`);
  }
  const json = await response.json();
  return json.data as Load[];
}

export async function createLoad(payload: CreateLoadPayload): Promise<Load> {
  const response = await fetch(`${API_BASE_URL}/api/loads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to create load (status ${response.status}): ${errorText}`
    );
  }
  const json = await response.json();
  return json.data as Load;
}

export async function fetchLoadsByAssigned(assignedTo: string): Promise<Load[]> {
  const url = new URL(`${API_BASE_URL}/api/loads`);
  url.searchParams.set("assigned_to", assignedTo);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch assigned loads (${response.status})`);
  }
  const json = await response.json();
  return json.data as Load[];
}

export async function fetchLoadsByCreator(creatorId: string): Promise<Load[]> {
  const url = new URL(`${API_BASE_URL}/api/loads`);
  if (creatorId) {
    url.searchParams.set("created_by", creatorId);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch loads for shipper (${response.status})`);
  }
  const json = await response.json();
  return json.data as Load[];
}

export async function assignLoad(
  loadId: number,
  haulerId: string
): Promise<Load> {
  const response = await fetch(`${API_BASE_URL}/api/loads/${loadId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assigned_to: haulerId }),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to assign load (status ${response.status}): ${errorText}`
    );
  }
  const json = await response.json();
  return json.data as Load;
}

export async function startLoad(loadId: number): Promise<Load> {
  const response = await fetch(`${API_BASE_URL}/api/loads/${loadId}/start`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to start load (${response.status})`);
  }
  const json = await response.json();
  return json.data as Load;
}

export async function completeLoad(
  loadId: number,
  epodUrl?: string
): Promise<Load> {
  const response = await fetch(`${API_BASE_URL}/api/loads/${loadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ epod_url: epodUrl ?? null }),
  });
  if (!response.ok) {
    throw new Error(`Failed to complete load (${response.status})`);
  }
  const json = await response.json();
  return json.data as Load;
}

export async function uploadEpod(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE_URL}/api/uploads/epod`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Failed to upload ePOD (${response.status})`);
  }
  const json = await response.json();
  return json.url as string;
}

export type LoadDetail = Load;
export type LoadSummary = Load;

export async function fetchLoadsForHauler(
  haulerId: string
): Promise<LoadSummary[]> {
  const url = new URL(`${API_BASE_URL}/api/loads`);
  url.searchParams.set("assigned_to", haulerId);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch loads for hauler (${response.status})`);
  }
  const json = await response.json();
  return json.data as LoadSummary[];
}

export async function fetchLoadsForShipper(
  shipperId: string
): Promise<LoadSummary[]> {
  const url = new URL(`${API_BASE_URL}/api/loads`);
  url.searchParams.set("created_by", shipperId);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Failed to fetch loads for shipper ${shipperId} (${response.status})`
    );
  }
  const json = await response.json();
  return json.data as LoadSummary[];
}

export async function fetchLoadById(id: number): Promise<LoadDetail> {
  const response = await fetch(`${API_BASE_URL}/api/loads/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch load ${id} (${response.status})`);
  }
  const json = await response.json();
  return json.data as LoadDetail;
}

export async function fetchPaymentsForUser(
  userId: string,
  role: "shipper" | "hauler" | "driver" | "stakeholder"
): Promise<Payment[]> {
  const url = new URL(`${API_BASE_URL}/api/payments`);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("role", role);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch payments (${response.status})`);
  }
  return (await response.json()) as Payment[];
}
