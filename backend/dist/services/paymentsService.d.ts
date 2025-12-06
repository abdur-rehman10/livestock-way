import { PoolClient } from "pg";
interface CreatePaymentArgs {
    tripId: number;
    loadId?: number | null;
    shipperUserId: number;
    haulerUserId: number;
    amount: number;
    currency?: string;
    client?: PoolClient;
}
type PaymentStatus = "PENDING_FUNDING" | "FUNDED" | "RELEASED" | string;
export interface PaymentRecord {
    id: number;
    trip_id: number | null;
    load_id: number | null;
    payer_id: string | null;
    payer_role: string;
    payee_id: string | null;
    payee_role: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    created_at: string;
    updated_at: string | null;
    funded_at: string | null;
    funded_by_user_id?: string | null;
    released_at: string | null;
    released_by_user_id?: string | null;
    platform_commission_amount: number;
    commission_percent: number;
    hauler_payout_amount: number;
    pickup_location?: string | null;
    dropoff_location?: string | null;
    split_amount_to_hauler?: number | null;
    split_amount_to_shipper?: number | null;
    split_resolved_at?: string | null;
}
export declare function mapPaymentRow(row: any): PaymentRecord;
export declare function createPaymentForTrip(args: CreatePaymentArgs): Promise<PaymentRecord>;
export declare function getPaymentById(paymentId: number, client?: PoolClient): Promise<PaymentRecord | null>;
export declare function getPaymentByTripId(tripId: number, client?: PoolClient): Promise<PaymentRecord | null>;
export declare function fundPayment(paymentId: number, fundedByUserId: number, client?: PoolClient): Promise<PaymentRecord | null>;
export declare function releasePayment(paymentId: number, client?: PoolClient, releasedByUserId?: number | null): Promise<PaymentRecord | null>;
export declare function releasePaymentForTrip(tripId: number, options?: {
    defaultCommissionPercent?: number;
    releasedByUserId?: number | null;
    client?: PoolClient;
}): Promise<PaymentRecord | null>;
export {};
//# sourceMappingURL=paymentsService.d.ts.map