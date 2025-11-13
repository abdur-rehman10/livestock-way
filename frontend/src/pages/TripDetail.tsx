import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  fetchLoadById,
  type LoadDetail,
  API_BASE_URL,
  fetchTripExpenses,
  createTripExpense,
  updateTripExpense,
  deleteTripExpense,
} from "../lib/api";
import type { TripExpense } from "../lib/types";
import { Button } from "../components/ui/button";


const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const statusLabel: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  in_transit: "In transit",
  delivered: "Delivered",
};

const statusColor: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  assigned: "bg-amber-100 text-amber-800",
  in_transit: "bg-sky-100 text-sky-800",
  delivered: "bg-emerald-100 text-emerald-800",
};

const resolveEpodUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url}`;
};

const EXPENSE_TYPES: Array<
  "fuel" | "toll" | "washout" | "feed" | "repair" | "other"
> = ["fuel", "toll", "washout", "feed", "repair", "other"];

const normalizeExpenseType = (
  value?: string
): (typeof EXPENSE_TYPES)[number] => {
  if (!value) return "other";
  const lower = value.toLowerCase();
  return (EXPENSE_TYPES as string[]).includes(lower)
    ? (lower as (typeof EXPENSE_TYPES)[number])
    : "other";
};

export function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [expenseType, setExpenseType] = useState<
    "fuel" | "toll" | "washout" | "feed" | "repair" | "other"
  >("fuel");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseSubmitError, setExpenseSubmitError] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingExpenseFields, setEditingExpenseFields] = useState<{
    type: "fuel" | "toll" | "washout" | "feed" | "repair" | "other";
    amount: string;
    note: string;
    currency: string;
  }>({
    type: "fuel",
    amount: "",
    note: "",
    currency: "USD",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Missing trip ID in URL.");
      setLoading(false);
      return;
    }

    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      setError("Invalid trip ID.");
      setLoading(false);
      return;
    }

    async function loadTrip() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLoadById(numericId);
        setLoad(data);
      } catch (err: any) {
        console.error("Error loading trip", err);
        setError(
          err?.message || "Something went wrong while loading this trip."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTrip();
  }, [id]);

  useEffect(() => {
    if (!load?.id) return;

    async function loadExpenses() {
      try {
        setExpensesLoading(true);
        setExpensesError(null);
        const data = await fetchTripExpenses(load.id);
        setExpenses(data);
      } catch (err: any) {
        console.error("Error loading trip expenses", err);
        setExpensesError(
          err?.message || "Failed to load expenses for this trip."
        );
      } finally {
        setExpensesLoading(false);
      }
    }

    loadExpenses();
  }, [load?.id]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!load?.id) return;

    const amountNumber = Number(expenseAmount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setExpenseSubmitError("Please enter a valid positive amount.");
      return;
    }

    try {
      setExpenseSubmitting(true);
      setExpenseSubmitError(null);

      const newExpense = await createTripExpense(load.id, {
        user_id: "demo_hauler_1",
        user_role: "hauler",
        type: expenseType,
        amount: amountNumber,
        currency: "USD",
        note: expenseNote || undefined,
      });

      setExpenses((prev) => [newExpense, ...prev]);
      setExpenseAmount("");
      setExpenseNote("");
      setExpenseType("fuel");
    } catch (err: any) {
      console.error("Error creating expense", err);
      setExpenseSubmitError(
        err?.message || "Failed to save expense. Please try again."
      );
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const startEditingExpense = (expense: TripExpense) => {
    setEditingExpenseId(expense.id);
    setEditingExpenseFields({
      type: normalizeExpenseType(expense.type),
      amount: Number(expense.amount ?? 0).toString(),
      note: expense.note ?? "",
      currency: expense.currency ?? "USD",
    });
    setEditError(null);
  };

  const cancelEditingExpense = () => {
    setEditingExpenseId(null);
    setEditingExpenseFields({
      type: "fuel",
      amount: "",
      note: "",
      currency: "USD",
    });
    setEditError(null);
  };

  const handleSaveExpenseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!load?.id || editingExpenseId == null) return;

    const amountNumber = Number(editingExpenseFields.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setEditError("Please enter a valid positive amount.");
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);
      const updated = await updateTripExpense(load.id, editingExpenseId, {
        type: editingExpenseFields.type,
        amount: amountNumber,
        currency: editingExpenseFields.currency || "USD",
        note: editingExpenseFields.note ?? "",
      });

      setExpenses((prev) =>
        prev.map((exp) => (exp.id === editingExpenseId ? updated : exp))
      );
      cancelEditingExpense();
    } catch (err: any) {
      console.error("Error updating expense", err);
      setEditError(err?.message || "Failed to update expense.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!load?.id) return;
    const confirmed = window.confirm("Remove this expense?");
    if (!confirmed) return;

    try {
      setDeletingExpenseId(expenseId);
      setExpensesError(null);
      await deleteTripExpense(load.id, expenseId);
      setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
      if (editingExpenseId === expenseId) {
        cancelEditingExpense();
      }
    } catch (err: any) {
      console.error("Error deleting expense", err);
      setExpensesError(err?.message || "Failed to delete expense.");
    } finally {
      setDeletingExpenseId(null);
    }
  };

  if (loading) {

    return (
      <div className="p-4 text-sm text-gray-600">
        Loading trip details…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-sm text-red-600">{error}</div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!load) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Trip not found.
      </div>
    );
  }

  const statusKey = (load.status || "open").toLowerCase();
  const badgeLabel = statusLabel[statusKey] ?? load.status ?? "Unknown";
  const badgeClass = statusColor[statusKey] ?? "bg-gray-100 text-gray-700";
  const roleSegment = location.pathname.split("/").filter(Boolean)[0] ?? "hauler";
  const trackingBase =
    roleSegment === "shipper" || roleSegment === "hauler"
      ? `/${roleSegment}`
      : "/hauler";

  return (
    <div className="p-4 space-y-4">
      {/* Header + breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs text-gray-500 hover:underline"
          >
            ← Back to My Loads
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            Trip #{load.id} –{" "}
            {load.title ||
              `${load.species ?? "Livestock"} • ${load.quantity ?? "?"} head`}
          </h1>
          <div className="text-xs text-gray-500">
            {load.pickup_location ?? "—"} → {load.dropoff_location ?? "—"}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
          >
            {badgeLabel}
          </span>
          <div className="text-[11px] text-gray-500">
            Created: {formatDateTime(load.created_at)}
          </div>
        </div>
      </div>

      {/* Journey + timeline */}
      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-2">
        <div className="space-y-2 text-xs text-gray-700">
          <h2 className="text-sm font-semibold text-gray-900">
            Journey status
          </h2>
          <div>
            <div className="font-medium">Assigned to</div>
            <div className="text-gray-600">
              {load.assigned_to || "Not yet assigned"}
            </div>
          </div>
          <div>
            <div className="font-medium">Pickup time</div>
            <div className="text-gray-600">
              {formatDateTime(load.pickup_date)}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-700">
          <h2 className="text-sm font-semibold text-gray-900">
            Timeline
          </h2>
          <div className="flex flex-col gap-1">
            <div>
              <span className="font-medium">Assigned:</span>{" "}
              {formatDateTime(load.assigned_at)}
            </div>
            <div>
              <span className="font-medium">Started:</span>{" "}
              {formatDateTime(load.started_at)}
            </div>
            <div>
              <span className="font-medium">Delivered:</span>{" "}
              {formatDateTime(load.completed_at)}
            </div>
          </div>
        </div>
      </div>

      {/* ePOD + tracking */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Proof of Delivery (ePOD)
          </h2>
          {resolveEpodUrl(load.epod_url) ? (
            <div className="space-y-1">
              <div className="text-gray-600">
                An ePOD file was attached when this trip was completed.
              </div>
              <a
                href={resolveEpodUrl(load.epod_url) ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-[11px] font-medium text-emerald-700 hover:underline"
              >
                View ePOD
              </a>
            </div>
          ) : (
            <div className="text-gray-500">
              No ePOD has been uploaded yet. It will appear here after the
              driver completes the trip.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Tracking & route
          </h2>
          <div className="text-gray-500 mb-2">
            Live map and IoT telemetry will be integrated in later phases. For
            now, use the tracking view for a monitoring-friendly layout.
          </div>
          <button
            type="button"
            onClick={() => navigate(`${trackingBase}/trips/${load.id}/tracking`)}
            className="inline-flex items-center rounded-md border border-emerald-200 px-3 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50"
          >
            View tracking
          </button>
        </div>

      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Trip expenses</h2>
          <p className="text-[11px] text-gray-500">
            Logged against this load by hauler/driver
          </p>
        </div>

        <form
          onSubmit={handleAddExpense}
          className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end"
        >
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">
              Type
            </label>
            <select
              value={expenseType}
              onChange={(e) =>
                setExpenseType(
                  e.target.value as
                    | "fuel"
                    | "toll"
                    | "washout"
                    | "feed"
                    | "repair"
                    | "other"
                )
              }
              className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {EXPENSE_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option === "feed" ? "Feed / Hay" : option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">
              Amount (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. 150.75"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] font-medium text-gray-700">
              Note (optional)
            </label>
            <input
              type="text"
              value={expenseNote}
              onChange={(e) => setExpenseNote(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. Fuel stop at XYZ station"
            />
          </div>

          {expenseSubmitError && (
            <div className="md:col-span-4 text-[11px] text-red-600">
              {expenseSubmitError}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={expenseSubmitting || !load}
              className="bg-[#29CA8D] hover:bg-[#24b67d] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {expenseSubmitting ? "Saving…" : "Add expense"}
            </Button>
          </div>
        </form>

        <div className="border-t border-gray-100 pt-3">
          {expensesLoading ? (
            <div className="text-[11px] text-gray-500">Loading expenses…</div>
          ) : expensesError ? (
            <div className="text-[11px] text-red-600">{expensesError}</div>
          ) : expenses.length === 0 ? (
            <div className="text-[11px] text-gray-500">
              No expenses logged yet for this trip.
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => {
                const isEditing = editingExpenseId === exp.id;
                return (
                  <div
                    key={exp.id}
                    className="rounded-md bg-gray-50 px-3 py-2 text-[11px]"
                  >
                    {isEditing ? (
                      <form className="space-y-2" onSubmit={handleSaveExpenseEdit}>
                        <div className="grid gap-2 md:grid-cols-4">
                          <select
                            value={editingExpenseFields.type}
                            onChange={(e) =>
                              setEditingExpenseFields((prev) => ({
                                ...prev,
                                type: e.target.value as
                                  | "fuel"
                                  | "toll"
                                  | "washout"
                                  | "feed"
                                  | "repair"
                                  | "other",
                              }))
                            }
                            className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            {EXPENSE_TYPES.map((option) => (
                              <option key={option} value={option}>
                                {option === "feed"
                                  ? "Feed / Hay"
                                  : option.charAt(0).toUpperCase() + option.slice(1)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingExpenseFields.amount}
                            onChange={(e) =>
                              setEditingExpenseFields((prev) => ({
                                ...prev,
                                amount: e.target.value,
                              }))
                            }
                            className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Amount"
                          />
                          <input
                            type="text"
                            value={editingExpenseFields.currency}
                            onChange={(e) =>
                              setEditingExpenseFields((prev) => ({
                                ...prev,
                                currency: e.target.value,
                              }))
                            }
                            className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Currency"
                          />
                          <input
                            type="text"
                            value={editingExpenseFields.note}
                            onChange={(e) =>
                              setEditingExpenseFields((prev) => ({
                                ...prev,
                                note: e.target.value,
                              }))
                            }
                            className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 md:col-span-1"
                            placeholder="Note"
                          />
                        </div>
                        {editError && (
                          <div className="text-[11px] text-red-600">{editError}</div>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelEditingExpense}
                            className="px-3 py-1 text-[11px]"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={editSubmitting}
                            className="bg-[#29CA8D] hover:bg-[#24b67d] px-3 py-1 text-[11px] font-medium text-white disabled:opacity-60"
                          >
                            {editSubmitting ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 capitalize">
                            {exp.type} · {Number(exp.amount).toFixed(2)} {exp.currency}
                          </div>
                          {exp.note && (
                            <div className="text-gray-700">{exp.note}</div>
                          )}
                          <div className="text-[10px] text-gray-400">
                            {new Date(exp.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          <div className="text-gray-500 text-right">
                            {exp.user_role}
                            <br />
                            <span className="font-mono">{exp.user_id}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-[10px] border-gray-300 text-gray-600 hover:bg-gray-100"
                              onClick={() => startEditingExpense(exp)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-[10px] font-medium text-rose-700 border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                              onClick={() => handleDeleteExpense(exp.id)}
                              disabled={deletingExpenseId === exp.id}
                            >
                              {deletingExpenseId === exp.id ? "Deleting…" : "Delete"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TripDetail;
