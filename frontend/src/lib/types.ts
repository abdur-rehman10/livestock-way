export interface Payment {
  id: number;
  load_id: number | null;
  trip_id?: number | null;
  payer_id: string | null;
  payer_role: string;
  payee_id: string | null;
  payee_role: string;
  amount: number;
  currency: string;
  status: string;
  payment_mode?: "ESCROW" | "DIRECT";
  is_escrow?: boolean | null;
  created_at: string;
  funded_at?: string | null;
  released_by_user_id?: string | null;
  funded_by_user_id?: string | null;
  released_at: string | null;
  platform_commission_amount?: number;
  commission_percent?: number;
  hauler_payout_amount?: number;
  species?: string;
  quantity?: number;
  pickup_location?: string;
  dropoff_location?: string;
  split_amount_to_hauler?: number | null;
  split_amount_to_shipper?: number | null;
  split_resolved_at?: string | null;
}

export interface SupportTicket {
  id: number;
  user_id: string;
  user_role: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  resolution_notes?: string | null;
}

export interface SupportTicketMessage {
  id: number;
  ticket_id: number;
  sender_user_id: string | null;
  sender_role: string | null;
  message: string;
  attachments?: unknown[];
  created_at: string;
}
export interface TripExpense {
  id: number;
  trip_id: number;
  driver_id: number | null;
  expense_type: string;
  amount: number;
  currency: string;
  description: string | null;
  receipt_photo_url: string | null;
  incurred_at: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface TripRecord {
  id: number;
  load_id: number;
  hauler_id: number;
  truck_id: number;
  driver_id: number;
  status: string;
  planned_start_time: string | null;
  planned_end_time: string | null;
  route_distance_km: number | null;
  rest_stop_plan_json: any;
  created_at: string;
  updated_at: string | null;
}
