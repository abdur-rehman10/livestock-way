import { Request, Router } from "express";
import authRequired from "../middlewares/auth";
import { ensureHaulerProfile, ensureShipperProfile } from "../utils/profileHelpers";
import {
  createLoadOffer,
  listLoadOffers,
  getTripById,
  getTripAndLoad,
  getTripContextByLoadId,
  updateTripAssignment,
  updateTripStatus,
  createOfferMessage,
  listOfferMessages,
  offerHasShipperMessage,
  attachEscrowPaymentIntent,
  markPaymentFunded,
  scheduleAutoRelease,
  updateLoadStatus,
  driverBelongsToHauler,
  vehicleBelongsToHauler,
  driverMatchesUser,
  createPaymentDispute,
  listDisputesByTrip,
  listDisputesByPayment,
  getDisputeById,
  addDisputeMessage,
  listDisputeMessages,
  updateDisputeStatus,
  acceptOfferAndCreateTrip,
  getLoadById,
  updateOfferStatus,
  updateOfferDetails,
  getLoadOfferById,
  getLatestOfferForHauler,
  getPaymentForTrip,
  getDirectPaymentForTrip,
  getPaymentById,
  getPaymentByIntentId,
  updatePaymentStatus,
  clearAutoReleaseForPayment,
  finalizePaymentLifecycle,
  autoReleaseReadyPayments,
  resolveDisputeLifecycle,
  getHaulerSummary,
  PaymentStatus,
  LoadOfferStatus,
  TripStatus,
  DisputeStatus,
  LoadStatus,
  LoadOfferRecord,
  TripRecord,
  LoadRecord,
  PaymentRecord,
  DisputeRecord,
  TruckAvailabilityRecord,
  LoadBookingRecord,
  listTruckAvailability,
  createTruckAvailability,
  updateTruckAvailability,
  getTruckAvailabilityById,
  createTruckChat,
  createTruckChatMessage,
  listTruckChatMessages,
  getTruckChatById,
  listTruckChatsForHauler,
  listTruckChatsForShipper,
  createBookingFromOffer,
  createBookingForAvailability,
  listBookingsForHauler,
  listBookingsForShipper,
  respondToBooking,
  BookingStatus,
  listDriversForHauler,
  listVehiclesForHauler,
} from "../services/marketplaceService";
import { emitEvent, SOCKET_EVENTS } from "../socket";
import { resolvePaymentModeSelection } from "../utils/paymentMode";
import {
  assertDisputesEnabled,
  assertEscrowEnabled,
  disputesDisabledResponse,
  escrowDisabledResponse,
} from "../utils/escrowGuard";
import { pool } from "../config/database";

type AuthUser = {
  id?: string;
  user_type?: string;
  company_id?: string | number | null;
};

type AuthedRequest = Request & { user?: AuthUser };

function getAuthUser(req: Request): AuthUser {
  return (req as AuthedRequest).user ?? {};
}

const router = Router();

router.get(
  "/truck-board",
  authRequired,
  async (req, res) => {
    try {
      const origin = req.query?.origin ? String(req.query.origin) : undefined;
      const onlyMine = String(req.query?.scope || "").toLowerCase() === "mine";
      const authUser = getAuthUser(req);
      let haulerId: string | undefined;
      if (onlyMine && isHaulerUser(authUser)) {
        const resolved = await resolveHaulerId(authUser);
        if (resolved) haulerId = resolved;
      }
      const nearLat = req.query?.near_lat !== undefined ? Number(req.query.near_lat) : undefined;
      const nearLng = req.query?.near_lng !== undefined ? Number(req.query.near_lng) : undefined;
      const radiusKm = req.query?.radius_km !== undefined ? Number(req.query.radius_km) : undefined;
      if ((nearLat !== undefined || nearLng !== undefined) && (nearLat === undefined || nearLng === undefined)) {
        return res.status(400).json({ error: "near_lat and near_lng must both be provided." });
      }
      if (nearLat !== undefined && (Number.isNaN(nearLat) || nearLat < -90 || nearLat > 90)) {
        return res.status(400).json({ error: "near_lat must be between -90 and 90." });
      }
      if (nearLng !== undefined && (Number.isNaN(nearLng) || nearLng < -180 || nearLng > 180)) {
        return res.status(400).json({ error: "near_lng must be between -180 and 180." });
      }
      if (radiusKm !== undefined && (Number.isNaN(radiusKm) || radiusKm <= 0)) {
        return res.status(400).json({ error: "radius_km must be greater than zero." });
      }
      const options: {
        haulerId?: string;
        originSearch?: string;
        near?: { lat: number; lng: number; radiusKm: number };
        limit?: number;
      } = {};
      if (haulerId) options.haulerId = haulerId;
      if (origin) options.originSearch = origin;
      if (nearLat !== undefined && nearLng !== undefined) {
        options.near = {
          lat: nearLat,
          lng: nearLng,
          radiusKm: radiusKm ?? 200,
        };
      }
      options.limit = Number(req.query?.limit ?? 50);
      const items = await listTruckAvailability(options);
      res.json({ items });
    } catch (err) {
      console.error("listTruckAvailability error", err);
      res.status(500).json({ error: "Failed to load truck board" });
    }
  }
);

router.post(
  "/truck-board",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isHaulerUser(authUser)) {
        return res.status(403).json({ error: "Only haulers can post trucks" });
      }
      const haulerIdResolved = await resolveHaulerId(authUser);
      if (!haulerIdResolved) {
        return res.status(400).json({ error: "Unable to resolve hauler profile" });
      }
      const truckId = req.body?.truck_id ? String(req.body.truck_id) : null;
      if (!truckId) {
        return res.status(400).json({ error: "truck_id is required" });
      }
      const availability = await createTruckAvailability({
        haulerId: haulerIdResolved,
        truckId,
        origin: req.body?.origin_location_text ?? "",
        destination: req.body?.destination_location_text ?? null,
        availableFrom: req.body?.available_from ?? new Date().toISOString(),
        availableUntil: req.body?.available_until ?? null,
        capacityHeadcount: req.body?.capacity_headcount ?? null,
        capacityWeightKg: req.body?.capacity_weight_kg ?? null,
        allowShared: req.body?.allow_shared ?? true,
        notes: req.body?.notes ?? null,
        originLat: req.body?.origin_lat ?? null,
        originLng: req.body?.origin_lng ?? null,
        destinationLat: req.body?.destination_lat ?? null,
        destinationLng: req.body?.destination_lng ?? null,
      });
      res.status(201).json({ availability });
    } catch (err: any) {
      console.error("createTruckAvailability error", err);
      res.status(400).json({ error: err?.message ?? "Failed to post truck" });
    }
  }
);

router.patch(
  "/truck-board/:id",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isHaulerUser(authUser) && !isSuperAdminUser(authUser)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const availabilityId = req.params.id;
      if (!availabilityId) {
        return res.status(400).json({ error: "Missing availability id" });
      }
      const availability = await getTruckAvailabilityById(availabilityId);
      if (!availability) {
        return res.status(404).json({ error: "Listing not found" });
      }
      if (availability.is_external) {
        return res.status(403).json({ error: "External listings are read-only." });
      }
      if (availability.is_external) {
        return res.status(403).json({ error: "External listings are read-only." });
      }
      if (availability.is_external) {
        return res.status(403).json({ error: "External listings are read-only." });
      }
      const haulerId = await resolveHaulerId(authUser);
      if (
        !isSuperAdminUser(authUser) &&
        (!haulerId || availability.hauler_id !== haulerId)
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updated = await updateTruckAvailability(availabilityId, {
        origin: req.body?.origin_location_text,
        destination: req.body?.destination_location_text,
        availableFrom: req.body?.available_from,
        availableUntil: req.body?.available_until,
        capacityHeadcount: req.body?.capacity_headcount,
        capacityWeightKg: req.body?.capacity_weight_kg,
        allowShared: req.body?.allow_shared,
        notes: req.body?.notes,
        originLat: req.body?.origin_lat,
        originLng: req.body?.origin_lng,
        destinationLat: req.body?.destination_lat,
        destinationLng: req.body?.destination_lng,
        truckId: req.body?.truck_id,
        isActive: req.body?.is_active,
      });
      res.json({ availability: updated });
    } catch (err) {
      console.error("updateTruckAvailability error", err);
      res.status(500).json({ error: "Failed to update listing" });
    }
  }
);

