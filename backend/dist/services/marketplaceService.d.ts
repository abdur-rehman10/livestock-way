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
export declare enum BookingStatus {
    REQUESTED = "REQUESTED",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}
export type PaymentMode = "ESCROW" | "DIRECT";
export interface LoadRecord {
    id: string;
    shipper_id: string;
    shipper_user_id: string;
    status: LoadStatus;
    currency: string | null;
    asking_amount: string | null;
    awarded_offer_id: string | null;
    assigned_to_user_id?: string | null;
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
export interface TruckAvailabilityRecord {
    id: string;
    hauler_id: string;
    truck_id: string | null;
    origin_location_text: string;
    destination_location_text: string | null;
    available_from: string;
    available_until: string | null;
    capacity_headcount: number | null;
    capacity_weight_kg: number | null;
    allow_shared: boolean;
    notes: string | null;
    origin_lat: number | null;
    origin_lng: number | null;
    destination_lat: number | null;
    destination_lng: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface LoadBookingRecord {
    id: string;
    load_id: string;
    hauler_id: string;
    shipper_id: string;
    offer_id: string | null;
    truck_availability_id: string | null;
    requested_headcount: number | null;
    requested_weight_kg: string | null;
    offered_amount: string | null;
    offered_currency: string | null;
    status: BookingStatus;
    notes: string | null;
    created_by_user_id: string;
    updated_by_user_id: string | null;
    created_at: string;
    updated_at: string;
}
export interface TruckChatRecord {
    id: string;
    truck_availability_id: string;
    shipper_id: string;
    load_id: string | null;
    status: string;
    created_by_user_id: string;
    created_at: string;
    updated_at: string;
}
export interface TruckChatMessageRecord {
    id: string;
    chat_id: string;
    sender_user_id: string;
    sender_role: string;
    message: string | null;
    attachments: any[];
    created_at: string;
}
export interface TruckChatSummary {
    chat: TruckChatRecord;
    availability: {
        origin_location_text: string;
        destination_location_text: string | null;
        capacity_headcount: number | null;
    };
    last_message: TruckChatMessageRecord | null;
}
export declare function getLoadOfferById(offerId: string): Promise<LoadOfferRecord | null>;
export declare function getLatestOfferForHauler(loadId: string, haulerId: string): Promise<LoadOfferRecord | null>;
export interface TripRecord {
    id: string;
    load_id: string;
    hauler_id: string | null;
    assigned_driver_id: string | null;
    assigned_vehicle_id: string | null;
    status: TripStatus;
    payment_mode: PaymentMode;
    direct_payment_disclaimer_accepted_at: string | null;
    direct_payment_disclaimer_version: string | null;
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
export interface HaulerSummary {
    id: string;
    name: string | null;
    fleet_count: number;
    driver_count: number;
    completed_trips: number;
    hauler_type?: string | null;
    rating: number | null;
}
export interface HaulerDriverRecord {
    id: string;
    full_name: string | null;
    status: string | null;
    phone_number?: string | null;
    license_number?: string | null;
    license_expiry?: string | null;
}
export interface HaulerVehicleRecord {
    id: string;
    plate_number: string | null;
    truck_type: string | null;
    status: string | null;
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
export declare function getTruckAvailabilityById(id: string): Promise<TruckAvailabilityRecord | null>;
export declare function listTruckAvailability(options?: {
    haulerId?: string;
    originSearch?: string;
    near?: {
        lat: number;
        lng: number;
        radiusKm: number;
    };
    limit?: number;
}): Promise<TruckAvailabilityRecord[]>;
export interface CreateTruckAvailabilityInput {
    haulerId: string;
    truckId?: string | null;
    origin: string;
    destination?: string | null;
    availableFrom: string;
    availableUntil?: string | null;
    capacityHeadcount?: number | null;
    capacityWeightKg?: number | null;
    allowShared?: boolean;
    notes?: string | null;
    originLat?: number | null;
    originLng?: number | null;
    destinationLat?: number | null;
    destinationLng?: number | null;
}
export declare function createTruckAvailability(input: CreateTruckAvailabilityInput): Promise<TruckAvailabilityRecord>;
export declare function updateTruckAvailability(id: string, patch: Partial<CreateTruckAvailabilityInput> & {
    isActive?: boolean;
}): Promise<TruckAvailabilityRecord | null>;
export declare function getTruckChatById(id: string): Promise<TruckChatRecord | null>;
export declare function getTruckChatForShipper(availabilityId: string, shipperId: string, loadId?: string | null): Promise<TruckChatRecord | null>;
export declare function createTruckChat(params: {
    availabilityId: string;
    shipperId: string;
    loadId?: string | null;
    createdByUserId: string;
}): Promise<TruckChatRecord>;
export declare function createTruckChatMessage(params: {
    chatId: string;
    senderUserId: string;
    senderRole: string;
    message?: string | null;
    attachments?: unknown[];
}): Promise<TruckChatMessageRecord>;
export declare function listTruckChatMessages(chatId: string): Promise<TruckChatMessageRecord[]>;
export declare function listTruckChatsForHauler(haulerId: string): Promise<TruckChatSummary[]>;
export declare function listTruckChatsForShipper(shipperId: string): Promise<TruckChatSummary[]>;
export declare function createBookingFromOffer(params: {
    offerId: string;
    shipperUserId: string;
    notes?: string;
}): Promise<LoadBookingRecord>;
export declare function createBookingForAvailability(params: {
    truckAvailabilityId: string;
    loadId: string;
    shipperId: string;
    shipperUserId: string;
    requestedHeadcount?: number | null;
    requestedWeightKg?: number | null;
    offeredAmount?: number | null;
    offeredCurrency?: string | null;
    notes?: string | null;
}): Promise<LoadBookingRecord>;
export declare function getBookingById(id: string): Promise<LoadBookingRecord | null>;
export declare function listBookingsForHauler(haulerId: string): Promise<LoadBookingRecord[]>;
export declare function listBookingsForShipper(shipperId: string): Promise<LoadBookingRecord[]>;
export declare function respondToBooking(params: {
    bookingId: string;
    actor: "SHIPPER" | "HAULER";
    action: "ACCEPT" | "REJECT";
    actingUserId: string;
    paymentModeSelection?: {
        paymentMode: PaymentMode;
        directDisclaimerAt: string | null;
        directDisclaimerVersion: string | null;
    } | null;
}): Promise<{
    booking: LoadBookingRecord;
    trip?: TripRecord;
    payment?: PaymentRecord;
}>;
export interface UpdateOfferDetailsInput {
    offeredAmount?: number;
    currency?: string;
    message?: string | null;
    expiresAt?: string | null;
}
export declare function updateOfferDetails(offerId: string, patch: UpdateOfferDetailsInput): Promise<LoadOfferRecord | null>;
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
    paymentModeSelection?: {
        paymentMode: PaymentMode;
        directDisclaimerAt: string | null;
        directDisclaimerVersion: string | null;
    };
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
export declare function offerHasShipperMessage(offerId: string): Promise<boolean>;
export declare function getTripById(tripId: string): Promise<TripRecord | null>;
export declare function getLatestTripForLoad(loadId: string): Promise<TripRecord | null>;
export declare function getTripAndLoad(tripId: string): Promise<{
    trip: TripRecord;
    load: LoadRecord;
} | null>;
export declare function getTripContextByLoadId(loadId: string): Promise<{
    trip: TripRecord | null;
    load: LoadRecord;
    payment: PaymentRecord | null;
}>;
export declare function listDriversForHauler(haulerId: string): Promise<HaulerDriverRecord[]>;
export declare function listVehiclesForHauler(haulerId: string): Promise<HaulerVehicleRecord[]>;
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
export declare function getHaulerSummary(haulerId: string): Promise<HaulerSummary | null>;
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
    recipientRole?: string | null;
    text?: string;
    attachments?: unknown[];
}): Promise<any>;
export declare function listDisputeMessages(disputeId: string): Promise<any[]>;
export declare function updateDisputeStatus(disputeId: string, status: DisputeStatus, patch?: Partial<DisputeRecord>): Promise<DisputeRecord | null>;
//# sourceMappingURL=marketplaceService.d.ts.map