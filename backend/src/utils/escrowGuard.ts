import type { PaymentRecord, TripRecord } from "../services/marketplaceService";

const ESCROW_DISABLED_ERROR = Object.assign(new Error("Escrow is disabled for direct payment trips"), {
  code: "ESCROW_DISABLED",
  status: 409,
});

export function assertEscrowEnabled(context: { trip?: TripRecord | null; payment?: PaymentRecord | null }) {
  if (!context.trip && !context.payment) {
    return;
  }
  const mode = context.trip?.payment_mode;
  const isEscrowPayment =
    context.payment?.is_escrow === true || (context.trip && context.trip.payment_mode !== "DIRECT");

  if (mode === "DIRECT" || !isEscrowPayment) {
    throw ESCROW_DISABLED_ERROR;
  }
}

export function escrowDisabledResponse(res: any) {
  return res
    .status(409)
    .json({ error: "Escrow is disabled for direct payment trips", code: "ESCROW_DISABLED" });
}

const DISPUTES_DISABLED_ERROR = Object.assign(
  new Error("Disputes are disabled for direct payment trips"),
  { code: "DISPUTES_DISABLED", status: 403 }
);

export function assertDisputesEnabled(trip?: TripRecord | null) {
  if (trip && trip.payment_mode === "DIRECT") {
    throw DISPUTES_DISABLED_ERROR;
  }
}

export function disputesDisabledResponse(res: any) {
  return res
    .status(403)
    .json({ error: "Disputes are disabled for direct payment trips", code: "DISPUTES_DISABLED" });
}