router.delete(
  "/truck-board/:id",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isHaulerUser(authUser) && !isSuperAdminUser(authUser)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const availabilityId = req.params.id;
      if (!availabilityId) {
        return res.status(400).json({ error: "Missing availability id" });
      }
      const availability = await getTruckAvailabilityById(availabilityId);
      if (!availability) {
        return res.status(404).json({ error: "Listing not found" });
      }
      const haulerId = await resolveHaulerId(authUser);
      if (
        !isSuperAdminUser(authUser) &&
        (!haulerId || availability.hauler_id !== haulerId)
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Block delete if any accepted booking exists.
      const bookingCheck = await pool.query(
        `
          SELECT 1
          FROM load_bookings
          WHERE truck_availability_id = $1
            AND status = 'ACCEPTED'
          LIMIT 1
        `,
        [availabilityId]
      );
      if (bookingCheck.rowCount && bookingCheck.rowCount > 0) {
        return res.status(400).json({ error: "Listing has an accepted booking and cannot be deleted" });
      }

      const updated = await updateTruckAvailability(availabilityId, { isActive: false });
      return res.json({ availability: updated });
    } catch (err) {
      console.error("deleteTruckAvailability error", err);
      res.status(500).json({ error: "Failed to delete listing" });
    }
  }
);

router.post(
  "/loads/:loadId/offers",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      const loadId = req.params.loadId;
      if (!loadId) {
        return res.status(400).json({ error: "Missing loadId" });
      }
      let derivedHaulerId = "";
      if (req.body?.hauler_id !== undefined && req.body?.hauler_id !== null) {
        derivedHaulerId = String(req.body.hauler_id);
      } else if (authUser.company_id !== undefined && authUser.company_id !== null) {
        derivedHaulerId = String(authUser.company_id);
      } else if (authUser.id !== undefined && authUser.id !== null) {
        const ensured = await ensureHaulerProfile(Number(authUser.id));
        derivedHaulerId = String(ensured);
      }
      if (!derivedHaulerId) {
        return res.status(400).json({ error: "hauler_id is required" });
      }
      const load = await getLoadById(loadId);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }
      if (load.is_external) {
        return res.status(403).json({ error: "External loads are read-only and cannot receive offers." });
      }
      if (isShipperForLoad(authUser, load)) {
        return res.status(400).json({ error: "You cannot bid on your own load." });
      }
      if (load.status !== LoadStatus.PUBLISHED) {
        return res.status(400).json({ error: "Offers can only be placed on published loads." });
      }
      const existingOffer = await getLatestOfferForHauler(loadId, derivedHaulerId);
      if (
        existingOffer &&
        ![
          LoadOfferStatus.WITHDRAWN,
          LoadOfferStatus.REJECTED,
          LoadOfferStatus.EXPIRED,
        ].includes(existingOffer.status)
      ) {
        return res.status(400).json({
          error:
            "You already have an active offer on this load. Update or withdraw it before creating a new one.",
        });
      }
      const offer = await createLoadOffer({
        loadId,
        haulerId: derivedHaulerId,
        createdByUserId: String(authUser.id ?? ""),
        offeredAmount: Number(req.body.offered_amount),
        currency: req.body.currency,
        message: req.body.message,
        expiresAt: req.body.expires_at,
      });
      emitOfferCreatedEvent(offer);
      res.status(201).json({ offer });
    } catch (err) {
      console.error("createLoadOffer error", err);
      res.status(500).json({ error: "Failed to create offer" });
    }
  }
);

router.get(
  "/haulers/:haulerId/summary",
  authRequired,
  async (req, res) => {
    try {
      const haulerId = req.params.haulerId;
      if (!haulerId) {
        return res.status(400).json({ error: "Missing haulerId" });
      }
      const summary = await getHaulerSummary(haulerId);
      if (!summary) {
        return res.status(404).json({ error: "Hauler not found" });
      }
      res.json({ summary });
    } catch (err) {
      console.error("getHaulerSummary error", err);
      res.status(500).json({ error: "Failed to load hauler profile" });
    }
  }
);

router.get(
  "/loads/:loadId/offers",
  authRequired,
  async (req, res) => {
    try {
      const loadId = req.params.loadId;
      if (!loadId) {
        return res.status(400).json({ error: "Missing loadId" });
      }
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const result = await listLoadOffers(loadId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      res.json({ items: result.items, total: result.total, page, pageSize });
    } catch (err) {
      console.error("listLoadOffers error", err);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  }
);

router.post(
  "/load-offers/:offerId/withdraw",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      const offerId = req.params.offerId;
      if (!offerId) {
        return res.status(400).json({ error: "Missing offerId" });
      }
      const offer = await getLoadOfferById(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      const companyId = String(authUser.company_id ?? "");
      if (!companyId || offer.hauler_id !== companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (offer.status !== LoadOfferStatus.PENDING) {
        return res.status(400).json({ error: "Offer is not pending" });
      }
      const updated = await updateOfferStatus(offer.id, LoadOfferStatus.WITHDRAWN);
      emitOfferUpdatedEvent(updated);
      return res.json({ offer: updated });
    } catch (err) {
      console.error("withdrawOffer error", err);
      res.status(500).json({ error: "Failed to withdraw offer" });
    }
  }
);

router.post(
  "/load-offers/:offerId/bookings",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!isShipperUser(authUser) && !isSuperAdminUser(authUser)) {
        return res.status(403).json({ error: "Only shippers can request bookings" });
      }
      const offerId = req.params.offerId;
      if (!offerId) {
        return res.status(400).json({ error: "Missing offerId" });
      }
      const booking = await createBookingFromOffer({
        offerId,
        shipperUserId: String(authUser.id),
        notes: req.body?.notes,
      });
      res.status(201).json({ booking });
    } catch (err: any) {
      console.error("createBookingFromOffer error", err);
      res.status(400).json({ error: err?.message ?? "Failed to request booking" });
    }
  }
);

router.patch(
  "/load-offers/:offerId",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      const offerId = req.params.offerId;
      if (!offerId) {
        return res.status(400).json({ error: "Missing offerId" });
      }
      const offer = await getLoadOfferById(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      const companyId = getCompanyId(authUser);
      const isHauler = companyId !== null && offer.hauler_id === companyId;
      const isCreator = String(authUser.id ?? "") === offer.created_by_user_id;
      if (!isHauler && !isCreator && !isSuperAdminUser(authUser)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (offer.status !== LoadOfferStatus.PENDING) {
        return res.status(400).json({ error: "Only pending offers can be updated" });
      }

      const patch: {
        offeredAmount?: number;
        currency?: string;
        message?: string | null;
        expiresAt?: string | null;
      } = {};
      if (req.body?.offered_amount !== undefined) {
        const amount = Number(req.body.offered_amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ error: "offered_amount must be positive" });
        }
        patch.offeredAmount = amount;
      }
      if (req.body?.currency !== undefined) {
        patch.currency = req.body.currency;
      }
      if (req.body?.message !== undefined) {
        patch.message = req.body.message;
      }
      if (req.body?.expires_at !== undefined) {
        patch.expiresAt = req.body.expires_at ?? null;
      }
      if (
        patch.offeredAmount === undefined &&
        patch.currency === undefined &&
        patch.message === undefined &&
        patch.expiresAt === undefined
      ) {
        return res.status(400).json({ error: "No fields provided to update" });
      }

      const updated = await updateOfferDetails(offer.id, patch);
      emitOfferUpdatedEvent(updated);
      return res.json({ offer: updated });
    } catch (err) {
      console.error("updateOffer error", err);
      res.status(500).json({ error: "Failed to update offer" });
    }
  }
);

