import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import {
  createWaitlistSignupRequestSchema,
  type CreateWaitlistSignupResponse,
  type CheckWaitlistResponse,
  type ValidateReferralResponse,
} from "@/shared/contracts";

export const waitlistRouter = new Hono<AppType>();

// Generate a unique 8-character referral code
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 1, 0 to avoid confusion
  let code = "MU"; // Mobile Unit prefix
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Rate limiting map (in-memory, resets on server restart)
const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 3;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = signupAttempts.get(identifier);

  if (!record || now > record.resetAt) {
    signupAttempts.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count++;
  return true;
}

// POST /api/waitlist - Create waitlist signup
waitlistRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createWaitlistSignupRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
    }

    const data = parsed.data;

    // Rate limit by email
    if (!checkRateLimit(data.email)) {
      return c.json({ error: "Too many signup attempts. Please try again later." }, 429);
    }

    // Check if email already exists
    const existing = await db.waitlistSignup.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      // Return existing signup (no duplicate rows)
      const response: CreateWaitlistSignupResponse = {
        success: true,
        signup: {
          id: existing.id,
          email: existing.email,
          city: existing.city,
          country: existing.country,
          interestType: existing.interestType as "buyer" | "seller" | "both",
          referralCode: existing.referralCode,
          referredByCode: existing.referredByCode,
          referralCount: existing.referralCount,
          positionScore: existing.positionScore,
          languagePref: existing.languagePref as "el" | "en",
          createdAt: existing.createdAt.toISOString(),
        },
      };
      return c.json(response);
    }

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await db.waitlistSignup.findUnique({
        where: { referralCode },
      });
      if (!exists) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    // Handle referral credit
    let referredByCode = data.referredByCode?.trim() || null;

    if (referredByCode) {
      // Validate referral code exists
      const referrer = await db.waitlistSignup.findUnique({
        where: { referralCode: referredByCode },
      });

      if (!referrer) {
        referredByCode = null; // Invalid code, ignore
      } else if (referrer.email === data.email) {
        // Prevent self-referral
        referredByCode = null;
      } else {
        // Valid referral - credit the referrer
        await db.waitlistSignup.update({
          where: { id: referrer.id },
          data: {
            referralCount: { increment: 1 },
            positionScore: { increment: 3 },
          },
        });
      }
    }

    // Create signup
    const signup = await db.waitlistSignup.create({
      data: {
        email: data.email,
        city: data.city,
        country: data.country,
        interestType: data.interestType,
        consent: data.consent,
        phone: data.phone || null,
        socialHandle: data.socialHandle || null,
        notes: data.notes || null,
        languagePref: data.languagePref,
        referralCode,
        referredByCode,
      },
    });

    const response: CreateWaitlistSignupResponse = {
      success: true,
      signup: {
        id: signup.id,
        email: signup.email,
        city: signup.city,
        country: signup.country,
        interestType: signup.interestType as "buyer" | "seller" | "both",
        referralCode: signup.referralCode,
        referredByCode: signup.referredByCode,
        referralCount: signup.referralCount,
        positionScore: signup.positionScore,
        languagePref: signup.languagePref as "el" | "en",
        createdAt: signup.createdAt.toISOString(),
      },
    };

    console.log(`[Waitlist] New signup: ${signup.email} from ${signup.city}, ${signup.country}`);

    return c.json(response, 201);
  } catch (error) {
    console.error("[Waitlist] Signup error:", error);
    return c.json({ error: "Failed to create waitlist signup" }, 500);
  }
});

// GET /api/waitlist/check/:email - Check if email is already on waitlist
waitlistRouter.get("/check/:email", async (c) => {
  try {
    const email = decodeURIComponent(c.req.param("email"));

    const signup = await db.waitlistSignup.findUnique({
      where: { email },
    });

    if (!signup) {
      const response: CheckWaitlistResponse = { exists: false };
      return c.json(response);
    }

    const response: CheckWaitlistResponse = {
      exists: true,
      signup: {
        id: signup.id,
        email: signup.email,
        city: signup.city,
        country: signup.country,
        interestType: signup.interestType as "buyer" | "seller" | "both",
        referralCode: signup.referralCode,
        referredByCode: signup.referredByCode,
        referralCount: signup.referralCount,
        positionScore: signup.positionScore,
        languagePref: signup.languagePref as "el" | "en",
        createdAt: signup.createdAt.toISOString(),
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("[Waitlist] Check error:", error);
    return c.json({ error: "Failed to check waitlist status" }, 500);
  }
});

// GET /api/waitlist/referral/:code - Validate referral code
waitlistRouter.get("/referral/:code", async (c) => {
  try {
    const code = c.req.param("code").toUpperCase();

    const signup = await db.waitlistSignup.findUnique({
      where: { referralCode: code },
    });

    if (!signup) {
      const response: ValidateReferralResponse = { valid: false };
      return c.json(response);
    }

    // Mask email for privacy (show first 2 chars + domain)
    const [localPart, domain] = signup.email.split("@");
    const maskedLocal = localPart.slice(0, 2) + "***";
    const maskedEmail = `${maskedLocal}@${domain}`;

    const response: ValidateReferralResponse = {
      valid: true,
      referrerEmail: maskedEmail,
    };

    return c.json(response);
  } catch (error) {
    console.error("[Waitlist] Referral validation error:", error);
    return c.json({ error: "Failed to validate referral code" }, 500);
  }
});
