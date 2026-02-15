import type {
  Payment,
  SupportTicket,
  SupportTicketMessage,
  TripExpense,
  TripRecord,
} from "./types";

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
  description?: string | null;
  post_link?: string | null;
  external_contact_email?: string | null;
  external_contact_phone?: string | null;
  status: "open" | "assigned" | "in_transit" | "delivered";
  created_by: string | null;
  posted_by?: string | null;
  created_at: string;
  assigned_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  epod_url?: string | null;
  awarded_offer_id?: string | null;
  assigned_to?: string | null;
  payment_mode?: "ESCROW" | "DIRECT";
  direct_payment_disclaimer_accepted_at?: string | null;
  direct_payment_disclaimer_version?: string | null;
  is_external?: boolean;
  offer_count?: number;
}

export interface CreateLoadPayload {
  title: string;
  species: string;
  quantity: number;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  offer_price?: number | null;
  price_offer_amount?: number | null;
  price_currency?: string | null;
  created_by?: string | null;
  payment_mode?: "ESCROW" | "DIRECT";
  direct_payment_disclaimer_accepted?: boolean;
  direct_payment_disclaimer_version?: string | null;
}

export async function fetchLoads(): Promise<Load[]> {
  const response = await fetch(`${API_BASE_URL}/api/loads`);
  if (!response.ok) {
    throw new Error(`Failed to fetch loads (status ${response.status})`);
  }
  const json = await response.json();
  return json.data as Load[];
}

function getAuthHeaders(headers: Record<string, string> = {}) {
  if (typeof window === "undefined") return headers;
  const token = window.localStorage.getItem("token");
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

export async function createLoad(payload: CreateLoadPayload): Promise<Load> {
  const response = await fetch(`${API_BASE_URL}/api/loads`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
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

export async function deleteLoad(loadId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/loads/${loadId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to delete load (status ${response.status}): ${errorText}`
    );
  }
}

export async function updateLoadStatus(loadId: number, status: "posted" | "cancelled") {
  const response = await fetch(`${API_BASE_URL}/api/loads/${loadId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to update load status (status ${response.status}): ${errorText}`
    );
  }
  const json = await response.json();
  return json.data as Pick<Load, "id" | "status">;
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

export interface TripRoutePlan {
  id: number;
  trip_id: number;
  plan_json: any;
  tolls_amount: number | null;
  tolls_currency: string | null;
  compliance_status: string | null;
  compliance_notes: string | null;
  created_at: string;
  updated_at: string | null;
}

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
  const raw = json.data as Partial<Load> & {
    pickup_location_text?: string | null;
    dropoff_location_text?: string | null;
    pickup_window_start?: string | null;
    pickup_date?: string | null;
  };
  const normalized: Load = {
    ...(raw as Load),
    pickup_location: raw.pickup_location ?? raw.pickup_location_text ?? "",
    dropoff_location: raw.dropoff_location ?? raw.dropoff_location_text ?? "",
    pickup_date: raw.pickup_date ?? raw.pickup_window_start ?? "",
  };
  return normalized as LoadDetail;
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

export async function fetchSupportTicketsForUser(
  userId: string,
  role: "shipper" | "hauler" | "driver" | "stakeholder"
): Promise<SupportTicket[]> {
  const url = new URL(`${API_BASE_URL}/api/support`);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("role", role);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch support tickets (${response.status})`);
  }
  return (await response.json()) as SupportTicket[];
}

interface CreateSupportTicketPayload {
  user_id: string;
  role: "shipper" | "hauler" | "driver" | "stakeholder";
  subject: string;
  message: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

export async function createSupportTicket(
  payload: CreateSupportTicketPayload
): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE_URL}/api/support`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to create support ticket (${response.status}): ${text || ""}`
    );
  }
  return (await response.json()) as SupportTicket;
}