router.post(
  "/load-offers/:offerId/reject",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      const offerId = req.params.offerId;
      if (!offerId) {
        return res.status(400).json({ error: "Missing offerId" });
      }
      const offer = await getLoadOfferById(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      const load = await getLoadById(offer.load_id);
      if (!load) {
        return res.status(404).json({ error: "Load not found" });
      }
      if (!isShipperForLoad(authUser, load)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (offer.status !== LoadOfferStatus.PENDING) {
        return res.status(400).json({ error: "Offer is not pending" });
      }
      const updated = await updateOfferStatus(offer.id, LoadOfferStatus.REJECTED, {
        rejected_at: new Date().toISOString(),
      });
      emitOfferUpdatedEvent(updated);
      return res.json({ offer: updated });
    } catch (err) {
      console.error("rejectOffer error", err);
      res.status(500).json({ error: "Failed to reject offer" });
    }
  }
);

router.post(
  "/load-offers/:offerId/accept",
  authRequired,
  async (req, res) => {
    res.status(400).json({ error: "Use booking approval endpoint to accept offers." });
  }
);

// helper to check offer access
async function getOfferAccess(offerId: string, userId?: string, userRole?: string) {
  const offer = await getLoadOfferById(offerId);
  if (!offer) {
    return { offer: null, load: null, allowed: false, isShipper: false, isHauler: false, isAdmin: false };
  }
  const load = await getLoadById(offer.load_id);
  const shipperUserId = load?.shipper_user_id ?? null;
  const isShipper = shipperUserId !== null && shipperUserId === String(userId ?? "");
  const isHauler = offer.created_by_user_id === String(userId ?? "");
  const isAdmin = (userRole ?? "").toUpperCase() === "SUPER_ADMIN";
  return { offer, load, allowed: isShipper || isHauler || isAdmin, isShipper, isHauler, isAdmin };
}

function toRoleSlug(role?: string | null) {
  return (role ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function normalizeRole(role?: string | null) {
  return (role ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
}

function getCompanyId(user?: { company_id?: string | number | null }) {
  if (user?.company_id === undefined || user?.company_id === null) {
    return null;
  }
  return String(user.company_id);
}

function isSuperAdminUser(user?: { user_type?: string | null }) {
  const slug = toRoleSlug(user?.user_type);
  return slug === "super-admin" || slug === "superadmin" || slug === "admin";
}

function isHaulerUser(user?: { user_type?: string | null }) {
  const role = normalizeRole(user?.user_type);
  return role.startsWith("HAULER");
}

function isShipperUser(user?: { user_type?: string | null }) {
  const role = normalizeRole(user?.user_type);
  return role.startsWith("SHIPPER");
}

async function resolveHaulerId(user: AuthUser): Promise<string | null> {
  const companyId = getCompanyId(user);
  if (companyId) return companyId;
  if (user.id === undefined || user.id === null) return null;
  const ensured = await ensureHaulerProfile(Number(user.id));
  return String(ensured);
}

async function resolveShipperId(user: AuthUser): Promise<string | null> {
  const companyId = getCompanyId(user);
  if (companyId) return companyId;
  if (user.id === undefined || user.id === null) return null;
  const ensured = await ensureShipperProfile(Number(user.id));
  return String(ensured);
}

async function getTruckChatContext(chatId: string) {
  const chat = await getTruckChatById(chatId);
  if (!chat) return null;
  const availability = await getTruckAvailabilityById(chat.truck_availability_id);
  if (!availability) {
    return null;
  }
  return { chat, availability };
}

function isShipperForLoad(
  user: { id?: string; company_id?: string | number | null },
  load: { shipper_id: string; shipper_user_id: string }
) {
  const companyId = getCompanyId(user);
  const userId = user?.id ? String(user.id) : null;
  return companyId === load.shipper_id || userId === load.shipper_user_id;
}

function isHaulerForTripUser(
  user: { company_id?: string | number | null },
  trip: { hauler_id: string | null }
) {
  const companyId = getCompanyId(user);
  return !!companyId && !!trip.hauler_id && companyId === trip.hauler_id;
}

async function isAuthorizedHaulerForTrip(user: AuthUser, trip: { hauler_id: string | null }) {
  if (isHaulerForTripUser(user, trip)) {
    return true;
  }
  if (!isHaulerUser(user)) {
    return false;
  }
  const resolved = await resolveHaulerId(user);
  if (!resolved || !trip.hauler_id) {
    return false;
  }
  return resolved === trip.hauler_id;
}

async function isDriverForTripUser(userId: string | undefined, trip: { assigned_driver_id: string | null }) {
  if (!userId) return false;
  return driverMatchesUser(trip.assigned_driver_id, String(userId));
}

async function getDisputeContext(disputeId: string) {
  const dispute = await getDisputeById(disputeId);
  if (!dispute) return null;
  const trip = await getTripById(dispute.trip_id);
  const load = trip ? await getLoadById(trip.load_id) : null;
  const payment = await getPaymentById(dispute.payment_id);
  return { dispute, trip, load, payment };
}

async function ensureTripPaymentModeImmutable(tripId: string, incomingMode?: string | null) {
  if (!incomingMode) return;
  const trip = await getTripById(tripId);
  if (!trip) return;
  const normalized = incomingMode.toUpperCase();
  if (trip.payment_mode && trip.payment_mode !== normalized) {
    throw new Error("PAYMENT_MODE_IMMUTABLE");
  }
}

const ADMIN_MESSAGE_TARGETS = new Set(["SHIPPER", "HAULER", "ALL"]);

function resolveDisputeRecipientRole(
  senderRole: string,
  requestedTarget?: string
) {
  if (senderRole === "SUPER_ADMIN") {
    const normalizedRequest = normalizeRole(requestedTarget);
    if (ADMIN_MESSAGE_TARGETS.has(normalizedRequest)) {
      return normalizedRequest;
    }
    if (
      normalizedRequest === "BOTH" ||
      normalizedRequest === "ALL_PARTIES" ||
      normalizedRequest === "SHIPPER_AND_HAULER"
    ) {
      return "ALL";
    }
    return "ALL";
  }
  return "ADMIN";
}

function emitOfferCreatedEvent(offer?: LoadOfferRecord | null) {
  if (offer) {
    emitEvent(SOCKET_EVENTS.OFFER_CREATED, { offer });
  }
}

function emitOfferUpdatedEvent(offer?: LoadOfferRecord | null) {
  if (offer) {
    emitEvent(SOCKET_EVENTS.OFFER_UPDATED, { offer });
  }
}

function emitOfferMessageEvent(message?: unknown) {
  if (message) {
    emitEvent(SOCKET_EVENTS.OFFER_MESSAGE, { message });
  }
}

function emitTripEvent(trip?: TripRecord | null) {
  if (trip) {
    emitEvent(SOCKET_EVENTS.TRIP_UPDATED, { trip });
  }
}

function emitLoadEvent(load?: LoadRecord | null) {
  if (load) {
    emitEvent(SOCKET_EVENTS.LOAD_UPDATED, { load });
  }
}

function emitPaymentEvent(payment?: PaymentRecord | null) {
  if (payment) {
    emitEvent(SOCKET_EVENTS.PAYMENT_UPDATED, { payment });
  }
}

function emitDisputeEvent(
  event: typeof SOCKET_EVENTS.DISPUTE_CREATED | typeof SOCKET_EVENTS.DISPUTE_UPDATED,
  dispute?: DisputeRecord | null
) {
  if (dispute) {
    emitEvent(event, { dispute });
  }
}

function emitDisputeMessageEvent(message?: unknown) {
  if (message) {
    emitEvent(SOCKET_EVENTS.DISPUTE_MESSAGE, { message });
  }
}

// List offer messages
router.get(
  "/load-offers/:offerId/messages",
  authRequired,
  async (req, res) => {
    try {
      const offerId = req.params.offerId;
      if (!offerId) {
        return res.status(400).json({ error: "Missing offerId" });
      }
      const authUser = getAuthUser(req);
      if (authUser.id === undefined || authUser.id === null) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const access = await getOfferAccess(
        offerId,
        authUser.id,
        authUser.user_type
      );
      if (!access.offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      if (!access.allowed) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const messages = await listOfferMessages(access.offer.id);
      return res.json({ items: messages });
    } catch (err) {
      console.error("listOfferMessages error", err);
      res.status(500).json({ error: "Failed to fetch offer messages" });
    }
  }
);

// Post offer message
router.post(
  "/load-offers/:offerId/messages",
  authRequired,
  async (req, res) => {
    try {
      const offerId = req.params.offerId;
      if (!offerId) {
        return res.status(400).json({ error: "Missing offerId" });
      }
      const authUser = getAuthUser(req);
      if (authUser.id === undefined || authUser.id === null) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const access = await getOfferAccess(
        offerId,
        authUser.id,
        authUser.user_type
      );
      if (!access.offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      if (!access.allowed) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (
        access.isHauler &&
        access.offer.status === LoadOfferStatus.PENDING
      ) {
        const hasShipperMessage = await offerHasShipperMessage(access.offer.id);
        if (!hasShipperMessage) {
          return res
            .status(403)
            .json({ error: "Shipper must start the conversation first." });
        }
      }
      if (
        access.offer.status === LoadOfferStatus.EXPIRED ||
        access.offer.status === LoadOfferStatus.REJECTED ||
        access.offer.status === LoadOfferStatus.WITHDRAWN
      ) {
        return res.status(400).json({ error: "Cannot message on closed offer" });
      }
      const message = await createOfferMessage({
        offerId: access.offer.id,
        senderUserId: String(authUser.id),
        senderRole: String(authUser.user_type ?? "unknown"),
        text: req.body.text,
        attachments: req.body.attachments,
      });
      emitOfferMessageEvent(message);
      return res.status(201).json({ message });
    } catch (err) {
      console.error("createOfferMessage error", err);
      res.status(500).json({ error: "Failed to send offer message" });
    }
  }
);

/**
 * ==========================
 * TRIPS & LIFECYCLE
 * ==========================
 */

router.get("/trips/:tripId", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const context = await getTripAndLoad(tripId);
    if (!context) {
      return res.status(404).json({ error: "Trip not found" });
    }
    try {
      assertDisputesEnabled(context.trip);
    } catch (err: any) {
      if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
      throw err;
    }
    try {
      assertDisputesEnabled(context.trip);
    } catch (err: any) {
      if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
      throw err;
    }
    const user = getAuthUser(req);
    const isShipper = isShipperForLoad(user, context.load);
    const isHauler = await isAuthorizedHaulerForTrip(user, context.trip);
    const isDriver = await isDriverForTripUser(user.id, context.trip);
    if (!isShipper && !isHauler && !isDriver && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const payment = await getPaymentForTrip(context.trip.id);
    const direct_payment =
      context.trip.payment_mode === "DIRECT"
        ? await getDirectPaymentForTrip(context.trip.id)
        : null;
    return res.json({ trip: context.trip, load: context.load, payment, direct_payment });
  } catch (err) {
    console.error("getTrip error", err);
    res.status(500).json({ error: "Failed to load trip" });
  }
});

router.get("/loads/:loadId/trip", authRequired, async (req, res) => {
  try {
    const loadId = req.params.loadId;
    if (!loadId) {
      return res.status(400).json({ error: "Missing loadId" });
    }
    let context;
    try {
      context = await getTripContextByLoadId(loadId);
    } catch (err: any) {
      return res.status(404).json({ error: err?.message ?? "Load not found" });
    }
    const user = getAuthUser(req);
    const isShipper = isShipperForLoad(user, context.load);
    let isHauler = false;
    if (context.trip && isHaulerUser(user)) {
      const resolved = await resolveHaulerId(user);
      if (resolved && context.trip.hauler_id === resolved) {
        isHauler = true;
      }
    }
    if (!isShipper && !isHauler && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(context);
  } catch (err) {
    console.error("getTripByLoad error", err);
    res.status(500).json({ error: "Failed to load trip by load id" });
  }
});

router.get("/hauler/drivers", authRequired, async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!isHaulerUser(user)) {
      return res.status(403).json({ error: "Only haulers can view drivers" });
    }
    const haulerId = await resolveHaulerId(user);
    if (!haulerId) {
      return res.status(400).json({ error: "Unable to resolve hauler profile" });
    }
    const items = await listDriversForHauler(haulerId);
    return res.json({ items });
  } catch (err) {
    console.error("listHaulerDrivers error", err);
    res.status(500).json({ error: "Failed to load drivers" });
  }
});

router.get("/hauler/vehicles", authRequired, async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!isHaulerUser(user)) {
      return res.status(403).json({ error: "Only haulers can view vehicles" });
    }
    const haulerId = await resolveHaulerId(user);
    if (!haulerId) {
      return res.status(400).json({ error: "Unable to resolve hauler profile" });
    }
    const items = await listVehiclesForHauler(haulerId);
    return res.json({ items });
  } catch (err) {
    console.error("listHaulerVehicles error", err);
    res.status(500).json({ error: "Failed to load vehicles" });
  }
});

