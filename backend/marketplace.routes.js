const express = require("express");
const router = express.Router();

const LoadStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  AWAITING_ESCROW: "AWAITING_ESCROW",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

const LoadOfferStatus = {
  PENDING: "PENDING",
  WITHDRAWN: "WITHDRAWN",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  ACCEPTED: "ACCEPTED",
};

const TripStatus = {
  PENDING_ESCROW: "PENDING_ESCROW",
  READY_TO_START: "READY_TO_START",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERED_AWAITING_CONFIRMATION: "DELIVERED_AWAITING_CONFIRMATION",
  DELIVERED_CONFIRMED: "DELIVERED_CONFIRMED",
  DISPUTED: "DISPUTED",
  CLOSED: "CLOSED",
};

const PaymentStatus = {
  AWAITING_FUNDING: "AWAITING_FUNDING",
  ESCROW_FUNDED: "ESCROW_FUNDED",
  RELEASED_TO_HAULER: "RELEASED_TO_HAULER",
  REFUNDED_TO_SHIPPER: "REFUNDED_TO_SHIPPER",
  SPLIT_BETWEEN_PARTIES: "SPLIT_BETWEEN_PARTIES",
  CANCELLED: "CANCELLED",
};

const DisputeStatus = {
  OPEN: "OPEN",
  UNDER_REVIEW: "UNDER_REVIEW",
  RESOLVED_RELEASE_TO_HAULER: "RESOLVED_RELEASE_TO_HAULER",
  RESOLVED_REFUND_TO_SHIPPER: "RESOLVED_REFUND_TO_SHIPPER",
  RESOLVED_SPLIT: "RESOLVED_SPLIT",
  CANCELLED: "CANCELLED",
};

const Roles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SHIPPER_OWNER: "SHIPPER_OWNER",
  SHIPPER_STAFF: "SHIPPER_STAFF",
  HAULER_OWNER: "HAULER_OWNER",
  HAULER_DISPATCHER: "HAULER_DISPATCHER",
  DRIVER: "DRIVER",
  READ_ONLY_SUPPORT: "READ_ONLY_SUPPORT",
};

const loads = [
  {
    id: "load_1",
    shipper_company_id: "comp_shipper_1",
    status: LoadStatus.PUBLISHED,
    currency: "USD",
    asking_amount: 1000,
    awarded_offer_id: null,
  },
];

const offers = [];
const offerMessages = [];
const trips = [];
const payments = [];
const disputes = [];
const disputeMessages = [];

let counter = 1;
function genId(prefix) {
  counter += 1;
  return `${prefix}_${counter}`;
}

function nowISO() {
  return new Date().toISOString();
}

function error(res, status, message, code = "ERROR") {
  return res.status(status).json({ error: { code, message } });
}

function findLoad(id) {
  return loads.find((l) => l.id === id) || null;
}

function findOffer(id) {
  return offers.find((o) => o.id === id) || null;
}

function findTrip(id) {
  return trips.find((t) => t.id === id) || null;
}

function findPayment(id) {
  return payments.find((p) => p.id === id) || null;
}

function findDispute(id) {
  return disputes.find((d) => d.id === id) || null;
}

function getPaymentForTrip(tripId) {
  return payments.find((p) => p.trip_id === tripId) || null;
}

function getDisputesForPayment(paymentId) {
  return disputes.filter((d) => d.payment_id === paymentId);
}

router.use((req, _res, next) => {
  if (!req.user) {
    req.user = {
      id: "user_hauler",
      companyId: "comp_hauler_1",
      role: Roles.HAULER_OWNER,
    };
  }
  next();
});

function isShipperForLoad(user, load) {
  return load.shipper_company_id === user.companyId;
}

function isHaulerForOffer(user, offer) {
  return offer.hauler_company_id === user.companyId;
}

function isHaulerForTrip(user, trip) {
  return trip.hauler_company_id === user.companyId;
}

