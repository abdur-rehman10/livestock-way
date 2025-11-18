export interface Payment {
  id: number;
  load_id: number;
  payer_id: string;
  payer_role: string;
  payee_id: string;
  payee_role: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  released_at: string | null;
  species?: string;
  quantity?: number;
  pickup_location?: string;
  dropoff_location?: string;
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

export interface TripMessage {
  id: number;
  trip_id: number;
  sender: "shipper" | "hauler";
  message: string;
  created_at: string;
}
