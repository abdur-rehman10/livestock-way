import assert from "node:assert/strict";

export type CompanyTierInput = {
  name?: string;
  min_vehicles?: number | null;
  max_vehicles?: number | null;
  monthly_price?: number | null;
  sales_form_link?: string | null;
  is_enterprise?: boolean;
  sort_order?: number | null;
};

export type ValidatedCompanyTier = {
  name: string;
  min_vehicles: number | null;
  max_vehicles: number | null;
  monthly_price: number | null;
  sales_form_link: string | null;
  is_enterprise: boolean;
  sort_order: number;
};

export type IndividualPackageCode = "FREE" | "PAID";

export type IndividualPackageFeatures = {
  feature_list: string[];
  trip_tracking_limit?: number | null;
  documents_validation_limit?: number | null;
  outside_trips_limit?: number | null;
  trips_unlimited?: boolean;
  loadboard_unlimited?: boolean;
  truckboard_unlimited?: boolean;
  [key: string]: unknown;
};

export type IndividualPackage = {
  id: number;
  code: IndividualPackageCode;
  name: string;
  description: string | null;
  features: IndividualPackageFeatures;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function validateIndividualPackageCode(code: string): IndividualPackageCode {
  const normalized = (code ?? "").toString().trim().toUpperCase();
  if (normalized === "FREE" || normalized === "PAID") return normalized;
  throw new Error("Invalid package code. Only FREE or PAID are allowed.");
}

function assertFeatureObject(features: any) {
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    throw new Error("features must be a JSON object.");
  }
}

function assertFeatureList(features: any) {
  if (!Array.isArray(features.feature_list) || features.feature_list.length === 0) {
    throw new Error("features.feature_list must be a non-empty array.");
  }
}

function ensureSuperAdmin(role: string | null | undefined) {
  if (role !== "super-admin") {
    throw new Error("Only super admins can manage pricing.");
  }
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateIndividualPricingInput(role: string | null | undefined, monthlyPrice: any) {
  ensureSuperAdmin(role);
  const price = Number(monthlyPrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("monthly_price must be a positive number.");
  }
  return { monthly_price: price };
}

export function validateIndividualPackageUpdateInput(
  role: string | null | undefined,
  codeInput: string,
  payload: {
    name?: string;
    description?: string | null;
    features?: IndividualPackageFeatures;
  }
) {
  ensureSuperAdmin(role);
  const code = validateIndividualPackageCode(codeInput);
  const name = (payload.name ?? "").toString().trim();
  if (!name) {
    throw new Error("name is required.");
  }
  const description =
    payload.description === undefined || payload.description === null
      ? null
      : payload.description.toString();
  assertFeatureObject(payload.features);
  const features: IndividualPackageFeatures = payload.features as any;
  assertFeatureList(features);

  if (code === "FREE") {
    const tracking = Number((features as any).trip_tracking_limit);
    const docs = Number((features as any).documents_validation_limit);
    const outside = Number((features as any).outside_trips_limit);
    if (tracking !== 1 || docs !== 1 || outside !== 3) {
      throw new Error(
        "FREE package must include trip_tracking_limit=1, documents_validation_limit=1, outside_trips_limit=3."
      );
    }
  }

  if (code === "PAID") {
    const tripsUnlimited = Boolean((features as any).trips_unlimited);
    const loadboardUnlimited = Boolean((features as any).loadboard_unlimited);
    const truckboardUnlimited = Boolean((features as any).truckboard_unlimited);
    if (!tripsUnlimited || !loadboardUnlimited || !truckboardUnlimited) {
      throw new Error(
        "PAID package must indicate unlimited access for trips, loadboard, and truckboard."
      );
    }
    const numericLimits = [
      (features as any).trip_tracking_limit,
      (features as any).documents_validation_limit,
      (features as any).outside_trips_limit,
    ].filter((v) => v !== null && v !== undefined);
    const hasRestrictiveLimit = numericLimits.some((v) => Number(v) > 0);
    if (hasRestrictiveLimit) {
      throw new Error("PAID package cannot set restrictive limits.");
    }
  }

  return { code, name, description, features };
}

export function validateCompanyPricingInput(
  role: string | null | undefined,
  tiers: CompanyTierInput[]
): ValidatedCompanyTier[] {
  ensureSuperAdmin(role);
  if (!Array.isArray(tiers)) {
    throw new Error("tiers must be an array.");
  }
  if (tiers.length > 4) {
    throw new Error("Maximum of 4 tiers allowed.");
  }

  const sanitized: ValidatedCompanyTier[] = tiers.map((tier, index) => {
    const name = (tier.name || "").trim();
    const isEnterprise =
      Boolean(tier.is_enterprise) || name.toLowerCase() === "enterprise";
    const sortOrder =
      tier.sort_order != null && Number.isFinite(Number(tier.sort_order))
        ? Number(tier.sort_order)
        : index;

    if (!name) {
      throw new Error(`Tier ${index + 1}: name is required.`);
    }

    const min = tier.min_vehicles == null ? null : Number(tier.min_vehicles);
    const max = tier.max_vehicles == null ? null : Number(tier.max_vehicles);
    const price =
      tier.monthly_price == null ? null : Number(tier.monthly_price);
    const salesLink = tier.sales_form_link
      ? tier.sales_form_link.trim()
      : null;

    if (isEnterprise) {
      if (price !== null) {
        throw new Error("Enterprise tier cannot have monthly_price.");
      }
      if (!salesLink || !isValidUrl(salesLink)) {
        throw new Error("Enterprise tier requires a valid sales_form_link.");
      }
    } else {
      if (min == null || max == null) {
        throw new Error(`Tier ${index + 1}: min_vehicles and max_vehicles are required.`);
      }
      if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max <= 0) {
        throw new Error(`Tier ${index + 1}: vehicle counts must be positive integers.`);
      }
      if (min > max) {
        throw new Error(`Tier ${index + 1}: min_vehicles cannot exceed max_vehicles.`);
      }
      if (price === null || !Number.isFinite(price) || price <= 0) {
        throw new Error(`Tier ${index + 1}: monthly_price must be a positive number.`);
      }
    }

    return {
      name,
      min_vehicles: min,
      max_vehicles: max,
      monthly_price: isEnterprise ? null : price,
      sales_form_link: salesLink,
      is_enterprise: isEnterprise,
      sort_order: sortOrder,
    };
  });

  // Overlap check for non-enterprise tiers
  const nonEnterprise = sanitized.filter((t) => !t.is_enterprise);
  const sortedByMin = [...nonEnterprise].sort((a, b) => {
    assert(a.min_vehicles !== null && b.min_vehicles !== null);
    return a.min_vehicles - b.min_vehicles;
  });
  for (let i = 1; i < sortedByMin.length; i += 1) {
    const prev = sortedByMin[i - 1]!;
    const curr = sortedByMin[i]!;
    if (
      prev.max_vehicles != null &&
      curr.min_vehicles != null &&
      curr.min_vehicles <= prev.max_vehicles
    ) {
      throw new Error("Tier ranges must not overlap.");
    }
  }

  return sanitized;
}