router.post("/loads/:loadId/offers", (req, res) => {
  const user = req.user;
  const loadId = req.params.loadId;
  const { offered_amount, currency, message, expires_at } = req.body || {};

  const load = findLoad(loadId);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  if (load.status !== LoadStatus.PUBLISHED) {
    return error(res, 400, "Offers can only be placed on PUBLISHED loads.", "INVALID_STATE");
  }

  if (isShipperForLoad(user, load)) {
    return error(res, 400, "You cannot bid on your own load.", "SELF_BID_NOT_ALLOWED");
  }

  if (typeof offered_amount !== "number" || offered_amount <= 0) {
    return error(res, 400, "offered_amount must be a positive number.", "VALIDATION_ERROR");
  }

  const offer = {
    id: genId("offer"),
    load_id: loadId,
    hauler_company_id: user.companyId,
    created_by_user_id: user.id,
    offered_amount,
    currency: currency || load.currency || "USD",
    message: message || null,
    status: LoadOfferStatus.PENDING,
    expires_at: expires_at || null,
    accepted_at: null,
    rejected_at: null,
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  offers.push(offer);
  return res.status(201).json({ offer });
});

router.get("/loads/:loadId/offers", (req, res) => {
  const user = req.user;
  const loadId = req.params.loadId;
  const page = parseInt(req.query.page || "1", 10);
  const pageSize = parseInt(req.query.pageSize || "20", 10);

  const load = findLoad(loadId);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  const isShipper = isShipperForLoad(user, load);

  let filtered = offers.filter((o) => o.load_id === loadId);
  if (!isShipper && user.companyId) {
    filtered = filtered.filter((o) => o.hauler_company_id === user.companyId);
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return res.json({ items, page, pageSize, total });
});

router.post("/load-offers/:offerId/withdraw", (req, res) => {
  const user = req.user;
  const offerId = req.params.offerId;

  const offer = findOffer(offerId);
  if (!offer) return error(res, 404, "Offer not found", "OFFER_NOT_FOUND");

  if (!isHaulerForOffer(user, offer)) {
    return error(res, 403, "You can only withdraw offers from your company.", "FORBIDDEN");
  }

  if (offer.status !== LoadOfferStatus.PENDING) {
    return error(res, 400, "Only PENDING offers can be withdrawn.", "INVALID_STATE");
  }

  offer.status = LoadOfferStatus.WITHDRAWN;
  offer.updated_at = nowISO();

  return res.json({ offer });
});

router.post("/load-offers/:offerId/reject", (req, res) => {
  const user = req.user;
  const offerId = req.params.offerId;

  const offer = findOffer(offerId);
  if (!offer) return error(res, 404, "Offer not found", "OFFER_NOT_FOUND");

  const load = findLoad(offer.load_id);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  if (!isShipperForLoad(user, load)) {
    return error(res, 403, "You can only reject offers on your own loads.", "FORBIDDEN");
  }

  if (offer.status !== LoadOfferStatus.PENDING) {
    return error(res, 400, "Only PENDING offers can be rejected.", "INVALID_STATE");
  }

  offer.status = LoadOfferStatus.REJECTED;
  offer.rejected_at = nowISO();
  offer.updated_at = offer.rejected_at;

  return res.json({ offer });
});

router.post("/load-offers/:offerId/accept", (req, res) => {
  const user = req.user;
  const offerId = req.params.offerId;

  const offer = findOffer(offerId);
  if (!offer) return error(res, 404, "Offer not found", "OFFER_NOT_FOUND");

  const load = findLoad(offer.load_id);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  if (!isShipperForLoad(user, load)) {
    return error(res, 403, "You can only accept offers on your own loads.", "FORBIDDEN");
  }

  if (load.status !== LoadStatus.PUBLISHED) {
    return error(res, 400, "Only PUBLISHED loads can accept offers.", "INVALID_STATE");
  }

  if (offer.status !== LoadOfferStatus.PENDING) {
    return error(res, 400, "Only PENDING offers can be accepted.", "INVALID_STATE");
  }

  const now = nowISO();

  offer.status = LoadOfferStatus.ACCEPTED;
  offer.accepted_at = now;
  offer.updated_at = now;

  offers.forEach((o) => {
    if (o.load_id === offer.load_id && o.id !== offer.id && o.status === LoadOfferStatus.PENDING) {
      o.status = LoadOfferStatus.EXPIRED;
      o.updated_at = now;
    }
  });

  const trip = {
    id: genId("trip"),
    load_id: offer.load_id,
    hauler_company_id: offer.hauler_company_id,
    assigned_driver_id: null,
    assigned_vehicle_id: null,
    status: TripStatus.PENDING_ESCROW,
    started_at: null,
    delivered_at: null,
    delivered_confirmed_at: null,
    created_at: now,
    updated_at: now,
  };
  trips.push(trip);

  const payment = {
    id: genId("pay"),
    trip_id: trip.id,
    payer_company_id: load.shipper_company_id,
    beneficiary_company_id: offer.hauler_company_id,
    amount: offer.offered_amount,
    currency: offer.currency,
    status: PaymentStatus.AWAITING_FUNDING,
    is_escrow: true,
    auto_release_at: null,
    external_provider: "dummy",
    external_intent_id: null,
    external_charge_id: null,
    created_at: now,
    updated_at: now,
  };
  payments.push(payment);

  load.awarded_offer_id = offer.id;
  load.status = LoadStatus.AWAITING_ESCROW;

  return res.status(201).json({ offer, trip, payment });
});

function checkOfferChatAccess(user, offer) {
  const load = findLoad(offer.load_id);
  if (!load) return false;
  const isShipper = isShipperForLoad(user, load);
  const isHauler = isHaulerForOffer(user, offer);
  const isAdmin = user.role === Roles.SUPER_ADMIN;
  return isShipper || isHauler || isAdmin;
}

router.get("/load-offers/:offerId/messages", (req, res) => {
  const user = req.user;
  const offerId = req.params.offerId;

  const offer = findOffer(offerId);
  if (!offer) return error(res, 404, "Offer not found", "OFFER_NOT_FOUND");

  if (!checkOfferChatAccess(user, offer)) {
    return error(res, 403, "Not allowed to view messages for this offer.", "FORBIDDEN");
  }

  const items = offerMessages
    .filter((m) => m.offer_id === offerId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return res.json({ items });
});

router.post("/load-offers/:offerId/messages", (req, res) => {
  const user = req.user;
  const offerId = req.params.offerId;
  const { text, attachments } = req.body || {};

  const offer = findOffer(offerId);
  if (!offer) return error(res, 404, "Offer not found", "OFFER_NOT_FOUND");

  if (!checkOfferChatAccess(user, offer)) {
    return error(res, 403, "Not allowed to send messages on this offer.", "FORBIDDEN");
  }

  if (
    offer.status === LoadOfferStatus.EXPIRED ||
    offer.status === LoadOfferStatus.REJECTED ||
    offer.status === LoadOfferStatus.WITHDRAWN
  ) {
    return error(res, 400, "Cannot send messages on a closed offer.", "INVALID_STATE");
  }

  const message = {
    id: genId("omsg"),
    offer_id: offerId,
    sender_user_id: user.id,
    sender_role: user.role,
    text: text || null,
    attachments: Array.isArray(attachments) ? attachments : [],
    created_at: nowISO(),
  };

  offerMessages.push(message);

  return res.status(201).json({ message });
});

router.get("/trips/:tripId", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  const load = findLoad(trip.load_id);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  const isShipper = isShipperForLoad(user, load);
  const isHauler = isHaulerForTrip(user, trip);
  const isDriver = user.role === Roles.DRIVER && user.id === trip.assigned_driver_id;
  const isAdmin = user.role === Roles.SUPER_ADMIN;

  if (!isShipper && !isHauler && !isDriver && !isAdmin) {
    return error(res, 403, "Not allowed to view this trip.", "FORBIDDEN");
  }

  return res.json({ trip });
});

router.patch("/trips/:tripId/assign-driver", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;
  const { driver_id } = req.body || {};

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  if (!isHaulerForTrip(user, trip)) {
    return error(res, 403, "Only hauler can assign driver.", "FORBIDDEN");
  }

  if (![TripStatus.PENDING_ESCROW, TripStatus.READY_TO_START].includes(trip.status)) {
    return error(res, 400, "Cannot assign driver in current trip status.", "INVALID_STATE");
  }

  if (!driver_id) {
    return error(res, 400, "driver_id is required.", "VALIDATION_ERROR");
  }

  trip.assigned_driver_id = driver_id;
  trip.updated_at = nowISO();

  return res.json({ trip });
});

router.patch("/trips/:tripId/assign-vehicle", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;
  const { vehicle_id } = req.body || {};

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  if (![TripStatus.PENDING_ESCROW, TripStatus.READY_TO_START].includes(trip.status)) {
    return error(res, 400, "Cannot assign vehicle in current trip status.", "INVALID_STATE");
  }

  if (!isHaulerForTrip(user, trip)) {
    return error(res, 403, "Only hauler can assign vehicle.", "FORBIDDEN");
  }

  if (!vehicle_id) {
    return error(res, 400, "vehicle_id is required.", "VALIDATION_ERROR");
  }

  trip.assigned_vehicle_id = vehicle_id;
  trip.updated_at = nowISO();

  return res.json({ trip });
});

