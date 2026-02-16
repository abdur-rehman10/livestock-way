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

export interface ServiceListing {
  id: number;
  title: string;
  service_type?: string | null;
  description?: string | null;
  location_name?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  price_type?: string;
  base_price?: number | null;
  availability?: string | null;
  response_time?: string | null;
  certifications?: string | null;
  insured?: boolean;
  images?: string[];
  status?: string;
}

export interface ServiceBooking {
  id: number;
  service_id: number;
  hauler_user_id?: number;
  hauler_name?: string | null;
  hauler_company?: string | null;
  price?: number | null;
  notes?: string | null;
  status: string;
  payment_status: string;
  created_at: string;
  service?: ServiceListing;
}

export interface CreateServicePayload {
  title: string;
  service_type?: string | null;
  description?: string | null;
  location_name?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  price_type?: string | null;
  base_price?: number | null;
  availability?: string | null;
  response_time?: string | null;
  certifications?: string | null;
  insured?: boolean;
  images?: string[];
}

export interface UpdateServicePayload extends Partial<CreateServicePayload> {}

export async function fetchServices(): Promise<ServiceListing[]> {
  const res = await fetch(`${API_BASE_URL}/api/services`);
  if (!res.ok) {
    throw new Error(`Failed to load services (${res.status})`);
  }
  const json = await res.json();
  return json.items ?? [];
}

export async function bookService(serviceId: number, payload?: { price?: number | null; notes?: string | null }) {
  const res = await fetch(`${API_BASE_URL}/api/services/${serviceId}/book`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to request service (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.booking as ServiceBooking;
}

export async function createService(payload: CreateServicePayload): Promise<ServiceListing> {
  const res = await fetch(`${API_BASE_URL}/api/services`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create service (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.service as ServiceListing;
}

export async function uploadServiceImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/uploads/service-image`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to upload image (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.url as string;
}

export async function fetchMyServiceBookings(): Promise<ServiceBooking[]> {
  const res = await fetch(`${API_BASE_URL}/api/services/bookings/hauler/mine`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load service bookings (${res.status})`);
  }
  const json = await res.json();
  return json.items ?? [];
}

export async function fetchMyServices(): Promise<ServiceListing[]> {
  const res = await fetch(`${API_BASE_URL}/api/services/mine`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load my services (${res.status})`);
  }
  const json = await res.json();
  return json.items ?? [];
}

export async function fetchProviderServiceBookings(filters?: { status?: string[]; payment_status?: string[] }): Promise<ServiceBooking[]> {
  const url = new URL(`${API_BASE_URL}/api/services/bookings/provider/mine`);
  if (filters?.status?.length) {
    url.searchParams.set("status", filters.status.join(","));
  }
  if (filters?.payment_status?.length) {
    url.searchParams.set("payment_status", filters.payment_status.join(","));
  }
  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load provider bookings (${res.status})`);
  }
  const json = await res.json();
  return json.items ?? [];
}

export async function respondToServiceBooking(bookingId: number, action: "accept" | "reject" | "complete") {
  const url = `${API_BASE_URL}/api/services/bookings/${bookingId}/${action}`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to ${action} booking (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.booking as ServiceBooking;
}

export async function payForServiceBooking(bookingId: number) {
  const res = await fetch(`${API_BASE_URL}/api/services/bookings/${bookingId}/pay`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to mark paid (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.booking as ServiceBooking;
}

export async function confirmServiceBookingPayment(bookingId: number) {
  const res = await fetch(`${API_BASE_URL}/api/services/bookings/${bookingId}/confirm-payment`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to confirm payment (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.booking as ServiceBooking;
}

export async function updateService(serviceId: number, payload: UpdateServicePayload): Promise<ServiceListing> {
  const res = await fetch(`${API_BASE_URL}/api/services/${serviceId}`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update service (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.service as ServiceListing;
}

export async function deleteService(serviceId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/services/${serviceId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete service (${res.status}): ${text}`);
  }
}

/* ---------- Provider Dashboard ---------- */

export interface ProviderDashboardActivity {
  id: string;
  action: string;
  resource: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ProviderDashboardBooking {
  id: string;
  status: string;
  payment_status: string;
  price: number | null;
  created_at: string;
  service_title: string;
  service_type: string | null;
  city: string | null;
  state: string | null;
}

export interface ProviderDashboardStats {
  active_services_count: number;
  pending_bookings_count: number;
  completed_bookings_count: number;
  active_resources_count: number;
  pending_bookings: ProviderDashboardBooking[];
  recent_bookings: ProviderDashboardBooking[];
  recent_activities: ProviderDashboardActivity[];
}

export async function fetchProviderDashboard(): Promise<ProviderDashboardStats> {
  const res = await fetch(`${API_BASE_URL}/api/services/provider/dashboard`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to load provider dashboard (${res.status}): ${text}`);
  }
  return (await res.json()) as ProviderDashboardStats;
}
