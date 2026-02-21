import { Router, Request, Response } from "express";
import authRequired from "../middlewares/auth";
import {
  getUserJobThreads,
  getJobThreadById,
  getThreadByJobAndApplication,
  getThreadMessages,
  sendThreadMessage,
} from "../services/jobMessagesService";
import { emitEvent, SOCKET_EVENTS } from "../socket";
import { notifyNewMessage } from "../services/notificationEmailService";

const router = Router();

// GET /api/job-messages/threads - Get all threads for current user
router.get("/threads", authRequired, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const threads = await getUserJobThreads(userId);
    res.json({ threads });
  } catch (err: any) {
    console.error("Error getting threads:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load threads" });
  }
});

// GET /api/job-messages/threads/:threadId - Get specific thread
router.get("/threads/:threadId", authRequired, async (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(threadId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const thread = await getJobThreadById(threadId, userId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json({ thread });
  } catch (err: any) {
    console.error("Error getting thread:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load thread" });
  }
});

// GET /api/job-messages/threads/by-job/:jobId/:applicationId - Get thread by job and application
router.get("/threads/by-job/:jobId/:applicationId", authRequired, async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.jobId);
    const applicationId = Number(req.params.applicationId);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(jobId) || Number.isNaN(applicationId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const thread = await getThreadByJobAndApplication(jobId, applicationId, userId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json({ thread });
  } catch (err: any) {
    console.error("Error getting thread:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load thread" });
  }
});

// GET /api/job-messages/threads/:threadId/messages - Get messages for a thread
router.get("/threads/:threadId/messages", authRequired, async (req: Request, res: Response) => {
  try {
    const threadId = Number(req.params.threadId);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(threadId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const messages = await getThreadMessages(threadId, userId);
    res.json({ messages });
  } catch (err: any) {
    console.error("Error getting messages:", err);
    const status = err?.message === "Thread not found or access denied" ? 404 : 500;
    res.status(status).json({ error: err?.message ?? "Failed to load messages" });
  }
});

// POST /api/job-messages/threads/:threadId/messages - Send a message
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

    const sentMessage = await sendThreadMessage(
      threadId,
      userId,
      userRole.toLowerCase(),
      message.trim(),
      attachments
    );

    // Get thread info for socket emission
    const thread = await getJobThreadById(threadId, userId);
    if (thread) {
      // Emit message to thread room (both users should join this room)
      const threadRoom = `job-thread-${threadId}`;
      emitEvent(SOCKET_EVENTS.JOB_MESSAGE, { message: sentMessage, thread }, [threadRoom]);
      
      // Also emit thread list updates to both users to update unread counts
      const updatedThreads = await Promise.all([
        getUserJobThreads(thread.job_poster_user_id),
        getUserJobThreads(thread.applicant_user_id),
      ]);
      
      emitEvent(
        SOCKET_EVENTS.JOB_THREAD_UPDATED,
        { threads: updatedThreads[0] },
        [`user-${thread.job_poster_user_id}`]
      );
      emitEvent(
        SOCKET_EVENTS.JOB_THREAD_UPDATED,
        { threads: updatedThreads[1] },
        [`user-${thread.applicant_user_id}`]
      );

      const recipientId = userId === thread.job_poster_user_id ? thread.applicant_user_id : thread.job_poster_user_id;
      notifyNewMessage({ recipientUserId: recipientId, threadType: "job", messagePreview: message }).catch(() => {});
    }

    res.status(201).json({ message: sentMessage });
  } catch (err: any) {
    console.error("Error sending message:", err);
    const status =
      err?.message === "Thread not found" || err?.message === "Access denied"
        ? 403
        : err?.message === "Only the job poster can send the first message"
          ? 403
          : 500;
    res.status(status).json({ error: err?.message ?? "Failed to send message" });
  }
});

export default router;
