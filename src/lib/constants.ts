// Pricing bands by condition (% of new price)
export const PRICING_BANDS = {
  new: { min: 85, max: 95 },
  like_new: { min: 75, max: 88 },
  good: { min: 60, max: 75 },
  fair: { min: 40, max: 60 },
  parts: { min: 10, max: 35 },
} as const;

// Grade multipliers (admin-configurable)
export const GRADE_MULTIPLIERS = {
  A: 1.00,
  B: 0.93,
  C: 0.85,
  D: 0.60,
} as const;

// Pandas pricing link
export const PANDAS_PRICING_URL = "https://pricing-v2.pandas.io/el-GR/irepair/smartphone";

// V1: Configurable label for white-label support
export const VERIFICATION_LABEL = "iRepair";
