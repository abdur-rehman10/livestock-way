import { Router } from "express";
import authRequired from "../middlewares/auth";
import {
  createServiceListing,
  listServiceListings,
  getServiceListingById,
  createServiceBooking,
  listBookingsForHauler,
  listBookingsForStakeholder,
  respondToBooking,
  markBookingPaid,
  listServiceListingsForOwner,
  updateServiceListing,
  archiveServiceListing,
  confirmBookingPayment,
} from "../services/serviceListingsService";
import { pool } from "../config/database";

const router = Router();

function getUserId(req: any): number | null {
  const val = req?.user?.id;
  if (!val) return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
}

function requireUserId(req: any, res: any): number | null {
  const id = getUserId(req);
  if (!id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return id;
}

router.get("/", async (_req, res) => {
  try {
    const items = await listServiceListings();
    res.json({ items });
  } catch (err) {
    console.error("list services failed", err);
    res.status(500).json({ error: "Failed to load services" });
  }
});

router.post("/", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const {
    title,
    service_type,
    description,
    location_name,
    street_address,
    city,
    state,
    zip,
    price_type,
    base_price,
    availability,
    response_time,
    certifications,
    insured,
    images,
  } = req.body ?? {};

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  try {
    const listing = await createServiceListing({
      userId,
      title,
      serviceType: service_type,
      description,
      locationName: location_name,
      streetAddress: street_address,
      city,
      state,
      zip,
      priceType: price_type,
      basePrice: base_price !== undefined ? Number(base_price) : null,
      availability,
      responseTime: response_time,
      certifications,
      insured: Boolean(insured),
      images: Array.isArray(images) ? images : [],
    });
    res.status(201).json({ service: listing });
  } catch (err: any) {
    console.error("create service failed", err);
    res.status(400).json({ error: err?.message ?? "Failed to create service" });
  }
});

router.post("/:id/book", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const serviceId = Number(req.params.id);
  if (Number.isNaN(serviceId)) {
    return res.status(400).json({ error: "Invalid service id" });
  }

  try {
    const payload: { serviceId: number; haulerUserId: number; price?: number | null; notes?: string | null } = {
      serviceId,
      haulerUserId: userId,
      notes: req.body?.notes ?? null,
    };
    if (req.body?.price !== undefined) {
      payload.price = Number(req.body.price);
    }
    const booking = await createServiceBooking(payload);
    res.status(201).json({ booking });
  } catch (err: any) {
    const message = err?.message ?? "Failed to book service";
    const status =
      message === "Service not found"
        ? 404
        : message === "Service already requested"
          ? 409
          : 400;
    console.error("book service failed", err);
    res.status(status).json({ error: message });
  }
});

