import { pool } from "../config/database";
import { ensureHaulerProfile, ensureShipperProfile, ensureStakeholderProfile } from "../utils/profileHelpers";

export interface ResourcesListing {
  id: number;
  posted_by_user_id: number;
  posted_by_role: "hauler" | "shipper" | "stakeholder";
  hauler_id: number | null;
  shipper_id: number | null;
  stakeholder_id: number | null;
  resource_type: "logistics" | "insurance" | "washout" | "scale" | "hay" | "stud" | "salesyard" | "beefspotter";
  title: string;
  description: string | null;
  contact_name: string | null;
  contact_phone: string;
  contact_email: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  photos: string[];
  type_specific_data: Record<string, any>;
  status: "active" | "closed" | "archived";
  views: number;
  application_count: number;
  created_at: string;
  updated_at: string;
}

export interface ResourcesApplication {
  id: number;
  listing_id: number;
  applicant_user_id: number;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  message: string | null;
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn";
  reviewed_at: string | null;
  reviewed_by_user_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapResourcesListingRow(row: any): ResourcesListing {
  return {
    id: Number(row.id),
    posted_by_user_id: Number(row.posted_by_user_id),
    posted_by_role: row.posted_by_role,
    hauler_id: row.hauler_id ? Number(row.hauler_id) : null,
    shipper_id: row.shipper_id ? Number(row.shipper_id) : null,
    stakeholder_id: row.stakeholder_id ? Number(row.stakeholder_id) : null,
    resource_type: row.resource_type,
    title: row.title,
    description: row.description,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    contact_email: row.contact_email,
    city: row.city,
    state: row.state,
    zip_code: row.zip_code,
    photos: Array.isArray(row.photos) ? row.photos : [],
    type_specific_data: row.type_specific_data ? (typeof row.type_specific_data === 'string' ? JSON.parse(row.type_specific_data) : row.type_specific_data) : {},
    status: row.status,
    views: Number(row.views ?? 0),
    application_count: Number(row.application_count ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapResourcesApplicationRow(row: any): ResourcesApplication {
  return {
    id: Number(row.id),
    listing_id: Number(row.listing_id),
    applicant_user_id: Number(row.applicant_user_id),
    applicant_name: row.applicant_name,
    applicant_email: row.applicant_email,
    applicant_phone: row.applicant_phone,
    message: row.message,
    status: row.status,
    reviewed_at: row.reviewed_at,
    reviewed_by_user_id: row.reviewed_by_user_id ? Number(row.reviewed_by_user_id) : null,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export interface CreateResourcesListingPayload {
  resource_type: string;
  title: string;
  description?: string | null;
  contact_name?: string | null;
  contact_phone: string;
  contact_email?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  photos?: string[];
  type_specific_data?: Record<string, any>;
}

export interface UpdateResourcesListingPayload {
  resource_type?: string;
  title?: string;
  description?: string | null;
  contact_name?: string | null;
  contact_phone?: string;
  contact_email?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  photos?: string[];
  type_specific_data?: Record<string, any>;
  status?: string;
}

export interface ApplyResourcesPayload {
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  message?: string | null;
}

export interface ResourcesListingFilters {
  status?: "active" | "closed" | "archived";
  role?: "hauler" | "shipper" | "stakeholder";
  resource_type?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

// Get all resources listings with filters
export async function getResourcesListings(
  filters: ResourcesListingFilters = {}
): Promise<{ items: ResourcesListing[]; total: number }> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (filters.status) {
    paramCount++;
    conditions.push(`status = $${paramCount}`);
    params.push(filters.status);
  }

  if (filters.role) {
    paramCount++;
    conditions.push(`posted_by_role = $${paramCount}`);
    params.push(filters.role);
  }

  if (filters.resource_type) {
    paramCount++;
    conditions.push(`resource_type = $${paramCount}`);
    params.push(filters.resource_type);
  }

  if (filters.city) {
    paramCount++;
    conditions.push(`city ILIKE $${paramCount}`);
    params.push(`%${filters.city}%`);
  }

  if (filters.state) {
    paramCount++;
    conditions.push(`state = $${paramCount}`);
    params.push(filters.state);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM resources_listings ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0].total);

  // Get listings
  paramCount = params.length;
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const query = `
    SELECT * FROM resources_listings
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;

  const result = await pool.query(query, [...params, limit, offset]);
  const items = result.rows.map(mapResourcesListingRow);

  return { items, total };
}

// Get a specific listing by ID
export async function getResourcesListingById(listingId: number): Promise<ResourcesListing | null> {
  const result = await pool.query("SELECT * FROM resources_listings WHERE id = $1", [listingId]);

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  // Increment views
  await pool.query("UPDATE resources_listings SET views = views + 1 WHERE id = $1", [listingId]);

  return mapResourcesListingRow(result.rows[0]);
}

// Get listings posted by a specific user
export async function getMyResourcesListings(userId: number): Promise<{ items: ResourcesListing[]; total: number }> {
  const result = await pool.query(
    "SELECT * FROM resources_listings WHERE posted_by_user_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  const items = result.rows.map(mapResourcesListingRow);
  return { items, total: items.length };
}

// Create a new listing
export async function createResourcesListing(
  userId: number,
  userRole: string,
  payload: CreateResourcesListingPayload
): Promise<ResourcesListing> {
  // Ensure profile exists
  let haulerId: number | null = null;
  let shipperId: number | null = null;
  let stakeholderId: number | null = null;

  if (userRole.toLowerCase() === "hauler") {
    haulerId = await ensureHaulerProfile(userId);
  } else if (userRole.toLowerCase() === "shipper") {
    shipperId = await ensureShipperProfile(userId);
  } else if (userRole.toLowerCase() === "stakeholder") {
    stakeholderId = await ensureStakeholderProfile(userId);
  }

  const photos = payload.photos && Array.isArray(payload.photos) ? payload.photos : [];
  const typeSpecificData = payload.type_specific_data || {};

  const result = await pool.query(
    `
    INSERT INTO resources_listings (
      posted_by_user_id, posted_by_role, hauler_id, shipper_id, stakeholder_id,
      resource_type, title, description, contact_name, contact_phone, contact_email,
      city, state, zip_code, photos, type_specific_data, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active')
    RETURNING *
    `,
    [
      userId,
      userRole.toLowerCase(),
      haulerId,
      shipperId,
      stakeholderId,
      payload.resource_type,
      payload.title,
      payload.description ?? null,
      payload.contact_name ?? null,
      payload.contact_phone,
      payload.contact_email ?? null,
      payload.city ?? null,
      payload.state ?? null,
      payload.zip_code ?? null,
      photos,
      JSON.stringify(typeSpecificData),
    ]
  );

  return mapResourcesListingRow(result.rows[0]);
}

// Update a listing
export async function updateResourcesListing(
  listingId: number,
  userId: number,
  payload: UpdateResourcesListingPayload
): Promise<ResourcesListing | null> {
  // Verify ownership
  const checkResult = await pool.query(
    "SELECT id FROM resources_listings WHERE id = $1 AND posted_by_user_id = $2",
    [listingId, userId]
  );

  if ((checkResult.rowCount ?? 0) === 0) {
    throw new Error("Listing not found or access denied");
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (payload.resource_type !== undefined) {
    paramCount++;
    updates.push(`resource_type = $${paramCount}`);
    params.push(payload.resource_type);
  }
  if (payload.title !== undefined) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    params.push(payload.title);
  }
  if (payload.description !== undefined) {
    paramCount++;
    updates.push(`description = $${paramCount}`);
    params.push(payload.description);
  }
  if (payload.contact_name !== undefined) {
    paramCount++;
    updates.push(`contact_name = $${paramCount}`);
    params.push(payload.contact_name);
  }
  if (payload.contact_phone !== undefined) {
    paramCount++;
    updates.push(`contact_phone = $${paramCount}`);
    params.push(payload.contact_phone);
  }
  if (payload.contact_email !== undefined) {
    paramCount++;
    updates.push(`contact_email = $${paramCount}`);
    params.push(payload.contact_email);
  }
  if (payload.city !== undefined) {
    paramCount++;
    updates.push(`city = $${paramCount}`);
    params.push(payload.city);
  }
  if (payload.state !== undefined) {
    paramCount++;
    updates.push(`state = $${paramCount}`);
    params.push(payload.state);
  }
  if (payload.zip_code !== undefined) {
    paramCount++;
    updates.push(`zip_code = $${paramCount}`);
    params.push(payload.zip_code);
  }
  if (payload.photos !== undefined) {
    paramCount++;
    updates.push(`photos = $${paramCount}`);
    params.push(Array.isArray(payload.photos) ? payload.photos : []);
  }
  if (payload.type_specific_data !== undefined) {
    paramCount++;
    updates.push(`type_specific_data = $${paramCount}`);
    params.push(JSON.stringify(payload.type_specific_data));
  }
  if (payload.status !== undefined) {
    paramCount++;
    updates.push(`status = $${paramCount}`);
    params.push(payload.status);
  }

  if (updates.length === 0) {
    return getResourcesListingById(listingId);
  }

  paramCount++;
  updates.push(`updated_at = NOW()`);
  params.push(listingId);

  await pool.query(
    `UPDATE resources_listings SET ${updates.join(", ")} WHERE id = $${paramCount}`,
    params
  );

  return getResourcesListingById(listingId);
}

// Delete a listing
export async function deleteResourcesListing(listingId: number, userId: number): Promise<void> {
  const result = await pool.query(
    "DELETE FROM resources_listings WHERE id = $1 AND posted_by_user_id = $2",
    [listingId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("Listing not found or access denied");
  }
}

// Get applications for a listing
export async function getResourcesApplications(listingId: number, userId: number): Promise<{
  items: ResourcesApplication[];
  total: number;
}> {
  // Verify user owns the listing
  const checkResult = await pool.query(
    "SELECT id FROM resources_listings WHERE id = $1 AND posted_by_user_id = $2",
    [listingId, userId]
  );

  if ((checkResult.rowCount ?? 0) === 0) {
    throw new Error("Listing not found or access denied");
  }

  const result = await pool.query(
    "SELECT * FROM resources_applications WHERE listing_id = $1 ORDER BY created_at DESC",
    [listingId]
  );

  const items = result.rows.map(mapResourcesApplicationRow);
  return { items, total: items.length };
}

// Apply to a listing
export async function applyToResourcesListing(
  listingId: number,
  userId: number,
  payload: ApplyResourcesPayload
): Promise<ResourcesApplication> {
  // Check if listing exists and is active
  const listingResult = await pool.query(
    "SELECT id, posted_by_user_id FROM resources_listings WHERE id = $1 AND status = 'active'",
    [listingId]
  );

  if ((listingResult.rowCount ?? 0) === 0) {
    throw new Error("Listing not found or not available");
  }

  const listing = listingResult.rows[0];
  if (Number(listing.posted_by_user_id) === userId) {
    throw new Error("Cannot apply to your own listing");
  }

  // Check if already applied
  const existingResult = await pool.query(
    "SELECT id FROM resources_applications WHERE listing_id = $1 AND applicant_user_id = $2",
    [listingId, userId]
  );

  if ((existingResult.rowCount ?? 0) > 0) {
    throw new Error("You have already applied to this listing");
  }

  const result = await pool.query(
    `
    INSERT INTO resources_applications (
      listing_id, applicant_user_id, applicant_name, applicant_email, applicant_phone,
      message, status
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    RETURNING *
    `,
    [
      listingId,
      userId,
      payload.applicant_name,
      payload.applicant_email,
      payload.applicant_phone,
      payload.message ?? null,
    ]
  );

  return mapResourcesApplicationRow(result.rows[0]);
}

// Get user's application for a listing
export async function getMyResourcesApplication(
  listingId: number,
  userId: number
): Promise<ResourcesApplication | null> {
  const result = await pool.query(
    "SELECT * FROM resources_applications WHERE listing_id = $1 AND applicant_user_id = $2",
    [listingId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapResourcesApplicationRow(result.rows[0]);
}

// Update application status
export async function updateResourcesApplicationStatus(
  applicationId: number,
  listingOwnerId: number,
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn",
  notes?: string | null
): Promise<ResourcesApplication> {
  // Verify ownership of listing
  const checkResult = await pool.query(
    `
    SELECT a.id FROM resources_applications a
    INNER JOIN resources_listings l ON l.id = a.listing_id
    WHERE a.id = $1 AND l.posted_by_user_id = $2
    `,
    [applicationId, listingOwnerId]
  );

  if ((checkResult.rowCount ?? 0) === 0) {
    throw new Error("Application not found or access denied");
  }

  const result = await pool.query(
    `
    UPDATE resources_applications
    SET status = $1, reviewed_at = NOW(), reviewed_by_user_id = $2, notes = $3, updated_at = NOW()
    WHERE id = $4
    RETURNING *
    `,
    [status, listingOwnerId, notes ?? null, applicationId]
  );

  return mapResourcesApplicationRow(result.rows[0]);
}
