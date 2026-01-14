import { Router, Request, Response } from "express";
import authRequired from "../middlewares/auth";
import { requireRoles } from "../middlewares/rbac";
import {
  createJobListing,
  listJobListings,
  getJobListingById,
  updateJobListing,
  deleteJobListing,
  incrementJobViews,
  createJobApplication,
  listJobApplications,
  updateJobApplicationStatus,
} from "../services/jobListingsService";

const router = Router();

// GET /api/jobs - List all active jobs (public)
router.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query.status ? String(req.query.status) : "active";
    const role = req.query.role ? String(req.query.role) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const filters: Parameters<typeof listJobListings>[0] = {
      status: status as "active" | "closed" | "filled",
      limit,
      offset,
    };
    if (role) {
      filters.role = role as "hauler" | "shipper";
    }

    const result = await listJobListings(filters);

    res.json({ items: result.items, total: result.total });
  } catch (err: any) {
    console.error("Error listing jobs:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load jobs" });
  }
});

// GET /api/jobs/mine - Get my posted jobs
router.get("/mine", authRequired, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const status = req.query.status ? String(req.query.status) : undefined;
    const filters: Parameters<typeof listJobListings>[0] = {
      postedByUserId: userId,
    };
    if (status) {
      filters.status = status as "active" | "closed" | "filled";
    }

    const result = await listJobListings(filters);

    res.json({ items: result.items, total: result.total });
  } catch (err: any) {
    console.error("Error listing my jobs:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load your jobs" });
  }
});

// GET /api/jobs/:id - Get job details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid job id" });
    }

    const job = await getJobListingById(id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Increment views
    await incrementJobViews(id);

    res.json({ job });
  } catch (err: any) {
    console.error("Error getting job:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load job" });
  }
});

// POST /api/jobs - Create job listing
router.post("/", authRequired, requireRoles(["hauler", "shipper"]), async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    const userRole = (req as any).user?.user_type;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const normalizedRole = userRole?.toLowerCase();
    if (normalizedRole !== "hauler" && normalizedRole !== "shipper") {
      return res.status(403).json({ error: "Only haulers and shippers can post jobs" });
    }

    const {
      title,
      description,
      required_skills,
      job_type,
      location_type,
      location,
      salary,
      salary_frequency,
      benefits_accommodation,
      benefits_food,
      benefits_fuel,
      benefits_vehicle,
      benefits_bonus,
      benefits_others,
      contact_person,
      contact_phone,
      preferred_call_time,
      contact_email,
      photos,
    } = req.body;

    if (!title || !description || !job_type || !location_type || !contact_person || !contact_phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const job = await createJobListing({
      userId,
      role: normalizedRole as "hauler" | "shipper",
      title,
      description,
      requiredSkills: required_skills ?? null,
      jobType: job_type,
      locationType: location_type,
      location: location ?? null,
      salary: salary ?? null,
      salaryFrequency: salary_frequency ?? null,
      benefitsAccommodation: Boolean(benefits_accommodation),
      benefitsFood: Boolean(benefits_food),
      benefitsFuel: Boolean(benefits_fuel),
      benefitsVehicle: Boolean(benefits_vehicle),
      benefitsBonus: Boolean(benefits_bonus),
      benefitsOthers: Boolean(benefits_others),
      contactPerson: contact_person,
      contactPhone: contact_phone,
      preferredCallTime: preferred_call_time ?? null,
      contactEmail: contact_email ?? null,
      photos: Array.isArray(photos) ? photos : [],
    });

    res.status(201).json({ job });
  } catch (err: any) {
    console.error("Error creating job:", err);
    res.status(400).json({ error: err?.message ?? "Failed to create job" });
  }
});

// PATCH /api/jobs/:id - Update job listing
router.patch("/:id", authRequired, requireRoles(["hauler", "shipper"]), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(id) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const {
      title,
      description,
      required_skills,
      job_type,
      location_type,
      location,
      salary,
      salary_frequency,
      benefits_accommodation,
      benefits_food,
      benefits_fuel,
      benefits_vehicle,
      benefits_bonus,
      benefits_others,
      contact_person,
      contact_phone,
      preferred_call_time,
      contact_email,
      photos,
      status,
    } = req.body;

    const updates: Parameters<typeof updateJobListing>[2] = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (required_skills !== undefined) updates.requiredSkills = required_skills;
    if (job_type !== undefined) updates.jobType = job_type;
    if (location_type !== undefined) updates.locationType = location_type;
    if (location !== undefined) updates.location = location;
    if (salary !== undefined) updates.salary = salary;
    if (salary_frequency !== undefined) updates.salaryFrequency = salary_frequency;
    if (benefits_accommodation !== undefined) updates.benefitsAccommodation = benefits_accommodation;
    if (benefits_food !== undefined) updates.benefitsFood = benefits_food;
    if (benefits_fuel !== undefined) updates.benefitsFuel = benefits_fuel;
    if (benefits_vehicle !== undefined) updates.benefitsVehicle = benefits_vehicle;
    if (benefits_bonus !== undefined) updates.benefitsBonus = benefits_bonus;
    if (benefits_others !== undefined) updates.benefitsOthers = benefits_others;
    if (contact_person !== undefined) updates.contactPerson = contact_person;
    if (contact_phone !== undefined) updates.contactPhone = contact_phone;
    if (preferred_call_time !== undefined) updates.preferredCallTime = preferred_call_time;
    if (contact_email !== undefined) updates.contactEmail = contact_email;
    if (photos !== undefined) {
      updates.photos = Array.isArray(photos) ? photos : [];
    }
    if (status !== undefined) {
      updates.status = status as "active" | "closed" | "filled";
    }

    const job = await updateJobListing(id, userId, updates);

    res.json({ job });
  } catch (err: any) {
    console.error("Error updating job:", err);
    const status = err?.message === "Forbidden" ? 403 : err?.message === "Job listing not found" ? 404 : 400;
    res.status(status).json({ error: err?.message ?? "Failed to update job" });
  }
});

