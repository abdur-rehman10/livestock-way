import { Request, Response } from "express";
import { pool } from "../config/database";

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
        l.species,
        l.quantity,
        l.pickup_location,
        l.dropoff_location
      FROM payments p
      LEFT JOIN loads l ON l.id = p.load_id
      WHERE (p.payer_id = $1 AND p.payer_role = $2)
         OR (p.payee_id = $1 AND p.payee_role = $2)
      ORDER BY p.created_at DESC
      `,
      [userId, userRole]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
};
