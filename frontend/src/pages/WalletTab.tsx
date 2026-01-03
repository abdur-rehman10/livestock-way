import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchPaymentsForUser } from "../lib/api";
import type { Payment } from "../lib/types";
import { storage, STORAGE_KEYS } from "../lib/storage";

type UserRole = "shipper" | "hauler" | "driver" | "stakeholder";

function detectRoleFromPath(pathname: string): UserRole {
  if (pathname.startsWith("/hauler")) return "hauler";
  if (pathname.startsWith("/shipper")) return "shipper";
  if (pathname.startsWith("/driver")) return "driver";
  return "stakeholder";
}

export default function WalletTab() {
  const location = useLocation();
  const role = useMemo(
    () => detectRoleFromPath(location.pathname),
    [location.pathname]
  );
  const storedUserId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const userId = useMemo(() => storedUserId, [storedUserId]);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!userId) {
        setError("Please log in to view wallet information.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPaymentsForUser(userId, role);
        setPayments(data);
      } catch (err: any) {
        console.error("Error loading payments", err);
        setError(err?.message || "Failed to load wallet data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, role]);

  const totals = useMemo(() => {
    let credited = 0;
    let debited = 0;

    for (const p of payments) {
      const baseAmount = Number(p.amount || 0);
      const splitCredit =
        p.split_amount_to_hauler !== undefined && p.split_amount_to_hauler !== null
          ? Number(p.split_amount_to_hauler)
          : null;
      const splitRefund =
        p.split_amount_to_shipper !== undefined && p.split_amount_to_shipper !== null
          ? Number(p.split_amount_to_shipper)
          : null;
      const isCredit = userId && p.payee_id === userId && p.payee_role === role;
      const isDebit = userId && p.payer_id === userId && p.payer_role === role;

      if (isCredit) {
        const creditAmount =
          p.status === "SPLIT_BETWEEN_PARTIES" && splitCredit !== null
            ? splitCredit
            : baseAmount;
        credited += creditAmount;
      }

      if (isDebit) {
        let debitAmount = baseAmount;
        if (p.status === "SPLIT_BETWEEN_PARTIES" && splitRefund !== null) {
          debitAmount = Math.max(baseAmount - splitRefund, 0);
          credited += splitRefund;
        }
        debited += debitAmount;
      }
    }

    return {
      credited,
      debited,
      balance: credited - debited,
    };
  }, [payments, role, userId]);

  if (loading) {
    return (
      <div className="p-4 text-xs text-gray-600">
        Loading your wallet…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-xs text-red-600">{error}</div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    );
  }

  const paymentStatusMeta: Record<
    string,
    { label: string; badgeClass: string }
  > = {
    PENDING_FUNDING: {
      label: "Pending",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    FUNDED: {
      label: "Funded",
      badgeClass: "bg-sky-50 text-sky-700 border border-sky-200",
    },
    RELEASED: {
      label: "Released",
      badgeClass: "bg-primary-50 text-emerald-700 border border-emerald-200",
    },
    REFUNDED_TO_SHIPPER: {
      label: "Refunded",
      badgeClass: "bg-blue-50 text-blue-700 border border-blue-200",
    },
    SPLIT_BETWEEN_PARTIES: {
      label: "Split payout",
      badgeClass: "bg-purple-50 text-purple-700 border border-purple-200",
    },
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Wallet & Payments
          </h1>
          <p className="text-[11px] text-gray-500">
          Role: <span className="font-medium capitalize">{role}</span> · User ID:{" "}
          <span className="font-mono text-gray-700">{userId ?? "n/a"}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-[11px] text-gray-500">Total credited</div>
          <div className="mt-1 text-base font-semibold text-emerald-700">
            ${totals.credited.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-[11px] text-gray-500">Total debited</div>
          <div className="mt-1 text-base font-semibold text-rose-600">
            -${totals.debited.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-[11px] text-gray-500">Net balance (Phase 1)</div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            ${totals.balance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-2 text-[11px] font-semibold text-gray-600">
          Transactions
        </div>

        {payments.length === 0 ? (
          <div className="p-4 text-[11px] text-gray-500">
            No payments recorded yet. Complete a trip to see entries here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Trip</th>
                  <th className="px-4 py-2">Direction</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const isCredit = p.payee_id === userId && p.payee_role === role;
                  const isDebit = p.payer_id === userId && p.payer_role === role;
                  const date = p.released_at || p.created_at;
                  const routeLabel =
                    p.pickup_location && p.dropoff_location
                      ? `${p.pickup_location} → ${p.dropoff_location}`
                      : `Trip #${p.load_id}`;

                  const splitCredit =
                    p.split_amount_to_hauler !== undefined && p.split_amount_to_hauler !== null
                      ? Number(p.split_amount_to_hauler)
                      : null;
                  const splitRefund =
                    p.split_amount_to_shipper !== undefined && p.split_amount_to_shipper !== null
                      ? Number(p.split_amount_to_shipper)
                      : null;

                  let directionLabel = "";
                  if (isCredit) directionLabel = "Incoming payment";
                  if (isDebit) directionLabel = "Outgoing payment";
                  if (p.status === "SPLIT_BETWEEN_PARTIES") {
                    directionLabel = isCredit ? "Split payout" : "Split debit";
                  }

                  const creditAmount =
                    isCredit && p.status === "SPLIT_BETWEEN_PARTIES" && splitCredit !== null
                      ? splitCredit
                      : isCredit
                      ? Number(p.amount || 0)
                      : null;
                  const debitAmount =
                    isDebit && p.status === "SPLIT_BETWEEN_PARTIES" && splitRefund !== null
                      ? Math.max(Number(p.amount || 0) - splitRefund, 0)
                      : isDebit
                      ? Number(p.amount || 0)
                      : null;
                  const showRefundRow =
                    splitRefund !== null &&
                    splitRefund > 0 &&
                    p.status === "SPLIT_BETWEEN_PARTIES" &&
                    isDebit;

                  return (
                    <React.Fragment key={`payment-${p.id}`}>
                      <tr className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-gray-600">
                          {date ? new Date(date).toLocaleString() : "—"}
                          {p.status === "SPLIT_BETWEEN_PARTIES" && p.split_resolved_at && (
                            <div className="text-[10px] text-gray-400">
                              Resolved {new Date(p.split_resolved_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {routeLabel}
                          {p.status === "SPLIT_BETWEEN_PARTIES" && (
                            <div className="text-[10px] text-gray-500">Escrow split</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {directionLabel || "—"}
                        </td>
                        <td className="px-4 py-2">
                          {creditAmount !== null && (
                            <span className="font-semibold text-emerald-700">
                              +${creditAmount.toFixed(2)}
                            </span>
                          )}
                          {creditAmount === null && debitAmount !== null && (
                            <span className="font-semibold text-rose-600">
                              -${debitAmount.toFixed(2)}
                            </span>
                          )}
                          {creditAmount === null && debitAmount === null && (
                            <span className="text-gray-500">
                              ${Number(p.amount).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-[1px] text-[10px] font-medium capitalize",
                              paymentStatusMeta[p.status]?.badgeClass ||
                                "bg-gray-100 text-gray-600 border border-gray-200",
                            ].join(" ")}
                          >
                            {paymentStatusMeta[p.status]?.label || p.status}
                          </span>
                        </td>
                      </tr>
                      {showRefundRow && splitRefund !== null && (
                        <tr className="border-t border-gray-50 bg-primary-50/40 text-[10px] text-emerald-800">
                          <td className="px-4 py-2">
                            {p.split_resolved_at
                              ? new Date(p.split_resolved_at).toLocaleString()
                              : date
                              ? new Date(date).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-4 py-2" colSpan={2}>
                            Refund to shipper from split decision
                          </td>
                          <td className="px-4 py-2 font-semibold">
                            +${splitRefund.toFixed(2)}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex rounded-full border border-emerald-200 px-2 py-[1px] text-[10px] font-semibold text-emerald-700">
                              Refund
                            </span>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400">
        Phase 1 note: Payments are simulated based on completed trips and
        simple rules. In later phases this will be connected to real payment
        gateways and escrow flows.
      </p>
    </div>
  );
}
