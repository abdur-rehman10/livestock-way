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