router.post("/trips/:tripId/start", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  const payment = getPaymentForTrip(trip.id);
  if (!payment || payment.status !== PaymentStatus.ESCROW_FUNDED) {
    return error(res, 400, "Trip cannot start until escrow is funded.", "ESCROW_NOT_FUNDED");
  }

  const load = findLoad(trip.load_id);
  const isShipper = isShipperForLoad(user, load);
  const isHauler = isHaulerForTrip(user, trip);
  const isDriver = user.role === Roles.DRIVER && user.id === trip.assigned_driver_id;

  if (!isHauler && !isDriver && !isShipper && user.role !== Roles.SUPER_ADMIN) {
    return error(res, 403, "Not allowed to start this trip.", "FORBIDDEN");
  }

  if (trip.status !== TripStatus.READY_TO_START) {
    return error(res, 400, "Trip must be READY_TO_START to be started.", "INVALID_STATE");
  }

  trip.status = TripStatus.IN_PROGRESS;
  trip.started_at = nowISO();
  trip.updated_at = trip.started_at;

  load.status = LoadStatus.IN_TRANSIT;

  return res.json({ trip });
});

router.post("/trips/:tripId/mark-delivered", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  const load = findLoad(trip.load_id);
  const isHauler = isHaulerForTrip(user, trip);
  const isDriver = user.role === Roles.DRIVER && user.id === trip.assigned_driver_id;

  if (!isHauler && !isDriver && user.role !== Roles.SUPER_ADMIN) {
    return error(res, 403, "Not allowed to mark delivered.", "FORBIDDEN");
  }

  if (trip.status !== TripStatus.IN_PROGRESS) {
    return error(res, 400, "Trip must be IN_PROGRESS to mark delivered.", "INVALID_STATE");
  }

  trip.status = TripStatus.DELIVERED_AWAITING_CONFIRMATION;
  trip.delivered_at = nowISO();
  trip.updated_at = trip.delivered_at;

  load.status = LoadStatus.DELIVERED;

  return res.json({ trip });
});

