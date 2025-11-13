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
  load_id: number;
  user_id: string;
  user_role: string;
  type: string;
  amount: number;
  currency: string;
  note: string | null;
  created_at: string;
}
