// contracts.ts
// Shared API contracts (schemas and types) used by both the server and the app.
// Import in the app as: `import { type GetSampleResponse } from "@shared/contracts"`
// Import in the server as: `import { postSampleRequestSchema } from "@shared/contracts"`

import { z } from "zod";

// ============================================
// Listing Types
// ============================================

export const categorySchema = z.enum(["phone", "tablet", "accessory"]);
export type Category = z.infer<typeof categorySchema>;

export const conditionSchema = z.enum(["new", "like_new", "good", "fair"]);
export type Condition = z.infer<typeof conditionSchema>;

export const citySchema = z.enum(["rhodes"]);
export type City = z.infer<typeof citySchema>;

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
  isActive: z.boolean(),
  isFeatured: z.boolean(),
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
  images: z.array(z.string()).min(1).max(5),
  location: z.string().optional(),
  city: citySchema,
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
