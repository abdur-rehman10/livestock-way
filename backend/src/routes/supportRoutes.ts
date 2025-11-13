import { Router } from "express";
import {
  getSupportTicketsForUser,
  createSupportTicket,
} from "../controllers/supportController";

const router = Router();

router.get("/", getSupportTicketsForUser);
router.post("/", createSupportTicket);

export default router;
