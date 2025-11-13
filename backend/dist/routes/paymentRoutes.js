"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const router = (0, express_1.Router)();
// GET /api/payments?user_id=...&role=shipper|hauler
router.get("/", paymentController_1.getPaymentsForUser);
exports.default = router;
//# sourceMappingURL=paymentRoutes.js.map