router.patch("/trips/:tripId/assign-driver", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const trip = await getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const user = getAuthUser(req);
    if (!(await isAuthorizedHaulerForTrip(user, trip)) && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (![TripStatus.PENDING_ESCROW, TripStatus.READY_TO_START].includes(trip.status)) {
      return res.status(400).json({ error: "Cannot assign driver in current status" });
    }
    const driverId = req.body?.driver_id;
    if (!driverId) {
      return res.status(400).json({ error: "driver_id is required" });
    }
    if (!(await driverBelongsToHauler(driverId, trip.hauler_id ?? ""))) {
      return res.status(400).json({ error: "Driver must belong to hauler" });
    }
    const updated = await updateTripAssignment({ tripId: trip.id, driverId });
    emitTripEvent(updated);
    return res.json({ trip: updated });
  } catch (err) {
    console.error("assignDriver error", err);
    res.status(500).json({ error: "Failed to assign driver" });
  }
});

router.patch("/trips/:tripId/assign-vehicle", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const trip = await getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const user = getAuthUser(req);
    if (!(await isAuthorizedHaulerForTrip(user, trip)) && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (![TripStatus.PENDING_ESCROW, TripStatus.READY_TO_START].includes(trip.status)) {
      return res.status(400).json({ error: "Cannot assign vehicle in current status" });
    }
    const vehicleId = req.body?.vehicle_id;
    if (!vehicleId) {
      return res.status(400).json({ error: "vehicle_id is required" });
    }
    if (!(await vehicleBelongsToHauler(vehicleId, trip.hauler_id ?? ""))) {
      return res.status(400).json({ error: "Vehicle must belong to hauler" });
    }
    const updated = await updateTripAssignment({ tripId: trip.id, vehicleId });
    emitTripEvent(updated);
    return res.json({ trip: updated });
  } catch (err) {
    console.error("assignVehicle error", err);
    res.status(500).json({ error: "Failed to assign vehicle" });
  }
});

router.post("/trips/:tripId/start", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const context = await getTripAndLoad(tripId);
    if (!context) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const user = getAuthUser(req);
    const isHauler = await isAuthorizedHaulerForTrip(user, context.trip);
    const isDriver = await isDriverForTripUser(user.id, context.trip);
    const isShipper = isShipperForLoad(user, context.load);
    if (!isHauler && !isDriver && !isShipper && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const payment = await getPaymentForTrip(context.trip.id);
    const directMode =
      context.trip.payment_mode === "DIRECT" ||
      context.load.payment_mode === "DIRECT" ||
      (payment as any)?.payment_mode === "DIRECT" ||
      payment?.is_escrow === false ||
      payment?.status === PaymentStatus.NOT_APPLICABLE ||
      (!payment && context.trip.status === TripStatus.PENDING_ESCROW);

    if (!directMode) {
      if (context.trip.status !== TripStatus.READY_TO_START) {
        return res.status(400).json({ error: "Trip must be READY_TO_START" });
      }
      if (!payment || payment.status !== PaymentStatus.ESCROW_FUNDED) {
        return res.status(400).json({ error: "Escrow not funded" });
      }
    } else {
      // Direct payment: allow start from READY_TO_START or PENDING_ESCROW, and do not require escrow.
      if (
        ![TripStatus.READY_TO_START, TripStatus.PENDING_ESCROW].includes(context.trip.status)
      ) {
        return res.status(400).json({ error: "Trip must be READY_TO_START" });
      }
    }
    const now = new Date().toISOString();
    const updatedTrip = await updateTripStatus(context.trip.id, TripStatus.IN_PROGRESS, {
      started_at: now,
    });
    const updatedLoad = await updateLoadStatus(context.load.id, LoadStatus.IN_TRANSIT);
    emitTripEvent(updatedTrip);
    emitLoadEvent(updatedLoad);
    return res.json({ trip: updatedTrip, load: updatedLoad });
  } catch (err) {
    console.error("startTrip error", err);
    res.status(500).json({ error: "Failed to start trip" });
  }
});

