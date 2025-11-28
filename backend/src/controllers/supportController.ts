import { Request, Response } from "express";
import { pool } from "../config/database";
import { normalizeRole } from "../middlewares/rbac";

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

export const getSupportTicketMessages = async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const userId = req.query.user_id ? String(req.query.user_id) : null;
    const userRole = req.query.role ? normalizeRole(String(req.query.role)) : null;
    if (!ticketId || Number.isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket id" });
    }
    const ticketResult = await pool.query(
      `SELECT user_id, user_role FROM support_tickets WHERE id = $1`,
      [ticketId]
    );
    if (ticketResult.rowCount === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    if (userId && userRole && normalizeRole(ticketResult.rows[0].user_role) !== userRole) {
      if (String(ticketResult.rows[0].user_id) !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    const { rows } = await pool.query(
      `
        SELECT id, ticket_id, sender_user_id, sender_role, message, attachments, created_at
        FROM support_ticket_messages
        WHERE ticket_id = $1
        ORDER BY created_at ASC
      `,
      [ticketId]
    );
    return res.json({ items: rows });
  } catch (error) {
    console.error("Error fetching support ticket messages:", error);
    res.status(500).json({ error: "Failed to fetch ticket messages" });
  }
};

export const addSupportTicketMessage = async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.ticketId);
    if (!ticketId || Number.isNaN(ticketId)) {
      return res.status(400).json({ error: "Invalid ticket id" });
    }
    const { sender_user_id, sender_role, message, attachments } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }
    const ticketResult = await pool.query(
      `SELECT id FROM support_tickets WHERE id = $1`,
      [ticketId]
    );
    if (ticketResult.rowCount === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const { rows } = await pool.query(
      `
        INSERT INTO support_ticket_messages (
          ticket_id,
          sender_user_id,
          sender_role,
          message,
          attachments
        )
        VALUES ($1,$2,$3,$4,$5)
        RETURNING id, ticket_id, sender_user_id, sender_role, message, attachments, created_at
      `,
      [
        ticketId,
        sender_user_id ?? null,
        sender_role ?? null,
        message,
        JSON.stringify(attachments ?? []),
      ]
    );
    return res.status(201).json({ message: rows[0] });
  } catch (error) {
    console.error("Error adding support ticket message:", error);
    res.status(500).json({ error: "Failed to add ticket message" });
  }
};
