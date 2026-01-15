import { Router, Request, Response } from "express";
import authRequired from "../middlewares/auth";
import {
  getResourcesListings,
  getResourcesListingById,
  getMyResourcesListings,
  createResourcesListing,
  updateResourcesListing,
  deleteResourcesListing,
  getResourcesApplications,
  applyToResourcesListing,
  getMyResourcesApplication,
  updateResourcesApplicationStatus,
  type CreateResourcesListingPayload,
  type UpdateResourcesListingPayload,
  type ApplyResourcesPayload,
} from "../services/resourcesService";

const router = Router();

// GET /api/resources - Get all listings with filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.role) filters.role = req.query.role;
    if (req.query.resource_type) filters.resource_type = req.query.resource_type;
    if (req.query.city) filters.city = req.query.city as string;
    if (req.query.state) filters.state = req.query.state as string;
    if (req.query.limit) filters.limit = Number(req.query.limit);
    if (req.query.offset) filters.offset = Number(req.query.offset);

    const result = await getResourcesListings(filters);
    res.json(result);
  } catch (err: any) {
    console.error("Error getting listings:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load listings" });
  }
});

// GET /api/resources/my-listings - Get current user's listings
router.get("/my-listings", authRequired, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await getMyResourcesListings(userId);
    res.json(result);
  } catch (err: any) {
    console.error("Error getting my listings:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load listings" });
  }
});

// POST /api/resources - Create new listing
router.post("/", authRequired, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    const userRole = (req as any).user?.user_type;
    if (!userId || !userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload: CreateResourcesListingPayload = {
      resource_type: req.body.resource_type,
      title: req.body.title,
      description: req.body.description || null,
      contact_name: req.body.contact_name || null,
      contact_phone: req.body.contact_phone,
      contact_email: req.body.contact_email || null,
      city: req.body.city || null,
      state: req.body.state || null,
      zip_code: req.body.zip_code || null,
      photos: Array.isArray(req.body.photos) ? req.body.photos : [],
      type_specific_data: req.body.type_specific_data || {},
    };

    const listing = await createResourcesListing(userId, userRole, payload);
    res.status(201).json({ listing });
  } catch (err: any) {
    console.error("Error creating listing:", err);
    res.status(500).json({ error: err?.message ?? "Failed to create listing" });
  }
});

// PUT /api/resources/:id - Update listing
router.put("/:id", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const payload: UpdateResourcesListingPayload = {};
    if (req.body.resource_type !== undefined) payload.resource_type = req.body.resource_type;
    if (req.body.title !== undefined) payload.title = req.body.title;
    if (req.body.description !== undefined) payload.description = req.body.description || null;
    if (req.body.contact_name !== undefined) payload.contact_name = req.body.contact_name || null;
    if (req.body.contact_phone !== undefined) payload.contact_phone = req.body.contact_phone;
    if (req.body.contact_email !== undefined) payload.contact_email = req.body.contact_email || null;
    if (req.body.city !== undefined) payload.city = req.body.city || null;
    if (req.body.state !== undefined) payload.state = req.body.state || null;
    if (req.body.zip_code !== undefined) payload.zip_code = req.body.zip_code || null;
    if (req.body.photos !== undefined) payload.photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (req.body.type_specific_data !== undefined) payload.type_specific_data = req.body.type_specific_data || {};
    if (req.body.status !== undefined) payload.status = req.body.status;

    const listing = await updateResourcesListing(listingId, userId, payload);
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

// DELETE /api/resources/:id - Delete listing
router.delete("/:id", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    await deleteResourcesListing(listingId, userId);
    res.json({ message: "Listing deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting listing:", err);
    const status = err?.message === "Listing not found or access denied" ? 403 : 500;
    res.status(status).json({ error: err?.message ?? "Failed to delete listing" });
  }
});

// GET /api/resources/:id/my-application - Get current user's application for a listing (must come before /:id)
router.get("/:id/my-application", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const application = await getMyResourcesApplication(listingId, userId);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json({ application });
  } catch (err: any) {
    console.error("Error getting application:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load application" });
  }
});

// GET /api/resources/:id/applications - Get applications for a listing (must come before /:id)
router.get("/:id/applications", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const result = await getResourcesApplications(listingId, userId);
    res.json(result);
  } catch (err: any) {
    console.error("Error getting applications:", err);
    const status = err?.message === "Listing not found or access denied" ? 403 : 500;
    res.status(status).json({ error: err?.message ?? "Failed to load applications" });
  }
});

// POST /api/resources/:id/applications - Apply to a listing (must come before /:id)
router.post("/:id/applications", authRequired, async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(listingId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const payload: ApplyResourcesPayload = {
      applicant_name: req.body.applicant_name,
      applicant_email: req.body.applicant_email,
      applicant_phone: req.body.applicant_phone,
      message: req.body.message || null,
    };

    const application = await applyToResourcesListing(listingId, userId, payload);
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

// GET /api/resources/:id - Get specific listing (must come after more specific routes)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const listingId = Number(req.params.id);
    if (Number.isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const listing = await getResourcesListingById(listingId);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    res.json({ listing });
  } catch (err: any) {
    console.error("Error getting listing:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load listing" });
  }
});

// PUT /api/resources/applications/:id/status - Update application status
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

    const notes = req.body.notes || null;
    const application = await updateResourcesApplicationStatus(applicationId, userId, status, notes);
    res.json({ application });
  } catch (err: any) {
    console.error("Error updating application status:", err);
    const status = err?.message === "Application not found or access denied" ? 403 : 500;
    res.status(status).json({ error: err?.message ?? "Failed to update application" });
  }
});

export default router;
