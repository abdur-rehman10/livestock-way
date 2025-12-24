import type { PaymentMode } from "../services/marketplaceService";

export type PaymentModeSelection = {
  paymentMode: PaymentMode;
  directDisclaimerAt: string | null;
  directDisclaimerVersion: string | null;
};

type ActorRole = "SHIPPER" | "HAULER" | "SUPER_ADMIN" | null;

export function resolvePaymentModeSelection(
  input: {
    payment_mode?: unknown;
    direct_payment_disclaimer_version?: unknown;
    direct_payment_disclaimer_accepted?: unknown;
  },
  actor: ActorRole
): PaymentModeSelection {
  const rawMode = input.payment_mode;
  const providedMode = typeof rawMode === "string" ? rawMode.toUpperCase().trim() : undefined;

  if (providedMode && actor !== "SHIPPER" && actor !== "SUPER_ADMIN") {
    throw new Error("Only shippers can choose payment mode");
  }

  if (providedMode && providedMode !== "DIRECT" && providedMode !== "ESCROW") {
    throw new Error("Invalid payment_mode");
  }

  const paymentMode: PaymentMode = providedMode === "DIRECT" ? "DIRECT" : "ESCROW";

  if (paymentMode === "DIRECT") {
    const accepted = input.direct_payment_disclaimer_accepted === true;
    if (!accepted) {
      throw new Error("direct_payment_disclaimer_accepted must be true for DIRECT payments");
    }
    const version =
      typeof input.direct_payment_disclaimer_version === "string" &&
      input.direct_payment_disclaimer_version.trim().length > 0
        ? input.direct_payment_disclaimer_version.trim()
        : null;
    if (!version) {
      throw new Error("direct_payment_disclaimer_version is required for DIRECT payments");
    }
    return {
      paymentMode,
      directDisclaimerAt: new Date().toISOString(),
      directDisclaimerVersion: version,
    };
  }

  return {
    paymentMode: "ESCROW",
    directDisclaimerAt: null,
    directDisclaimerVersion: null,
  };
}
