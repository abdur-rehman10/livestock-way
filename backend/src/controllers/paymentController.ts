import { Request, Response } from "express";
import { pool } from "../config/database";
import { mapPaymentRow } from "../services/paymentsService";

// GET /api/payments?user_id=xxx&role=shipper|hauler
export const getPaymentsForUser = async (req: Request, res: Response) => {
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
    const { rows } = await pool.query(
      `
      SELECT
        p.*,
        l.pickup_location_text,
        l.dropoff_location_text,
        d.status AS dispute_status,
        d.resolution_amount_to_hauler,
        d.resolution_amount_to_shipper,
        d.resolved_at AS dispute_resolved_at
      FROM payments p
      LEFT JOIN loads l ON l.id = p.load_id
      LEFT JOIN LATERAL (
        SELECT
          status,
          resolution_amount_to_hauler,
          resolution_amount_to_shipper,
          resolved_at
        FROM payment_disputes
        WHERE payment_id = p.id
        ORDER BY created_at DESC
        LIMIT 1
      ) d ON TRUE
      WHERE p.payer_user_id::text = $1 OR p.payee_user_id::text = $1
      ORDER BY p.created_at DESC
      `,
      [userId]
    );

    const mapped = rows
      .map((row) => {
        const payment = mapPaymentRow(row);
        if (row.dispute_status === "RESOLVED_SPLIT") {
          payment.split_amount_to_hauler =
            row.resolution_amount_to_hauler !== null
              ? Number(row.resolution_amount_to_hauler)
              : null;
          payment.split_amount_to_shipper =
            row.resolution_amount_to_shipper !== null
              ? Number(row.resolution_amount_to_shipper)
              : null;
          payment.split_resolved_at = row.dispute_resolved_at ?? null;
        } else if (row.dispute_status === "RESOLVED_REFUND_TO_SHIPPER") {
          payment.split_amount_to_hauler = null;
          payment.split_amount_to_shipper =
            row.resolution_amount_to_shipper !== null
              ? Number(row.resolution_amount_to_shipper)
              : null;
          payment.split_resolved_at = row.dispute_resolved_at ?? null;
        }
        return payment;
      })
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
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
};
