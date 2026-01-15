import { API_BASE_URL } from "../lib/api";

const RESOURCES_BASE = `${API_BASE_URL}/api/resources`;

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

function buildHeaders(method: string, hasJsonBody = true): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export interface ResourcesListing {
  id: number;
  posted_by_user_id: number;
  posted_by_role: "hauler" | "shipper";
  hauler_id: number | null;
  shipper_id: number | null;
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

export interface CreateResourcesPayload {
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

export interface ApplyResourcesPayload {
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  message?: string | null;
}

export interface ResourcesFilters {
  status?: "active" | "closed" | "archived";
  role?: "hauler" | "shipper";
  resource_type?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

export async function fetchResourcesListings(filters: ResourcesFilters = {}): Promise<{
  items: ResourcesListing[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.role) params.append("role", filters.role);
  if (filters.resource_type) params.append("resource_type", filters.resource_type);
  if (filters.city) params.append("city", filters.city);
  if (filters.state) params.append("state", filters.state);
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.offset) params.append("offset", String(filters.offset));

  const response = await fetch(`${RESOURCES_BASE}?${params.toString()}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch listings (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data;
}

export async function fetchMyResourcesListings(): Promise<{
  items: ResourcesListing[];
  total: number;
}> {
  const response = await fetch(`${RESOURCES_BASE}/my-listings`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch my listings (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data;
}

export async function fetchResourcesById(id: number): Promise<ResourcesListing> {
  const response = await fetch(`${RESOURCES_BASE}/${id}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch listing (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.listing;
}

export async function createResourcesListing(payload: CreateResourcesPayload): Promise<ResourcesListing> {
  const response = await fetch(`${RESOURCES_BASE}`, {
    method: "POST",
    headers: buildHeaders("POST", true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to create listing (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.listing;
}

export async function updateResourcesListing(
  id: number,
  payload: Partial<CreateResourcesPayload & { status?: string }>
): Promise<ResourcesListing> {
  const response = await fetch(`${RESOURCES_BASE}/${id}`, {
    method: "PUT",
    headers: buildHeaders("PUT", true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to update listing (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.listing;
}

export async function deleteResourcesListing(id: number): Promise<void> {
  const response = await fetch(`${RESOURCES_BASE}/${id}`, {
    method: "DELETE",
    headers: buildHeaders("DELETE", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to delete listing (${response.status}): ${text}`);
  }
}

export async function fetchResourcesApplications(listingId: number): Promise<{
  items: ResourcesApplication[];
  total: number;
}> {
  const response = await fetch(`${RESOURCES_BASE}/${listingId}/applications`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch applications (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data;
}

export async function applyToResourcesListing(
  listingId: number,
  payload: ApplyResourcesPayload
): Promise<ResourcesApplication> {
  const response = await fetch(`${RESOURCES_BASE}/${listingId}/applications`, {
    method: "POST",
    headers: buildHeaders("POST", true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to apply (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.application;
}

export async function fetchMyResourcesApplication(listingId: number): Promise<ResourcesApplication | null> {
  const response = await fetch(`${RESOURCES_BASE}/${listingId}/my-application`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch application (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.application;
}

export async function updateResourcesApplicationStatus(
  applicationId: number,
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn",
  notes?: string | null
): Promise<ResourcesApplication> {
  const response = await fetch(`${RESOURCES_BASE}/applications/${applicationId}/status`, {
    method: "PUT",
    headers: buildHeaders("PUT", true),
    body: JSON.stringify({ status, notes: notes || null }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to update application (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.application;
}
