"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeStatus = exports.PaymentStatus = exports.TripStatus = exports.LoadOfferStatus = exports.LoadStatus = void 0;
exports.getLoadOfferById = getLoadOfferById;
exports.getLatestOfferForHauler = getLatestOfferForHauler;
exports.getLoadById = getLoadById;
exports.createLoadOffer = createLoadOffer;
exports.listLoadOffers = listLoadOffers;
exports.updateOfferStatus = updateOfferStatus;
exports.updateOfferDetails = updateOfferDetails;
exports.expireOtherOffers = expireOtherOffers;
exports.acceptOfferAndCreateTrip = acceptOfferAndCreateTrip;
exports.createOfferMessage = createOfferMessage;
exports.listOfferMessages = listOfferMessages;
exports.offerHasShipperMessage = offerHasShipperMessage;
exports.getTripById = getTripById;
exports.getTripAndLoad = getTripAndLoad;
exports.updateTripAssignment = updateTripAssignment;
exports.driverBelongsToHauler = driverBelongsToHauler;
exports.vehicleBelongsToHauler = vehicleBelongsToHauler;
exports.driverMatchesUser = driverMatchesUser;
exports.updateTripStatus = updateTripStatus;
exports.updateLoadStatus = updateLoadStatus;
exports.attachEscrowPaymentIntent = attachEscrowPaymentIntent;
exports.markPaymentFunded = markPaymentFunded;
exports.scheduleAutoRelease = scheduleAutoRelease;
exports.getPaymentForTrip = getPaymentForTrip;
exports.getPaymentById = getPaymentById;
exports.getPaymentByIntentId = getPaymentByIntentId;
exports.updatePaymentStatus = updatePaymentStatus;
exports.clearAutoReleaseForPayment = clearAutoReleaseForPayment;
exports.finalizePaymentLifecycle = finalizePaymentLifecycle;
exports.getHaulerSummary = getHaulerSummary;
exports.autoReleaseReadyPayments = autoReleaseReadyPayments;
exports.resolveDisputeLifecycle = resolveDisputeLifecycle;
exports.createPaymentDispute = createPaymentDispute;
exports.listDisputesByTrip = listDisputesByTrip;
exports.listDisputesByPayment = listDisputesByPayment;
exports.getDisputeById = getDisputeById;
exports.addDisputeMessage = addDisputeMessage;
exports.listDisputeMessages = listDisputeMessages;
exports.updateDisputeStatus = updateDisputeStatus;
const database_1 = require("../config/database");
var LoadStatus;
(function (LoadStatus) {
    LoadStatus["DRAFT"] = "DRAFT";
    LoadStatus["PUBLISHED"] = "PUBLISHED";
    LoadStatus["AWAITING_ESCROW"] = "AWAITING_ESCROW";
    LoadStatus["IN_TRANSIT"] = "IN_TRANSIT";
    LoadStatus["DELIVERED"] = "DELIVERED";
    LoadStatus["COMPLETED"] = "COMPLETED";
    LoadStatus["CANCELLED"] = "CANCELLED";
})(LoadStatus || (exports.LoadStatus = LoadStatus = {}));
var LoadOfferStatus;
(function (LoadOfferStatus) {
    LoadOfferStatus["PENDING"] = "PENDING";
    LoadOfferStatus["WITHDRAWN"] = "WITHDRAWN";
    LoadOfferStatus["REJECTED"] = "REJECTED";
    LoadOfferStatus["EXPIRED"] = "EXPIRED";
    LoadOfferStatus["ACCEPTED"] = "ACCEPTED";
})(LoadOfferStatus || (exports.LoadOfferStatus = LoadOfferStatus = {}));
var TripStatus;
(function (TripStatus) {
    TripStatus["PENDING_ESCROW"] = "PENDING_ESCROW";
    TripStatus["READY_TO_START"] = "READY_TO_START";
    TripStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TripStatus["DELIVERED_AWAITING_CONFIRMATION"] = "DELIVERED_AWAITING_CONFIRMATION";
    TripStatus["DELIVERED_CONFIRMED"] = "DELIVERED_CONFIRMED";
    TripStatus["DISPUTED"] = "DISPUTED";
    TripStatus["CLOSED"] = "CLOSED";
})(TripStatus || (exports.TripStatus = TripStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["AWAITING_FUNDING"] = "AWAITING_FUNDING";
    PaymentStatus["ESCROW_FUNDED"] = "ESCROW_FUNDED";
    PaymentStatus["RELEASED_TO_HAULER"] = "RELEASED_TO_HAULER";
    PaymentStatus["REFUNDED_TO_SHIPPER"] = "REFUNDED_TO_SHIPPER";
    PaymentStatus["SPLIT_BETWEEN_PARTIES"] = "SPLIT_BETWEEN_PARTIES";
    PaymentStatus["CANCELLED"] = "CANCELLED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "OPEN";
    DisputeStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    DisputeStatus["RESOLVED_RELEASE_TO_HAULER"] = "RESOLVED_RELEASE_TO_HAULER";
    DisputeStatus["RESOLVED_REFUND_TO_SHIPPER"] = "RESOLVED_REFUND_TO_SHIPPER";
    DisputeStatus["RESOLVED_SPLIT"] = "RESOLVED_SPLIT";
    DisputeStatus["CANCELLED"] = "CANCELLED";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
const LOAD_STATUS_DB_TO_APP = {
    draft: LoadStatus.DRAFT,
    DRAFT: LoadStatus.DRAFT,
    posted: LoadStatus.PUBLISHED,
    PUBLISHED: LoadStatus.PUBLISHED,
    matched: LoadStatus.AWAITING_ESCROW,
    MATCHED: LoadStatus.AWAITING_ESCROW,
    awaiting_escrow: LoadStatus.AWAITING_ESCROW,
    AWAITING_ESCROW: LoadStatus.AWAITING_ESCROW,
    in_transit: LoadStatus.IN_TRANSIT,
    IN_TRANSIT: LoadStatus.IN_TRANSIT,
    delivered: LoadStatus.DELIVERED,
    DELIVERED: LoadStatus.DELIVERED,
    completed: LoadStatus.COMPLETED,
    COMPLETED: LoadStatus.COMPLETED,
    cancelled: LoadStatus.CANCELLED,
    CANCELLED: LoadStatus.CANCELLED,
};
const LOAD_STATUS_APP_TO_DB = {
    [LoadStatus.DRAFT]: "draft",
    [LoadStatus.PUBLISHED]: "posted",
    [LoadStatus.AWAITING_ESCROW]: "AWAITING_ESCROW",
    [LoadStatus.IN_TRANSIT]: "in_transit",
    [LoadStatus.DELIVERED]: "DELIVERED",
    [LoadStatus.COMPLETED]: "completed",
    [LoadStatus.CANCELLED]: "cancelled",
};
const TRIP_STATUS_DB_TO_APP = {
    planned: TripStatus.PENDING_ESCROW,
    PENDING_ESCROW: TripStatus.PENDING_ESCROW,
    assigned: TripStatus.READY_TO_START,
    READY_TO_START: TripStatus.READY_TO_START,
    en_route: TripStatus.IN_PROGRESS,
    IN_PROGRESS: TripStatus.IN_PROGRESS,
    completed: TripStatus.CLOSED,
    COMPLETED: TripStatus.CLOSED,
    cancelled: TripStatus.CLOSED,
    CANCELLED: TripStatus.CLOSED,
    DELIVERED_AWAITING_CONFIRMATION: TripStatus.DELIVERED_AWAITING_CONFIRMATION,
    delivered_awaiting_confirmation: TripStatus.DELIVERED_AWAITING_CONFIRMATION,
    DELIVERED_CONFIRMED: TripStatus.DELIVERED_CONFIRMED,
    delivered_confirmed: TripStatus.DELIVERED_CONFIRMED,
    DISPUTED: TripStatus.DISPUTED,
    disputed: TripStatus.DISPUTED,
    CLOSED: TripStatus.CLOSED,
};
const TRIP_STATUS_APP_TO_DB = {
    [TripStatus.PENDING_ESCROW]: "PENDING_ESCROW",
    [TripStatus.READY_TO_START]: "READY_TO_START",
    [TripStatus.IN_PROGRESS]: "IN_PROGRESS",
    [TripStatus.DELIVERED_AWAITING_CONFIRMATION]: "DELIVERED_AWAITING_CONFIRMATION",
    [TripStatus.DELIVERED_CONFIRMED]: "DELIVERED_CONFIRMED",
    [TripStatus.DISPUTED]: "DISPUTED",
    [TripStatus.CLOSED]: "CLOSED",
};
const PAYMENT_STATUS_DB_TO_APP = {
    pending: PaymentStatus.AWAITING_FUNDING,
    pending_funding: PaymentStatus.AWAITING_FUNDING,
    AWAITING_FUNDING: PaymentStatus.AWAITING_FUNDING,
    in_escrow: PaymentStatus.ESCROW_FUNDED,
    ESCROW_FUNDED: PaymentStatus.ESCROW_FUNDED,
    released: PaymentStatus.RELEASED_TO_HAULER,
    RELEASED_TO_HAULER: PaymentStatus.RELEASED_TO_HAULER,
    refunded: PaymentStatus.REFUNDED_TO_SHIPPER,
    REFUNDED_TO_SHIPPER: PaymentStatus.REFUNDED_TO_SHIPPER,
    SPLIT_BETWEEN_PARTIES: PaymentStatus.SPLIT_BETWEEN_PARTIES,
    failed: PaymentStatus.CANCELLED,
    CANCELLED: PaymentStatus.CANCELLED,
};
const PAYMENT_STATUS_APP_TO_DB = {
    [PaymentStatus.AWAITING_FUNDING]: "AWAITING_FUNDING",
    [PaymentStatus.ESCROW_FUNDED]: "ESCROW_FUNDED",
    [PaymentStatus.RELEASED_TO_HAULER]: "RELEASED_TO_HAULER",
    [PaymentStatus.REFUNDED_TO_SHIPPER]: "REFUNDED_TO_SHIPPER",
    [PaymentStatus.SPLIT_BETWEEN_PARTIES]: "SPLIT_BETWEEN_PARTIES",
    [PaymentStatus.CANCELLED]: "CANCELLED",
};
function mapLoadStatusFromDb(value) {
    if (!value)
        return LoadStatus.DRAFT;
    return LOAD_STATUS_DB_TO_APP[value] ?? LoadStatus.DRAFT;
}
function mapTripStatusFromDb(value) {
    if (!value)
        return TripStatus.PENDING_ESCROW;
    return TRIP_STATUS_DB_TO_APP[value] ?? TripStatus.PENDING_ESCROW;
}
function mapTripStatusToDb(status) {
    return TRIP_STATUS_APP_TO_DB[status] ?? "PENDING_ESCROW";
}
function mapLoadStatusToDb(status) {
    return LOAD_STATUS_APP_TO_DB[status] ?? "draft";
}
function mapPaymentStatusFromDb(value) {
    if (!value)
        return PaymentStatus.AWAITING_FUNDING;
    return PAYMENT_STATUS_DB_TO_APP[value] ?? PaymentStatus.AWAITING_FUNDING;
}
function mapPaymentStatusToDb(status) {
    return PAYMENT_STATUS_APP_TO_DB[status] ?? "AWAITING_FUNDING";
}
async function getLoadOfferById(offerId) {
    const result = await database_1.pool.query(`
      SELECT *
      FROM load_offers
      WHERE id = $1
    `, [offerId]);
    return result.rows[0] ?? null;
}
async function getLatestOfferForHauler(loadId, haulerId) {
    const result = await database_1.pool.query(`
      SELECT *
      FROM load_offers
      WHERE load_id = $1
        AND hauler_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [loadId, haulerId]);
    return result.rows[0] ?? null;
}
function mapLoadRow(row) {
    return {
        ...row,
        status: mapLoadStatusFromDb(row.status),
    };
}
function mapTripRow(row) {
    return {
        id: row.id,
        load_id: row.load_id,
        hauler_id: row.hauler_id,
        assigned_driver_id: row.driver_id,
        assigned_vehicle_id: row.truck_id,
        status: mapTripStatusFromDb(row.status),
        started_at: row.actual_start_time,
        delivered_at: row.actual_end_time,
        delivered_confirmed_at: row.delivered_confirmed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
function mapPaymentRow(row) {
    return {
        ...row,
        status: mapPaymentStatusFromDb(row.status),
    };
}
function mapDisputeRow(row) {
    return {
        ...row,
        status: row.status ?? DisputeStatus.OPEN,
    };
}
async function getLoadById(loadId) {
    const result = await database_1.pool.query(`
      SELECT l.id::text,
             l.shipper_id::text AS shipper_id,
             s.user_id::text    AS shipper_user_id,
             l.status::text     AS status,
             l.asking_currency  AS currency,
             l.asking_amount::text AS asking_amount,
             l.awarded_offer_id::text AS awarded_offer_id,
             l.assigned_to_user_id::text AS assigned_to_user_id
      FROM loads l
      JOIN shippers s ON s.id = l.shipper_id
      WHERE l.id = $1
    `, [loadId]);
    const row = result.rows[0];
    return row ? mapLoadRow(row) : null;
}
async function createLoadOffer(input) {
    const { loadId, haulerId, createdByUserId, offeredAmount, currency, message, expiresAt } = input;
    const result = await database_1.pool.query(`
      INSERT INTO load_offers (
        load_id,
        hauler_id,
        created_by_user_id,
        offered_amount,
        currency,
        message,
        expires_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7
      )
      RETURNING *
    `, [
        loadId,
        haulerId,
        createdByUserId,
        offeredAmount,
        currency ?? "USD",
        message ?? null,
        expiresAt ?? null,
    ]);
    const row = result.rows[0];
    if (!row) {
        throw new Error("Failed to create load offer");
    }
    return row;
}
async function listLoadOffers(loadId, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const itemsQuery = database_1.pool.query(`
      SELECT *
      FROM load_offers
      WHERE load_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [loadId, limit, offset]);
    const countQuery = database_1.pool.query(`SELECT COUNT(*)::text AS count FROM load_offers WHERE load_id = $1`, [loadId]);
    const [itemsResult, countResult] = await Promise.all([itemsQuery, countQuery]);
    return {
        items: itemsResult.rows,
        total: Number(countResult.rows[0]?.count ?? 0),
    };
}
async function updateOfferStatus(offerId, status, patch = {}) {
    const fields = ["status"];
    const values = [status];
    if (patch.accepted_at) {
        fields.push("accepted_at");
        values.push(patch.accepted_at);
    }
    if (patch.rejected_at) {
        fields.push("rejected_at");
        values.push(patch.rejected_at);
    }
    const sets = fields
        .map((field, idx) => `${field} = $${idx + 2}`)
        .concat("updated_at = NOW()");
    const query = `
    UPDATE load_offers
    SET ${sets.join(",")}
    WHERE id = $1
    RETURNING *
  `;
    const result = await database_1.pool.query(query, [offerId, ...values]);
    return result.rows[0] ?? null;
}
async function updateOfferDetails(offerId, patch) {
    const sets = [];
    const values = [];
    if (patch.offeredAmount !== undefined) {
        sets.push(`offered_amount = $${values.length + 2}`);
        values.push(patch.offeredAmount);
    }
    if (patch.currency !== undefined) {
        sets.push(`currency = $${values.length + 2}`);
        values.push(patch.currency);
    }
    if (patch.message !== undefined) {
        sets.push(`message = $${values.length + 2}`);
        values.push(patch.message);
    }
    if (patch.expiresAt !== undefined) {
        sets.push(`expires_at = $${values.length + 2}`);
        values.push(patch.expiresAt);
    }
    if (sets.length === 0) {
        return getLoadOfferById(offerId);
    }
    sets.push(`updated_at = NOW()`);
    const result = await database_1.pool.query(`
      UPDATE load_offers
      SET ${sets.join(", ")}
      WHERE id = $1
      RETURNING *
    `, [offerId, ...values]);
    return result.rows[0] ?? null;
}
async function expireOtherOffers(loadId, acceptedOfferId, client) {
    const runner = client ?? database_1.pool;
    await runner.query(`
      UPDATE load_offers
      SET status = $1,
          updated_at = NOW()
      WHERE load_id = $2
        AND id <> $3
        AND status = $4
    `, [LoadOfferStatus.EXPIRED, loadId, acceptedOfferId, LoadOfferStatus.PENDING]);
}
async function acceptOfferAndCreateTrip(params) {
    const client = await database_1.pool.connect();
    async function ensureTruckId() {
        const existing = await client.query(`
        SELECT id::text
        FROM trucks
        WHERE hauler_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `, [params.haulerId]);
        if (existing.rowCount && existing.rows[0]?.id) {
            return existing.rows[0].id;
        }
        const inserted = await client.query(`
        INSERT INTO trucks (
          hauler_id,
          plate_number,
          truck_type,
          status,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          'mixed_livestock',
          'active',
          NOW(),
          NOW()
        )
        RETURNING id::text
      `, [params.haulerId, `AUTO-${Date.now()}`]);
        return inserted.rows[0].id;
    }
    async function ensureDriverId() {
        const existing = await client.query(`
        SELECT id::text
        FROM drivers
        WHERE hauler_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `, [params.haulerId]);
        if (existing.rowCount && existing.rows[0]?.id) {
            return existing.rows[0].id;
        }
        const inserted = await client.query(`
        INSERT INTO drivers (
          hauler_id,
          full_name,
          status,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          'active',
          NOW(),
          NOW()
        )
        RETURNING id::text
      `, [params.haulerId, `Auto Driver ${params.haulerUserId ?? ""}`]);
        return inserted.rows[0]?.id ?? null;
    }
    try {
        await client.query("BEGIN");
        await client.query(`
        UPDATE load_offers
        SET status = $1,
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
      `, [LoadOfferStatus.ACCEPTED, params.offerId]);
        await expireOtherOffers(params.loadId, params.offerId, client);
        const truckId = await ensureTruckId();
        const driverId = await ensureDriverId();
        const tripResult = await client.query(`
        INSERT INTO trips (
          load_id,
          hauler_id,
          truck_id,
          driver_id,
          status
        )
        VALUES (
          $1,$2,$3,$4,$5
        )
        RETURNING *
      `, [
            params.loadId,
            params.haulerId,
            truckId,
            driverId,
            mapTripStatusToDb(TripStatus.PENDING_ESCROW),
        ]);
        const tripRow = tripResult.rows[0];
        if (!tripRow) {
            throw new Error("Failed to create trip");
        }
        const trip = mapTripRow(tripRow);
        const paymentResult = await client.query(`
        INSERT INTO payments (
          trip_id,
          load_id,
          payer_user_id,
          payee_user_id,
          amount,
          currency,
          status,
          is_escrow
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,true
        )
        RETURNING *
      `, [
            trip.id,
            params.loadId,
            params.shipperUserId,
            params.haulerUserId,
            params.amount,
            params.currency,
            mapPaymentStatusToDb(PaymentStatus.AWAITING_FUNDING),
        ]);
        const paymentRow = paymentResult.rows[0];
        if (!paymentRow) {
            throw new Error("Failed to create payment");
        }
        const payment = mapPaymentRow(paymentRow);
        await client.query(`
        UPDATE loads
        SET awarded_offer_id = $1,
            status = $2,
            assigned_to_user_id = $3,
            assigned_at = NOW(),
            updated_at = NOW()
        WHERE id = $4
      `, [
            params.offerId,
            mapLoadStatusToDb(LoadStatus.AWAITING_ESCROW),
            params.haulerUserId,
            params.loadId,
        ]);
        await client.query("COMMIT");
        return { trip, payment };
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
async function createOfferMessage(input) {
    const result = await database_1.pool.query(`
      INSERT INTO load_offer_messages (
        offer_id,
        sender_user_id,
        sender_role,
        text,
        attachments
      )
      VALUES (
        $1,$2,$3,$4,$5
      )
      RETURNING *
    `, [
        input.offerId,
        input.senderUserId,
        input.senderRole,
        input.text ?? null,
        JSON.stringify(input.attachments ?? []),
    ]);
    return result.rows[0];
}
async function listOfferMessages(offerId) {
    const result = await database_1.pool.query(`
      SELECT *
      FROM load_offer_messages
      WHERE offer_id = $1
      ORDER BY created_at ASC
    `, [offerId]);
    return result.rows;
}
async function offerHasShipperMessage(offerId) {
    const result = await database_1.pool.query(`
      SELECT 1
      FROM load_offer_messages
      WHERE offer_id = $1
        AND UPPER(sender_role) LIKE 'SHIPPER%'
      LIMIT 1
    `, [offerId]);
    return (result.rowCount ?? 0) > 0;
}
async function getTripById(tripId) {
    const result = await database_1.pool.query(`
      SELECT id::text,
             load_id::text,
             hauler_id::text,
             driver_id::text,
             truck_id::text,
             status::text,
             actual_start_time,
             actual_end_time,
             delivered_confirmed_at,
             created_at,
             updated_at
      FROM trips
      WHERE id = $1
    `, [tripId]);
    const row = result.rows[0];
    return row ? mapTripRow(row) : null;
}
async function getTripAndLoad(tripId) {
    const trip = await getTripById(tripId);
    if (!trip)
        return null;
    const load = await getLoadById(trip.load_id);
    if (!load)
        return null;
    return { trip, load };
}
async function updateTripAssignment(input) {
    const sets = [];
    const values = [];
    if (input.driverId !== undefined) {
        sets.push(`driver_id = $${sets.length + 1}`);
        values.push(input.driverId);
    }
    if (input.vehicleId !== undefined) {
        sets.push(`truck_id = $${sets.length + 1}`);
        values.push(input.vehicleId);
    }
    if (sets.length === 0) {
        return null;
    }
    const query = `
    UPDATE trips
    SET ${sets.join(", ")}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING *
  `;
    const result = await database_1.pool.query(query, [...values, input.tripId]);
    const row = result.rows[0];
    return row ? mapTripRow(row) : null;
}
async function driverBelongsToHauler(driverId, haulerId) {
    if (!driverId || !haulerId)
        return false;
    const result = await database_1.pool.query(`SELECT 1 FROM drivers WHERE id = $1 AND hauler_id = $2`, [driverId, haulerId]);
    return (result.rowCount ?? 0) > 0;
}
async function vehicleBelongsToHauler(vehicleId, haulerId) {
    if (!vehicleId || !haulerId)
        return false;
    const result = await database_1.pool.query(`SELECT 1 FROM trucks WHERE id = $1 AND hauler_id = $2`, [vehicleId, haulerId]);
    return (result.rowCount ?? 0) > 0;
}
async function driverMatchesUser(driverId, userId) {
    if (!driverId || !userId)
        return false;
    const result = await database_1.pool.query(`SELECT 1 FROM drivers WHERE id = $1 AND user_id = $2`, [driverId, userId]);
    return (result.rowCount ?? 0) > 0;
}
async function updateTripStatus(tripId, status, patch = {}) {
    const sets = [`status = $1`, `updated_at = NOW()`];
    const values = [mapTripStatusToDb(status)];
    if (patch.started_at !== undefined) {
        sets.push(`actual_start_time = $${sets.length + 1}`);
        values.push(patch.started_at);
    }
    if (patch.delivered_at !== undefined) {
        sets.push(`actual_end_time = $${sets.length + 1}`);
        values.push(patch.delivered_at);
    }
    if (patch.delivered_confirmed_at !== undefined) {
        sets.push(`delivered_confirmed_at = $${sets.length + 1}`);
        values.push(patch.delivered_confirmed_at);
    }
    const result = await database_1.pool.query(`UPDATE trips SET ${sets.join(", ")} WHERE id = $${values.length + 1} RETURNING *`, [...values, tripId]);
    const row = result.rows[0];
    return row ? mapTripRow(row) : null;
}
async function updateLoadStatus(loadId, status, client) {
    const runner = client ?? database_1.pool;
    const result = await runner.query(`
      UPDATE loads
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id::text,
                shipper_id::text,
                (SELECT user_id::text FROM shippers WHERE id = loads.shipper_id) AS shipper_user_id,
                status::text,
                asking_currency,
                asking_amount::text,
                awarded_offer_id::text
    `, [loadId, mapLoadStatusToDb(status)]);
    const row = result.rows[0];
    return row ? mapLoadRow(row) : null;
}
async function attachEscrowPaymentIntent(input) {
    const result = await database_1.pool.query(`
      UPDATE payments
      SET status = $1,
          external_provider = $2,
          external_intent_id = $3,
          updated_at = NOW()
      WHERE trip_id = $4
      RETURNING *
    `, [
        mapPaymentStatusToDb(PaymentStatus.AWAITING_FUNDING),
        input.provider,
        input.externalIntentId,
        input.tripId,
    ]);
    const row = result.rows[0];
    return row ? mapPaymentRow(row) : null;
}
async function markPaymentFunded(tripId) {
    const client = await database_1.pool.connect();
    try {
        await client.query("BEGIN");
        const paymentResult = await client.query(`
        UPDATE payments
        SET status = $1,
            updated_at = NOW()
        WHERE trip_id = $2
        RETURNING *
      `, [mapPaymentStatusToDb(PaymentStatus.ESCROW_FUNDED), tripId]);
        const paymentRow = paymentResult.rows[0] ?? null;
        const payment = paymentRow ? mapPaymentRow(paymentRow) : null;
        if (payment) {
            await client.query(`
          UPDATE trips
          SET status = $1,
              updated_at = NOW()
          WHERE id = $2
            AND status = $3
        `, [
                mapTripStatusToDb(TripStatus.READY_TO_START),
                tripId,
                mapTripStatusToDb(TripStatus.PENDING_ESCROW),
            ]);
        }
        await client.query("COMMIT");
        return payment;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
async function scheduleAutoRelease(input) {
    const result = await database_1.pool.query(`
      UPDATE payments
      SET auto_release_at = $1,
          updated_at = NOW()
      WHERE trip_id = $2
        AND status = $3
      RETURNING *
    `, [input.releaseAt, input.tripId, mapPaymentStatusToDb(PaymentStatus.ESCROW_FUNDED)]);
    const row = result.rows[0];
    return row ? mapPaymentRow(row) : null;
}
async function getPaymentForTrip(tripId) {
    const result = await database_1.pool.query(`
      SELECT *
      FROM payments
      WHERE trip_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [tripId]);
    const row = result.rows[0];
    return row ? mapPaymentRow(row) : null;
}
async function getPaymentById(paymentId) {
    const result = await database_1.pool.query(`
      SELECT *
      FROM payments
      WHERE id = $1
    `, [paymentId]);
    const row = result.rows[0];
    return row ? mapPaymentRow(row) : null;
}
async function getPaymentByIntentId(intentId) {
    const result = await database_1.pool.query(`
      SELECT *
      FROM payments
      WHERE external_intent_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `, [intentId]);
    const row = result.rows[0];
    return row ? mapPaymentRow(row) : null;
}
async function updatePaymentStatus(paymentId, status, patch = {}) {
    const sets = ["status = $2", "updated_at = NOW()"];
    const values = [paymentId, mapPaymentStatusToDb(status)];
    if (patch.external_charge_id !== undefined) {
        sets.push(`external_charge_id = $${values.length + 1}`);
        values.push(patch.external_charge_id);
    }
    if (patch.auto_release_at !== undefined) {
        sets.push(`auto_release_at = $${values.length + 1}`);
        values.push(patch.auto_release_at);
    }
    const result = await database_1.pool.query(`
      UPDATE payments
      SET ${sets.join(", ")}
      WHERE id = $1
      RETURNING *
    `, values);
    const row = result.rows[0];
    return row ? mapPaymentRow(row) : null;
}
async function clearAutoReleaseForPayment(paymentId) {
    const result = await database_1.pool.query(`
      UPDATE payments
      SET auto_release_at = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [paymentId]);
    const row = result.rows[0];
    return row ? mapPaymentRow(row) : null;
}
async function updatePaymentTripLoadWithinClient(client, paymentId, paymentStatus, options = {}) {
    const paymentResult = await client.query(`
      UPDATE payments
      SET status = $1,
          auto_release_at = NULL,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [mapPaymentStatusToDb(paymentStatus), paymentId]);
    const paymentRow = paymentResult.rows[0];
    if (!paymentRow) {
        throw new Error("PAYMENT_NOT_FOUND");
    }
    const payment = mapPaymentRow(paymentRow);
    let trip = null;
    if (payment.trip_id && options.tripStatus) {
        const tripResult = await client.query(`
        UPDATE trips
        SET status = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [mapTripStatusToDb(options.tripStatus), payment.trip_id]);
        const tripRow = tripResult.rows[0];
        trip = tripRow ? mapTripRow(tripRow) : null;
    }
    let load = null;
    if (payment.load_id && options.loadStatus) {
        const loadResult = await client.query(`
        UPDATE loads
        SET status = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id::text,
                  shipper_id::text,
                  (SELECT user_id::text FROM shippers WHERE id = loads.shipper_id) AS shipper_user_id,
                  status::text,
                  asking_currency,
                  asking_amount::text,
                  awarded_offer_id::text
      `, [payment.load_id, mapLoadStatusToDb(options.loadStatus)]);
        const loadRow = loadResult.rows[0];
        load = loadRow ? mapLoadRow(loadRow) : null;
    }
    return { payment, trip, load };
}
async function finalizePaymentLifecycle(params) {
    const client = await database_1.pool.connect();
    try {
        await client.query("BEGIN");
        const lifecycleOptions = {};
        if (params.tripStatus) {
            lifecycleOptions.tripStatus = params.tripStatus;
        }
        if (params.loadStatus) {
            lifecycleOptions.loadStatus = params.loadStatus;
        }
        const result = await updatePaymentTripLoadWithinClient(client, params.paymentId, params.paymentStatus, lifecycleOptions);
        await client.query("COMMIT");
        return result;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
async function getHaulerSummary(haulerId) {
    const result = await database_1.pool.query(`
      SELECT
        h.id::text,
        COALESCE(h.legal_name, u.full_name) AS name,
        (
          SELECT COUNT(*) FROM trucks t WHERE t.hauler_id = h.id
        )::int AS fleet_count,
        (
          SELECT COUNT(*) FROM drivers d WHERE d.hauler_id = h.id
        )::int AS driver_count,
        (
          SELECT COUNT(*) FROM trips tr WHERE tr.hauler_id = h.id
        )::int AS completed_trips
      FROM haulers h
      LEFT JOIN app_users u ON u.id = h.user_id
      WHERE h.id = $1
    `, [haulerId]);
    const row = result.rows[0];
    if (!row)
        return null;
    return {
        id: row.id,
        name: row.name ?? null,
        fleet_count: Number(row.fleet_count ?? 0),
        driver_count: Number(row.driver_count ?? 0),
        completed_trips: Number(row.completed_trips ?? 0),
        rating: null,
    };
}
async function autoReleaseReadyPayments() {
    const client = await database_1.pool.connect();
    try {
        await client.query("BEGIN");
        const candidates = await client.query(`
        SELECT *
        FROM payments p
        WHERE p.status = $1
          AND p.auto_release_at IS NOT NULL
          AND p.auto_release_at <= NOW()
          AND NOT EXISTS (
            SELECT 1
            FROM payment_disputes d
            WHERE d.payment_id = p.id
              AND d.status IN ($2,$3)
          )
        FOR UPDATE SKIP LOCKED
      `, [
            mapPaymentStatusToDb(PaymentStatus.ESCROW_FUNDED),
            DisputeStatus.OPEN,
            DisputeStatus.UNDER_REVIEW,
        ]);
        const updates = [];
        for (const row of candidates.rows) {
            const result = await updatePaymentTripLoadWithinClient(client, row.id, PaymentStatus.RELEASED_TO_HAULER, {
                tripStatus: TripStatus.CLOSED,
                loadStatus: LoadStatus.COMPLETED,
            });
            updates.push(result);
        }
        await client.query("COMMIT");
        return updates;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
async function resolveDisputeLifecycle(params) {
    const client = await database_1.pool.connect();
    try {
        await client.query("BEGIN");
        const disputeResult = await client.query(`
        UPDATE payment_disputes
        SET status = $2,
            resolution_type = $3,
            resolution_amount_to_hauler = $4,
            resolution_amount_to_shipper = $5,
            resolved_by_user_id = $6,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [
            params.disputeId,
            params.disputeStatus,
            params.disputeStatus,
            params.resolutionAmounts?.amountToHauler ?? null,
            params.resolutionAmounts?.amountToShipper ?? null,
            params.resolvedBy,
        ]);
        const disputeRow = disputeResult.rows[0];
        if (!disputeRow) {
            throw new Error("DISPUTE_NOT_FOUND");
        }
        const dispute = mapDisputeRow(disputeRow);
        const lifecycle = await updatePaymentTripLoadWithinClient(client, dispute.payment_id, params.paymentStatus, { tripStatus: TripStatus.CLOSED, loadStatus: LoadStatus.COMPLETED });
        await client.query("COMMIT");
        return { dispute, ...lifecycle };
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
async function createPaymentDispute(input) {
    const result = await database_1.pool.query(`
      INSERT INTO payment_disputes (
        trip_id,
        payment_id,
        opened_by_user_id,
        opened_by_role,
        status,
        reason_code,
        description,
        requested_action
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7
      )
      RETURNING *
    `, [
        input.tripId,
        input.paymentId,
        input.openedByUserId,
        input.openedByRole,
        DisputeStatus.OPEN,
        input.reasonCode,
        input.description ?? null,
        input.requestedAction ?? null,
    ]);
    const row = result.rows[0];
    if (!row) {
        throw new Error("Failed to create dispute");
    }
    return mapDisputeRow(row);
}
async function listDisputesByTrip(tripId) {
    const result = await database_1.pool.query(`
      SELECT *
      FROM payment_disputes
      WHERE trip_id = $1
      ORDER BY created_at DESC
    `, [tripId]);
    return result.rows.map(mapDisputeRow);
}
async function listDisputesByPayment(paymentId, statuses) {
    const clauses = ["payment_id = $1"];
    const values = [paymentId];
    if (statuses && statuses.length > 0) {
        clauses.push(`status = ANY($2)`);
        values.push(statuses);
    }
    const result = await database_1.pool.query(`
      SELECT *
      FROM payment_disputes
      WHERE ${clauses.join(" AND ")}
      ORDER BY created_at DESC
    `, values);
    return result.rows.map(mapDisputeRow);
}
async function getDisputeById(disputeId) {
    const result = await database_1.pool.query(`
      SELECT *
      FROM payment_disputes
      WHERE id = $1
    `, [disputeId]);
    const row = result.rows[0];
    return row ? mapDisputeRow(row) : null;
}
async function addDisputeMessage(input) {
    const result = await database_1.pool.query(`
      INSERT INTO dispute_messages (
        id,
        dispute_id,
        sender_user_id,
        sender_role,
        text,
        attachments
      )
      VALUES (
        gen_random_uuid(),
        $1,$2,$3,$4,$5
      )
      RETURNING *
    `, [
        input.disputeId,
        input.senderUserId,
        input.senderRole,
        input.text ?? null,
        JSON.stringify(input.attachments ?? []),
    ]);
    return result.rows[0];
}
async function listDisputeMessages(disputeId) {
    const result = await database_1.pool.query(`
      SELECT *
      FROM dispute_messages
      WHERE dispute_id = $1
      ORDER BY created_at ASC
    `, [disputeId]);
    return result.rows;
}
async function updateDisputeStatus(disputeId, status, patch = {}) {
    const sets = ["status = $2", "updated_at = NOW()"];
    const values = [disputeId, status];
    if (patch.resolution_type !== undefined) {
        sets.push(`resolution_type = $${values.length + 1}`);
        values.push(patch.resolution_type);
    }
    if (patch.resolution_amount_to_hauler !== undefined) {
        sets.push(`resolution_amount_to_hauler = $${values.length + 1}`);
        values.push(patch.resolution_amount_to_hauler);
    }
    if (patch.resolution_amount_to_shipper !== undefined) {
        sets.push(`resolution_amount_to_shipper = $${values.length + 1}`);
        values.push(patch.resolution_amount_to_shipper);
    }
    if (patch.resolved_by_user_id !== undefined) {
        sets.push(`resolved_by_user_id = $${values.length + 1}`);
        values.push(patch.resolved_by_user_id);
    }
    if (patch.resolved_at !== undefined) {
        sets.push(`resolved_at = $${values.length + 1}`);
        values.push(patch.resolved_at);
    }
    const result = await database_1.pool.query(`
      UPDATE payment_disputes
      SET ${sets.join(", ")}
      WHERE id = $1
      RETURNING *
    `, values);
    const row = result.rows[0];
    return row ? mapDisputeRow(row) : null;
}
//# sourceMappingURL=marketplaceService.js.map