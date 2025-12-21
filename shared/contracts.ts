// contracts.ts
// Shared API contracts (schemas and types) used by both the server and the app.
// Import in the app as: `import { type GetSampleResponse } from "@shared/contracts"`
// Import in the server as: `import { postSampleRequestSchema } from "@shared/contracts"`

import { z } from "zod";

// ============================================
// Listing Types
// ============================================

export const categorySchema = z.enum(["phone", "tablet", "laptop", "accessory"]);
export type Category = z.infer<typeof categorySchema>;

export const conditionSchema = z.enum(["new", "like_new", "good", "fair", "parts"]);
export type Condition = z.infer<typeof conditionSchema>;

export const citySchema = z.enum(["rhodes"]);
export type City = z.infer<typeof citySchema>;

export const gradeSchema = z.enum(["A", "B", "C", "D"]);
export type Grade = z.infer<typeof gradeSchema>;

// V1: Configurable label for white-label support
export const VERIFICATION_LABEL = "iRepair";

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

// Listing approval status
export const listingStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const listingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  category: categorySchema,
  condition: conditionSchema,
  brand: z.string().nullable(),
  model: z.string().nullable(),
  images: z.array(z.string()),
  location: z.string().nullable(),
  city: citySchema,
  // Inspection verification
  grade: gradeSchema.nullable(),
  checklistComplete: z.boolean(),
  inspectionDate: z.string().nullable(),
  // Approval workflow
  status: listingStatusSchema.default("pending"),
  // V1: All private listings are PICKUP ONLY (shipping disabled)
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isStore: z.boolean().default(false), // "Sold by iRepair" listings
  views: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sellerId: z.string(),
  seller: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
    defaultCity: z.string().nullable(),
    trustEventCount: z.number(),
  }).optional(),
});
export type Listing = z.infer<typeof listingSchema>;

// GET /api/listings
export const getListingsQuerySchema = z.object({
  category: categorySchema.optional(),
  condition: conditionSchema.optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  featured: z.coerce.boolean().optional(),
  verifiedOnly: z.coerce.boolean().optional(), // Filter for verified listings only
  sellerId: z.string().optional(),
  limit: z.coerce.number().default(20),
  offset: z.coerce.number().default(0),
});
export type GetListingsQuery = z.infer<typeof getListingsQuerySchema>;

export const getListingsResponseSchema = z.object({
  listings: z.array(listingSchema),
  total: z.number(),
});
export type GetListingsResponse = z.infer<typeof getListingsResponseSchema>;

// GET /api/listings/:id
export const getListingResponseSchema = listingSchema;
export type GetListingResponse = z.infer<typeof getListingResponseSchema>;

// POST /api/listings
export const createListingRequestSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  price: z.number().min(0),
  category: categorySchema,
  condition: conditionSchema,
  brand: z.string().optional(),
  model: z.string().optional(),
  images: z.array(z.string()).min(3).max(10), // Min 3 photos required
  location: z.string().optional(),
  city: citySchema,
  // V1: Private listings are PICKUP ONLY. Shipping disabled until V2.
  // shippingEnabled: z.boolean().optional(), // V2: Uncomment for shipping support
});
export type CreateListingRequest = z.infer<typeof createListingRequestSchema>;

export const createListingResponseSchema = listingSchema;
export type CreateListingResponse = z.infer<typeof createListingResponseSchema>;

// PUT /api/listings/:id
export const updateListingRequestSchema = createListingRequestSchema.partial();
export type UpdateListingRequest = z.infer<typeof updateListingRequestSchema>;

export const updateListingResponseSchema = listingSchema;
export type UpdateListingResponse = z.infer<typeof updateListingResponseSchema>;

// DELETE /api/listings/:id
export const deleteListingResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteListingResponse = z.infer<typeof deleteListingResponseSchema>;

// ============================================
// Sample Types (existing)
// ============================================

// GET /api/sample
export const getSampleResponseSchema = z.object({
  message: z.string(),
});
export type GetSampleResponse = z.infer<typeof getSampleResponseSchema>;

// POST /api/sample
export const postSampleRequestSchema = z.object({
  value: z.string(),
});
export type PostSampleRequest = z.infer<typeof postSampleRequestSchema>;
export const postSampleResponseSchema = z.object({
  message: z.string(),
});
export type PostSampleResponse = z.infer<typeof postSampleResponseSchema>;

