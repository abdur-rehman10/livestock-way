import { API_BASE_URL } from "../lib/api";

const JOBS_BASE = `${API_BASE_URL}/api/jobs`;

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

export interface JobListing {
  id: number;
  posted_by_user_id: number;
  posted_by_role: "hauler" | "shipper";
  hauler_id: number | null;
  shipper_id: number | null;
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

export interface CreateJobPayload {
  title: string;
  description: string;
  required_skills?: string | null;
  job_type: string;
  location_type: string;
  location?: string | null;
  salary?: string | null;
  salary_frequency?: string | null;
  benefits_accommodation?: boolean;
  benefits_food?: boolean;
  benefits_fuel?: boolean;
  benefits_vehicle?: boolean;
  benefits_bonus?: boolean;
  benefits_others?: boolean;
  contact_person: string;
  contact_phone: string;
  preferred_call_time?: string | null;
  contact_email?: string | null;
  photos?: string[];
}

export interface ApplyJobPayload {
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  resume_url?: string | null;
  cover_letter?: string | null;
}

export async function fetchJobs(filters?: {
  status?: "active" | "closed" | "filled";
  role?: "hauler" | "shipper";
  limit?: number;
  offset?: number;
}): Promise<{ items: JobListing[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.role) params.append("role", filters.role);
  if (filters?.limit) params.append("limit", String(filters.limit));
  if (filters?.offset) params.append("offset", String(filters.offset));

  const url = `${JOBS_BASE}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch jobs (${response.status}): ${text}`);
  }

  return response.json();
}

export async function fetchMyJobs(status?: "active" | "closed" | "filled"): Promise<{ items: JobListing[]; total: number }> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);

  const url = `${JOBS_BASE}/mine${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch my jobs (${response.status}): ${text}`);
  }

  return response.json();
}

export async function fetchJobById(id: number): Promise<JobListing> {
  const response = await fetch(`${JOBS_BASE}/${id}`, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch job (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.job;
}

export async function createJob(payload: CreateJobPayload): Promise<JobListing> {
  const response = await fetch(JOBS_BASE, {
    method: "POST",
    headers: buildHeaders("POST", true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to create job (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.job;
}

export async function updateJob(id: number, payload: Partial<CreateJobPayload> & { status?: "active" | "closed" | "filled" }): Promise<JobListing> {
  const response = await fetch(`${JOBS_BASE}/${id}`, {
    method: "PATCH",
    headers: buildHeaders("PATCH", true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to update job (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.job;
}

export async function deleteJob(id: number): Promise<void> {
  const response = await fetch(`${JOBS_BASE}/${id}`, {
    method: "DELETE",
    headers: buildHeaders("DELETE", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to delete job (${response.status}): ${text}`);
  }
}

export async function applyForJob(jobId: number, payload: ApplyJobPayload): Promise<JobApplication> {
  const response = await fetch(`${JOBS_BASE}/${jobId}/applications`, {
    method: "POST",
    headers: buildHeaders("POST", true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to apply for job (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.application;
}

export async function fetchMyApplication(jobId: number): Promise<JobApplication | null> {
  const response = await fetch(`${JOBS_BASE}/${jobId}/my-application`, {
    headers: buildHeaders("GET", false),
  });

  if (response.status === 404) {
    return null; // User hasn't applied yet
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch my application (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.application;
}

export async function fetchJobApplications(jobId: number, status?: string): Promise<{ items: JobApplication[] }> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);

  const url = `${JOBS_BASE}/${jobId}/applications${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: buildHeaders("GET", false),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch applications (${response.status}): ${text}`);
  }

  return response.json();
}

export async function updateApplicationStatus(
  applicationId: number,
  status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn",
  notes?: string | null
): Promise<JobApplication> {
  const response = await fetch(`${JOBS_BASE}/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: buildHeaders("PATCH", true),
    body: JSON.stringify({ status, notes }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to update application (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.application;
}
