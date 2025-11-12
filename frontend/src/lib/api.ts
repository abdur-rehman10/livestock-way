// frontend/src/lib/api.ts

// You can later move this to an env variable (Vite style).
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export interface Load {
  id: number;
  title: string;
  species: string;
  quantity: number;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string; // comes as ISO string from backend
  offer_price: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
}

export interface CreateLoadPayload {
  title: string;
  species: string;
  quantity: number;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string; // ISO string
  offer_price?: number | null;
  created_by?: string | null;
}

/**
 * Fetch all loads for the public loadboard.
 */
export async function fetchLoads(): Promise<Load[]> {
  const response = await fetch(`${API_BASE_URL}/api/loads`);

  if (!response.ok) {
    throw new Error(`Failed to fetch loads (status ${response.status})`);
  }

  const json = await response.json();

  // Backend returns { status: "OK", data: [...] }
  return json.data as Load[];
}

export async function createLoad(payload: CreateLoadPayload): Promise<Load> {
  const response = await fetch(`${API_BASE_URL}/api/loads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

export async function fetchMyLoads(createdBy: string): Promise<Load[]> {
  const url = new URL(`${API_BASE_URL}/api/loads`);

  if (createdBy) {
    url.searchParams.set("created_by", createdBy);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch my loads (status ${response.status})`);
  }

  const json = await response.json();

  return json.data as Load[];
}
