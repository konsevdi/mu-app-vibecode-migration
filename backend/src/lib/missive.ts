// Missive API integration for fraud alerts
// Only creates drafts for fraud>=80 holds and auto-actions

const MISSIVE_LABEL = "Mobile Unit Leads";

interface MissiveDraftPayload {
  entityType: string;
  entityId: string;
  fraudScore: number;
  reason: string;
  userEmail?: string;
  listingTitle?: string;
}

export async function createMissiveFraudDraft(
  payload: MissiveDraftPayload
): Promise<string | null> {
  const apiKey = process.env.MISSIVE_API_KEY;
  const orgId = process.env.MISSIVE_ORG_ID;

  if (!apiKey || !orgId) {
    console.log("[Missive] API key or org ID not configured, skipping draft");
    return null;
  }

  try {
    const subject = `🚨 Fraud Hold: ${payload.entityType} ${payload.entityId.slice(0, 8)}`;
    const body = `
Fraud Score: ${payload.fraudScore}/100
Entity Type: ${payload.entityType}
Entity ID: ${payload.entityId}
Reason: ${payload.reason}
${payload.userEmail ? `User Email: ${payload.userEmail}` : ""}
${payload.listingTitle ? `Listing: ${payload.listingTitle}` : ""}

Action Required: Super Admin approval needed to release hold.
Tokens and redemptions are blocked until cleared.
    `.trim();

    const response = await fetch("https://public.missiveapp.com/v1/drafts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        drafts: {
          subject,
          body,
          organization: orgId,
          add_shared_labels: [MISSIVE_LABEL],
        },
      }),
    });

    if (!response.ok) {
      console.error("[Missive] Failed to create draft:", response.status);
      return null;
    }

    const data = (await response.json()) as { drafts?: { id?: string } };
    return data.drafts?.id ?? null;
  } catch (error) {
    console.error("[Missive] Error creating draft:", error);
    return null;
  }
}

export { MISSIVE_LABEL };
