// Chat anti-scam moderation utilities

// URL patterns to block
const URL_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.(com|net|org|io|co|me|app|link|ly|bit\.ly|goo\.gl|tinyurl|t\.co)[^\s]*/gi,
];

// Off-platform messaging patterns
const OFF_PLATFORM_PATTERNS = [
  /whatsapp/gi,
  /telegram/gi,
  /instagram/gi,
  /facebook\s*messenger/gi,
  /signal\s*app/gi,
  /viber/gi,
  /wa\.me/gi,
  /t\.me/gi,
  /ig:/gi,
  /\+\d{10,}/g, // Phone numbers
  /@[a-zA-Z0-9_]+\s*(on\s*)?(insta|telegram|whatsapp)/gi,
];

const LINK_REMOVED_TEXT = "[Link removed for safety]";
const SENDER_TOOLTIP = "Links are blocked for safety. Please share details without links.";

export interface ModerationResult {
  sanitizedContent: string;
  isHidden: boolean;
  flaggedReason: string | null;
  showSenderTooltip: boolean;
}

export function moderateMessage(content: string): ModerationResult {
  let sanitizedContent = content;
  let flaggedReason: string | null = null;
  let showSenderTooltip = false;

  // Check for URLs
  for (const pattern of URL_PATTERNS) {
    if (pattern.test(content)) {
      sanitizedContent = sanitizedContent.replace(pattern, LINK_REMOVED_TEXT);
      flaggedReason = "url";
      showSenderTooltip = true;
    }
    pattern.lastIndex = 0; // Reset regex state
  }

  // Check for off-platform patterns
  for (const pattern of OFF_PLATFORM_PATTERNS) {
    if (pattern.test(content)) {
      sanitizedContent = sanitizedContent.replace(pattern, LINK_REMOVED_TEXT);
      flaggedReason = flaggedReason || "off_platform";
      showSenderTooltip = true;
    }
    pattern.lastIndex = 0;
  }

  return {
    sanitizedContent,
    isHidden: flaggedReason !== null,
    flaggedReason,
    showSenderTooltip,
  };
}

// Image spam detection - returns true if suspicious
export async function detectImageSpam(
  db: any,
  senderId: string,
  imageHash: string | null,
  timeWindowMinutes: number = 5,
  recipientThreshold: number = 3
): Promise<{ isSuspicious: boolean; reason: string | null }> {
  if (!imageHash) return { isSuspicious: false, reason: null };

  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  // Check for same image sent to multiple recipients quickly
  const recentSameImage = await db.message.findMany({
    where: {
      senderId,
      imageHash,
      createdAt: { gte: timeWindow },
    },
    select: { recipientId: true },
    distinct: ["recipientId"],
  });

  if (recentSameImage.length >= recipientThreshold) {
    return { isSuspicious: true, reason: "image_spam" };
  }

  return { isSuspicious: false, reason: null };
}

// Strike management (90-day rolling decay)
export async function addStrike(db: any, userId: string, reason: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  await db.userStrike.create({
    data: { userId, reason, expiresAt },
  });
}

export async function getActiveStrikes(db: any, userId: string): Promise<number> {
  const now = new Date();
  const strikes = await db.userStrike.count({
    where: {
      userId,
      expiresAt: { gt: now },
    },
  });
  return strikes;
}

export { SENDER_TOOLTIP };
