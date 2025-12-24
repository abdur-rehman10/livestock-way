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
