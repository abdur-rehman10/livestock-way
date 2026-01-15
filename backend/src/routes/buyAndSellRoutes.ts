import { Router, Request, Response } from "express";
import authRequired from "../middlewares/auth";
import {
  getBuyAndSellListings,
  getBuyAndSellListingById,
  getMyBuyAndSellListings,
  createBuyAndSellListing,
  updateBuyAndSellListing,
  deleteBuyAndSellListing,
  getBuyAndSellApplications,
  applyToBuyAndSellListing,
  getMyBuyAndSellApplication,
  updateBuyAndSellApplicationStatus,
  type CreateBuyAndSellListingPayload,
  type UpdateBuyAndSellListingPayload,
  type ApplyBuyAndSellPayload,
} from "../services/buyAndSellService";

const router = Router();

// GET /api/buy-and-sell - Get all listings with filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.role) filters.role = req.query.role;
    if (req.query.listing_type) filters.listing_type = req.query.listing_type;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.city) filters.city = req.query.city as string;
    if (req.query.state) filters.state = req.query.state as string;
    if (req.query.limit) filters.limit = Number(req.query.limit);
    if (req.query.offset) filters.offset = Number(req.query.offset);

    const result = await getBuyAndSellListings(filters);
    res.json(result);
  } catch (err: any) {
    console.error("Error getting listings:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load listings" });
  }
});

// GET /api/buy-and-sell/my-listings - Get current user's listings
router.get("/my-listings", authRequired, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await getMyBuyAndSellListings(userId);
    res.json(result);
  } catch (err: any) {
    console.error("Error getting my listings:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load listings" });
  }
});

// POST /api/buy-and-sell - Create new listing
router.post("/", authRequired, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    const userRole = (req as any).user?.user_type;
    if (!userId || !userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload: CreateBuyAndSellListingPayload = {
      listing_type: req.body.listing_type,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      price: req.body.price ? Number(req.body.price) : null,
      price_type: req.body.price_type || null,
      payment_terms: req.body.payment_terms || null,
      city: req.body.city,
      state: req.body.state,
      zip_code: req.body.zip_code || null,
      contact_name: req.body.contact_name,
      contact_phone: req.body.contact_phone,
      contact_email: req.body.contact_email || null,
      photos: Array.isArray(req.body.photos) ? req.body.photos : [],
    };

    const listing = await createBuyAndSellListing(userId, userRole, payload);
    res.status(201).json({ listing });
  } catch (err: any) {
    console.error("Error creating listing:", err);
    res.status(500).json({ error: err?.message ?? "Failed to create listing" });
  }
});

// PUT /api/buy-and-sell/:id - Update listing
router.put("/:id", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const payload: UpdateBuyAndSellListingPayload = {};
    if (req.body.listing_type !== undefined) payload.listing_type = req.body.listing_type;
    if (req.body.category !== undefined) payload.category = req.body.category;
    if (req.body.title !== undefined) payload.title = req.body.title;
    if (req.body.description !== undefined) payload.description = req.body.description;
    if (req.body.price !== undefined) payload.price = req.body.price ? Number(req.body.price) : null;
    if (req.body.price_type !== undefined) payload.price_type = req.body.price_type || null;
    if (req.body.payment_terms !== undefined) payload.payment_terms = req.body.payment_terms || null;
    if (req.body.city !== undefined) payload.city = req.body.city;
    if (req.body.state !== undefined) payload.state = req.body.state;
    if (req.body.zip_code !== undefined) payload.zip_code = req.body.zip_code || null;
    if (req.body.contact_name !== undefined) payload.contact_name = req.body.contact_name;
    if (req.body.contact_phone !== undefined) payload.contact_phone = req.body.contact_phone;
    if (req.body.contact_email !== undefined) payload.contact_email = req.body.contact_email || null;
    if (req.body.photos !== undefined) payload.photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (req.body.status !== undefined) payload.status = req.body.status;

    const listing = await updateBuyAndSellListing(listingId, userId, payload);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    res.json({ listing });
  } catch (err: any) {
    console.error("Error updating listing:", err);
    const status = err?.message === "Listing not found or access denied" ? 403 : 500;
    res.status(status).json({ error: err?.message ?? "Failed to update listing" });
  }
});

// DELETE /api/buy-and-sell/:id - Delete listing
router.delete("/:id", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    await deleteBuyAndSellListing(listingId, userId);
    res.json({ message: "Listing deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting listing:", err);
    const status = err?.message === "Listing not found or access denied" ? 403 : 500;
    res.status(status).json({ error: err?.message ?? "Failed to delete listing" });
  }
});

// GET /api/buy-and-sell/:id/my-application - Get current user's application for a listing (must come before /:id)
router.get("/:id/my-application", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const application = await getMyBuyAndSellApplication(listingId, userId);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json({ application });
  } catch (err: any) {
    console.error("Error getting application:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load application" });
  }
});

// GET /api/buy-and-sell/:id/applications - Get applications for a listing (must come before /:id)
router.get("/:id/applications", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const result = await getBuyAndSellApplications(listingId, userId);
    res.json(result);
  } catch (err: any) {
    console.error("Error getting applications:", err);
    const status = err?.message === "Listing not found or access denied" ? 403 : 500;
    res.status(status).json({ error: err?.message ?? "Failed to load applications" });
  }
});

// POST /api/buy-and-sell/:id/applications - Apply to a listing (must come before /:id)
router.post("/:id/applications", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const payload: ApplyBuyAndSellPayload = {
      applicant_name: req.body.applicant_name,
      applicant_email: req.body.applicant_email,
      applicant_phone: req.body.applicant_phone,
      offered_price: req.body.offered_price ? Number(req.body.offered_price) : null,
      message: req.body.message || null,
    };

    const application = await applyToBuyAndSellListing(listingId, userId, payload);
    res.status(201).json({ application });
  } catch (err: any) {
    console.error("Error applying to listing:", err);
    const status =
      err?.message === "Listing not found or not available" ||
      err?.message === "Cannot apply to your own listing" ||
      err?.message === "You have already applied to this listing"
        ? 400
        : 500;
    res.status(status).json({ error: err?.message ?? "Failed to submit application" });
  }
});

// GET /api/buy-and-sell/:id - Get specific listing (must come after more specific routes)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    if (Number.isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const listing = await getBuyAndSellListingById(listingId);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    res.json({ listing });
  } catch (err: any) {
    console.error("Error getting listing:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load listing" });
  }
});

// PUT /api/buy-and-sell/applications/:id/status - Update application status
router.put("/applications/:id/status", authRequired, async (req: Request, res: Response) => {
  try {
    const applicationId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    const status = req.body.status;
    if (Number.isNaN(applicationId) || !userId || !status) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (!["pending", "reviewing", "accepted", "rejected", "withdrawn"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const application = await updateBuyAndSellApplicationStatus(applicationId, userId, status);
    res.json({ application });
  } catch (err: any) {
    console.error("Error updating application status:", err);
    const status = err?.message === "Application not found or access denied" ? 403 : 500;
    res.status(status).json({ error: err?.message ?? "Failed to update application" });
  }
});

export default router;
