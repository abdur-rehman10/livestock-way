"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSupportTicketMessage = exports.getSupportTicketMessages = exports.createSupportTicket = exports.getSupportTicketsForUser = void 0;
const database_1 = require("../config/database");
const rbac_1 = require("../middlewares/rbac");
// GET /api/support?user_id=...&role=...
const getSupportTicketsForUser = async (req, res) => {
    try {
        const { user_id, role } = req.query;
        if (!user_id || !role) {
            return res
                .status(400)
                .json({ error: "user_id and role are required query params" });
        }
        const userId = String(user_id);
        const userRole = String(role);
        const { rows } = await database_1.pool.query(`
      SELECT *
      FROM support_tickets
      WHERE user_id = $1
        AND user_role = $2
      ORDER BY created_at DESC
      `, [userId, userRole]);
        res.json(rows);
    }
    catch (error) {
        console.error("Error fetching support tickets:", error);
        res.status(500).json({ error: "Failed to fetch support tickets" });
    }
};
exports.getSupportTicketsForUser = getSupportTicketsForUser;
// POST /api/support
const createSupportTicket = async (req, res) => {
    try {
        const { user_id, role, subject, message, priority } = req.body;
        if (!user_id || !role || !subject || !message) {
            return res.status(400).json({
                error: "user_id, role, subject and message are required",
            });
        }
        const { rows } = await database_1.pool.query(`
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
      `, [user_id, role, subject, message, priority || "normal"]);
        res.status(201).json(rows[0]);
    }
    catch (error) {
        console.error("Error creating support ticket:", error);
        res.status(500).json({ error: "Failed to create support ticket" });
    }
};
exports.createSupportTicket = createSupportTicket;
const getSupportTicketMessages = async (req, res) => {
    try {
        const ticketId = Number(req.params.ticketId);
        const userId = req.query.user_id ? String(req.query.user_id) : null;
        const userRole = req.query.role ? (0, rbac_1.normalizeRole)(String(req.query.role)) : null;
        if (!ticketId || Number.isNaN(ticketId)) {
            return res.status(400).json({ error: "Invalid ticket id" });
        }
        const ticketResult = await database_1.pool.query(`SELECT user_id, user_role FROM support_tickets WHERE id = $1`, [ticketId]);
        if (ticketResult.rowCount === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }
        if (userId && userRole && (0, rbac_1.normalizeRole)(ticketResult.rows[0].user_role) !== userRole) {
            if (String(ticketResult.rows[0].user_id) !== userId) {
                return res.status(403).json({ error: "Forbidden" });
            }
        }
        const { rows } = await database_1.pool.query(`
        SELECT id, ticket_id, sender_user_id, sender_role, message, attachments, created_at
        FROM support_ticket_messages
        WHERE ticket_id = $1
        ORDER BY created_at ASC
      `, [ticketId]);
        return res.json({ items: rows });
    }
    catch (error) {
        console.error("Error fetching support ticket messages:", error);
        res.status(500).json({ error: "Failed to fetch ticket messages" });
    }
};
exports.getSupportTicketMessages = getSupportTicketMessages;
const addSupportTicketMessage = async (req, res) => {
    try {
        const ticketId = Number(req.params.ticketId);
        if (!ticketId || Number.isNaN(ticketId)) {
            return res.status(400).json({ error: "Invalid ticket id" });
        }
        const { sender_user_id, sender_role, message, attachments } = req.body;
        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "message is required" });
        }
        const ticketResult = await database_1.pool.query(`SELECT id FROM support_tickets WHERE id = $1`, [ticketId]);
        if (ticketResult.rowCount === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }
        const { rows } = await database_1.pool.query(`
        INSERT INTO support_ticket_messages (
          ticket_id,
          sender_user_id,
          sender_role,
          message,
          attachments
        )
        VALUES ($1,$2,$3,$4,$5)
        RETURNING id, ticket_id, sender_user_id, sender_role, message, attachments, created_at
      `, [
            ticketId,
            sender_user_id ?? null,
            sender_role ?? null,
            message,
            JSON.stringify(attachments ?? []),
        ]);
        return res.status(201).json({ message: rows[0] });
    }
    catch (error) {
        console.error("Error adding support ticket message:", error);
        res.status(500).json({ error: "Failed to add ticket message" });
    }
};
exports.addSupportTicketMessage = addSupportTicketMessage;
//# sourceMappingURL=supportController.js.map