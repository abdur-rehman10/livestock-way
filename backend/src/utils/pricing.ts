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
