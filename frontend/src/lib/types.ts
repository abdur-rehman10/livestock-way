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
