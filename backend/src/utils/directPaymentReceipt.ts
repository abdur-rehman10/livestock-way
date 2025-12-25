import type { DirectPaymentMethod } from "../services/marketplaceService";

export type DirectReceiptPayload = {
  receivedAmount: number;
  paymentMethod: DirectPaymentMethod;
  reference: string | null;
  receivedAt: string | null;
};

const ALLOWED_METHODS: DirectPaymentMethod[] = ["CASH", "BANK_TRANSFER", "OTHER"];

export function resolveDirectPaymentReceipt(
  paymentMode: string | null | undefined,
  body: any
): DirectReceiptPayload | null {
  const normalizedMode = (paymentMode || "").toUpperCase();
  const hasReceiptFields =
    body?.received_amount !== undefined ||
    body?.received_payment_method !== undefined ||
    body?.received_reference !== undefined ||
    body?.received_at !== undefined;

  if (normalizedMode !== "DIRECT") {
    if (hasReceiptFields) {
      throw new Error("Received payment fields are not applicable for escrow trips");
    }
    return null;
  }

  const amountRaw = body?.received_amount;
  const methodRaw = body?.received_payment_method;

  if (amountRaw === undefined || methodRaw === undefined) {
    throw new Error("received_amount and received_payment_method are required for direct trips");
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("received_amount must be a positive number");
  }

  const method = String(methodRaw).toUpperCase() as DirectPaymentMethod;
  if (!ALLOWED_METHODS.includes(method)) {
    throw new Error("received_payment_method must be CASH, BANK_TRANSFER, or OTHER");
  }

  let receivedAt: string | null = null;
  if (body?.received_at !== undefined && body?.received_at !== null) {
    const dt = new Date(body.received_at);
    if (Number.isNaN(dt.getTime())) {
      throw new Error("received_at must be a valid timestamp");
    }
    receivedAt = dt.toISOString();
  }

  const reference =
    typeof body?.received_reference === "string" && body.received_reference.trim().length
      ? body.received_reference.trim()
      : null;

  return {
    receivedAmount: amount,
    paymentMethod: method,
    reference,
    receivedAt,
  };
}
