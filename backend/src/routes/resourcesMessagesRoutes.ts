import { Router, Request, Response } from "express";
import authRequired from "../middlewares/auth";
import {
  getUserResourcesThreads,
  getResourcesThreadById,
  getResourcesThreadByListingAndApplication,
  getResourcesThreadMessages,
  sendResourcesThreadMessage,
} from "../services/resourcesMessagesService";
import { emitEvent, SOCKET_EVENTS } from "../socket";
import { notifyNewMessage } from "../services/notificationEmailService";

const router = Router();

// GET /api/resources-messages/threads - Get all threads for current user
router.get("/threads", authRequired, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const threads = await getUserResourcesThreads(userId);
    res.json({ threads });
  } catch (err: any) {
    console.error("Error getting threads:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load threads" });
  }
});

// GET /api/resources-messages/threads/:threadId - Get specific thread
router.get("/threads/:threadId", authRequired, async (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(threadId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const thread = await getResourcesThreadById(threadId, userId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json({ thread });
  } catch (err: any) {
    console.error("Error getting thread:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load thread" });
  }
});

// GET /api/resources-messages/threads/by-listing/:listingId/:applicationId - Get thread by listing and application
router.get("/threads/by-listing/:listingId/:applicationId", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.listingId);
    const applicationId = Number(req.params.applicationId);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || Number.isNaN(applicationId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const thread = await getResourcesThreadByListingAndApplication(listingId, applicationId, userId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json({ thread });
  } catch (err: any) {
    console.error("Error getting thread:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load thread" });
  }
});

// GET /api/resources-messages/threads/:threadId/messages - Get messages for a thread
router.get("/threads/:threadId/messages", authRequired, async (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(threadId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const messages = await getResourcesThreadMessages(threadId, userId);
    res.json({ messages });
  } catch (err: any) {
    console.error("Error getting messages:", err);
    const status = err?.message === "Thread not found or access denied" ? 404 : 500;
    res.status(status).json({ error: err?.message ?? "Failed to load messages" });
  }
});

// POST /api/resources-messages/threads/:threadId/messages - Send a message
router.post("/threads/:threadId/messages", authRequired, async (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = Number((req as any).user?.id);
    const userRole = (req as any).user?.user_type;
    if (Number.isNaN(threadId) || !userId || !userRole) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const { message, attachments } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    const sentMessage = await sendResourcesThreadMessage(
      threadId,
      userId,
      userRole.toLowerCase(),
      message.trim(),
      attachments
    );

    // Get thread info for socket emission
    const thread = await getResourcesThreadById(threadId, userId);
    if (thread) {
      // Emit message to thread room
      const threadRoom = `resources-thread-${threadId}`;
      emitEvent("resources:message", { message: sentMessage, thread }, [threadRoom]);
      
      // Also emit thread list updates to both users
      const updatedThreads = await Promise.all([
        getUserResourcesThreads(thread.listing_poster_user_id),
        getUserResourcesThreads(thread.applicant_user_id),
      ]);
      
      emitEvent(
        "resources:thread:updated",
        { threads: updatedThreads[0] },
        [`user-${thread.listing_poster_user_id}`]
      );
      emitEvent(
        "resources:thread:updated",
        { threads: updatedThreads[1] },
        [`user-${thread.applicant_user_id}`]
      );

      const recipientId = userId === thread.listing_poster_user_id ? thread.applicant_user_id : thread.listing_poster_user_id;
      notifyNewMessage({ recipientUserId: recipientId, threadType: "resources", messagePreview: message }).catch(() => {});
    }

    res.status(201).json({ message: sentMessage });
  } catch (err: any) {
    console.error("Error sending message:", err);
    const status =
      err?.message === "Thread not found" || err?.message === "Access denied"
        ? 403
        : err?.message === "Only the listing poster can send the first message"
          ? 403
          : 500;
    res.status(status).json({ error: err?.message ?? "Failed to send message" });
  }
});

export default router;
