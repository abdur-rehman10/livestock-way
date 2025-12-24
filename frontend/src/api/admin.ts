import { API_BASE_URL } from "../lib/api";
import type { SupportTicketMessage } from "../lib/types";

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  const response = await fetch(`${API_BASE_URL}/api/admin${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export interface AdminStats {
  users: {
    total_users: number;
    pending_users: number;
    verified_users: number;
    haulers: number;
    shippers: number;
    stakeholders: number;
  };
  loads: {
    total_loads: number;
    open_loads: number;
    active_loads: number;
  };
  trips: {
    total_trips: number;
    active_trips: number;
    completed_trips: number;
  };
  payments: {
    total_volume: string;
    escrow_payments: number;
    released_payments: number;
  };
  kyc: {
    pending_kyc: number;
    approved_kyc: number;
  };
  disputes: {
    total_disputes: number;
    open_disputes: number;
  };
  support: {
    total_tickets: number;
    open_tickets: number;
    closed_tickets: number;
  };
}

export interface AdminUserRecord {
  id: number;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  user_type: string | null;
  account_status: string | null;
  company_name: string | null;
  created_at: string;
  loads_posted: number;
  trips_managed: number;
  payments_touching: number;
}

export interface SupportTicketRecord {
  id: number;
  user_id: string;
  user_role: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  resolution_notes?: string | null;
  resolved_by_user_id?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface AdminDisputeRecord {
  id: string;
  payment_id: string;
  trip_id: string;
  status: string;
  reason_code: string;
  description: string | null;
  requested_action: string | null;
  opened_by_user_id: string;
  created_at: string;
  updated_at: string | null;
  amount?: string | null;
  currency?: string | null;
  trip_status?: string | null;
  load_title?: string | null;
  payment_mode?: "ESCROW" | "DIRECT";
  direct_payment_disclaimer_accepted_at?: string | null;
  direct_payment_disclaimer_version?: string | null;
}

export interface AdminEarningRecord {
  payment_id: string;
  trip_id: string | null;
  load_id: string | null;
  amount: string;
  currency: string;
  status: string;
  commission_amount: string | null;
  commission_bps: number | null;
  created_at: string;
  updated_at: string | null;
  trip_status: string | null;
  hauler_name: string | null;
  shipper_name: string | null;
  route: string | null;
  species: string | null;
}

export interface AdminEarningsResponse {
  stats: {
    total_commission: string;
    last_30_days: string;
    avg_commission: string;
    fee_payments: number;
  };
  items: AdminEarningRecord[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return adminRequest<AdminStats>("/stats");
}

export async function fetchAdminUsers(params: { status?: string; role?: string }) {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.role && params.role !== "all") query.set("role", params.role);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return adminRequest<{ items: AdminUserRecord[] }>(`/users${suffix}`);
}

export async function updateAdminUserStatus(userId: number, status: string) {
  return adminRequest<{ user: AdminUserRecord }>(`/users/${userId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function fetchSupportTickets(params: { status?: string }) {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return adminRequest<{ items: SupportTicketRecord[] }>(`/support-tickets${suffix}`);
}

export async function updateSupportTicketStatus(
  ticketId: number,
  status: string,
  resolution_notes?: string
): Promise<{ ticket: SupportTicketRecord }> {
  return adminRequest<{ ticket: SupportTicketRecord }>(`/support-tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, resolution_notes }),
  });
}

export async function fetchSupportTicketMessages(ticketId: number) {
  return adminRequest<{ items: SupportTicketMessage[] }>(`/support-tickets/${ticketId}/messages`);
}

export async function postSupportTicketMessage(ticketId: number, payload: { message: string }) {
  return adminRequest<{ message: SupportTicketMessage }>(`/support-tickets/${ticketId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminDisputes(params: { status?: string }) {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return adminRequest<{ items: AdminDisputeRecord[] }>(`/disputes${suffix}`);
}

export async function fetchAdminEarnings(): Promise<AdminEarningsResponse> {
  return adminRequest<AdminEarningsResponse>("/earnings");
}