router.post("/trips/:tripId/confirm-delivery", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  const load = findLoad(trip.load_id);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  if (!isShipperForLoad(user, load)) {
    return error(res, 403, "Only shipper can confirm delivery.", "FORBIDDEN");
  }

  if (trip.status !== TripStatus.DELIVERED_AWAITING_CONFIRMATION) {
    return error(res, 400, "Trip must be DELIVERED_AWAITING_CONFIRMATION.", "INVALID_STATE");
  }

  const payment = getPaymentForTrip(trip.id);
  if (!payment || payment.status !== PaymentStatus.ESCROW_FUNDED) {
    return error(res, 400, "Escrow must be funded to set auto-release.", "ESCROW_NOT_FUNDED");
  }

  const now = nowISO();
  trip.status = TripStatus.DELIVERED_CONFIRMED;
  trip.delivered_confirmed_at = now;
  trip.updated_at = now;

  const holdMs = 24 * 60 * 60 * 1000;
  payment.auto_release_at = new Date(Date.now() + holdMs).toISOString();
  payment.updated_at = now;

  return res.json({ trip, payment });
});

router.post("/trips/:tripId/escrow/payment-intent", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;
  const { payment_method_id, save_payment_method } = req.body || {};

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  const load = findLoad(trip.load_id);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  if (!isShipperForLoad(user, load)) {
    return error(res, 403, "Only shipper can initiate escrow payment.", "FORBIDDEN");
  }

  if (trip.status !== TripStatus.PENDING_ESCROW) {
    return error(res, 400, "Trip must be PENDING_ESCROW to create payment intent.", "INVALID_STATE");
  }

  const payment = getPaymentForTrip(trip.id);
  if (!payment) {
    return error(res, 500, "Payment not found for this trip.", "PAYMENT_NOT_FOUND");
  }

  payment.external_intent_id = payment.external_intent_id || genId("pi");
  payment.status = PaymentStatus.AWAITING_FUNDING;
  payment.updated_at = nowISO();

  const client_secret = `secret_${payment.external_intent_id}`;

  return res.json({ payment, client_secret });
});

