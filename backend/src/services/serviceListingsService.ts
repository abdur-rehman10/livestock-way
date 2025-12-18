import { pool } from "../config/database";
import { ensureHaulerProfile, ensureStakeholderProfile } from "../utils/profileHelpers";

export type ServicePriceType = "fixed" | "hourly" | "quote" | string;
export type ServiceStatus = "active" | "archived" | string;
export type BookingStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed" | string;
export type PaymentStatus = "unpaid" | "pending" | "paid" | string;

export interface ServiceListing {
  id: number;
  stakeholder_id: number;
  owner_user_id: number;
  title: string;
  service_type: string | null;
  description: string | null;
  location_name: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  price_type: ServicePriceType;
  base_price: number | null;
  availability: string | null;
  response_time: string | null;
  certifications: string | null;
  insured: boolean;
  images: string[];
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceBooking {
  id: number;
  service_id: number;
  stakeholder_id: number;
  hauler_id: number;
  hauler_user_id: number;
  hauler_name?: string | null;
  hauler_company?: string | null;
  price: number | null;
  notes: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  paid_at: string | null;
  completed_at: string | null;
  service?: ServiceListing;
}

function mapServiceRow(row: any): ServiceListing {
  return {
    id: Number(row.id),
    stakeholder_id: Number(row.stakeholder_id),
    owner_user_id: Number(row.owner_user_id),
    title: row.title,
    service_type: row.service_type,
    description: row.description,
    location_name: row.location_name,
    street_address: row.street_address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    price_type: row.price_type,
    base_price: row.base_price !== null ? Number(row.base_price) : null,
    availability: row.availability,
    response_time: row.response_time,
    certifications: row.certifications,
    insured: Boolean(row.insured),
    images: row.images || [],
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapBookingRow(row: any): ServiceBooking {
  const booking: ServiceBooking = {
    id: Number(row.id),
    service_id: Number(row.service_id),
    stakeholder_id: Number(row.stakeholder_id),
    hauler_id: Number(row.hauler_id),
    hauler_user_id: Number(row.hauler_user_id),
    hauler_name: row.hauler_name ?? null,
    hauler_company: row.hauler_company ?? null,
    price: row.price !== null ? Number(row.price) : null,
    notes: row.notes,
    status: row.status,
    payment_status: row.payment_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    accepted_at: row.accepted_at,
    paid_at: row.paid_at,
    completed_at: row.completed_at,
  };

  if (row.service_id && row.service_title) {
    booking.service = {
      id: Number(row.service_id),
      stakeholder_id: Number(row.stakeholder_id),
      owner_user_id: Number(row.owner_user_id ?? row.service_owner_user_id ?? row.stakeholder_user_id ?? 0),
      title: row.service_title,
      service_type: row.service_type,
      description: row.description,
      location_name: row.location_name,
      street_address: row.street_address,
      city: row.city,
      state: row.state,
      zip: row.zip,
      price_type: row.price_type,
      base_price: row.base_price !== null ? Number(row.base_price) : null,
      availability: row.availability,
      response_time: row.response_time,
      certifications: row.certifications,
      insured: Boolean(row.insured),
      images: row.images || [],
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  return booking;
}

export async function createServiceListing(input: {
  userId: number;
  title: string;
  serviceType?: string;
  description?: string;
  locationName?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  priceType?: ServicePriceType;
  basePrice?: number | null;
  availability?: string;
  responseTime?: string;
  certifications?: string;
  insured?: boolean;
  images?: string[];
}): Promise<ServiceListing> {
  const stakeholderId = await ensureStakeholderProfile(input.userId);

  const result = await pool.query(
    `
    INSERT INTO service_listings (
      stakeholder_id, owner_user_id, title, service_type, description,
      location_name, street_address, city, state, zip,
      price_type, base_price, availability, response_time,
      certifications, insured, images, status, created_at, updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'active',NOW(),NOW())
    RETURNING *
    `,
    [
      stakeholderId,
      input.userId,
      input.title,
      input.serviceType ?? null,
      input.description ?? null,
      input.locationName ?? null,
      input.streetAddress ?? null,
      input.city ?? null,
      input.state ?? null,
      input.zip ?? null,
      input.priceType ?? "fixed",
      input.basePrice ?? null,
      input.availability ?? null,
      input.responseTime ?? null,
      input.certifications ?? null,
      input.insured ?? false,
      input.images ?? [],
    ]
  );

  return mapServiceRow(result.rows[0]);
}

export async function listServiceListings(): Promise<ServiceListing[]> {
  const result = await pool.query(
    `
    SELECT *
    FROM service_listings
    WHERE status = 'active'
    ORDER BY created_at DESC
    `
  );
  return result.rows.map(mapServiceRow);
}

export async function listServiceListingsForOwner(userId: number): Promise<ServiceListing[]> {
  const result = await pool.query(
    `
    SELECT *
    FROM service_listings
    WHERE owner_user_id = $1 AND status != 'archived'
    ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows.map(mapServiceRow);
}

export async function getServiceListingById(id: number): Promise<ServiceListing | null> {
  const result = await pool.query(
    `SELECT * FROM service_listings WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!result.rowCount) return null;
  return mapServiceRow(result.rows[0]);
}

export async function createServiceBooking(input: {
  serviceId: number;
  haulerUserId: number;
  price?: number | null;
  notes?: string | null;
}): Promise<ServiceBooking> {
  const service = await getServiceListingById(input.serviceId);
  if (!service) {
    throw new Error("Service not found");
  }

  const haulerId = await ensureHaulerProfile(input.haulerUserId);

  const existing = await pool.query(
    `
    SELECT id, status
    FROM service_bookings
    WHERE service_id = $1
      AND hauler_id = $2
      AND status IN ('pending', 'accepted', 'completed')
    LIMIT 1
    `,
    [input.serviceId, haulerId]
  );
  if (existing.rowCount) {
    throw new Error("Service already requested");
  }

  const price = input.price ?? service.base_price ?? null;

  const result = await pool.query(
    `
    INSERT INTO service_bookings (
      service_id, stakeholder_id, hauler_id, hauler_user_id,
      price, notes, status, payment_status, created_at, updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,'pending','unpaid',NOW(),NOW())
    RETURNING *
    `,
    [
      input.serviceId,
      service.stakeholder_id,
      haulerId,
      input.haulerUserId,
      price,
      input.notes ?? null,
    ]
  );

  return mapBookingRow(result.rows[0]);
}

export async function listBookingsForHauler(userId: number): Promise<ServiceBooking[]> {
  const haulerId = await ensureHaulerProfile(userId);
  const result = await pool.query(
    `
    SELECT b.*, s.title as service_title, s.service_type, s.price_type, s.base_price,
           s.stakeholder_id, s.owner_user_id, s.description, s.city, s.state, s.zip,
           s.location_name, s.street_address, s.availability, s.response_time,
           s.certifications, s.insured, s.images, s.status
    FROM service_bookings b
    JOIN service_listings s ON s.id = b.service_id
    WHERE b.hauler_id = $1
    ORDER BY b.created_at DESC
    `,
    [haulerId]
  );
  return result.rows.map(mapBookingRow);
}

export async function listBookingsForStakeholder(
  userId: number,
  filters: { status?: string[]; paymentStatus?: string[] } = {}
): Promise<ServiceBooking[]> {
  const where: string[] = ["s.owner_user_id = $1"];
  const params: any[] = [userId];

  if (filters.status?.length) {
    params.push(filters.status);
    where.push(`lower(b.status::text) = ANY (SELECT lower(x) FROM unnest($${params.length}::text[]) AS x)`);
  }
  if (filters.paymentStatus?.length) {
    params.push(filters.paymentStatus);
    where.push(
      `lower(b.payment_status::text) = ANY (SELECT lower(x) FROM unnest($${params.length}::text[]) AS x)`
    );
  }

  const result = await pool.query(
    `
    SELECT b.*, s.title as service_title, s.service_type, s.price_type, s.base_price,
           s.stakeholder_id, s.owner_user_id, s.description, s.city, s.state, s.zip,
           s.location_name, s.street_address, s.availability, s.response_time,
           s.certifications, s.insured, s.images, s.status,
           u.full_name as hauler_name,
           u.company_name as hauler_company
    FROM service_bookings b
    JOIN service_listings s ON s.id = b.service_id
    JOIN app_users u ON u.id = b.hauler_user_id
    WHERE ${where.join(" AND ")}
    ORDER BY b.created_at DESC
    `,
    params
  );
  return result.rows.map(mapBookingRow);
}

export async function respondToBooking(input: {
  bookingId: number;
  userId: number;
  action: "accept" | "reject" | "complete";
}): Promise<ServiceBooking> {
  const bookingRes = await pool.query(
    `
    SELECT b.*, s.owner_user_id
    FROM service_bookings b
    JOIN service_listings s ON s.id = b.service_id
    WHERE b.id = $1
    LIMIT 1
    `,
    [input.bookingId]
  );

  if (!bookingRes.rowCount) {
    throw new Error("Booking not found");
  }

  const bookingRow = bookingRes.rows[0];
  if (Number(bookingRow.owner_user_id) !== input.userId) {
    throw new Error("Forbidden");
  }

  if (input.action === "accept") {
    if (String(bookingRow.status).toLowerCase() !== "pending") {
      throw new Error("Only pending bookings can be accepted");
    }
    const updated = await pool.query(
      `
      UPDATE service_bookings
      SET status = 'accepted',
          accepted_at = NOW(),
          payment_status = 'requested',
          payment_requested_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [input.bookingId]
    );
    return mapBookingRow(updated.rows[0]);
  }

  if (input.action === "reject") {
    if (String(bookingRow.status).toLowerCase() !== "pending") {
      throw new Error("Only pending bookings can be rejected");
    }
    const updated = await pool.query(
      `
      UPDATE service_bookings
      SET status = 'rejected', updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [input.bookingId]
    );
    return mapBookingRow(updated.rows[0]);
  }

  if (String(bookingRow.status).toLowerCase() !== "accepted") {
    throw new Error("Only accepted bookings can be completed");
  }
  if (String(bookingRow.payment_status).toLowerCase() !== "paid") {
    throw new Error("Booking must be paid before completing");
  }
  const updated = await pool.query(
    `
    UPDATE service_bookings
    SET status = 'completed', completed_at = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [input.bookingId]
  );
  return mapBookingRow(updated.rows[0]);
}

export async function updateServiceListing(input: {
  serviceId: number;
  userId: number;
  patch: Partial<{
    title: string;
    serviceType: string | null;
    description: string | null;
    locationName: string | null;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    priceType: ServicePriceType;
    basePrice: number | null;
    availability: string | null;
    responseTime: string | null;
    certifications: string | null;
    insured: boolean;
    images: string[];
  }>;
}): Promise<ServiceListing> {
  const existing = await getServiceListingById(input.serviceId);
  if (!existing) throw new Error("Service not found");
  if (existing.owner_user_id !== input.userId) throw new Error("Forbidden");

  const fields: string[] = [];
  const values: any[] = [];
  const pushField = (column: string, value: any) => {
    fields.push(`${column} = $${fields.length + 2}`);
    values.push(value);
  };

  const { patch } = input;
  if (patch.title !== undefined) pushField("title", patch.title);
  if (patch.serviceType !== undefined) pushField("service_type", patch.serviceType);
  if (patch.description !== undefined) pushField("description", patch.description);
  if (patch.locationName !== undefined) pushField("location_name", patch.locationName);
  if (patch.streetAddress !== undefined) pushField("street_address", patch.streetAddress);
  if (patch.city !== undefined) pushField("city", patch.city);
  if (patch.state !== undefined) pushField("state", patch.state);
  if (patch.zip !== undefined) pushField("zip", patch.zip);
  if (patch.priceType !== undefined) pushField("price_type", patch.priceType);
  if (patch.basePrice !== undefined) pushField("base_price", patch.basePrice);
  if (patch.availability !== undefined) pushField("availability", patch.availability);
  if (patch.responseTime !== undefined) pushField("response_time", patch.responseTime);
  if (patch.certifications !== undefined) pushField("certifications", patch.certifications);
  if (patch.insured !== undefined) pushField("insured", patch.insured);
  if (patch.images !== undefined) pushField("images", patch.images);

  if (!fields.length) {
    return existing;
  }

  const result = await pool.query(
    `
    UPDATE service_listings
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [input.serviceId, ...values]
  );

  return mapServiceRow(result.rows[0]);
}

export async function archiveServiceListing(input: { serviceId: number; userId: number }): Promise<void> {
  const existing = await getServiceListingById(input.serviceId);
  if (!existing) throw new Error("Service not found");
  if (existing.owner_user_id !== input.userId) throw new Error("Forbidden");
  await pool.query(
    `
    UPDATE service_listings
    SET status = 'archived', updated_at = NOW()
    WHERE id = $1
    `,
    [input.serviceId]
  );
}

export async function markBookingPaid(input: {
  bookingId: number;
  userId: number;
}): Promise<ServiceBooking> {
  const bookingRes = await pool.query(
    `
    SELECT *
    FROM service_bookings
    WHERE id = $1
    LIMIT 1
    `,
    [input.bookingId]
  );

  if (!bookingRes.rowCount) {
    throw new Error("Booking not found");
  }

  const booking = bookingRes.rows[0];
  if (Number(booking.hauler_user_id) !== input.userId) {
    throw new Error("Forbidden");
  }

  if (String(booking.status).toLowerCase() !== "accepted") {
    throw new Error("Booking must be accepted before payment");
  }

  const currentPaymentStatus = String(booking.payment_status ?? "").toLowerCase();
  if (currentPaymentStatus === "paid") {
    return mapBookingRow(booking);
  }
  if (currentPaymentStatus !== "requested" && currentPaymentStatus !== "unpaid" && currentPaymentStatus !== "pending") {
    throw new Error("Payment already sent or confirmed");
  }

  const now = new Date().toISOString();
  const updated = await pool.query(
    `
    UPDATE service_bookings
    SET payment_status = 'sent',
        payment_sent_at = $2,
        updated_at = $2
    WHERE id = $1
    RETURNING *
    `,
    [input.bookingId, now]
  );

  return mapBookingRow(updated.rows[0]);
}

export async function confirmBookingPayment(input: { bookingId: number; userId: number }): Promise<ServiceBooking> {
  const bookingRes = await pool.query(
    `
    SELECT b.*, s.owner_user_id
    FROM service_bookings b
    JOIN service_listings s ON s.id = b.service_id
    WHERE b.id = $1
    LIMIT 1
    `,
    [input.bookingId]
  );

  if (!bookingRes.rowCount) {
    throw new Error("Booking not found");
  }

  const booking = bookingRes.rows[0];
  if (Number(booking.owner_user_id) !== input.userId) {
    throw new Error("Forbidden");
  }

  if (String(booking.status).toLowerCase() !== "accepted") {
    throw new Error("Only accepted bookings can be confirmed");
  }

  const currentPaymentStatus = String(booking.payment_status ?? "").toLowerCase();
  if (currentPaymentStatus === "paid") {
    return mapBookingRow(booking);
  }
  if (currentPaymentStatus !== "sent" && currentPaymentStatus !== "pending") {
    throw new Error("Payment has not been sent yet");
  }

  const now = new Date().toISOString();
  const updated = await pool.query(
    `
    UPDATE service_bookings
    SET payment_status = 'paid',
        paid_at = $2,
        payment_confirmed_at = $2,
        updated_at = $2
    WHERE id = $1
    RETURNING *
    `,
    [input.bookingId, now]
  );

  return mapBookingRow(updated.rows[0]);
}
