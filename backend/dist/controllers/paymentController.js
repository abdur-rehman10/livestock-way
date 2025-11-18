"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentsForUser = void 0;
const database_1 = require("../config/database");
const paymentsService_1 = require("../services/paymentsService");
// GET /api/payments?user_id=xxx&role=shipper|hauler
const getPaymentsForUser = async (req, res) => {
    try {
        const { user_id, role } = req.query;
        if (!user_id || !role) {
            return res
                .status(400)
                .json({ error: "user_id and role are required query params" });
        }
        const userId = String(user_id);
        const userRole = String(role);
        // A user can be payer or payee; we show both sides
        const { rows } = await database_1.pool.query(`
      SELECT
        p.*,
        l.pickup_location_text,
        l.dropoff_location_text
      FROM payments p
      LEFT JOIN loads l ON l.id = p.load_id
      WHERE p.payer_user_id::text = $1 OR p.payee_user_id::text = $1
      ORDER BY p.created_at DESC
      `, [userId]);
        const mapped = rows
            .map((row) => (0, paymentsService_1.mapPaymentRow)(row))
            .filter((payment) => {
            if (userRole.toLowerCase() === "shipper") {
                return payment.payer_id === userId;
            }
            if (userRole.toLowerCase() === "hauler") {
                return payment.payee_id === userId;
            }
            return true;
        });
        res.json(mapped);
    }
    catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ error: "Failed to fetch payments" });
    }
};
exports.getPaymentsForUser = getPaymentsForUser;
//# sourceMappingURL=paymentController.js.map