router.post("/trips/:tripId/mark-delivered", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const context = await getTripAndLoad(tripId);
    if (!context) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const user = getAuthUser(req);
    const isHauler = await isAuthorizedHaulerForTrip(user, context.trip);
    const isDriver = await isDriverForTripUser(user.id, context.trip);
    if (!isHauler && !isDriver && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (context.trip.status !== TripStatus.IN_PROGRESS) {
      return res.status(400).json({ error: "Trip must be IN_PROGRESS" });
    }
    const now = new Date().toISOString();
    const updatedTrip = await updateTripStatus(
      context.trip.id,
      TripStatus.DELIVERED_AWAITING_CONFIRMATION,
      { delivered_at: now }
    );
    const updatedLoad = await updateLoadStatus(context.load.id, LoadStatus.DELIVERED);
    emitTripEvent(updatedTrip);
    emitLoadEvent(updatedLoad);
    return res.json({ trip: updatedTrip, load: updatedLoad });
  } catch (err) {
    console.error("markDelivered error", err);
    res.status(500).json({ error: "Failed to mark delivered" });
  }
});

router.post("/trips/:tripId/confirm-delivery", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const context = await getTripAndLoad(tripId);
    if (!context) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const user = getAuthUser(req);
    if (!isShipperForLoad(user, context.load) && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Only shipper can confirm delivery" });
    }
    if (context.trip.status !== TripStatus.DELIVERED_AWAITING_CONFIRMATION) {
      return res.status(400).json({ error: "Trip not awaiting confirmation" });
    }
    const payment = await getPaymentForTrip(context.trip.id);
    if (context.trip.payment_mode !== "DIRECT") {
      if (!payment || payment.status !== PaymentStatus.ESCROW_FUNDED) {
        return res.status(400).json({ error: "Escrow must be funded" });
      }
    }
    const now = new Date().toISOString();
    const updatedTrip = await updateTripStatus(
      context.trip.id,
      TripStatus.DELIVERED_CONFIRMED,
      { delivered_confirmed_at: now }
    );
    const releaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const updatedPayment =
      context.trip.payment_mode === "DIRECT"
        ? payment
        : await scheduleAutoRelease({ tripId: context.trip.id, releaseAt });
    const updatedLoad = await updateLoadStatus(context.load.id, LoadStatus.DELIVERED);
    emitTripEvent(updatedTrip);
    emitPaymentEvent(updatedPayment);
    emitLoadEvent(updatedLoad);
    return res.json({ trip: updatedTrip, payment: updatedPayment, load: updatedLoad });
  } catch (err) {
    console.error("confirmDelivery error", err);
    res.status(500).json({ error: "Failed to confirm delivery" });
  }
});

/**
 * ==========================
 * ESCROW
 * ==========================
 */

