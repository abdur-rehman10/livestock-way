import { validateIndividualPackageCode } from "./pricing";

export type AccountMode = "INDIVIDUAL" | "COMPANY" | null;

export function isIndividualHaulerSignup(userType?: string | null, accountMode?: AccountMode) {
  const normalizedRole = (userType ?? "").toString().toLowerCase();
  const normalizedMode = (accountMode ?? "").toString().toUpperCase();
  return normalizedRole.startsWith("hauler") && normalizedMode === "INDIVIDUAL";
}

export function resolveSignupPlanSelection(params: {
  userType?: string | null;
  accountMode?: AccountMode | undefined;
  planCode?: string | null | undefined;
}) {
  const { userType, accountMode, planCode } = params;
  const requiresPlan = isIndividualHaulerSignup(userType, accountMode);

  if (!requiresPlan) {
    return {
      planCode: null as "FREE" | "PAID" | null,
      onboardingCompleted: false,
      selectedAt: null as Date | null,
    };
  }

  if (!planCode) {
    const err = new Error("individual_plan_code is required for individual haulers.");
    (err as any).status = 400;
    throw err;
  }

  const validatedCode = validateIndividualPackageCode(planCode);
  const onboardingCompleted = validatedCode === "FREE";
  const selectedAt = new Date();

  return {
    planCode: validatedCode,
    onboardingCompleted,
    selectedAt,
  };
}