// DELETE /api/jobs/:id - Delete job listing
router.delete("/:id", authRequired, requireRoles(["hauler", "shipper"]), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(id) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    await deleteJobListing(id, userId);
    res.status(204).send();
  } catch (err: any) {
    console.error("Error deleting job:", err);
    const status = err?.message === "Forbidden" ? 403 : err?.message === "Job listing not found" ? 404 : 400;
    res.status(status).json({ error: err?.message ?? "Failed to delete job" });
  }
});

// POST /api/jobs/:id/applications - Apply for job
router.post("/:id/applications", authRequired, async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(jobId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const { applicant_name, applicant_email, applicant_phone, resume_url, cover_letter } = req.body;

    if (!applicant_name || !applicant_email || !applicant_phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Normalize resume_url: convert empty string to null, trim whitespace
    const normalizedResumeUrl = resume_url && typeof resume_url === "string" && resume_url.trim() ? resume_url.trim() : null;

    console.log("Creating job application:", {
      jobId,
      applicantUserId: userId,
      applicantEmail: applicant_email,
      resumeUrl: normalizedResumeUrl ? `${normalizedResumeUrl.substring(0, 50)}...` : null,
    });

    const application = await createJobApplication({
      jobId,
      applicantUserId: userId,
      applicantName: applicant_name,
      applicantEmail: applicant_email,
      applicantPhone: applicant_phone,
      resumeUrl: normalizedResumeUrl,
      coverLetter: cover_letter ?? null,
    });

    res.status(201).json({ application });
  } catch (err: any) {
    console.error("Error creating application:", err);
    const status = err?.message === "Job listing not found" ? 404 : err?.message === "You have already applied" ? 409 : 400;
    res.status(status).json({ error: err?.message ?? "Failed to submit application" });
  }
});

// GET /api/jobs/:id/my-application - Get current user's application for a job
router.get("/:id/my-application", authRequired, async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(jobId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const applications = await listJobApplications({
      jobId,
      applicantUserId: userId,
    });

    if (applications.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json({ application: applications[0] });
  } catch (err: any) {
    console.error("Error getting my application:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load application" });
  }
});

// GET /api/jobs/:id/applications - Get applications for a job (job poster only)
router.get("/:id/applications", authRequired, async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.id);
    const userId = Number((req as any).user?.id);
    if (Number.isNaN(jobId) || !userId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const job = await getJobListingById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (Number(job.posted_by_user_id) !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const status = req.query.status ? String(req.query.status) : undefined;
    const filters: Parameters<typeof listJobApplications>[0] = {
      jobId,
    };
    if (status) {
      filters.status = status;
    }
    const applications = await listJobApplications(filters);

    res.json({ items: applications });
  } catch (err: any) {
    console.error("Error listing applications:", err);
    res.status(500).json({ error: err?.message ?? "Failed to load applications" });
  }
});

// PATCH /api/jobs/applications/:applicationId/status - Update application status
router.patch("/applications/:applicationId/status", authRequired, async (req: Request, res: Response) => {
  try {
    const applicationId = Number(req.params.applicationId);
    const userId = Number((req as any).user?.id);
    const { status, notes } = req.body;

    if (Number.isNaN(applicationId) || !userId || !status) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const validStatuses = ["pending", "reviewing", "accepted", "rejected", "withdrawn"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const application = await updateJobApplicationStatus(
      applicationId,
      userId,
      status as "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn",
      notes ?? null
    );

    res.json({ application });
  } catch (err: any) {
    console.error("Error updating application status:", err);
    const status = err?.message === "Forbidden" ? 403 : err?.message === "Application not found" ? 404 : 400;
    res.status(status).json({ error: err?.message ?? "Failed to update application" });
  }
});

export default router;