router.get("/trips/:tripId/payment", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  const load = findLoad(trip.load_id);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  const isShipper = isShipperForLoad(user, load);
  const isHauler = isHaulerForTrip(user, trip);
  const isAdmin = user.role === Roles.SUPER_ADMIN;

  if (!isShipper && !isHauler && !isAdmin) {
    return error(res, 403, "Not allowed to view this payment.", "FORBIDDEN");
  }

  const payment = getPaymentForTrip(trip.id);
  if (!payment) {
    return error(res, 404, "Payment not found.", "PAYMENT_NOT_FOUND");
  }

  return res.json({ payment });
});

router.post("/webhooks/payment-provider", (req, res) => {
  const { external_intent_id, event } = req.body || {};
  if (!external_intent_id || !event) {
    return error(res, 400, "external_intent_id and event are required.", "VALIDATION_ERROR");
  }

  const payment = payments.find((p) => p.external_intent_id === external_intent_id);
  if (!payment) {
    return res.status(200).json({ ok: true });
  }

  const trip = findTrip(payment.trip_id);

  if (event === "payment_succeeded") {
    payment.status = PaymentStatus.ESCROW_FUNDED;
    payment.updated_at = nowISO();
    if (trip && trip.status === TripStatus.PENDING_ESCROW) {
      trip.status = TripStatus.READY_TO_START;
      trip.updated_at = payment.updated_at;
    }
  } else if (event === "payment_failed") {
    payment.status = PaymentStatus.AWAITING_FUNDING;
    payment.updated_at = nowISO();
  }

  return res.status(200).json({ ok: true });
});

router.post("/trips/:tripId/disputes", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;
  const { reason_code, description, requested_action } = req.body || {};

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  const load = findLoad(trip.load_id);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  const payment = getPaymentForTrip(trip.id);
  if (!payment || payment.status !== PaymentStatus.ESCROW_FUNDED) {
    return error(res, 400, "Disputes can only be opened when escrow is funded.", "ESCROW_NOT_FUNDED");
  }

  const isShipper = isShipperForLoad(user, load);
  const isHauler = isHaulerForTrip(user, trip);
  if (!isShipper && !isHauler && user.role !== Roles.SUPER_ADMIN) {
    return error(res, 403, "Only shipper or hauler can open a dispute.", "FORBIDDEN");
  }

  if (!reason_code) {
    return error(res, 400, "reason_code is required.", "VALIDATION_ERROR");
  }

  if (
    ![TripStatus.DELIVERED_AWAITING_CONFIRMATION, TripStatus.DELIVERED_CONFIRMED].includes(
      trip.status
    )
  ) {
    return error(res, 400, "Dispute can only be opened after delivery.", "INVALID_STATE");
  }

  const existing = getDisputesForPayment(payment.id).find(
    (d) => d.status === DisputeStatus.OPEN || d.status === DisputeStatus.UNDER_REVIEW
  );
  if (existing) {
    return error(res, 400, "There is already an open dispute for this payment.", "DISPUTE_ALREADY_OPEN");
  }

  const now = nowISO();
  const dispute = {
    id: genId("disp"),
    trip_id: trip.id,
    payment_id: payment.id,
    opened_by_company_id: user.companyId,
    opened_by_user_id: user.id,
    status: DisputeStatus.OPEN,
    reason_code,
    description: description || null,
    requested_action: requested_action || null,
    resolution_type: null,
    resolution_amount_to_hauler: null,
    resolution_amount_to_shipper: null,
    resolved_by_user_id: null,
    opened_at: now,
    resolved_at: null,
    created_at: now,
    updated_at: now,
  };
  disputes.push(dispute);

  trip.status = TripStatus.DISPUTED;
  trip.updated_at = now;
  payment.auto_release_at = null;
  payment.updated_at = now;

  return res.status(201).json({ dispute });
});

