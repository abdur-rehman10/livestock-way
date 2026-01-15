import { pool } from "../config/database";
import { ensureHaulerProfile, ensureShipperProfile, ensureStakeholderProfile } from "../utils/profileHelpers";

export interface JobListing {
  id: number;
  posted_by_user_id: number;
  posted_by_role: "hauler" | "shipper" | "stakeholder";
  hauler_id: number | null;
  shipper_id: number | null;
  stakeholder_id: number | null;
  title: string;
  description: string;
  required_skills: string | null;
  job_type: "full-time" | "part-time" | "temporary" | "freelance";
  location_type: "remote" | "on-site" | "mobile";
  location: string | null;
  salary: string | null;
  salary_frequency: "hourly" | "weekly" | "monthly" | "yearly" | "project" | null;
  benefits_accommodation: boolean;
  benefits_food: boolean;
  benefits_fuel: boolean;
  benefits_vehicle: boolean;
  benefits_bonus: boolean;
  benefits_others: boolean;
  contact_person: string;
  contact_phone: string;
  preferred_call_time: string | null;
  contact_email: string | null;
  photos: string[];
  status: "active" | "closed" | "filled";
  views: number;
  application_count: number;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: number;
  job_id: number;
  applicant_user_id: number;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  resume_url: string | null;
  cover_letter: string | null;
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn";
  reviewed_at: string | null;
  reviewed_by_user_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapJobListingRow(row: any): JobListing {
  return {
    id: Number(row.id),
    posted_by_user_id: Number(row.posted_by_user_id),
    posted_by_role: row.posted_by_role,
    hauler_id: row.hauler_id ? Number(row.hauler_id) : null,
    shipper_id: row.shipper_id ? Number(row.shipper_id) : null,
    stakeholder_id: row.stakeholder_id ? Number(row.stakeholder_id) : null,
    title: row.title,
    description: row.description,
    required_skills: row.required_skills,
    job_type: row.job_type,
    location_type: row.location_type,
    location: row.location,
    salary: row.salary,
    salary_frequency: row.salary_frequency,
    benefits_accommodation: Boolean(row.benefits_accommodation),
    benefits_food: Boolean(row.benefits_food),
    benefits_fuel: Boolean(row.benefits_fuel),
    benefits_vehicle: Boolean(row.benefits_vehicle),
    benefits_bonus: Boolean(row.benefits_bonus),
    benefits_others: Boolean(row.benefits_others),
    contact_person: row.contact_person,
    contact_phone: row.contact_phone,
    preferred_call_time: row.preferred_call_time,
    contact_email: row.contact_email,
    photos: Array.isArray(row.photos) ? row.photos : [],
    status: row.status,
    views: Number(row.views ?? 0),
    application_count: Number(row.application_count ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapJobApplicationRow(row: any): JobApplication {
  return {
    id: Number(row.id),
    job_id: Number(row.job_id),
    applicant_user_id: Number(row.applicant_user_id),
    applicant_name: row.applicant_name,
    applicant_email: row.applicant_email,
    applicant_phone: row.applicant_phone,
    resume_url: row.resume_url,
    cover_letter: row.cover_letter,
    status: row.status,
    reviewed_at: row.reviewed_at,
    reviewed_by_user_id: row.reviewed_by_user_id ? Number(row.reviewed_by_user_id) : null,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createJobListing(input: {
  userId: number;
  role: "hauler" | "shipper";
  title: string;
  description: string;
  requiredSkills?: string | null;
  jobType: string;
  locationType: string;
  location?: string | null;
  salary?: string | null;
  salaryFrequency?: string | null;
  benefitsAccommodation?: boolean;
  benefitsFood?: boolean;
  benefitsFuel?: boolean;
  benefitsVehicle?: boolean;
  benefitsBonus?: boolean;
  benefitsOthers?: boolean;
  contactPerson: string;
  contactPhone: string;
  preferredCallTime?: string | null;
  contactEmail?: string | null;
  photos?: string[];
}): Promise<JobListing> {
  let haulerId: number | null = null;
  let shipperId: number | null = null;
  let stakeholderId: number | null = null;

  if (input.role === "hauler") {
    haulerId = await ensureHaulerProfile(input.userId);
  } else if (input.role === "shipper") {
    shipperId = await ensureShipperProfile(input.userId);
  } else if (input.role === "stakeholder") {
    stakeholderId = await ensureStakeholderProfile(input.userId);
  }

  const result = await pool.query(
    `
    INSERT INTO job_listings (
      posted_by_user_id, posted_by_role, hauler_id, shipper_id, stakeholder_id,
      title, description, required_skills, job_type, location_type, location,
      salary, salary_frequency,
      benefits_accommodation, benefits_food, benefits_fuel, benefits_vehicle, benefits_bonus, benefits_others,
      contact_person, contact_phone, preferred_call_time, contact_email, photos,
      status, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'active', NOW(), NOW())
    RETURNING *
    `,
    [
      input.userId,
      input.role,
      haulerId,
      shipperId,
      stakeholderId,
      input.title,
      input.description,
      input.requiredSkills ?? null,
      input.jobType,
      input.locationType,
      input.location ?? null,
      input.salary ?? null,
      input.salaryFrequency ?? null,
      input.benefitsAccommodation ?? false,
      input.benefitsFood ?? false,
      input.benefitsFuel ?? false,
      input.benefitsVehicle ?? false,
      input.benefitsBonus ?? false,
      input.benefitsOthers ?? false,
      input.contactPerson,
      input.contactPhone,
      input.preferredCallTime ?? null,
      input.contactEmail ?? null,
      input.photos ?? [],
    ]
  );

  return mapJobListingRow(result.rows[0]);
}

export async function listJobListings(filters?: {
  role?: "hauler" | "shipper" | "stakeholder";
  status?: "active" | "closed" | "filled";
  postedByUserId?: number;
  limit?: number;
  offset?: number;
}): Promise<{ items: JobListing[]; total: number }> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.role) {
    conditions.push(`posted_by_role = $${paramIndex}`);
    params.push(filters.role);
    paramIndex++;
  }

  if (filters?.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.postedByUserId) {
    conditions.push(`posted_by_user_id = $${paramIndex}`);
    params.push(filters.postedByUserId);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM job_listings ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0]?.total ?? 0);

  const result = await pool.query(
    `
    SELECT *
    FROM job_listings
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
    [...params, limit, offset]
  );

  return {
    items: result.rows.map(mapJobListingRow),
    total,
  };
}

export async function getJobListingById(id: number): Promise<JobListing | null> {
  const result = await pool.query("SELECT * FROM job_listings WHERE id = $1", [id]);
  if ((result.rowCount ?? 0) === 0) return null;
  return mapJobListingRow(result.rows[0]);
}

export async function updateJobListing(
  id: number,
  userId: number,
  updates: {
    title?: string;
    description?: string;
    requiredSkills?: string | null;
    jobType?: string;
    locationType?: string;
    location?: string | null;
    salary?: string | null;
    salaryFrequency?: string | null;
    benefitsAccommodation?: boolean;
    benefitsFood?: boolean;
    benefitsFuel?: boolean;
    benefitsVehicle?: boolean;
    benefitsBonus?: boolean;
    benefitsOthers?: boolean;
    contactPerson?: string;
    contactPhone?: string;
    preferredCallTime?: string | null;
    contactEmail?: string | null;
    photos?: string[];
    status?: "active" | "closed" | "filled";
  }
): Promise<JobListing> {
  const existing = await pool.query("SELECT posted_by_user_id FROM job_listings WHERE id = $1", [id]);
  if ((existing.rowCount ?? 0) === 0) {
    throw new Error("Job listing not found");
  }
  if (Number(existing.rows[0]?.posted_by_user_id) !== userId) {
    throw new Error("Forbidden");
  }

  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const updateFields: Record<string, any> = {
    title: updates.title,
    description: updates.description,
    required_skills: updates.requiredSkills,
    job_type: updates.jobType,
    location_type: updates.locationType,
    location: updates.location,
    salary: updates.salary,
    salary_frequency: updates.salaryFrequency,
    benefits_accommodation: updates.benefitsAccommodation,
    benefits_food: updates.benefitsFood,
    benefits_fuel: updates.benefitsFuel,
    benefits_vehicle: updates.benefitsVehicle,
    benefits_bonus: updates.benefitsBonus,
    benefits_others: updates.benefitsOthers,
    contact_person: updates.contactPerson,
    contact_phone: updates.contactPhone,
    preferred_call_time: updates.preferredCallTime,
    contact_email: updates.contactEmail,
    photos: updates.photos,
    status: updates.status,
  };

  for (const [key, value] of Object.entries(updateFields)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    throw new Error("No fields to update");
  }

  setClauses.push(`updated_at = NOW()`);
  params.push(id);

  const result = await pool.query(
    `UPDATE job_listings SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  return mapJobListingRow(result.rows[0]);
}

export async function deleteJobListing(id: number, userId: number): Promise<void> {
  const existing = await pool.query("SELECT posted_by_user_id FROM job_listings WHERE id = $1", [id]);
  if ((existing.rowCount ?? 0) === 0) {
    throw new Error("Job listing not found");
  }
  if (Number(existing.rows[0]?.posted_by_user_id) !== userId) {
    throw new Error("Forbidden");
  }

  await pool.query("DELETE FROM job_listings WHERE id = $1", [id]);
}

export async function incrementJobViews(id: number): Promise<void> {
  await pool.query("UPDATE job_listings SET views = views + 1 WHERE id = $1", [id]);
}

export async function createJobApplication(input: {
  jobId: number;
  applicantUserId: number;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  resumeUrl?: string | null;
  coverLetter?: string | null;
}): Promise<JobApplication> {
  // Check if job exists and is active
  const job = await getJobListingById(input.jobId);
  if (!job) {
    throw new Error("Job listing not found");
  }
  if (job.status !== "active") {
    throw new Error("Job listing is not accepting applications");
  }

  // Check if user already applied
  const existing = await pool.query(
    "SELECT id FROM job_applications WHERE job_id = $1 AND applicant_user_id = $2",
    [input.jobId, input.applicantUserId]
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw new Error("You have already applied for this job");
  }

  // Ensure resumeUrl is either a valid string or null
  const resumeUrl = input.resumeUrl && typeof input.resumeUrl === "string" && input.resumeUrl.trim() ? input.resumeUrl.trim() : null;

  console.log("Inserting job application into database:", {
    jobId: input.jobId,
    applicantUserId: input.applicantUserId,
    resumeUrl: resumeUrl ? `${resumeUrl.substring(0, 50)}...` : null,
  });

  const result = await pool.query(
    `
    INSERT INTO job_applications (
      job_id, applicant_user_id, applicant_name, applicant_email, applicant_phone,
      resume_url, cover_letter, status, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
    RETURNING *
    `,
    [
      input.jobId,
      input.applicantUserId,
      input.applicantName,
      input.applicantEmail,
      input.applicantPhone,
      resumeUrl,
      input.coverLetter ?? null,
    ]
  );

  const savedApplication = mapJobApplicationRow(result.rows[0]);
  console.log("Job application saved successfully:", {
    id: savedApplication.id,
    resumeUrl: savedApplication.resume_url ? `${savedApplication.resume_url.substring(0, 50)}...` : null,
  });

  return savedApplication;
}

export async function listJobApplications(filters: {
  jobId?: number;
  applicantUserId?: number;
  status?: string;
}): Promise<JobApplication[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.jobId) {
    conditions.push(`job_id = $${paramIndex}`);
    params.push(filters.jobId);
    paramIndex++;
  }

  if (filters.applicantUserId) {
    conditions.push(`applicant_user_id = $${paramIndex}`);
    params.push(filters.applicantUserId);
    paramIndex++;
  }

  if (filters.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT * FROM job_applications ${whereClause} ORDER BY created_at DESC`,
    params
  );

  return result.rows.map(mapJobApplicationRow);
}

export async function getJobApplicationById(id: number): Promise<JobApplication | null> {
  const result = await pool.query("SELECT * FROM job_applications WHERE id = $1", [id]);
  if ((result.rowCount ?? 0) === 0) return null;
  return mapJobApplicationRow(result.rows[0]);
}

export async function updateJobApplicationStatus(
  id: number,
  reviewerUserId: number,
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn",
  notes?: string | null
): Promise<JobApplication> {
  const application = await getJobApplicationById(id);
  if (!application) {
    throw new Error("Application not found");
  }

  const job = await getJobListingById(application.job_id);
  if (!job) {
    throw new Error("Job listing not found");
  }

  // Only job poster can update application status
  if (Number(job.posted_by_user_id) !== reviewerUserId) {
    throw new Error("Forbidden");
  }

  const result = await pool.query(
    `
    UPDATE job_applications
    SET status = $1, reviewed_at = NOW(), reviewed_by_user_id = $2, notes = $3, updated_at = NOW()
    WHERE id = $4
    RETURNING *
    `,
    [status, reviewerUserId, notes ?? null, id]
  );

  return mapJobApplicationRow(result.rows[0]);
}