export async function fetchSupportTicketMessagesForUser(
  ticketId: number | string,
  userId: string,
  role: "shipper" | "hauler" | "driver" | "stakeholder"
): Promise<SupportTicketMessage[]> {
  const url = new URL(`${API_BASE_URL}/api/support/${ticketId}/messages`);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("role", role);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch ticket messages (${response.status})`);
  }
  const data = await response.json();
  return data.items ?? [];
}

export async function postSupportTicketMessageForUser(
  ticketId: number | string,
  payload: { user_id: string; role: "shipper" | "hauler" | "driver" | "stakeholder"; message: string }
): Promise<SupportTicketMessage> {
  const response = await fetch(`${API_BASE_URL}/api/support/${ticketId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender_user_id: payload.user_id,
      sender_role: payload.role,
      message: payload.message,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to send ticket message (${response.status}): ${text || ""}`);
  }
  const data = await response.json();
  return data.message;
}

export async function fetchPaymentByTripId(
  tripId: number
): Promise<Payment | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/by-trip/${tripId}`,
    {
      headers: getAuthHeaders(),
    }
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to fetch payment for trip (${response.status}): ${text || ""}`
    );
  }
  return (await response.json()) as Payment;
}

export async function fundPayment(paymentId: number): Promise<Payment> {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/${paymentId}/fund`,
    {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to fund payment (${response.status}): ${text || ""}`
    );
  }
  return (await response.json()) as Payment;
}

export async function fetchTripExpenses(
  tripId: number
): Promise<TripExpense[]> {
  const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/expenses`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch trip expenses (status ${response.status})`
    );
  }
  return (await response.json()) as TripExpense[];
}

interface CreateTripExpensePayload {
  driver_id?: number | null;
  expense_type: string;
  amount: number;
  currency?: string;
  description?: string | null;
  receipt_photo_url?: string | null;
  incurred_at?: string | null;
}

export async function createTripExpense(
  tripId: number,
  payload: CreateTripExpensePayload
): Promise<TripExpense> {
  const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to create trip expense (${response.status}): ${text || ""}`
    );
  }
  return (await response.json()) as TripExpense;
}

interface UpdateTripExpensePayload {
  expense_type?: string;
  amount?: number;
  currency?: string;
  description?: string | null;
  receipt_photo_url?: string | null;
  incurred_at?: string | null;
}

export async function updateTripExpense(
  tripId: number,
  expenseId: number,
  payload: UpdateTripExpensePayload
): Promise<TripExpense> {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/${tripId}/expenses/${expenseId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to update trip expense (${response.status}): ${text || ""}`
    );
  }
  return (await response.json()) as TripExpense;
}

export async function deleteTripExpense(
  tripId: number,
  expenseId: number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/${tripId}/expenses/${expenseId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to delete trip expense (${response.status}): ${text || ""}`
    );
  }
}

export async function deleteTrip(tripId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/${tripId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `Failed to delete trip (status ${response.status})`;
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

export async function fetchTripByLoadId(
  loadId: number
): Promise<TripRecord | null> {
  const url = new URL(`${API_BASE_URL}/api/trips`);
  url.searchParams.set("load_id", String(loadId));
  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch trip for load (${response.status})`);
  }
  const trips = (await response.json()) as TripRecord[];
  return trips[0] || null;
}

export async function fetchTripRoutePlan(
  tripId: number
): Promise<TripRoutePlan | null> {
  const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/route-plan`, {
    headers: getAuthHeaders(),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch route plan (${response.status}): ${text}`);
  }
  const json = await response.json();
  return (json.plan ?? null) as TripRoutePlan | null;
}

export async function upsertTripRoutePlan(
  tripId: number,
  payload: {
    plan_json: any;
    tolls_amount?: number | null;
    tolls_currency?: string | null;
    compliance_status?: string | null;
    compliance_notes?: string | null;
  }
): Promise<TripRoutePlan> {
  const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/route-plan`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to save route plan (${response.status}): ${text}`);
  }
  const json = await response.json();
  return json.plan as TripRoutePlan;
}

export async function generateTripRoutePlan(tripId: number): Promise<TripRoutePlan> {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/${tripId}/route-plan/generate`,
    {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
    }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to generate route plan (${response.status}): ${text}`);
  }
  const json = await response.json();
  return json.plan as TripRoutePlan;
}

export interface TripLatestLocation {
  latitude: number;
  longitude: number;
  recorded_at: string;
}

export async function fetchTripLatestLocation(
  tripId: number
): Promise<TripLatestLocation | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/${tripId}/location/latest`,
    { headers: getAuthHeaders() }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch latest location (${response.status}): ${text}`);
  }
  const json = await response.json();
  const loc = json.location;
  if (loc?.latitude == null || loc?.longitude == null) return null;
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    recorded_at: loc.recorded_at ?? new Date().toISOString(),
  };
}