router.get("/trips/:tripId/disputes", (req, res) => {
  const user = req.user;
  const tripId = req.params.tripId;

  const trip = findTrip(tripId);
  if (!trip) return error(res, 404, "Trip not found", "TRIP_NOT_FOUND");

  const load = findLoad(trip.load_id);
  if (!load) return error(res, 404, "Load not found", "LOAD_NOT_FOUND");

  const isShipper = isShipperForLoad(user, load);
  const isHauler = isHaulerForTrip(user, trip);
  const isAdmin = user.role === Roles.SUPER_ADMIN;

  if (!isShipper && !isHauler && !isAdmin) {
    return error(res, 403, "Not allowed to view disputes for this trip.", "FORBIDDEN");
  }

  const items = disputes.filter((d) => d.trip_id === tripId);
  return res.json({ items });
});

router.get("/disputes/:disputeId", (req, res) => {
  const user = req.user;
  const disputeId = req.params.disputeId;

  const dispute = findDispute(disputeId);
  if (!dispute) return error(res, 404, "Dispute not found", "DISPUTE_NOT_FOUND");

  const trip = findTrip(dispute.trip_id);
  const load = findLoad(trip.load_id);

  const isShipper = isShipperForLoad(user, load);
  const isHauler = isHaulerForTrip(user, trip);
  const isAdmin = user.role === Roles.SUPER_ADMIN;

  if (!isShipper && !isHauler && !isAdmin) {
    return error(res, 403, "Not allowed to view this dispute.", "FORBIDDEN");
  }

  return res.json({ dispute });
});

function disputeAccess(user, dispute) {
  const trip = findTrip(dispute.trip_id);
  const load = findLoad(trip.load_id);

  const isShipper = isShipperForLoad(user, load);
  const isHauler = isHaulerForTrip(user, trip);
  const isAdmin = user.role === Roles.SUPER_ADMIN;

  return { isShipper, isHauler, isAdmin };
}

router.post("/disputes/:disputeId/messages", (req, res) => {
  const user = req.user;
  const { disputeId } = req.params;
  const { text, attachments } = req.body || {};

  const dispute = findDispute(disputeId);
  if (!dispute) return error(res, 404, "Dispute not found", "DISPUTE_NOT_FOUND");

  const { isShipper, isHauler, isAdmin } = disputeAccess(user, dispute);
  if (!isShipper && !isHauler && !isAdmin) {
    return error(res, 403, "Not allowed to post messages in this dispute.", "FORBIDDEN");
  }

  const msg = {
    id: genId("dmsg"),
    dispute_id: disputeId,
    sender_user_id: user.id,
    sender_role: user.role,
    text: text || null,
    attachments: Array.isArray(attachments) ? attachments : [],
    created_at: nowISO(),
  };
  disputeMessages.push(msg);

  return res.status(201).json({ message: msg });
});

