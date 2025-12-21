import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import {
  sendMessageRequestSchema,
  reportMessageRequestSchema,
} from "@/shared/contracts";
import {
  moderateMessage,
  detectImageSpam,
  addStrike,
  SENDER_TOOLTIP,
} from "../lib/chat-moderation";

const messagesRouter = new Hono<AppType>();

// Helper to generate conversation ID (sorted user IDs)
function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join("_");
}

// Helper to transform message
const transformMessage = (msg: { id: string; conversationId: string; senderId: string; recipientId: string; content: string; imageUrl: string | null; isHidden: boolean; flaggedReason: string | null; createdAt: Date }) => ({
  ...msg,
  createdAt: msg.createdAt.toISOString(),
});

// POST /api/messages - Send a message
messagesRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const data = sendMessageRequestSchema.parse(body);
    const conversationId = getConversationId(user.id, data.recipientId);

    // Moderate content
    const moderation = moderateMessage(data.content);

    // Check for image spam
    let imageSpamResult = { isSuspicious: false, reason: null as string | null };
    if (data.imageUrl && data.imageHash) {
      imageSpamResult = await detectImageSpam(db, user.id, data.imageHash);
    }

    const flaggedReason = moderation.flaggedReason || imageSpamResult.reason;
    const isHidden = moderation.isHidden || imageSpamResult.isSuspicious;

    const message = await db.message.create({
      data: {
        conversationId,
        senderId: user.id,
        recipientId: data.recipientId,
        content: moderation.sanitizedContent,
        imageUrl: data.imageUrl ?? null,
        imageHash: data.imageHash ?? null,
        isHidden,
        flaggedReason,
      },
    });

    return c.json({
      message: transformMessage(message),
      showSenderTooltip: moderation.showSenderTooltip,
      senderTooltip: moderation.showSenderTooltip ? SENDER_TOOLTIP : undefined,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// GET /api/messages/:recipientId - Get conversation messages
messagesRouter.get("/:recipientId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const recipientId = c.req.param("recipientId");
    const conversationId = getConversationId(user.id, recipientId);

    const messages = await db.message.findMany({
      where: {
        conversationId,
        // Hide flagged messages from recipient (but show to sender)
        OR: [
          { isHidden: false },
          { senderId: user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    return c.json({ messages: messages.map(transformMessage) });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

// POST /api/messages/report - Report a message
messagesRouter.post("/report", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const data = reportMessageRequestSchema.parse(body);

    const message = await db.message.findUnique({
      where: { id: data.messageId },
    });

    if (!message) {
      return c.json({ error: "Message not found" }, 404);
    }

    // Create report
    await db.chatReport.create({
      data: {
        messageId: data.messageId,
        reporterId: user.id,
        reason: data.reason,
      },
    });

    // Immediately soft-hide the message
    await db.message.update({
      where: { id: data.messageId },
      data: { isHidden: true, flaggedReason: "reported" },
    });

    // Add strike to sender (90-day decay)
    await addStrike(db, message.senderId, `Reported: ${data.reason}`);

    return c.json({ success: true, message: "Report submitted" });
  } catch (error) {
    console.error("Error reporting message:", error);
    return c.json({ error: "Failed to report message" }, 500);
  }
});

export { messagesRouter };
