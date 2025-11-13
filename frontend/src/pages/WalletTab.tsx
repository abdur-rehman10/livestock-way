import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchPaymentsForUser } from "../lib/api";
import type { Payment } from "../lib/types";

type UserRole = "shipper" | "hauler" | "driver" | "stakeholder";

function detectRoleFromPath(pathname: string): UserRole {
  if (pathname.startsWith("/hauler")) return "hauler";
  if (pathname.startsWith("/shipper")) return "shipper";
  if (pathname.startsWith("/driver")) return "driver";
  return "stakeholder";
}

function getDemoUserId(role: UserRole): string {
  switch (role) {
    case "shipper":
      return "demo_shipper_1";
    case "hauler":
      return "demo_hauler_1";
    case "driver":
      return "demo_driver_1";
    case "stakeholder":
    default:
      return "demo_stakeholder_1";
  }
}

export default function WalletTab() {
  const location = useLocation();
  const role = useMemo(
    () => detectRoleFromPath(location.pathname),
    [location.pathname]
  );
  const userId = useMemo(() => getDemoUserId(role), [role]);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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
      if (p.payee_id === userId && p.payee_role === role) {
        credited += Number(p.amount || 0);
      }
      if (p.payer_id === userId && p.payer_role === role) {
        debited += Number(p.amount || 0);
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

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Wallet & Payments
          </h1>
          <p className="text-[11px] text-gray-500">
            Role: <span className="font-medium capitalize">{role}</span> · User ID:{" "}
            <span className="font-mono text-gray-700">{userId}</span>
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

                  let directionLabel = "";
                  if (isCredit) directionLabel = "Incoming payment";
                  if (isDebit) directionLabel = "Outgoing payment";

                  return (
                    <tr
                      key={p.id}
                      className="border-t border-gray-100 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-2 text-gray-600">
                        {date ? new Date(date).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{routeLabel}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {directionLabel || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {isCredit && (
                          <span className="font-semibold text-emerald-700">
                            +${Number(p.amount).toFixed(2)}
                          </span>
                        )}
                        {isDebit && (
                          <span className="font-semibold text-rose-600">
                            -${Number(p.amount).toFixed(2)}
                          </span>
                        )}
                        {!isCredit && !isDebit && (
                          <span className="text-gray-500">
                            ${Number(p.amount).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 capitalize text-gray-600">
                        {p.status}
                      </td>
                    </tr>
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