router.get("/disputes/:disputeId/messages", (req, res) => {
  const user = req.user;
  const { disputeId } = req.params;

  const dispute = findDispute(disputeId);
  if (!dispute) return error(res, 404, "Dispute not found", "DISPUTE_NOT_FOUND");

  const { isShipper, isHauler, isAdmin } = disputeAccess(user, dispute);
  if (!isShipper && !isHauler && !isAdmin) {
    return error(res, 403, "Not allowed to view messages in this dispute.", "FORBIDDEN");
  }

  const items = disputeMessages
    .filter((m) => m.dispute_id === disputeId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return res.json({ items });
});

router.post("/disputes/:disputeId/cancel", (req, res) => {
  const user = req.user;
  const { disputeId } = req.params;

  const dispute = findDispute(disputeId);
  if (!dispute) return error(res, 404, "Dispute not found", "DISPUTE_NOT_FOUND");

  if (dispute.status !== DisputeStatus.OPEN) {
    return error(res, 400, "Only OPEN disputes can be cancelled.", "INVALID_STATE");
  }

  const isOpener = dispute.opened_by_user_id === user.id;
  const isAdmin = user.role === Roles.SUPER_ADMIN;
  if (!isOpener && !isAdmin) {
    return error(res, 403, "Only opener or Super Admin can cancel dispute.", "FORBIDDEN");
  }

  const payment = findPayment(dispute.payment_id);
  const trip = findTrip(dispute.trip_id);
  const load = findLoad(trip.load_id);

  const now = nowISO();
  dispute.status = DisputeStatus.CANCELLED;
  dispute.updated_at = now;

  const otherOpen = getDisputesForPayment(payment.id).some(
    (d) =>
      d.id !== dispute.id &&
      (d.status === DisputeStatus.OPEN || d.status === DisputeStatus.UNDER_REVIEW)
  );

  if (!otherOpen) {
    if (trip.status === TripStatus.DISPUTED) {
      trip.status = TripStatus.DELIVERED_CONFIRMED;
      trip.updated_at = now;
    }
    if (payment.status === PaymentStatus.ESCROW_FUNDED) {
      const holdMs = 24 * 60 * 60 * 1000;
      payment.auto_release_at = new Date(Date.now() + holdMs).toISOString();
      payment.updated_at = now;
    }
  }

  return res.json({ dispute, trip, payment, load });
});

function ensureAdmin(user, res) {
  if (user.role !== Roles.SUPER_ADMIN) {
    error(res, 403, "Admin-only endpoint.", "FORBIDDEN");
    return false;
  }
  return true;
}

router.post("/admin/disputes/:disputeId/start-review", (req, res) => {
  const user = req.user;
  if (!ensureAdmin(user, res)) return;

  const { disputeId } = req.params;
  const dispute = findDispute(disputeId);
  if (!dispute) return error(res, 404, "Dispute not found", "DISPUTE_NOT_FOUND");

  dispute.status = DisputeStatus.UNDER_REVIEW;
  dispute.updated_at = nowISO();

  return res.json({ dispute });
});

function resolveDispute(dispute, resolutionType, amounts, adminUser) {
  const payment = findPayment(dispute.payment_id);
  const trip = findTrip(dispute.trip_id);
  const load = findLoad(trip.load_id);

  const now = nowISO();
  dispute.status = resolutionType;
  dispute.resolution_type = resolutionType;
  dispute.resolved_by_user_id = adminUser.id;
  dispute.resolved_at = now;
  dispute.updated_at = now;

  if (resolutionType === DisputeStatus.RESOLVED_RELEASE_TO_HAULER) {
    payment.status = PaymentStatus.RELEASED_TO_HAULER;
  } else if (resolutionType === DisputeStatus.RESOLVED_REFUND_TO_SHIPPER) {
    payment.status = PaymentStatus.REFUNDED_TO_SHIPPER;
  } else if (resolutionType === DisputeStatus.RESOLVED_SPLIT) {
    payment.status = PaymentStatus.SPLIT_BETWEEN_PARTIES;
    payment.resolution_amount_to_hauler = amounts.amount_to_hauler;
    payment.resolution_amount_to_shipper = amounts.amount_to_shipper;
  }

  payment.updated_at = now;

  trip.status = TripStatus.CLOSED;
  trip.updated_at = now;

  load.status = LoadStatus.COMPLETED;

  return { dispute, payment, trip, load };
}

router.post("/admin/disputes/:disputeId/resolve-release", (req, res) => {
  const user = req.user;
  if (!ensureAdmin(user, res)) return;

  const { disputeId } = req.params;
  const dispute = findDispute(disputeId);
  if (!dispute) return error(res, 404, "Dispute not found", "DISPUTE_NOT_FOUND");

  const result = resolveDispute(dispute, DisputeStatus.RESOLVED_RELEASE_TO_HAULER, null, user);
  return res.json(result);
});

router.post("/admin/disputes/:disputeId/resolve-refund", (req, res) => {
  const user = req.user;
  if (!ensureAdmin(user, res)) return;

  const { disputeId } = req.params;
  const dispute = findDispute(disputeId);
  if (!dispute) return error(res, 404, "Dispute not found", "DISPUTE_NOT_FOUND");

  const result = resolveDispute(dispute, DisputeStatus.RESOLVED_REFUND_TO_SHIPPER, null, user);
  return res.json(result);
});

router.post("/admin/disputes/:disputeId/resolve-split", (req, res) => {
  const user = req.user;
  if (!ensureAdmin(user, res)) return;

  const { disputeId } = req.params;
  const { amount_to_hauler, amount_to_shipper } = req.body || {};

  const dispute = findDispute(disputeId);
  if (!dispute) return error(res, 404, "Dispute not found", "DISPUTE_NOT_FOUND");

  const payment = findPayment(dispute.payment_id);
  const total = payment.amount;
  const sum = Number(amount_to_hauler || 0) + Number(amount_to_shipper || 0);
  if (sum !== total) {
    return error(
      res,
      400,
      `Split must equal total amount ${total}.`,
      "SPLIT_VALIDATION_ERROR"
    );
  }

  const result = resolveDispute(
    dispute,
    DisputeStatus.RESOLVED_SPLIT,
    { amount_to_hauler, amount_to_shipper },
    user
  );
  return res.json(result);
});

router.post("/admin/payments/:paymentId/force-release", (req, res) => {
  const user = req.user;
  if (!ensureAdmin(user, res)) return;
  const { paymentId } = req.params;

  const payment = findPayment(paymentId);
  if (!payment) return error(res, 404, "Payment not found", "PAYMENT_NOT_FOUND");

  const trip = findTrip(payment.trip_id);
  const load = findLoad(trip.load_id);
  const now = nowISO();

  payment.status = PaymentStatus.RELEASED_TO_HAULER;
  payment.updated_at = now;

  trip.status = TripStatus.CLOSED;
  trip.updated_at = now;

  load.status = LoadStatus.COMPLETED;

  return res.json({ payment, trip, load });
});

router.post("/admin/payments/:paymentId/force-refund", (req, res) => {
  const user = req.user;
  if (!ensureAdmin(user, res)) return;
  const { paymentId } = req.params;

  const payment = findPayment(paymentId);
  if (!payment) return error(res, 404, "Payment not found", "PAYMENT_NOT_FOUND");

  const trip = findTrip(payment.trip_id);
  const load = findLoad(trip.load_id);
  const now = nowISO();

  payment.status = PaymentStatus.REFUNDED_TO_SHIPPER;
  payment.updated_at = now;

  trip.status = TripStatus.CLOSED;
  trip.updated_at = now;

  load.status = LoadStatus.COMPLETED;

  return res.json({ payment, trip, load });
});

router.post("/admin/payments/run-auto-release", (req, res) => {
  const user = req.user;
  if (!ensureAdmin(user, res)) return;

  const now = new Date();
  const updatedPayments = [];

  payments.forEach((p) => {
    if (
      p.status === PaymentStatus.ESCROW_FUNDED &&
      p.auto_release_at &&
      new Date(p.auto_release_at) <= now
    ) {
      const openDispute = getDisputesForPayment(p.id).some(
        (d) => d.status === DisputeStatus.OPEN || d.status === DisputeStatus.UNDER_REVIEW
      );
      if (!openDispute) {
        p.status = PaymentStatus.RELEASED_TO_HAULER;
        p.updated_at = nowISO();

        const trip = findTrip(p.trip_id);
        const load = findLoad(trip.load_id);
        trip.status = TripStatus.CLOSED;
        trip.updated_at = p.updated_at;
        load.status = LoadStatus.COMPLETED;

        updatedPayments.push(p.id);
      }
    }
  });

  return res.json({ updatedPayments });
});

module.exports = router;