router.post("/trips/:tripId/escrow/payment-intent", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const context = await getTripAndLoad(tripId);
    if (!context) {
      return res.status(404).json({ error: "Trip not found" });
    }
    try {
      assertEscrowEnabled({ trip: context.trip });
    } catch (err: any) {
      if (err?.code === "ESCROW_DISABLED") return escrowDisabledResponse(res);
      throw err;
    }
    const user = getAuthUser(req);
    if (!isShipperForLoad(user, context.load) && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (context.trip.payment_mode !== "DIRECT" && context.trip.status !== TripStatus.PENDING_ESCROW) {
      return res.status(400).json({ error: "Trip must be PENDING_ESCROW" });
    }
    const provider = req.body?.provider || "dummy";
    const externalIntentId =
      req.body?.external_intent_id || `pi_${context.trip.id}_${Date.now()}`;
    const payment = await attachEscrowPaymentIntent({
      tripId: context.trip.id,
      provider,
      externalIntentId,
    });
    emitPaymentEvent(payment);
    const clientSecret = payment?.external_intent_id
      ? `secret_${payment.external_intent_id}`
      : null;
    return res.json({ payment, client_secret: clientSecret });
  } catch (err) {
    console.error("paymentIntent error", err);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

router.get("/trips/:tripId/payment", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const context = await getTripAndLoad(tripId);
    if (!context) {
      return res.status(404).json({ error: "Trip not found" });
    }
    try {
      assertEscrowEnabled({ trip: context.trip });
    } catch (err: any) {
      if (err?.code === "ESCROW_DISABLED") return escrowDisabledResponse(res);
      throw err;
    }
    const user = getAuthUser(req);
    const isShipper = isShipperForLoad(user, context.load);
    const isHauler = await isAuthorizedHaulerForTrip(user, context.trip);
    if (!isShipper && !isHauler && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const payment = await getPaymentForTrip(context.trip.id);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    try {
      assertEscrowEnabled({ trip: context.trip, payment });
    } catch (err: any) {
      if (err?.code === "ESCROW_DISABLED") return escrowDisabledResponse(res);
      throw err;
    }
    return res.json({ payment });
  } catch (err) {
    console.error("getPayment error", err);
    res.status(500).json({ error: "Failed to load payment" });
  }
});

router.post("/webhooks/payment-provider", async (req, res) => {
  try {
    const { external_intent_id, event } = req.body ?? {};
    if (!external_intent_id || !event) {
      return res.status(400).json({ error: "external_intent_id and event are required" });
    }
    const payment = await getPaymentByIntentId(external_intent_id);
    if (!payment) {
      return res.status(200).json({ ok: true });
    }
    let updatedPayment: PaymentRecord | null = null;
    let relatedTrip: TripRecord | null = null;
    if (event === "payment_succeeded" && payment.trip_id) {
      try {
        const tripContext = await getTripById(payment.trip_id);
        assertEscrowEnabled({ trip: tripContext ?? null, payment });
      } catch (err: any) {
        if (err?.code === "ESCROW_DISABLED") {
          return res.status(409).json({ error: "Escrow is disabled for direct payment trips" });
        }
        throw err;
      }
      updatedPayment = await markPaymentFunded(payment.trip_id);
      relatedTrip = await getTripById(payment.trip_id);
    } else if (event === "payment_failed") {
      updatedPayment = await updatePaymentStatus(payment.id, PaymentStatus.AWAITING_FUNDING);
    }
    emitPaymentEvent(updatedPayment);
    emitTripEvent(relatedTrip);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("payment webhook error", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * ==========================
 * DISPUTES
 * ==========================
 */

router.post("/trips/:tripId/disputes", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const context = await getTripAndLoad(tripId);
    if (!context) {
      return res.status(404).json({ error: "Trip not found" });
    }
    try {
      assertEscrowEnabled({ trip: context.trip });
    } catch (err: any) {
      if (err?.code === "ESCROW_DISABLED") return escrowDisabledResponse(res);
      throw err;
    }
    const user = getAuthUser(req);
    const isShipper = isShipperForLoad(user, context.load);
    const isHauler = await isAuthorizedHaulerForTrip(user, context.trip);
    if (!isShipper && !isHauler && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const payment = await getPaymentForTrip(context.trip.id);
    if (context.trip.payment_mode === "DIRECT") {
      return disputesDisabledResponse(res);
    }
    if (!payment || payment.status !== PaymentStatus.ESCROW_FUNDED) {
      return res.status(400).json({ error: "Disputes require funded escrow" });
    }
    if (
      ![
        TripStatus.DELIVERED_AWAITING_CONFIRMATION,
        TripStatus.DELIVERED_CONFIRMED,
      ].includes(context.trip.status)
    ) {
      return res.status(400).json({ error: "Trip must be delivered" });
    }
    const openDisputes = await listDisputesByPayment(payment.id, [
      DisputeStatus.OPEN,
      DisputeStatus.UNDER_REVIEW,
    ]);
    if (openDisputes.length > 0) {
      return res.status(400).json({ error: "Dispute already open" });
    }
    const reasonCode = req.body?.reason_code;
    if (!reasonCode) {
      return res.status(400).json({ error: "reason_code is required" });
    }
    const dispute = await createPaymentDispute({
      tripId: context.trip.id,
      paymentId: payment.id,
      openedByUserId: String(user.id ?? ""),
      openedByRole: normalizeRole(user.user_type),
      reasonCode,
      description: req.body?.description,
      requestedAction: req.body?.requested_action,
    });
    const updatedTrip = await updateTripStatus(context.trip.id, TripStatus.DISPUTED);
    let updatedPayment: PaymentRecord | null = payment;
    if (payment.id) {
      updatedPayment = await clearAutoReleaseForPayment(payment.id);
    }
    emitDisputeEvent(SOCKET_EVENTS.DISPUTE_CREATED, dispute);
    emitTripEvent(updatedTrip);
    emitPaymentEvent(updatedPayment);
    return res.status(201).json({ dispute });
  } catch (err) {
    console.error("createDispute error", err);
    res.status(500).json({ error: "Failed to create dispute" });
  }
});

router.get("/trips/:tripId/disputes", authRequired, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    if (!tripId) {
      return res.status(400).json({ error: "Missing tripId" });
    }
    const context = await getTripAndLoad(tripId);
    if (!context) {
      return res.status(404).json({ error: "Trip not found" });
    }
    try {
      assertDisputesEnabled(context.trip);
    } catch (err: any) {
      if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
      throw err;
    }
    const user = getAuthUser(req);
    const isShipper = isShipperForLoad(user, context.load);
    const isHauler = await isAuthorizedHaulerForTrip(user, context.trip);
    if (!isShipper && !isHauler && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const disputes = await listDisputesByTrip(context.trip.id);
    return res.json({ items: disputes });
  } catch (err) {
    console.error("listTripDisputes error", err);
    res.status(500).json({ error: "Failed to list disputes" });
  }
});

router.get("/disputes/:disputeId", authRequired, async (req, res) => {
  try {
    const disputeId = req.params.disputeId;
    if (!disputeId) {
      return res.status(400).json({ error: "Missing disputeId" });
    }
    const context = await getDisputeContext(disputeId);
    if (!context || !context.trip || !context.load) {
      return res.status(404).json({ error: "Dispute not found" });
    }
    try {
      assertDisputesEnabled(context.trip);
    } catch (err: any) {
      if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
      throw err;
    }
    try {
      assertDisputesEnabled(context.trip);
    } catch (err: any) {
      if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
      throw err;
    }
    try {
      assertDisputesEnabled(context.trip);
    } catch (err: any) {
      if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
      throw err;
    }
    const user = getAuthUser(req);
    const isShipper = isShipperForLoad(user, context.load);
    const isHauler = await isAuthorizedHaulerForTrip(user, context.trip);
    if (!isShipper && !isHauler && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json({ dispute: context.dispute });
  } catch (err) {
    console.error("getDispute error", err);
    res.status(500).json({ error: "Failed to fetch dispute" });
  }
});

router.post("/disputes/:disputeId/messages", authRequired, async (req, res) => {
  try {
    const disputeId = req.params.disputeId;
    if (!disputeId) {
      return res.status(400).json({ error: "Missing disputeId" });
    }
    const context = await getDisputeContext(disputeId);
    if (!context || !context.trip || !context.load) {
      return res.status(404).json({ error: "Dispute not found" });
    }
    try {
      assertDisputesEnabled(context.trip);
    } catch (err: any) {
      if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
      throw err;
    }
    const user = getAuthUser(req);
    const isShipper = isShipperForLoad(user, context.load);
    const isHauler = await isAuthorizedHaulerForTrip(user, context.trip);
    const senderRole = normalizeRole(user.user_type);
    const isAdmin = senderRole === "SUPER_ADMIN";
    if (!isShipper && !isHauler && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const requestedTarget =
      typeof req.body?.recipient_role === "string" ? req.body.recipient_role : undefined;
    const recipientRole = resolveDisputeRecipientRole(senderRole, requestedTarget);
    const message = await addDisputeMessage({
      disputeId: context.dispute.id,
      senderUserId: String(user.id ?? ""),
      senderRole,
      recipientRole,
      text: req.body?.text,
      attachments: req.body?.attachments,
    });
    emitDisputeMessageEvent(message);
    return res.status(201).json({ message });
  } catch (err) {
    console.error("addDisputeMessage error", err);
    res.status(500).json({ error: "Failed to send dispute message" });
  }
});

router.get("/disputes/:disputeId/messages", authRequired, async (req, res) => {
  try {
    const disputeId = req.params.disputeId;
    if (!disputeId) {
      return res.status(400).json({ error: "Missing disputeId" });
    }
    const context = await getDisputeContext(disputeId);
    if (!context || !context.trip || !context.load) {
      return res.status(404).json({ error: "Dispute not found" });
    }
    try {
      assertDisputesEnabled(context.trip);
    } catch (err: any) {
      if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
      throw err;
    }
    const user = getAuthUser(req);
    const isShipper = isShipperForLoad(user, context.load);
    const isHauler = await isAuthorizedHaulerForTrip(user, context.trip);
    if (!isShipper && !isHauler && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const messages = await listDisputeMessages(context.dispute.id);
    return res.json({ items: messages });
  } catch (err) {
    console.error("listDisputeMessages error", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/disputes/:disputeId/cancel", authRequired, async (req, res) => {
  try {
    const disputeId = req.params.disputeId;
    if (!disputeId) {
      return res.status(400).json({ error: "Missing disputeId" });
    }
    const context = await getDisputeContext(disputeId);
    if (!context || !context.trip || !context.load || !context.payment) {
      return res.status(404).json({ error: "Dispute not found" });
    }
    try {
      assertDisputesEnabled(context.trip);
    } catch (err: any) {
      if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
      throw err;
    }
    if (context.dispute.status !== DisputeStatus.OPEN) {
      return res.status(400).json({ error: "Only OPEN disputes can be cancelled" });
    }
    const user = getAuthUser(req);
    const isOpener = String(user.id ?? "") === context.dispute.opened_by_user_id;
    if (!isOpener && !isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const updatedDispute = await updateDisputeStatus(
      context.dispute.id,
      DisputeStatus.CANCELLED
    );
    const otherOpen = await listDisputesByPayment(context.payment.id, [
      DisputeStatus.OPEN,
      DisputeStatus.UNDER_REVIEW,
    ]);
    let updatedTrip = context.trip;
    let updatedPayment = context.payment;
    if (otherOpen.length === 0) {
      if (context.trip.status === TripStatus.DISPUTED) {
        const nextTrip = await updateTripStatus(context.trip.id, TripStatus.DELIVERED_CONFIRMED);
        if (nextTrip) {
          updatedTrip = nextTrip;
        }
      }
      if (context.payment.status === PaymentStatus.ESCROW_FUNDED) {
        const releaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const nextPayment = await scheduleAutoRelease({
          tripId: context.trip.id,
          releaseAt,
        });
        if (nextPayment) {
          updatedPayment = nextPayment;
        }
      }
    }
    emitDisputeEvent(SOCKET_EVENTS.DISPUTE_UPDATED, updatedDispute);
    emitTripEvent(updatedTrip);
    emitPaymentEvent(updatedPayment);
    return res.json({ dispute: updatedDispute, trip: updatedTrip, payment: updatedPayment });
  } catch (err) {
    console.error("cancelDispute error", err);
    res.status(500).json({ error: "Failed to cancel dispute" });
  }
});

/**
 * ==========================
 * ADMIN
 * ==========================
 */

router.post("/admin/disputes/:disputeId/start-review", authRequired, async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const disputeId = req.params.disputeId;
    if (!disputeId) {
      return res.status(400).json({ error: "Missing disputeId" });
    }
    const context = await getDisputeContext(disputeId);
    if (context?.trip) {
      try {
        assertDisputesEnabled(context.trip);
      } catch (err: any) {
        if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
        throw err;
      }
    }
    const dispute = await updateDisputeStatus(disputeId, DisputeStatus.UNDER_REVIEW);
    if (!dispute) {
      return res.status(404).json({ error: "Dispute not found" });
    }
    emitDisputeEvent(SOCKET_EVENTS.DISPUTE_UPDATED, dispute);
    return res.json({ dispute });
  } catch (err) {
    console.error("startReview error", err);
    res.status(500).json({ error: "Failed to update dispute" });
  }
});

router.post("/admin/disputes/:disputeId/resolve-release", authRequired, async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const disputeId = req.params.disputeId;
    if (!disputeId) {
      return res.status(400).json({ error: "Missing disputeId" });
    }
    const context = await getDisputeContext(disputeId);
    if (context?.trip) {
      try {
        assertDisputesEnabled(context.trip);
      } catch (err: any) {
        if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
        throw err;
      }
    }
    const result = await resolveDisputeLifecycle({
      disputeId,
      disputeStatus: DisputeStatus.RESOLVED_RELEASE_TO_HAULER,
      paymentStatus: PaymentStatus.RELEASED_TO_HAULER,
      resolvedBy: String(user.id ?? ""),
    });
    emitDisputeEvent(SOCKET_EVENTS.DISPUTE_UPDATED, result.dispute);
    emitPaymentEvent(result.payment);
    emitTripEvent(result.trip);
    emitLoadEvent(result.load);
    return res.json(result);
  } catch (err) {
    console.error("resolveRelease error", err);
    res.status(500).json({ error: "Failed to resolve dispute" });
  }
});

router.post("/admin/disputes/:disputeId/resolve-refund", authRequired, async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const disputeId = req.params.disputeId;
    if (!disputeId) {
      return res.status(400).json({ error: "Missing disputeId" });
    }
    const context = await getDisputeContext(disputeId);
    if (context?.trip) {
      try {
        assertDisputesEnabled(context.trip);
      } catch (err: any) {
        if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
        throw err;
      }
    }
    if (context?.trip?.payment_mode === "DIRECT") {
      return escrowDisabledResponse(res);
    }
    const result = await resolveDisputeLifecycle({
      disputeId,
      disputeStatus: DisputeStatus.RESOLVED_REFUND_TO_SHIPPER,
      paymentStatus: PaymentStatus.REFUNDED_TO_SHIPPER,
      resolvedBy: String(user.id ?? ""),
    });
    emitDisputeEvent(SOCKET_EVENTS.DISPUTE_UPDATED, result.dispute);
    emitPaymentEvent(result.payment);
    emitTripEvent(result.trip);
    emitLoadEvent(result.load);
    return res.json(result);
  } catch (err) {
    console.error("resolveRefund error", err);
    res.status(500).json({ error: "Failed to resolve dispute" });
  }
});

router.post("/admin/disputes/:disputeId/resolve-split", authRequired, async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const disputeId = req.params.disputeId;
    if (!disputeId) {
      return res.status(400).json({ error: "Missing disputeId" });
    }
    const context = await getDisputeContext(disputeId);
    if (!context || !context.payment) {
      return res.status(404).json({ error: "Dispute not found" });
    }
    if (context.trip) {
      try {
        assertDisputesEnabled(context.trip);
      } catch (err: any) {
        if (err?.code === "DISPUTES_DISABLED") return disputesDisabledResponse(res);
        throw err;
      }
    }
    const amountToHauler = Number(req.body?.amount_to_hauler ?? 0);
    const amountToShipper = Number(req.body?.amount_to_shipper ?? 0);
    const total = Number(context.payment.amount ?? 0);
    if (Math.round((amountToHauler + amountToShipper) * 100) !== Math.round(total * 100)) {
      return res.status(400).json({ error: "Split amounts must equal payment amount" });
    }
    const result = await resolveDisputeLifecycle({
      disputeId,
      disputeStatus: DisputeStatus.RESOLVED_SPLIT,
      paymentStatus: PaymentStatus.SPLIT_BETWEEN_PARTIES,
      resolvedBy: String(user.id ?? ""),
      resolutionAmounts: {
        amountToHauler: amountToHauler.toFixed(2),
        amountToShipper: amountToShipper.toFixed(2),
      },
    });
    emitDisputeEvent(SOCKET_EVENTS.DISPUTE_UPDATED, result.dispute);
    emitPaymentEvent(result.payment);
    emitTripEvent(result.trip);
    emitLoadEvent(result.load);
    return res.json(result);
  } catch (err) {
    console.error("resolveSplit error", err);
    res.status(500).json({ error: "Failed to resolve dispute" });
  }
});

router.post("/admin/payments/:paymentId/force-release", authRequired, async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const paymentId = req.params.paymentId;
    if (!paymentId) {
      return res.status(400).json({ error: "Missing paymentId" });
    }
    const result = await finalizePaymentLifecycle({
      paymentId,
      paymentStatus: PaymentStatus.RELEASED_TO_HAULER,
      tripStatus: TripStatus.CLOSED,
      loadStatus: LoadStatus.COMPLETED,
    });
    emitPaymentEvent(result.payment);
    emitTripEvent(result.trip);
    emitLoadEvent(result.load);
    return res.json(result);
  } catch (err) {
    console.error("forceRelease error", err);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

router.post("/admin/payments/:paymentId/force-refund", authRequired, async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const paymentId = req.params.paymentId;
    if (!paymentId) {
      return res.status(400).json({ error: "Missing paymentId" });
    }
    const result = await finalizePaymentLifecycle({
      paymentId,
      paymentStatus: PaymentStatus.REFUNDED_TO_SHIPPER,
      tripStatus: TripStatus.CLOSED,
      loadStatus: LoadStatus.COMPLETED,
    });
    emitPaymentEvent(result.payment);
    emitTripEvent(result.trip);
    emitLoadEvent(result.load);
    return res.json(result);
  } catch (err) {
    console.error("forceRefund error", err);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

router.post("/admin/payments/run-auto-release", authRequired, async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!isSuperAdminUser(user)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const results = await autoReleaseReadyPayments();
    for (const result of results) {
      emitPaymentEvent(result.payment);
      emitTripEvent(result.trip);
      emitLoadEvent(result.load);
    }
    return res.json({
      processed: results.map((r) => ({
        payment_id: r.payment.id,
        trip_id: r.trip?.id ?? null,
        load_id: r.load?.id ?? null,
      })),
    });
  } catch (err) {
    console.error("autoReleaseJob error", err);
    res.status(500).json({ error: "Auto-release job failed" });
  }
});

router.post(
  "/truck-board/:id/bookings",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isShipperUser(authUser)) {
        return res.status(403).json({ error: "Only shippers can request bookings" });
      }
      const shipperIdResolved = await resolveShipperId(authUser);
      if (!shipperIdResolved) {
        return res.status(400).json({ error: "Unable to resolve shipper profile" });
      }
      const loadId = String(req.body?.load_id ?? "");
      if (!loadId) {
        return res.status(400).json({ error: "load_id is required" });
      }
      const availabilityId = req.params.id;
      if (!availabilityId) {
        return res.status(400).json({ error: "Missing availability id" });
      }
      const availability = await getTruckAvailabilityById(availabilityId);
      if (!availability) {
        return res.status(404).json({ error: "Listing not found" });
      }
      if (availability.is_external) {
        return res.status(403).json({ error: "External listings are read-only." });
      }
      const booking = await createBookingForAvailability({
        truckAvailabilityId: availabilityId,
        loadId,
        shipperId: shipperIdResolved,
        shipperUserId: String(authUser.id ?? ""),
        requestedHeadcount: req.body?.requested_headcount,
        requestedWeightKg: req.body?.requested_weight_kg,
        offeredAmount: req.body?.offered_amount,
        offeredCurrency: req.body?.offered_currency,
        notes: req.body?.notes,
      });
      res.status(201).json({ booking });
    } catch (err: any) {
      console.error("createBookingForAvailability error", err);
      res.status(400).json({ error: err?.message ?? "Failed to request booking" });
    }
  }
);

