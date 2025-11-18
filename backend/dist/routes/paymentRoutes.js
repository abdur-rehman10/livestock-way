"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = __importDefault(require("../middlewares/auth"));
const paymentsService_1 = require("../services/paymentsService");
const router = (0, express_1.Router)();
// GET /api/payments?user_id=...&role=shipper|hauler
router.get("/", paymentController_1.getPaymentsForUser);
// GET /api/payments/:id
router.get("/:id", auth_1.default, async (req, res) => {
    const paymentId = Number(req.params.id);
    if (Number.isNaN(paymentId)) {
        return res.status(400).json({ error: "Invalid payment id" });
    }
    try {
        const payment = await (0, paymentsService_1.getPaymentById)(paymentId);
        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }
        res.json(payment);
    }
    catch (error) {
        console.error("GET /api/payments/:id error", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/payments/:id/fund
router.post("/:id/fund", auth_1.default, async (req, res) => {
    const paymentId = Number(req.params.id);
    if (Number.isNaN(paymentId)) {
        return res.status(400).json({ error: "Invalid payment id" });
    }
    try {
        const payment = await (0, paymentsService_1.getPaymentById)(paymentId);
        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }
        const user = req.user;
        const userType = user?.user_type?.toLowerCase();
        const actorId = user?.id ? String(user.id) : null;
        if (userType !== "shipper" || actorId !== payment.payer_id) {
            return res.status(403).json({ error: "Not allowed to fund this payment" });
        }
        const updated = await (0, paymentsService_1.fundPayment)(paymentId);
        res.json(updated);
    }
    catch (error) {
        console.error("POST /api/payments/:id/fund error", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=paymentRoutes.js.map