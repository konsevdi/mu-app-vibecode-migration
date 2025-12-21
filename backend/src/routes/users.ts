import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import {
  updateUserOnboardingRequestSchema,
  type UpdateUserOnboardingResponse,
} from "@/shared/contracts";

export const usersRouter = new Hono<AppType>();

// PATCH /api/users/onboarding - Update user onboarding status
usersRouter.patch("/onboarding", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const parsed = updateUserOnboardingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
    }

    const data = parsed.data;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: data.onboardingCompleted,
        selectedCity: data.selectedCity,
        selectedCountry: data.selectedCountry,
        isEligibleCity: data.isEligibleCity,
        languagePref: data.languagePref,
      },
    });

    const response: UpdateUserOnboardingResponse = {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        onboardingCompleted: updatedUser.onboardingCompleted,
        selectedCity: updatedUser.selectedCity,
        selectedCountry: updatedUser.selectedCountry,
        isEligibleCity: updatedUser.isEligibleCity,
        languagePref: updatedUser.languagePref,
      },
    };

    console.log(`[Users] Updated onboarding for user ${user.id}: ${JSON.stringify(data)}`);

    return c.json(response);
  } catch (error) {
    console.error("[Users] Onboarding update error:", error);
    return c.json({ error: "Failed to update onboarding status" }, 500);
  }
});

// GET /api/users/me - Get current user info including onboarding status
usersRouter.get("/me", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      image: fullUser.image,
      onboardingCompleted: fullUser.onboardingCompleted,
      selectedCity: fullUser.selectedCity,
      selectedCountry: fullUser.selectedCountry,
      isEligibleCity: fullUser.isEligibleCity,
      languagePref: fullUser.languagePref,
      defaultCity: fullUser.defaultCity,
      trustEventCount: fullUser.trustEventCount,
    });
  } catch (error) {
    console.error("[Users] Get me error:", error);
    return c.json({ error: "Failed to get user info" }, 500);
  }
});
