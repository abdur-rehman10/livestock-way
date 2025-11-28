import { Router } from "express";
import {
  getSupportTicketsForUser,
  createSupportTicket,
  getSupportTicketMessages,
  addSupportTicketMessage,
} from "../controllers/supportController";

const router = Router();

router.get("/", getSupportTicketsForUser);
router.post("/", createSupportTicket);
router.get("/:ticketId/messages", getSupportTicketMessages);
router.post("/:ticketId/messages", addSupportTicketMessage);

export default router;
