import { Request, Response } from "express";
import { pool } from "../config/database";

// GET /api/support?user_id=...&role=...
export const getSupportTicketsForUser = async (req: Request, res: Response) => {
  try {
    const { user_id, role } = req.query;

    if (!user_id || !role) {
      return res
        .status(400)
        .json({ error: "user_id and role are required query params" });
    }

    const userId = String(user_id);
    const userRole = String(role);

    const { rows } = await pool.query(
      `
      SELECT *
      FROM support_tickets
      WHERE user_id = $1
        AND user_role = $2
      ORDER BY created_at DESC
      `,
      [userId, userRole]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    res.status(500).json({ error: "Failed to fetch support tickets" });
  }
};

// POST /api/support
export const createSupportTicket = async (req: Request, res: Response) => {
  try {
    const { user_id, role, subject, message, priority } = req.body;

    if (!user_id || !role || !subject || !message) {
      return res.status(400).json({
        error: "user_id, role, subject and message are required",
      });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO support_tickets (
        user_id,
        user_role,
        subject,
        message,
        priority,
        status
      )
      VALUES ($1,$2,$3,$4,COALESCE($5,'normal'),'open')
      RETURNING *
      `,
      [user_id, role, subject, message, priority || "normal"]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating support ticket:", error);
    res.status(500).json({ error: "Failed to create support ticket" });
  }
};
