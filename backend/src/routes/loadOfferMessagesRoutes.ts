import { Router, Request, Response } from "express";
import authRequired from "../middlewares/auth";
import {
  getUserLoadOfferThreads,
  getLoadOfferThreadById,
  getLoadOfferThreadByOfferId,
  getLoadOfferThreadMessages,
  sendLoadOfferThreadMessage,
} from "../services/loadOfferMessagesService";
import { notifyNewMessage } from "../services/notificationEmailService";

const router = Router();

// GET /api/load-offer-messages/threads - Get all threads for current user
router.get("/threads", authRequired, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const threads = await getUserLoadOfferThreads(userId);
    res.json(threads);
  } catch (err: any) {
    console.error("Error getting threads:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load threads" });
  }
});

// GET /api/load-offer-messages/threads/:threadId - Get specific thread
router.get("/threads/:threadId", authRequired, async (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(threadId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const thread = await getLoadOfferThreadById(threadId, userId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(thread);
  } catch (err: any) {
    console.error("Error getting thread:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load thread" });
  }
});

// GET /api/load-offer-messages/threads/by-offer/:offerId - Get thread by offer ID
router.get("/threads/by-offer/:offerId", authRequired, async (req: Request, res: Response) => {
  try {
    const offerId = Number(req.params.offerId);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(offerId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const thread = await getLoadOfferThreadByOfferId(offerId, userId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(thread);
  } catch (err: any) {
    console.error("Error getting thread:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load thread" });
  }
});

// GET /api/load-offer-messages/threads/:threadId/messages - Get messages for a thread
router.get("/threads/:threadId/messages", authRequired, async (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(threadId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const messages = await getLoadOfferThreadMessages(threadId, userId);
    res.json(messages);
  } catch (err: any) {
    console.error("Error getting messages:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load messages" });
  }
});

// POST /api/load-offer-messages/threads/:threadId/messages - Send a message
router.post("/threads/:threadId/messages", authRequired, async (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = Number((req as any).user?.id);
    const userRole = (req as any).user?.user_type;
    const message = req.body.message;

    if (Number.isNaN(threadId) || !userId || !userRole) {
      return res.status(400).json({ error: "Invalid request" });
    }

    // Validate message - must be a non-empty string after trimming
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const sentMessage = await sendLoadOfferThreadMessage(
      threadId,
      userId,
      userRole,
      message,
      req.body.attachments
    );

    // Emit WebSocket events
    const { emitEvent, SOCKET_EVENTS } = require("../socket");
    const thread = await getLoadOfferThreadById(threadId, userId);
    if (thread) {
      // Emit message to thread room
      const threadRoom = `load-offer-thread-${threadId}`;
      emitEvent(SOCKET_EVENTS.LOAD_OFFER_MESSAGE, { message: sentMessage, thread }, [threadRoom]);
      
      // Emit thread list updates to both users
      const [shipperThreads, haulerThreads] = await Promise.all([
        getUserLoadOfferThreads(thread.shipper_user_id),
        getUserLoadOfferThreads(thread.hauler_user_id),
      ]);
      
      emitEvent(
        SOCKET_EVENTS.LOAD_OFFER_THREAD_UPDATED,
        { threads: shipperThreads },
        [`user-${thread.shipper_user_id}`]
      );
      emitEvent(
        SOCKET_EVENTS.LOAD_OFFER_THREAD_UPDATED,
        { threads: haulerThreads },
        [`user-${thread.hauler_user_id}`]
      );

      const recipientId = userId === thread.shipper_user_id ? thread.hauler_user_id : thread.shipper_user_id;
      notifyNewMessage({ recipientUserId: recipientId, threadType: "load-offer", messagePreview: message }).catch(() => {});
    }

    res.status(201).json(sentMessage);
  } catch (err: any) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: err?.message ?? "Failed to send message" });
  }
});

export default router;