router.post(
  "/truck-board/:id/chat",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isShipperUser(authUser)) {
        return res.status(403).json({ error: "Only shippers can start chats" });
      }
      const shipperId = await resolveShipperId(authUser);
      if (!shipperId) {
        return res.status(400).json({ error: "Unable to resolve shipper profile" });
      }
      const availabilityId = req.params.id;
      if (!availabilityId) {
        return res.status(400).json({ error: "Missing availability id" });
      }
      const availability = await getTruckAvailabilityById(availabilityId);
      if (!availability) {
        return res.status(404).json({ error: "Listing not found" });
      }
      let loadId: string | null = null;
      if (req.body?.load_id) {
        const load = await getLoadById(String(req.body.load_id));
        if (!load) {
          return res.status(404).json({ error: "Load not found" });
        }
        if (!isShipperForLoad(authUser, load)) {
          return res.status(403).json({ error: "You can only reference your own load" });
        }
        loadId = load.id;
      }
      const chat = await createTruckChat({
        availabilityId,
        shipperId,
        loadId,
        createdByUserId: String(authUser.id ?? ""),
      });
      let message = null;
      if (req.body?.message) {
        message = await createTruckChatMessage({
          chatId: chat.id,
          senderUserId: String(authUser.id ?? ""),
          senderRole: String(authUser.user_type ?? "SHIPPER"),
          message: req.body.message,
          attachments: req.body.attachments,
        });
        emitEvent(SOCKET_EVENTS.TRUCK_CHAT_MESSAGE, { message });
      }
      res.status(201).json({ chat, message });
    } catch (err: any) {
      console.error("createTruckChat error", err);
      res.status(400).json({ error: err?.message ?? "Failed to start chat" });
    }
  }
);

