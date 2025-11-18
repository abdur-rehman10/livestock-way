import { Router } from "express";
import { getPaymentsForUser } from "../controllers/paymentController";
import authRequired from "../middlewares/auth";
import {
  fundPayment,
  getPaymentById,
  getPaymentByTripId,
} from "../services/paymentsService";

const router = Router();

// GET /api/payments?user_id=...&role=shipper|hauler
router.get("/", getPaymentsForUser);

// GET /api/payments/by-trip/:tripId
router.get("/by-trip/:tripId", authRequired, async (req, res) => {
  const tripId = Number(req.params.tripId);
  if (Number.isNaN(tripId)) {
    return res.status(400).json({ error: "Invalid trip id" });
  }

  try {
    const payment = await getPaymentByTripId(tripId);
    if (!payment) {
      return res
        .status(404)
        .json({ error: "No payment found for this trip" });
    }
    res.json(payment);
  } catch (error) {
    console.error("GET /api/payments/by-trip/:tripId error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/payments/:id
router.get("/:id", authRequired, async (req, res) => {
  const paymentId = Number(req.params.id);
  if (Number.isNaN(paymentId)) {
    return res.status(400).json({ error: "Invalid payment id" });
  }

  try {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json(payment);
  } catch (error) {
    console.error("GET /api/payments/:id error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/payments/:id/fund
router.post("/:id/fund", authRequired, async (req, res) => {
  const paymentId = Number(req.params.id);
  if (Number.isNaN(paymentId)) {
    return res.status(400).json({ error: "Invalid payment id" });
  }

  try {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const user = (req as any).user as { id?: string | number; user_type?: string };
    const userType = user?.user_type?.toLowerCase();
    const actorId = user?.id ? String(user.id) : null;

    if (userType !== "shipper" || actorId !== payment.payer_id) {
      return res.status(403).json({ error: "Not allowed to fund this payment" });
    }

    const actorNumericId = actorId ? Number(actorId) : null;
    if (!actorNumericId) {
      return res.status(403).json({ error: "Not allowed to fund this payment" });
    }

    const updated = await fundPayment(paymentId, actorNumericId);
    if (!updated) {
      return res
        .status(400)
        .json({ error: "Payment is not in a fundable state" });
    }
    res.json(updated);
  } catch (error) {
    console.error("POST /api/payments/:id/fund error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