// POST /api/upload/image
export const uploadImageRequestSchema = z.object({
  image: z.instanceof(File),
});
export type UploadImageRequest = z.infer<typeof uploadImageRequestSchema>;
export const uploadImageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  url: z.string(),
  filename: z.string(),
});
export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>;

// ============================================
// Chat/Message Types
// ============================================

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  recipientId: z.string(),
  content: z.string(),
  imageUrl: z.string().nullable(),
  isHidden: z.boolean(),
  flaggedReason: z.string().nullable(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof messageSchema>;

// POST /api/messages
export const sendMessageRequestSchema = z.object({
  recipientId: z.string(),
  content: z.string().min(1).max(2000),
  imageUrl: z.string().optional(),
  imageHash: z.string().optional(),
  listingId: z.string().optional(), // For context
});
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

export const sendMessageResponseSchema = z.object({
  message: messageSchema,
  showSenderTooltip: z.boolean(),
  senderTooltip: z.string().optional(),
});
export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>;

// GET /api/messages/:conversationId
export const getMessagesResponseSchema = z.object({
  messages: z.array(messageSchema),
});
export type GetMessagesResponse = z.infer<typeof getMessagesResponseSchema>;

// POST /api/messages/report
export const reportMessageRequestSchema = z.object({
  messageId: z.string(),
  reason: z.string().min(1).max(500),
});
export type ReportMessageRequest = z.infer<typeof reportMessageRequestSchema>;

export const reportMessageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ReportMessageResponse = z.infer<typeof reportMessageResponseSchema>;

// ============================================
// Waitlist Types
// ============================================

export const interestTypeSchema = z.enum(["buyer", "seller", "both"]);
export type InterestType = z.infer<typeof interestTypeSchema>;

export const languageSchema = z.enum(["el", "en"]);
export type Language = z.infer<typeof languageSchema>;

// POST /api/waitlist
export const createWaitlistSignupRequestSchema = z.object({
  email: z.string().email(),
  city: z.string().min(1),
  country: z.string().min(1),
  interestType: interestTypeSchema,
  consent: z.boolean().refine((val) => val === true, {
    message: "Consent is required",
  }),
  phone: z.string().optional(),
  socialHandle: z.string().optional(),
  notes: z.string().max(500).optional(),
  languagePref: languageSchema.default("el"),
  referredByCode: z.string().optional(),
});
export type CreateWaitlistSignupRequest = z.infer<typeof createWaitlistSignupRequestSchema>;

export const waitlistSignupSchema = z.object({
  id: z.string(),
  email: z.string(),
  city: z.string(),
  country: z.string(),
  interestType: interestTypeSchema,
  referralCode: z.string(),
  referredByCode: z.string().nullable(),
  referralCount: z.number(),
  positionScore: z.number(),
  languagePref: languageSchema,
  createdAt: z.string(),
});
export type WaitlistSignup = z.infer<typeof waitlistSignupSchema>;

export const createWaitlistSignupResponseSchema = z.object({
  success: z.boolean(),
  signup: waitlistSignupSchema,
});
export type CreateWaitlistSignupResponse = z.infer<typeof createWaitlistSignupResponseSchema>;

// GET /api/waitlist/check/:email
export const checkWaitlistResponseSchema = z.object({
  exists: z.boolean(),
  signup: waitlistSignupSchema.optional(),
});
export type CheckWaitlistResponse = z.infer<typeof checkWaitlistResponseSchema>;

// GET /api/waitlist/referral/:code
export const validateReferralResponseSchema = z.object({
  valid: z.boolean(),
  referrerEmail: z.string().optional(),
});
export type ValidateReferralResponse = z.infer<typeof validateReferralResponseSchema>;

// ============================================
// User/Profile Types
// ============================================

export const updateUserOnboardingRequestSchema = z.object({
  onboardingCompleted: z.boolean().optional(),
  selectedCity: z.string().optional(),
  selectedCountry: z.string().optional(),
  isEligibleCity: z.boolean().optional(),
  languagePref: languageSchema.optional(),
});
export type UpdateUserOnboardingRequest = z.infer<typeof updateUserOnboardingRequestSchema>;

export const updateUserOnboardingResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    onboardingCompleted: z.boolean(),
    selectedCity: z.string().nullable(),
    selectedCountry: z.string().nullable(),
    isEligibleCity: z.boolean(),
    languagePref: z.string(),
  }),
});
export type UpdateUserOnboardingResponse = z.infer<typeof updateUserOnboardingResponseSchema>;
