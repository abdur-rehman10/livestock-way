import React from "react";
import type { Payment } from "../lib/types";
import { Button } from "./ui/button";

type PaymentStatus = Payment["status"];

const STATUS_META: Record<
  string,
  { label: string; badgeClass: string; description: string }
> = {
  PENDING_FUNDING: {
    label: "Pending",
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
    description: "Escrow not funded yet. Fund before pickup.",
  },
  PENDING: {
    label: "Pending",
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
    description: "Escrow not funded yet. Fund before pickup.",
  },
  FUNDED: {
    label: "Funded",
    badgeClass: "bg-sky-50 text-sky-700 border border-sky-200",
    description: "Escrow funded. Will release after delivery confirmation.",
  },
  RELEASED: {
    label: "Released",
    badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    description: "Escrow released to the hauler.",
  },
};

const formatCurrency = (value?: number | string | null, currency = "USD") => {
  if (value === undefined || value === null) return "—";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numeric)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numeric);
};

interface PaymentCardProps {
  payment: Payment;
  isShipper: boolean;
  onFund: (paymentId: number) => Promise<void>;
  funding?: boolean;
  fundError?: string | null;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({
  payment,
  isShipper,
  onFund,
  funding = false,
  fundError = null,
}) => {
  const normalizedStatus = (payment.status || "").toUpperCase();
  const meta = STATUS_META[normalizedStatus] ?? {
    label: payment.status,
    badgeClass: "bg-gray-100 text-gray-700 border border-gray-200",
    description: "Escrow status updated",
  };

  const [confirmVisible, setConfirmVisible] = React.useState(false);

  const canFund =
    isShipper &&
    ["PENDING_FUNDING", "PENDING"].includes(normalizedStatus) &&
    !funding;

  const handlePrimaryClick = () => {
    setConfirmVisible(true);
  };

  const handleConfirm = () => {
    setConfirmVisible(false);
    onFund(payment.id);
  };

  const handleCancelConfirm = () => {
    setConfirmVisible(false);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Payment & Escrow
          </h2>
          <p className="text-[11px] text-gray-500">
            Tracks the escrow status for this trip
          </p>
        </div>
        <span
          className={[
            "inline-flex rounded-full px-2 py-[2px] text-[11px] font-medium",
            meta.badgeClass,
          ].join(" ")}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <div className="text-2xl font-semibold text-gray-900">
          {formatCurrency(payment.amount, payment.currency)}
        </div>
        <div className="text-[11px] text-gray-500">{meta.description}</div>
      </div>

      {payment.platform_commission_amount !== undefined &&
        payment.platform_commission_amount !== null && (
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
            <div>
              Platform fee:{" "}
              <span className="font-medium">
                {formatCurrency(
                  payment.platform_commission_amount,
                  payment.currency
                )}
              </span>{" "}
              {!!payment.commission_percent &&
                `(${payment.commission_percent}%)`}
            </div>
            {payment.hauler_payout_amount !== undefined &&
              payment.hauler_payout_amount !== null && (
                <div>
                  Hauler payout:{" "}
                  <span className="font-medium">
                    {formatCurrency(
                      payment.hauler_payout_amount,
                      payment.currency
                    )}
                  </span>
                </div>
              )}
          </div>
        )}

      {fundError && (
        <div className="text-[11px] text-red-600">{fundError}</div>
      )}

      {canFund && !confirmVisible && (
        <Button
          type="button"
          onClick={handlePrimaryClick}
          disabled={funding}
          className="bg-[#F97316] hover:bg-[#ea580c] text-white text-[12px]"
        >
          Fund Escrow
        </Button>
      )}

      {canFund && confirmVisible && (
        <div className="space-y-2">
          <div className="text-[11px] text-gray-600">
            Funding escrow charges your card for the full amount. Continue?
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={funding}
              className="bg-[#F97316] hover:bg-[#ea580c] text-white text-[12px]"
            >
              {funding ? "Funding…" : "Yes, fund escrow"}
            </Button>
            <Button
              type="button"
              onClick={handleCancelConfirm}
              variant="outline"
              className="text-[12px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {normalizedStatus === "FUNDED" && (
        <div className="text-[11px] text-emerald-700">
          Escrow funded
          {payment.funded_at
            ? ` on ${new Date(payment.funded_at).toLocaleString()}`
            : ""}{" "}
          . Funds release after delivery confirmation.
        </div>
      )}

      {normalizedStatus === "RELEASED" && (
        <div className="text-[11px] text-emerald-700">
          Payment released
          {payment.released_at
            ? ` on ${new Date(payment.released_at).toLocaleString()}`
            : ""}{" "}
          . Hauler has received the payout.
        </div>
      )}
    </div>
  );
};
