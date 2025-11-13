import { Router } from "express";
import { getPaymentsForUser } from "../controllers/paymentController";

const router = Router();

// GET /api/payments?user_id=...&role=shipper|hauler
router.get("/", getPaymentsForUser);

export default router;
