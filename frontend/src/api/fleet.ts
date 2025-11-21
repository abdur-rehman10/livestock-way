import { API_BASE_URL } from "../lib/api";

function getAuthHeaders(headers: Record<string, string> = {}) {
  if (typeof window === "undefined") return headers;
  const token = window.localStorage.getItem("token");
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

async function fleetRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: getAuthHeaders({
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Fleet request failed (${response.status})`);
  }
  if (response.status === 204) {
    return null as T;
  }
  return (await response.json()) as T;
}

export interface DriverRecord {
  id: number;
  hauler_id: number;
  full_name: string;
  phone_number: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: string;
  created_at: string;
}

export interface TruckRecord {
  id: number;
  hauler_id: number;
  plate_number: string;
  truck_type: string;
  capacity: number | null;
  status: string;
  truck_name?: string | null;
  species_supported?: string | null;
  notes?: string | null;
  created_at: string;
}

export async function fetchDrivers() {
  return fleetRequest<{ items: DriverRecord[] }>("/api/drivers");
}

export async function createDriver(payload: {
  full_name: string;
  phone: string;
  license_number: string;
  license_expiry?: string | null;
}) {
  const [firstName, ...rest] = payload.full_name.trim().split(" ");
  const lastName = rest.join(" ") || firstName;
  return fleetRequest<DriverRecord>("/api/drivers", {
    method: "POST",
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      phone: payload.phone,
      license_number: payload.license_number,
      license_expiry: payload.license_expiry ?? null,
    }),
  });
}

export async function updateDriverStatus(id: number, status: string) {
  return fleetRequest<DriverRecord>(`/api/drivers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteDriver(id: number) {
  return fleetRequest<DriverRecord>(`/api/drivers/${id}`, { method: "DELETE" });
}

export async function fetchTrucks() {
  return fleetRequest<{ items: TruckRecord[] }>("/api/trucks");
}

export async function createTruck(payload: {
  truck_name: string;
  plate_number: string;
  truck_type: string;
  capacity_weight_kg?: number | null;
  species_supported?: string | null;
  notes?: string | null;
}) {
  return fleetRequest<{ truck: TruckRecord }>(`/api/trucks`, {
    method: "POST",
    body: JSON.stringify({
      truck_name: payload.truck_name,
      plate_number: payload.plate_number,
      truck_type: payload.truck_type,
      capacity: payload.capacity_weight_kg ?? null,
      species_supported: payload.species_supported ?? null,
      notes: payload.notes ?? null,
    }),
  });
}

export async function deleteTruck(id: number) {
  return fleetRequest<TruckRecord>(`/api/trucks/${id}`, { method: "DELETE" });
}
