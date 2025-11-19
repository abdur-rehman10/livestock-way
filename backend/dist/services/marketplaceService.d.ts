import { PoolClient } from "pg";
export declare enum LoadStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    AWAITING_ESCROW = "AWAITING_ESCROW",
    IN_TRANSIT = "IN_TRANSIT",
    DELIVERED = "DELIVERED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum LoadOfferStatus {
    PENDING = "PENDING",
    WITHDRAWN = "WITHDRAWN",
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED",
    ACCEPTED = "ACCEPTED"
}
export declare enum TripStatus {
    PENDING_ESCROW = "PENDING_ESCROW",
    READY_TO_START = "READY_TO_START",
    IN_PROGRESS = "IN_PROGRESS",
    DELIVERED_AWAITING_CONFIRMATION = "DELIVERED_AWAITING_CONFIRMATION",
    DELIVERED_CONFIRMED = "DELIVERED_CONFIRMED",
    DISPUTED = "DISPUTED",
    CLOSED = "CLOSED"
}
export declare enum PaymentStatus {
    AWAITING_FUNDING = "AWAITING_FUNDING",
    ESCROW_FUNDED = "ESCROW_FUNDED",
    RELEASED_TO_HAULER = "RELEASED_TO_HAULER",
    REFUNDED_TO_SHIPPER = "REFUNDED_TO_SHIPPER",
    SPLIT_BETWEEN_PARTIES = "SPLIT_BETWEEN_PARTIES",
    CANCELLED = "CANCELLED"
}
export declare enum DisputeStatus {
    OPEN = "OPEN",
    UNDER_REVIEW = "UNDER_REVIEW",
    RESOLVED_RELEASE_TO_HAULER = "RESOLVED_RELEASE_TO_HAULER",
    RESOLVED_REFUND_TO_SHIPPER = "RESOLVED_REFUND_TO_SHIPPER",
    RESOLVED_SPLIT = "RESOLVED_SPLIT",
    CANCELLED = "CANCELLED"
}
export interface LoadRecord {
    id: string;
    shipper_id: string;
    shipper_user_id: string;
    status: LoadStatus;
    currency: string | null;
    asking_amount: string | null;
    awarded_offer_id: string | null;
}
export interface LoadOfferRecord {
    id: string;
    load_id: string;
    hauler_id: string;
    created_by_user_id: string;
    offered_amount: string;
    currency: string;
    message: string | null;
    status: LoadOfferStatus;
    expires_at: string | null;
    accepted_at: string | null;
    rejected_at: string | null;
    created_at: string;
    updated_at: string;
}
export declare function getLoadOfferById(offerId: string): Promise<LoadOfferRecord | null>;
export interface TripRecord {
    id: string;
    load_id: string;
    hauler_id: string | null;
    assigned_driver_id: string | null;
    assigned_vehicle_id: string | null;
    status: TripStatus;
    started_at: string | null;
    delivered_at: string | null;
    delivered_confirmed_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface PaymentRecord {
    id: string;
    load_id: string | null;
    trip_id: string | null;
    payer_user_id: string | null;
    payee_user_id: string | null;
    amount: string;
    currency: string;
    status: PaymentStatus;
    auto_release_at: string | null;
    external_provider: string | null;
    external_intent_id: string | null;
    external_charge_id: string | null;
    is_escrow: boolean;
    created_at: string;
    updated_at: string;
}
export interface DisputeRecord {
    id: string;
    trip_id: string;
    payment_id: string;
    opened_by_user_id: string;
    opened_by_role: string;
    status: DisputeStatus;
    reason_code: string;
    description: string | null;
    requested_action: string | null;
    resolution_type: string | null;
    resolution_amount_to_hauler: string | null;
    resolution_amount_to_shipper: string | null;
    resolved_by_user_id: string | null;
    opened_at: string;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface CreateLoadOfferInput {
    loadId: string;
    haulerId: string;
    createdByUserId: string;
    offeredAmount: number;
    currency?: string;
    message?: string;
    expiresAt?: string;
}
export declare function getLoadById(loadId: string): Promise<LoadRecord | null>;
export declare function createLoadOffer(input: CreateLoadOfferInput): Promise<LoadOfferRecord>;
export declare function listLoadOffers(loadId: string, options?: {
    limit?: number;
    offset?: number;
}): Promise<{
    items: LoadOfferRecord[];
    total: number;
}>;
export declare function updateOfferStatus(offerId: string, status: LoadOfferStatus, patch?: Partial<LoadOfferRecord>): Promise<LoadOfferRecord | null>;
export declare function expireOtherOffers(loadId: string, acceptedOfferId: string, client?: PoolClient): Promise<void>;
export declare function acceptOfferAndCreateTrip(params: {
    offerId: string;
    loadId: string;
    haulerId: string;
    shipperId: string;
    shipperUserId: string;
    haulerUserId: string;
    amount: number;
    currency: string;
}): Promise<{
    trip: TripRecord;
    payment: PaymentRecord;
}>;
export interface CreateOfferMessageInput {
    offerId: string;
    senderUserId: string;
    senderRole: string;
    text?: string;
    attachments?: unknown[];
}
export declare function createOfferMessage(input: CreateOfferMessageInput): Promise<any>;
export declare function listOfferMessages(offerId: string): Promise<any[]>;
export declare function getTripById(tripId: string): Promise<TripRecord | null>;
export declare function getTripAndLoad(tripId: string): Promise<{
    trip: TripRecord;
    load: LoadRecord;
} | null>;
export interface UpdateTripAssignmentInput {
    tripId: string;
    driverId?: string | null;
    vehicleId?: string | null;
}
export declare function updateTripAssignment(input: UpdateTripAssignmentInput): Promise<TripRecord | null>;
export declare function driverBelongsToHauler(driverId: string, haulerId: string): Promise<boolean>;
export declare function vehicleBelongsToHauler(vehicleId: string, haulerId: string): Promise<boolean>;
export declare function driverMatchesUser(driverId: string | null, userId?: string): Promise<boolean>;
export declare function updateTripStatus(tripId: string, status: TripStatus, patch?: Partial<TripRecord>): Promise<TripRecord | null>;
export declare function updateLoadStatus(loadId: string, status: LoadStatus, client?: PoolClient): Promise<LoadRecord | null>;
export interface EscrowIntentInput {
    tripId: string;
    provider: string;
    externalIntentId: string;
}
export declare function attachEscrowPaymentIntent(input: EscrowIntentInput): Promise<PaymentRecord | null>;
export declare function markPaymentFunded(tripId: string): Promise<PaymentRecord | null>;
export interface ScheduleAutoReleaseInput {
    tripId: string;
    releaseAt: string;
}
export declare function scheduleAutoRelease(input: ScheduleAutoReleaseInput): Promise<PaymentRecord | null>;
export declare function getPaymentForTrip(tripId: string): Promise<PaymentRecord | null>;
export declare function getPaymentById(paymentId: string): Promise<PaymentRecord | null>;
export declare function getPaymentByIntentId(intentId: string): Promise<PaymentRecord | null>;
export declare function updatePaymentStatus(paymentId: string, status: PaymentStatus, patch?: Partial<PaymentRecord>): Promise<PaymentRecord | null>;
export declare function clearAutoReleaseForPayment(paymentId: string): Promise<PaymentRecord | null>;
export declare function finalizePaymentLifecycle(params: {
    paymentId: string;
    paymentStatus: PaymentStatus;
    tripStatus?: TripStatus;
    loadStatus?: LoadStatus;
}): Promise<{
    payment: PaymentRecord;
    trip: TripRecord | null;
    load: LoadRecord | null;
}>;
export declare function autoReleaseReadyPayments(): Promise<Array<{
    payment: PaymentRecord;
    trip: TripRecord | null;
    load: LoadRecord | null;
}>>;
export declare function resolveDisputeLifecycle(params: {
    disputeId: string;
    disputeStatus: DisputeStatus;
    paymentStatus: PaymentStatus;
    resolvedBy: string;
    resolutionAmounts?: {
        amountToHauler?: string | null;
        amountToShipper?: string | null;
    };
}): Promise<{
    dispute: DisputeRecord;
    payment: PaymentRecord;
    trip: TripRecord | null;
    load: LoadRecord | null;
}>;
export interface CreateDisputeInput {
    tripId: string;
    paymentId: string;
    openedByUserId: string;
    openedByRole: string;
    reasonCode: string;
    description?: string;
    requestedAction?: string;
}
export declare function createPaymentDispute(input: CreateDisputeInput): Promise<DisputeRecord>;
export declare function listDisputesByTrip(tripId: string): Promise<DisputeRecord[]>;
export declare function listDisputesByPayment(paymentId: string, statuses?: DisputeStatus[]): Promise<DisputeRecord[]>;
export declare function getDisputeById(disputeId: string): Promise<DisputeRecord | null>;
export declare function addDisputeMessage(input: {
    disputeId: string;
    senderUserId: string;
    senderRole: string;
    text?: string;
    attachments?: unknown[];
}): Promise<any>;
export declare function listDisputeMessages(disputeId: string): Promise<any[]>;
export declare function updateDisputeStatus(disputeId: string, status: DisputeStatus, patch?: Partial<DisputeRecord>): Promise<DisputeRecord | null>;
//# sourceMappingURL=marketplaceService.d.ts.map