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
};

const PaymentStatus = {
  AWAITING_FUNDING: "AWAITING_FUNDING",
};

// -------- Fake in-memory DB --------

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
const trips = [];
const payments = [];

let counter = 1;
function genId(prefix) {
  counter += 1;
  return `${prefix}_${counter}`;
}

router.use((req, _res, next) => {
  if (!req.user) {
    req.user = {
      id: "user_hauler",
      companyId: "comp_hauler_1",
      role: "HAULER_OWNER",
    };
  }
  next();
});

function findLoad(id) {
  return loads.find((l) => l.id === id) || null;
}

function findOffer(id) {
  return offers.find((o) => o.id === id) || null;
}

function sendError(res, status, message, code = "ERROR") {
  return res.status(status).json({ error: { code, message } });
}

router.post("/loads/:loadId/offers", (req, res) => {
  const user = req.user;
  const loadId = req.params.loadId;
  const { offered_amount, currency, message, expires_at } = req.body || {};

  const load = findLoad(loadId);
  if (!load) return sendError(res, 404, "Load not found", "LOAD_NOT_FOUND");

  if (load.status !== LoadStatus.PUBLISHED) {
    return sendError(
      res,
      400,
      "Offers can only be placed on PUBLISHED loads.",
      "INVALID_STATE"
    );
  }

  if (load.shipper_company_id === user.companyId) {
    return sendError(res, 400, "You cannot bid on your own load.", "SELF_BID");
  }

  if (typeof offered_amount !== "number" || offered_amount <= 0) {
    return sendError(
      res,
      400,
      "offered_amount must be a positive number.",
      "VALIDATION_ERROR"
    );
  }

  const now = new Date().toISOString();
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
    created_at: now,
    updated_at: now,
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
  if (!load) return sendError(res, 404, "Load not found", "LOAD_NOT_FOUND");

  const isShipper = load.shipper_company_id === user.companyId;

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
  const offer = findOffer(req.params.offerId);
  if (!offer) return sendError(res, 404, "Offer not found", "OFFER_NOT_FOUND");

  if (offer.hauler_company_id !== user.companyId) {
    return sendError(
      res,
      403,
      "You can only withdraw offers from your company.",
      "FORBIDDEN"
    );
  }

  if (offer.status !== LoadOfferStatus.PENDING) {
    return sendError(
      res,
      400,
      "Only PENDING offers can be withdrawn.",
      "INVALID_STATE"
    );
  }

  offer.status = LoadOfferStatus.WITHDRAWN;
  offer.updated_at = new Date().toISOString();
  return res.json({ offer });
});

router.post("/load-offers/:offerId/reject", (req, res) => {
  const user = req.user;
  const offer = findOffer(req.params.offerId);
  if (!offer) return sendError(res, 404, "Offer not found", "OFFER_NOT_FOUND");

  const load = findLoad(offer.load_id);
  if (!load) return sendError(res, 404, "Load not found", "LOAD_NOT_FOUND");

  if (load.shipper_company_id !== user.companyId) {
    return sendError(
      res,
      403,
      "You can only reject offers on your loads.",
      "FORBIDDEN"
    );
  }

  if (offer.status !== LoadOfferStatus.PENDING) {
    return sendError(
      res,
      400,
      "Only PENDING offers can be rejected.",
      "INVALID_STATE"
    );
  }

  const now = new Date().toISOString();
  offer.status = LoadOfferStatus.REJECTED;
  offer.rejected_at = now;
  offer.updated_at = now;
  return res.json({ offer });
});

router.post("/load-offers/:offerId/accept", (req, res) => {
  const user = req.user;
  const offer = findOffer(req.params.offerId);
  if (!offer) return sendError(res, 404, "Offer not found", "OFFER_NOT_FOUND");

  const load = findLoad(offer.load_id);
  if (!load) return sendError(res, 404, "Load not found", "LOAD_NOT_FOUND");

  if (load.shipper_company_id !== user.companyId) {
    return sendError(
      res,
      403,
      "You can only accept offers on your loads.",
      "FORBIDDEN"
    );
  }

  if (load.status !== LoadStatus.PUBLISHED) {
    return sendError(
      res,
      400,
      "Only PUBLISHED loads can accept offers.",
      "INVALID_STATE"
    );
  }

  if (offer.status !== LoadOfferStatus.PENDING) {
    return sendError(
      res,
      400,
      "Only PENDING offers can be accepted.",
      "INVALID_STATE"
    );
  }

  const now = new Date().toISOString();
  offer.status = LoadOfferStatus.ACCEPTED;
  offer.accepted_at = now;
  offer.updated_at = now;

  offers.forEach((o) => {
    if (
      o.load_id === offer.load_id &&
      o.id !== offer.id &&
      o.status === LoadOfferStatus.PENDING
    ) {
      o.status = LoadOfferStatus.EXPIRED;
      o.updated_at = now;
    }
  });

  const trip = {
    id: genId("trip"),
    load_id: offer.load_id,
    hauler_company_id: offer.hauler_company_id,
    status: TripStatus.PENDING_ESCROW,
    created_at: now,
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
    created_at: now,
  };
  payments.push(payment);

  load.awarded_offer_id = offer.id;
  load.status = LoadStatus.AWAITING_ESCROW;

  return res.status(201).json({ offer, trip, payment });
});

module.exports = router;
