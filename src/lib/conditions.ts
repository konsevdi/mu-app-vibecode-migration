/**
 * Centralized condition data for the Mobile Unit marketplace
 * Used across all screens that display device conditions
 */

export type ConditionKey = "new" | "like_new" | "good" | "fair" | "parts";

export interface ConditionData {
  key: ConditionKey;
  translationKey: string;
  descriptionKey: string;
  color: string;
  bgColor: string;
  priceRangePercent: { min: number; max: number };
}

/**
 * Condition definitions with styling and pricing info
 * Greek labels follow the tonality rule: UPPERCASE = no accents
 */
export const CONDITIONS: Record<ConditionKey, ConditionData> = {
  new: {
    key: "new",
    translationKey: "condition_new",
    descriptionKey: "condition_new_desc",
    color: "#00FF88", // Electric lime
    bgColor: "bg-emerald-500/20",
    priceRangePercent: { min: 85, max: 95 },
  },
  like_new: {
    key: "like_new",
    translationKey: "condition_like_new",
    descriptionKey: "condition_like_new_desc",
    color: "#00FFFF", // Cyan
    bgColor: "bg-cyan-500/20",
    priceRangePercent: { min: 75, max: 88 },
  },
  good: {
    key: "good",
    translationKey: "condition_good",
    descriptionKey: "condition_good_desc",
    color: "#FFD700", // Gold
    bgColor: "bg-yellow-500/20",
    priceRangePercent: { min: 60, max: 75 },
  },
  fair: {
    key: "fair",
    translationKey: "condition_fair",
    descriptionKey: "condition_fair_desc",
    color: "#FFA500", // Orange
    bgColor: "bg-orange-500/20",
    priceRangePercent: { min: 40, max: 60 },
  },
  parts: {
    key: "parts",
    translationKey: "condition_parts",
    descriptionKey: "condition_parts_desc",
    color: "#FF6B6B", // Soft red
    bgColor: "bg-red-500/20",
    priceRangePercent: { min: 10, max: 35 },
  },
};

/**
 * Get condition data by key
 */
export function getCondition(key: ConditionKey): ConditionData {
  return CONDITIONS[key];
}

/**
 * Get all conditions as an array (for dropdowns, filters, etc.)
 */
export function getAllConditions(): ConditionData[] {
  return Object.values(CONDITIONS);
}

/**
 * Calculate suggested price based on condition and original price
 */
export function calculateSuggestedPrice(
  originalPrice: number,
  condition: ConditionKey
): { min: number; max: number } {
  const { priceRangePercent } = CONDITIONS[condition];
  return {
    min: Math.round(originalPrice * (priceRangePercent.min / 100)),
    max: Math.round(originalPrice * (priceRangePercent.max / 100)),
  };
}

/**
 * Map legacy condition strings to ConditionKey
 */
export function normalizeConditionKey(condition: string): ConditionKey {
  const normalized = condition.toLowerCase().replace(/\s+/g, "_");
  const mapping: Record<string, ConditionKey> = {
    new: "new",
    καινουργιο: "new",
    like_new: "like_new",
    likenew: "like_new",
    σαν_καινουργιο: "like_new",
    good: "good",
    καλο: "good",
    fair: "fair",
    μετριο: "fair",
    parts: "parts",
    for_parts: "parts",
    ανταλλακτικα: "parts",
  };
  return mapping[normalized] ?? "good";
}
