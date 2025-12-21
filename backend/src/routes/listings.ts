import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import {
  createListingRequestSchema,
  updateListingRequestSchema,
  getListingsQuerySchema,
} from "@/shared/contracts";

const listingsRouter = new Hono<AppType>();

// Helper to transform DB listing to API response
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformListing = (listing: any) => ({
  ...listing,
  images: JSON.parse(listing.images) as string[],
  createdAt: listing.createdAt.toISOString(),
  updatedAt: listing.updatedAt.toISOString(),
  inspectionDate: listing.inspectionDate?.toISOString() ?? null,
});

// GET /api/listings - Get all listings with filters
listingsRouter.get("/", async (c) => {
  try {
    const query = getListingsQuerySchema.parse(c.req.query());
    const { category, condition, search, minPrice, maxPrice, featured, sellerId, limit, offset } = query;

    const where: Record<string, unknown> = { isActive: true };

    if (category) where.category = category;
    if (condition) where.condition = condition;
    if (featured) where.isFeatured = true;
    if (sellerId) where.sellerId = sellerId;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) (where.price as Record<string, number>).gte = minPrice;
      if (maxPrice !== undefined) (where.price as Record<string, number>).lte = maxPrice;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const [listings, total] = await Promise.all([
      db.listing.findMany({
        where,
        include: {
          seller: {
            select: { id: true, name: true, email: true, image: true, defaultCity: true, trustEventCount: true },
          },
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      db.listing.count({ where }),
    ]);

    return c.json({
      listings: listings.map(transformListing),
      total,
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    return c.json({ error: "Failed to fetch listings" }, 500);
  }
});

// GET /api/listings/:id - Get single listing
listingsRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true, name: true, email: true, image: true, defaultCity: true, trustEventCount: true },
        },
      },
    });

    if (!listing) {
      return c.json({ error: "Listing not found" }, 404);
    }

    // Increment view count
    await db.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return c.json(transformListing(listing));
  } catch (error) {
    console.error("Error fetching listing:", error);
    return c.json({ error: "Failed to fetch listing" }, 500);
  }
});

// POST /api/listings - Create new listing (requires auth)
listingsRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const data = createListingRequestSchema.parse(body);

    const listing = await db.listing.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        condition: data.condition,
        brand: data.brand ?? null,
        model: data.model ?? null,
        images: JSON.stringify(data.images),
        location: data.location ?? null,
        city: data.city,
        sellerId: user.id,
      },
      include: {
        seller: {
          select: { id: true, name: true, email: true, image: true, defaultCity: true, trustEventCount: true },
        },
      },
    });

    return c.json(transformListing(listing), 201);
  } catch (error) {
    console.error("Error creating listing:", error);
    return c.json({ error: "Failed to create listing" }, 500);
  }
});

// PUT /api/listings/:id - Update listing (requires auth + ownership)
listingsRouter.put("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const data = updateListingRequestSchema.parse(body);

    // Check ownership
    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: "Listing not found" }, 404);
    }
    if (existing.sellerId !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.condition !== undefined) updateData.condition = data.condition;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.images !== undefined) updateData.images = JSON.stringify(data.images);
    if (data.location !== undefined) updateData.location = data.location;
    if (data.city !== undefined) updateData.city = data.city;

    const listing = await db.listing.update({
      where: { id },
      data: updateData,
      include: {
        seller: {
          select: { id: true, name: true, email: true, image: true, defaultCity: true, trustEventCount: true },
        },
      },
    });

    return c.json(transformListing(listing));
  } catch (error) {
    console.error("Error updating listing:", error);
    return c.json({ error: "Failed to update listing" }, 500);
  }
});

// DELETE /api/listings/:id - Delete listing (requires auth + ownership)
listingsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const id = c.req.param("id");

    // Check ownership
    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ error: "Listing not found" }, 404);
    }
    if (existing.sellerId !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await db.listing.delete({ where: { id } });

    return c.json({ success: true, message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Error deleting listing:", error);
    return c.json({ error: "Failed to delete listing" }, 500);
  }
});

export { listingsRouter };