router.post(
  "/truck-chats/:chatId/messages",
  authRequired,
  async (req, res) => {
    try {
      const chatId = req.params.chatId;
      if (!chatId) {
        return res.status(400).json({ error: "Missing chat id" });
      }
      const authUser = getAuthUser(req);
      const context = await getTruckChatContext(chatId);
      if (!context) {
        return res.status(404).json({ error: "Chat not found" });
      }
      const shipperId = isShipperUser(authUser)
        ? await resolveShipperId(authUser)
        : null;
      const haulerId = isHaulerUser(authUser)
        ? await resolveHaulerId(authUser)
        : null;
      const isShipperParticipant = shipperId !== null && context.chat.shipper_id === shipperId;
      const isHaulerParticipant =
        haulerId !== null && context.availability.hauler_id === haulerId;
      if (!isShipperParticipant && !isHaulerParticipant && !isSuperAdminUser(authUser)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const message = await createTruckChatMessage({
        chatId,
        senderUserId: String(authUser.id ?? ""),
        senderRole: String(authUser.user_type ?? "unknown"),
        message: req.body?.message,
        attachments: req.body?.attachments,
      });
      emitEvent(SOCKET_EVENTS.TRUCK_CHAT_MESSAGE, { message });
      res.status(201).json({ message });
    } catch (err: any) {
      console.error("truck chat message error", err);
      res.status(400).json({ error: err?.message ?? "Failed to send message" });
    }
  }
);

router.get(
  "/truck-chats/:chatId/messages",
  authRequired,
  async (req, res) => {
    try {
      const chatId = req.params.chatId;
      if (!chatId) {
        return res.status(400).json({ error: "Missing chat id" });
      }
      const authUser = getAuthUser(req);
      const context = await getTruckChatContext(chatId);
      if (!context) {
        return res.status(404).json({ error: "Chat not found" });
      }
      const shipperId = isShipperUser(authUser)
        ? await resolveShipperId(authUser)
        : null;
      const haulerId = isHaulerUser(authUser)
        ? await resolveHaulerId(authUser)
        : null;
      const isShipperParticipant = shipperId !== null && context.chat.shipper_id === shipperId;
      const isHaulerParticipant =
        haulerId !== null && context.availability.hauler_id === haulerId;
      if (!isShipperParticipant && !isHaulerParticipant && !isSuperAdminUser(authUser)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const items = await listTruckChatMessages(chatId);
      res.json({ items });
    } catch (err) {
      console.error("list truck chat messages error", err);
      res.status(500).json({ error: "Failed to load messages" });
    }
  }
);

router.get(
  "/bookings",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (isHaulerUser(authUser)) {
        const haulerIdResolved = await resolveHaulerId(authUser);
        if (!haulerIdResolved) {
          return res.status(400).json({ error: "Unable to resolve hauler profile" });
        }
        const items = await listBookingsForHauler(haulerIdResolved);
        return res.json({ items });
      }
      if (isShipperUser(authUser)) {
        const shipperIdResolved = await resolveShipperId(authUser);
        if (!shipperIdResolved) {
          return res.status(400).json({ error: "Unable to resolve shipper profile" });
        }
        const items = await listBookingsForShipper(shipperIdResolved);
        return res.json({ items });
      }
      if (isSuperAdminUser(authUser)) {
        return res.json({ items: [] });
      }
      res.status(403).json({ error: "Forbidden" });
    } catch (err) {
      console.error("listBookings error", err);
      res.status(500).json({ error: "Failed to load bookings" });
    }
  }
);

async function emitBookingSideEffects(result: {
  booking: LoadBookingRecord;
  trip?: TripRecord;
  payment?: PaymentRecord;
}) {
  if (result.trip) {
    emitTripEvent(result.trip);
  }
  if (result.payment) {
    emitPaymentEvent(result.payment);
  }
  const load = await getLoadById(result.booking.load_id);
  emitLoadEvent(load);
}

router.post(
  "/bookings/:bookingId/accept",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      const actor = isHaulerUser(authUser)
        ? "HAULER"
        : isShipperUser(authUser)
        ? "SHIPPER"
        : null;
      if (!actor && !isSuperAdminUser(authUser)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const bookingId = req.params.bookingId;
      if (!bookingId) {
        return res.status(400).json({ error: "Missing booking id" });
      }
      if (
        actor === "HAULER" &&
        (req.body?.payment_mode !== undefined ||
          req.body?.direct_payment_disclaimer_version !== undefined ||
          req.body?.direct_payment_disclaimer_accepted !== undefined)
      ) {
        return res.status(403).json({ error: "Only shippers can choose payment mode" });
      }
      const paymentSelection = resolvePaymentModeSelection(
        {
          payment_mode: req.body?.payment_mode,
          direct_payment_disclaimer_version: req.body?.direct_payment_disclaimer_version,
          direct_payment_disclaimer_accepted: req.body?.direct_payment_disclaimer_accepted,
        },
        actor ?? (isSuperAdminUser(authUser) ? "SUPER_ADMIN" : null)
      );
      const result = await respondToBooking({
        bookingId,
        actor: actor ?? "SHIPPER",
        action: "ACCEPT",
        actingUserId: String(authUser.id ?? ""),
        paymentModeSelection: paymentSelection,
      });
      await emitBookingSideEffects(result);
      res.json(result);
    } catch (err: any) {
      console.error("acceptBooking error", err);
      res.status(400).json({ error: err?.message ?? "Failed to accept booking" });
    }
  }
);

router.post(
  "/bookings/:bookingId/reject",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      const actor = isHaulerUser(authUser)
        ? "HAULER"
        : isShipperUser(authUser)
        ? "SHIPPER"
        : null;
      if (!actor && !isSuperAdminUser(authUser)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const bookingId = req.params.bookingId;
      if (!bookingId) {
        return res.status(400).json({ error: "Missing booking id" });
      }
      const result = await respondToBooking({
        bookingId,
        actor: actor ?? "SHIPPER",
        action: "REJECT",
        actingUserId: String(authUser.id ?? ""),
      });
      res.json(result);
    } catch (err: any) {
      console.error("rejectBooking error", err);
      res.status(400).json({ error: err?.message ?? "Failed to reject booking" });
    }
  }
);

router.get(
  "/truck-chats",
  authRequired,
  async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (isHaulerUser(authUser)) {
        const haulerId = await resolveHaulerId(authUser);
        if (!haulerId) {
          return res.status(400).json({ error: "Unable to resolve hauler profile" });
        }
        const items = await listTruckChatsForHauler(haulerId);
        return res.json({ items });
      }
      if (isShipperUser(authUser)) {
        const shipperId = await resolveShipperId(authUser);
        if (!shipperId) {
          return res.status(400).json({ error: "Unable to resolve shipper profile" });
        }
        const items = await listTruckChatsForShipper(shipperId);
        return res.json({ items });
      }
      if (isSuperAdminUser(authUser)) {
        return res.json({ items: [] });
      }
      res.status(403).json({ error: "Forbidden" });
    } catch (err) {
      console.error("listTruckChats error", err);
      res.status(500).json({ error: "Failed to load truck chats" });
    }
  }
);

export default router;