router.get("/bookings/hauler/mine", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const items = await listBookingsForHauler(userId);
    res.json({ items });
  } catch (err) {
    console.error("list hauler bookings failed", err);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

router.get("/bookings/provider/mine", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const statusParam = req.query?.status ? String(req.query.status) : "";
    const paymentParam = req.query?.payment_status ? String(req.query.payment_status) : "";
    const status = statusParam
      ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    const paymentStatus = paymentParam
      ? paymentParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    const filters: { status?: string[]; paymentStatus?: string[] } = {};
    if (status?.length) filters.status = status;
    if (paymentStatus?.length) filters.paymentStatus = paymentStatus;
    const items = await listBookingsForStakeholder(userId, filters);
    res.json({ items });
  } catch (err) {
    console.error("list provider bookings failed", err);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

router.get("/provider/dashboard", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const [statsResult, pendingBookingsResult, recentBookingsResult, activityResult] = await Promise.all([
      pool.query(
        `
        SELECT
          (SELECT COUNT(*)::int FROM service_listings sl WHERE sl.owner_user_id = $1 AND (sl.status IS NULL OR sl.status <> 'archived')) AS active_services_count,
          (SELECT COUNT(*)::int FROM service_bookings sb JOIN service_listings sl2 ON sl2.id = sb.service_id WHERE sl2.owner_user_id = $1 AND LOWER(sb.status::text) = 'pending') AS pending_bookings_count,
          (SELECT COUNT(*)::int FROM service_bookings sb JOIN service_listings sl2 ON sl2.id = sb.service_id WHERE sl2.owner_user_id = $1 AND LOWER(sb.status::text) = 'completed') AS completed_bookings_count,
          (SELECT COUNT(*)::int FROM resources_listings rl WHERE rl.posted_by_user_id = $1 AND (rl.status IS NULL OR rl.status NOT IN ('withdrawn'))) AS active_resources_count
        `,
        [userId]
      ),
      pool.query(
        `
        SELECT sb.id::text, sb.status, sb.payment_status, sb.price, sb.created_at,
               sl.title AS service_title, sl.service_type, sl.city, sl.state
        FROM service_bookings sb
        JOIN service_listings sl ON sl.id = sb.service_id
        WHERE sl.owner_user_id = $1 AND LOWER(sb.status::text) = 'pending'
        ORDER BY sb.created_at DESC
        LIMIT 5
        `,
        [userId]
      ),
      pool.query(
        `
        SELECT sb.id::text, sb.status, sb.payment_status, sb.price, sb.created_at,
               sl.title AS service_title, sl.service_type, sl.city, sl.state
        FROM service_bookings sb
        JOIN service_listings sl ON sl.id = sb.service_id
        WHERE sl.owner_user_id = $1
        ORDER BY sb.updated_at DESC NULLS LAST
        LIMIT 10
        `,
        [userId]
      ),
      pool.query(
        `
        SELECT id::text, action, resource, metadata, created_at
        FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 15
        `,
        [userId]
      ),
    ]);

    const s = statsResult.rows[0];
    res.json({
      active_services_count: Number(s?.active_services_count ?? 0),
      pending_bookings_count: Number(s?.pending_bookings_count ?? 0),
      completed_bookings_count: Number(s?.completed_bookings_count ?? 0),
      active_resources_count: Number(s?.active_resources_count ?? 0),
      pending_bookings: pendingBookingsResult.rows.map((r: any) => ({
        id: r.id,
        status: r.status,
        payment_status: r.payment_status,
        price: r.price ? Number(r.price) : null,
        created_at: r.created_at,
        service_title: r.service_title,
        service_type: r.service_type,
        city: r.city,
        state: r.state,
      })),
      recent_bookings: recentBookingsResult.rows.map((r: any) => ({
        id: r.id,
        status: r.status,
        payment_status: r.payment_status,
        price: r.price ? Number(r.price) : null,
        created_at: r.created_at,
        service_title: r.service_title,
        service_type: r.service_type,
        city: r.city,
        state: r.state,
      })),
      recent_activities: activityResult.rows.map((r: any) => ({
        id: r.id,
        action: r.action,
        resource: r.resource ?? null,
        metadata: r.metadata ?? null,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error("provider dashboard error", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

router.get("/mine", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const items = await listServiceListingsForOwner(userId);
    res.json({ items });
  } catch (err) {
    console.error("list my services failed", err);
    res.status(500).json({ error: "Failed to load services" });
  }
});

router.patch("/:id", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const serviceId = Number(req.params.id);
  if (Number.isNaN(serviceId)) {
    return res.status(400).json({ error: "Invalid service id" });
  }
  try {
    const patch: any = {};
    const setIfDefined = (key: string, value: any) => {
      if (value !== undefined) patch[key] = value;
    };
    setIfDefined("title", req.body?.title);
    setIfDefined("serviceType", req.body?.service_type);
    setIfDefined("description", req.body?.description);
    setIfDefined("locationName", req.body?.location_name);
    setIfDefined("streetAddress", req.body?.street_address);
    setIfDefined("city", req.body?.city);
    setIfDefined("state", req.body?.state);
    setIfDefined("zip", req.body?.zip);
    setIfDefined("priceType", req.body?.price_type);
    if (req.body?.base_price !== undefined) {
      patch.basePrice = Number(req.body.base_price);
    }
    setIfDefined("availability", req.body?.availability);
    setIfDefined("responseTime", req.body?.response_time);
    setIfDefined("certifications", req.body?.certifications);
    setIfDefined("insured", req.body?.insured);
    if (Array.isArray(req.body?.images)) {
      patch.images = req.body.images;
    }

    const updated = await updateServiceListing({
      serviceId,
      userId,
      patch,
    });
    res.json({ service: updated });
  } catch (err: any) {
    const message = err?.message ?? "Failed to update service";
    const status = message === "Service not found" ? 404 : message === "Forbidden" ? 403 : 400;
    console.error("update service failed", err);
    res.status(status).json({ error: message });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const serviceId = Number(req.params.id);
  if (Number.isNaN(serviceId)) {
    return res.status(400).json({ error: "Invalid service id" });
  }
  try {
    await archiveServiceListing({ serviceId, userId });
    res.status(204).send();
  } catch (err: any) {
    const message = err?.message ?? "Failed to delete service";
    const status = message === "Service not found" ? 404 : message === "Forbidden" ? 403 : 400;
    console.error("delete service failed", err);
    res.status(status).json({ error: message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const service = await getServiceListingById(id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.json({ service });
  } catch (err) {
    console.error("get service failed", err);
    res.status(500).json({ error: "Failed to load service" });
  }
});

router.post("/bookings/:id/accept", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const bookingId = Number(req.params.id);
  if (Number.isNaN(bookingId)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }
  try {
    const booking = await respondToBooking({ bookingId, userId, action: "accept" });
    res.json({ booking });
  } catch (err: any) {
    const message = err?.message ?? "Failed to accept booking";
    const status = message === "Booking not found" ? 404 : message === "Forbidden" ? 403 : 400;
    console.error("accept booking failed", err);
    res.status(status).json({ error: message });
  }
});

router.post("/bookings/:id/reject", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const bookingId = Number(req.params.id);
  if (Number.isNaN(bookingId)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }
  try {
    const booking = await respondToBooking({ bookingId, userId, action: "reject" });
    res.json({ booking });
  } catch (err: any) {
    const message = err?.message ?? "Failed to reject booking";
    const status = message === "Booking not found" ? 404 : message === "Forbidden" ? 403 : 400;
    console.error("reject booking failed", err);
    res.status(status).json({ error: message });
  }
});

router.post("/bookings/:id/complete", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const bookingId = Number(req.params.id);
  if (Number.isNaN(bookingId)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }
  try {
    const booking = await respondToBooking({ bookingId, userId, action: "complete" });
    res.json({ booking });
  } catch (err: any) {
    const message = err?.message ?? "Failed to complete booking";
    const status = message === "Booking not found" ? 404 : message === "Forbidden" ? 403 : 400;
    console.error("complete booking failed", err);
    res.status(status).json({ error: message });
  }
});

router.post("/bookings/:id/pay", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const bookingId = Number(req.params.id);
  if (Number.isNaN(bookingId)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }
  try {
    const booking = await markBookingPaid({ bookingId, userId });
    res.json({ booking });
  } catch (err: any) {
    const message = err?.message ?? "Failed to mark paid";
    const status = message === "Booking not found" ? 404 : message === "Forbidden" ? 403 : 400;
    console.error("mark paid failed", err);
    res.status(status).json({ error: message });
  }
});

router.post("/bookings/:id/confirm-payment", authRequired, async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const bookingId = Number(req.params.id);
  if (Number.isNaN(bookingId)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }
  try {
    const booking = await confirmBookingPayment({ bookingId, userId });
    res.json({ booking });
  } catch (err: any) {
    const message = err?.message ?? "Failed to confirm payment";
    const status =
      message === "Booking not found"
        ? 404
        : message === "Forbidden"
          ? 403
          : 400;
    console.error("confirm payment failed", err);
    res.status(status).json({ error: message });
  }
});

export default router;
