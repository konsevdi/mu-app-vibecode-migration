// Fraud scoring system

const FRAUD_THRESHOLD = 80;
const PRIVATE_REPORT_LIMIT = 2;
const STORE_REPORT_LIMIT = 5;
const RESTRICTED_COOLDOWN_DAYS = 7;

// Suggested price ranges by category/condition (example values)
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  "phone_new": { min: 200, max: 1500 },
  "phone_like_new": { min: 150, max: 1200 },
  "phone_good": { min: 100, max: 800 },
  "phone_fair": { min: 50, max: 400 },
  "tablet_new": { min: 150, max: 1200 },
  "tablet_like_new": { min: 100, max: 900 },
  "tablet_good": { min: 80, max: 600 },
  "tablet_fair": { min: 40, max: 300 },
  "accessory_new": { min: 5, max: 200 },
  "accessory_like_new": { min: 3, max: 150 },
  "accessory_good": { min: 2, max: 100 },
  "accessory_fair": { min: 1, max: 50 },
};

export interface FraudCheckResult {
  newScore: number;
  shouldHold: boolean;
  shouldAutoHide: boolean;
  reason: string | null;
  addStrike: boolean;
}

// Check if price is anomalously low (private listings only)
export function checkPricingAnomaly(
  price: number,
  category: string,
  condition: string,
  isStore: boolean
): { isSuspicious: boolean; scoreIncrease: number } {
  if (isStore) return { isSuspicious: false, scoreIncrease: 0 };

  const key = `${category}_${condition}`;
  const range = PRICE_RANGES[key];
  if (!range) return { isSuspicious: false, scoreIncrease: 0 };

  // If price is less than 30% of minimum, flag as suspicious
  if (price < range.min * 0.3) {
    return { isSuspicious: true, scoreIncrease: 25 };
  }
  // If price is less than 50% of minimum, mild flag
  if (price < range.min * 0.5) {
    return { isSuspicious: true, scoreIncrease: 15 };
  }
  return { isSuspicious: false, scoreIncrease: 0 };
}

// Check report thresholds for auto-hide
export function checkReportThreshold(
  reportCount24h: number,
  isStore: boolean
): boolean {
  const limit = isStore ? STORE_REPORT_LIMIT : PRIVATE_REPORT_LIMIT;
  return reportCount24h >= limit;
}

// Calculate new fraud score with bounds
export function calculateNewFraudScore(
  currentScore: number,
  increase: number
): number {
  return Math.min(100, Math.max(0, currentScore + increase));
}

// Main fraud check for listings
export async function performFraudCheck(
  db: any,
  listingId: string,
  price: number,
  category: string,
  condition: string,
  isStore: boolean,
  currentFraudScore: number,
  reportCount24h: number
): Promise<FraudCheckResult> {
  let scoreIncrease = 0;
  let reason: string | null = null;
  let addStrike = false;

  // Pricing anomaly check (private only)
  const priceCheck = checkPricingAnomaly(price, category, condition, isStore);
  if (priceCheck.isSuspicious) {
    scoreIncrease += priceCheck.scoreIncrease;
    reason = "pricing_anomaly";
    addStrike = priceCheck.scoreIncrease >= 20;
  }

  const newScore = calculateNewFraudScore(currentFraudScore, scoreIncrease);
  const shouldHold = newScore >= FRAUD_THRESHOLD;
  const shouldAutoHide = checkReportThreshold(reportCount24h, isStore);

  return { newScore, shouldHold, shouldAutoHide, reason, addStrike };
}

// Apply fraud hold to user
export async function applyFraudHold(
  db: any,
  userId: string,
  fraudScore: number,
  reason: string
): Promise<void> {
  const restrictedUntil = new Date(Date.now() + RESTRICTED_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  await db.user.update({
    where: { id: userId },
    data: {
      fraudScore,
      isHeld: true,
      restrictedMode: true,
      restrictedUntil,
      tokensDisabled: true,
    },
  });

  await db.fraudHold.create({
    data: {
      entityType: "user",
      entityId: userId,
      fraudScore,
      reason,
    },
  });
}

// Apply fraud hold to listing
export async function applyListingFraudHold(
  db: any,
  listingId: string,
  fraudScore: number,
  reason: string
): Promise<string> {
  await db.listing.update({
    where: { id: listingId },
    data: { fraudScore, isHeld: true, isActive: false },
  });

  const hold = await db.fraudHold.create({
    data: {
      entityType: "listing",
      entityId: listingId,
      fraudScore,
      reason,
    },
  });

  return hold.id;
}

export { FRAUD_THRESHOLD, RESTRICTED_COOLDOWN_DAYS };
