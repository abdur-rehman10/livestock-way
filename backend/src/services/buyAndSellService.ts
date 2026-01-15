import { pool } from "../config/database";
import { ensureHaulerProfile, ensureShipperProfile, ensureStakeholderProfile } from "../utils/profileHelpers";

export interface BuyAndSellListing {
  id: number;
  posted_by_user_id: number;
  posted_by_role: "hauler" | "shipper" | "stakeholder";
  hauler_id: number | null;
  shipper_id: number | null;
  stakeholder_id: number | null;
  listing_type: "for-sale" | "wanted" | "for-rent";
  category: "equipment" | "livestock" | "supplies" | "services" | "vehicles" | "trailers";
  title: string;
  description: string;
  price: number | null;
  price_type: "fixed" | "negotiable" | "per-unit" | "per-head" | "obo" | null;
  payment_terms: "cash" | "check" | "financing" | "trade" | "flexible" | null;
  city: string;
  state: string;
  zip_code: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  photos: string[];
  status: "active" | "closed" | "sold";
  views: number;
  application_count: number;
  created_at: string;
  updated_at: string;
}

export interface BuyAndSellApplication {
  id: number;
  listing_id: number;
  applicant_user_id: number;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  offered_price: number | null;
  message: string | null;
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn";
  reviewed_at: string | null;
  reviewed_by_user_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapBuyAndSellListingRow(row: any): BuyAndSellListing {
  return {
    id: Number(row.id),
    posted_by_user_id: Number(row.posted_by_user_id),
    posted_by_role: row.posted_by_role,
    hauler_id: row.hauler_id ? Number(row.hauler_id) : null,
    shipper_id: row.shipper_id ? Number(row.shipper_id) : null,
    stakeholder_id: row.stakeholder_id ? Number(row.stakeholder_id) : null,
    listing_type: row.listing_type,
    category: row.category,
    title: row.title,
    description: row.description,
    price: row.price ? Number(row.price) : null,
    price_type: row.price_type,
    payment_terms: row.payment_terms,
    city: row.city,
    state: row.state,
    zip_code: row.zip_code,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    contact_email: row.contact_email,
    photos: Array.isArray(row.photos) ? row.photos : [],
    status: row.status,
    views: Number(row.views ?? 0),
    application_count: Number(row.application_count ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapBuyAndSellApplicationRow(row: any): BuyAndSellApplication {
  return {
    id: Number(row.id),
    listing_id: Number(row.listing_id),
    applicant_user_id: Number(row.applicant_user_id),
    applicant_name: row.applicant_name,
    applicant_email: row.applicant_email,
    applicant_phone: row.applicant_phone,
    offered_price: row.offered_price ? Number(row.offered_price) : null,
    message: row.message,
    status: row.status,
    reviewed_at: row.reviewed_at,
    reviewed_by_user_id: row.reviewed_by_user_id ? Number(row.reviewed_by_user_id) : null,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export interface CreateBuyAndSellListingPayload {
  listing_type: string;
  category: string;
  title: string;
  description: string;
  price?: number | null;
  price_type?: string | null;
  payment_terms?: string | null;
  city: string;
  state: string;
  zip_code?: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email?: string | null;
  photos?: string[];
}

export interface UpdateBuyAndSellListingPayload {
  listing_type?: string;
  category?: string;
  title?: string;
  description?: string;
  price?: number | null;
  price_type?: string | null;
  payment_terms?: string | null;
  city?: string;
  state?: string;
  zip_code?: string | null;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string | null;
  photos?: string[];
  status?: string;
}

export interface ApplyBuyAndSellPayload {
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  offered_price?: number | null;
  message?: string | null;
}

export interface BuyAndSellListingFilters {
  status?: "active" | "closed" | "sold";
  role?: "hauler" | "shipper" | "stakeholder";
  listing_type?: "for-sale" | "wanted" | "for-rent";
  category?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

// Get all buy and sell listings with filters
export async function getBuyAndSellListings(
  filters: BuyAndSellListingFilters = {}
): Promise<{ items: BuyAndSellListing[]; total: number }> {
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

  if (filters.listing_type) {
    paramCount++;
    conditions.push(`listing_type = $${paramCount}`);
    params.push(filters.listing_type);
  }

  if (filters.category) {
    paramCount++;
    conditions.push(`category = $${paramCount}`);
    params.push(filters.category);
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
    `SELECT COUNT(*) as total FROM buy_and_sell_listings ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0].total);

  // Get listings
  paramCount = params.length;
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const query = `
    SELECT * FROM buy_and_sell_listings
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;

  const result = await pool.query(query, [...params, limit, offset]);
  const items = result.rows.map(mapBuyAndSellListingRow);

  return { items, total };
}

// Get a specific listing by ID
export async function getBuyAndSellListingById(listingId: number): Promise<BuyAndSellListing | null> {
  const result = await pool.query("SELECT * FROM buy_and_sell_listings WHERE id = $1", [listingId]);

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  // Increment views
  await pool.query("UPDATE buy_and_sell_listings SET views = views + 1 WHERE id = $1", [listingId]);

  return mapBuyAndSellListingRow(result.rows[0]);
}

// Get listings posted by a specific user
export async function getMyBuyAndSellListings(userId: number): Promise<{ items: BuyAndSellListing[]; total: number }> {
  const result = await pool.query(
    "SELECT * FROM buy_and_sell_listings WHERE posted_by_user_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  const items = result.rows.map(mapBuyAndSellListingRow);
  return { items, total: items.length };
}

// Create a new listing
export async function createBuyAndSellListing(
  userId: number,
  userRole: string,
  payload: CreateBuyAndSellListingPayload
): Promise<BuyAndSellListing> {
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

  const result = await pool.query(
    `
    INSERT INTO buy_and_sell_listings (
      posted_by_user_id, posted_by_role, hauler_id, shipper_id, stakeholder_id,
      listing_type, category, title, description, price, price_type, payment_terms,
      city, state, zip_code, contact_name, contact_phone, contact_email, photos, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'active')
    RETURNING *
    `,
    [
      userId,
      userRole.toLowerCase(),
      haulerId,
      shipperId,
      stakeholderId,
      payload.listing_type,
      payload.category,
      payload.title,
      payload.description,
      payload.price ?? null,
      payload.price_type ?? null,
      payload.payment_terms ?? null,
      payload.city,
      payload.state,
      payload.zip_code ?? null,
      payload.contact_name,
      payload.contact_phone,
      payload.contact_email ?? null,
      photos,
    ]
  );

  return mapBuyAndSellListingRow(result.rows[0]);
}

// Update a listing
export async function updateBuyAndSellListing(
  listingId: number,
  userId: number,
  payload: UpdateBuyAndSellListingPayload
): Promise<BuyAndSellListing | null> {
  // Verify ownership
  const checkResult = await pool.query(
    "SELECT id FROM buy_and_sell_listings WHERE id = $1 AND posted_by_user_id = $2",
    [listingId, userId]
  );

  if ((checkResult.rowCount ?? 0) === 0) {
    throw new Error("Listing not found or access denied");
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (payload.listing_type !== undefined) {
    paramCount++;
    updates.push(`listing_type = $${paramCount}`);
    params.push(payload.listing_type);
  }
  if (payload.category !== undefined) {
    paramCount++;
    updates.push(`category = $${paramCount}`);
    params.push(payload.category);
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
  if (payload.price !== undefined) {
    paramCount++;
    updates.push(`price = $${paramCount}`);
    params.push(payload.price);
  }
  if (payload.price_type !== undefined) {
    paramCount++;
    updates.push(`price_type = $${paramCount}`);
    params.push(payload.price_type);
  }
  if (payload.payment_terms !== undefined) {
    paramCount++;
    updates.push(`payment_terms = $${paramCount}`);
    params.push(payload.payment_terms);
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
  if (payload.photos !== undefined) {
    paramCount++;
    updates.push(`photos = $${paramCount}`);
    params.push(Array.isArray(payload.photos) ? payload.photos : []);
  }
  if (payload.status !== undefined) {
    paramCount++;
    updates.push(`status = $${paramCount}`);
    params.push(payload.status);
  }

  if (updates.length === 0) {
    return getBuyAndSellListingById(listingId);
  }

  paramCount++;
  updates.push(`updated_at = NOW()`);
  params.push(listingId);

  await pool.query(
    `UPDATE buy_and_sell_listings SET ${updates.join(", ")} WHERE id = $${paramCount}`,
    params
  );

  return getBuyAndSellListingById(listingId);
}

// Delete a listing
export async function deleteBuyAndSellListing(listingId: number, userId: number): Promise<void> {
  const result = await pool.query(
    "DELETE FROM buy_and_sell_listings WHERE id = $1 AND posted_by_user_id = $2",
    [listingId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("Listing not found or access denied");
  }
}

// Get applications for a listing
export async function getBuyAndSellApplications(listingId: number, userId: number): Promise<{
  items: BuyAndSellApplication[];
  total: number;
}> {
  // Verify user owns the listing
  const checkResult = await pool.query(
    "SELECT id FROM buy_and_sell_listings WHERE id = $1 AND posted_by_user_id = $2",
    [listingId, userId]
  );

  if ((checkResult.rowCount ?? 0) === 0) {
    throw new Error("Listing not found or access denied");
  }

  const result = await pool.query(
    "SELECT * FROM buy_and_sell_applications WHERE listing_id = $1 ORDER BY created_at DESC",
    [listingId]
  );

  const items = result.rows.map(mapBuyAndSellApplicationRow);
  return { items, total: items.length };
}

// Apply to a listing
export async function applyToBuyAndSellListing(
  listingId: number,
  userId: number,
  payload: ApplyBuyAndSellPayload
): Promise<BuyAndSellApplication> {
  // Check if listing exists and is active
  const listingResult = await pool.query(
    "SELECT id, posted_by_user_id FROM buy_and_sell_listings WHERE id = $1 AND status = 'active'",
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
    "SELECT id FROM buy_and_sell_applications WHERE listing_id = $1 AND applicant_user_id = $2",
    [listingId, userId]
  );

  if ((existingResult.rowCount ?? 0) > 0) {
    throw new Error("You have already applied to this listing");
  }

  const result = await pool.query(
    `
    INSERT INTO buy_and_sell_applications (
      listing_id, applicant_user_id, applicant_name, applicant_email, applicant_phone,
      offered_price, message, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING *
    `,
    [
      listingId,
      userId,
      payload.applicant_name,
      payload.applicant_email,
      payload.applicant_phone,
      payload.offered_price ?? null,
      payload.message ?? null,
    ]
  );

  return mapBuyAndSellApplicationRow(result.rows[0]);
}

// Get user's application for a listing
export async function getMyBuyAndSellApplication(
  listingId: number,
  userId: number
): Promise<BuyAndSellApplication | null> {
  const result = await pool.query(
    "SELECT * FROM buy_and_sell_applications WHERE listing_id = $1 AND applicant_user_id = $2",
    [listingId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapBuyAndSellApplicationRow(result.rows[0]);
}

// Update application status
export async function updateBuyAndSellApplicationStatus(
  applicationId: number,
  listingOwnerId: number,
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn"
): Promise<BuyAndSellApplication> {
  // Verify ownership of listing
  const checkResult = await pool.query(
    `
    SELECT a.id FROM buy_and_sell_applications a
    INNER JOIN buy_and_sell_listings l ON l.id = a.listing_id
    WHERE a.id = $1 AND l.posted_by_user_id = $2
    `,
    [applicationId, listingOwnerId]
  );

  if ((checkResult.rowCount ?? 0) === 0) {
    throw new Error("Application not found or access denied");
  }

  const result = await pool.query(
    `
    UPDATE buy_and_sell_applications
    SET status = $1, reviewed_at = NOW(), reviewed_by_user_id = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [status, listingOwnerId, applicationId]
  );

  return mapBuyAndSellApplicationRow(result.rows[0]);
}
