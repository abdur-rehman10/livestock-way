import { API_BASE_URL } from "../lib/api";

const BUY_AND_SELL_BASE = `${API_BASE_URL}/api/buy-and-sell`;

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

export interface BuyAndSellListing {
  id: number;
  posted_by_user_id: number;
  posted_by_role: "hauler" | "shipper";
  hauler_id: number | null;
  shipper_id: number | null;
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

export interface CreateBuyAndSellPayload {
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

export interface ApplyBuyAndSellPayload {
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  offered_price?: number | null;
  message?: string | null;
}

export interface BuyAndSellFilters {
  status?: "active" | "closed" | "sold";
  role?: "hauler" | "shipper";
  listing_type?: "for-sale" | "wanted" | "for-rent";
  category?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

export async function fetchBuyAndSellListings(filters: BuyAndSellFilters = {}): Promise<{
  items: BuyAndSellListing[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.role) params.append("role", filters.role);
  if (filters.listing_type) params.append("listing_type", filters.listing_type);
  if (filters.category) params.append("category", filters.category);
  if (filters.city) params.append("city", filters.city);
  if (filters.state) params.append("state", filters.state);
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.offset) params.append("offset", String(filters.offset));

  const response = await fetch(`${BUY_AND_SELL_BASE}?${params.toString()}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch listings (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data;
}

export async function fetchMyBuyAndSellListings(): Promise<{
  items: BuyAndSellListing[];
  total: number;
}> {
  const response = await fetch(`${BUY_AND_SELL_BASE}/my-listings`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch my listings (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data;
}

export async function fetchBuyAndSellById(id: number): Promise<BuyAndSellListing> {
  const response = await fetch(`${BUY_AND_SELL_BASE}/${id}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch listing (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.listing;
}

export async function createBuyAndSellListing(payload: CreateBuyAndSellPayload): Promise<BuyAndSellListing> {
  const response = await fetch(`${BUY_AND_SELL_BASE}`, {
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

export async function updateBuyAndSellListing(
  id: number,
  payload: Partial<CreateBuyAndSellPayload & { status?: string }>
): Promise<BuyAndSellListing> {
  const response = await fetch(`${BUY_AND_SELL_BASE}/${id}`, {
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

export async function deleteBuyAndSellListing(id: number): Promise<void> {
  const response = await fetch(`${BUY_AND_SELL_BASE}/${id}`, {
    method: "DELETE",
    headers: buildHeaders("DELETE", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to delete listing (${response.status}): ${text}`);
  }
}

export async function fetchBuyAndSellApplications(listingId: number): Promise<{
  items: BuyAndSellApplication[];
  total: number;
}> {
  const response = await fetch(`${BUY_AND_SELL_BASE}/${listingId}/applications`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch applications (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data;
}

export async function applyToBuyAndSellListing(
  listingId: number,
  payload: ApplyBuyAndSellPayload
): Promise<BuyAndSellApplication> {
  const response = await fetch(`${BUY_AND_SELL_BASE}/${listingId}/applications`, {
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

export async function fetchMyBuyAndSellApplication(listingId: number): Promise<BuyAndSellApplication | null> {
  const response = await fetch(`${BUY_AND_SELL_BASE}/${listingId}/my-application`, {
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

export async function updateBuyAndSellApplicationStatus(
  applicationId: number,
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn"
): Promise<BuyAndSellApplication> {
  const response = await fetch(`${BUY_AND_SELL_BASE}/applications/${applicationId}/status`, {
    method: "PUT",
    headers: buildHeaders("PUT", true),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to update application (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.application;
}
