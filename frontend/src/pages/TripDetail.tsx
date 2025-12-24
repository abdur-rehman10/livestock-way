import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  fetchLoadById,
  type LoadDetail,
  API_BASE_URL,
  fetchTripExpenses,
  createTripExpense,
  updateTripExpense,
  deleteTripExpense,
  fetchTripByLoadId,
} from "../lib/api";
import type { TripExpense, TripRecord, Payment } from "../lib/types";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { normalizeLoadStatus, formatLoadStatusLabel } from "../lib/status";
import { getPaymentByTrip } from "../api/payments";
import {
  assignTripDriver,
  assignTripVehicle,
  startMarketplaceTrip,
  markMarketplaceTripDelivered,
  confirmMarketplaceTripDelivery,
  createEscrowPaymentIntent,
  triggerPaymentWebhook,
  fetchTripByLoadId as fetchMarketplaceTripByLoad,
  fetchHaulerDrivers,
  fetchHaulerVehicles,
  type TripEnvelope,
  type HaulerDriverOption,
  type HaulerVehicleOption,
} from "../api/marketplace";
import { PaymentCard } from "../components/PaymentCard";
import { toast } from "sonner";


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
  const currentUserId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const currentUserRole = storage.get<string | null>(
    STORAGE_KEYS.USER_ROLE,
    null
  );

  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);
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
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [marketplaceContext, setMarketplaceContext] = useState<TripEnvelope | null>(null);
  const [marketplaceContextLoading, setMarketplaceContextLoading] = useState(true);
  const [marketplaceContextError, setMarketplaceContextError] = useState<string | null>(null);
  const [driverInput, setDriverInput] = useState("");
  const [vehicleInput, setVehicleInput] = useState("");
  const [assignDriverLoading, setAssignDriverLoading] = useState(false);
  const [assignVehicleLoading, setAssignVehicleLoading] = useState(false);
  const [tripActionLoading, setTripActionLoading] = useState(false);
  const [driverOptions, setDriverOptions] = useState<HaulerDriverOption[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<HaulerVehicleOption[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const marketplaceTripId = marketplaceContext?.trip ? Number(marketplaceContext.trip.id) : null;
  const tripId = trip?.id ?? marketplaceTripId;

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

  const loadMarketplaceContext = useCallback(async () => {
    if (!id) {
      setMarketplaceContext(null);
      setMarketplaceContextLoading(false);
      return;
    }
    try {
      setMarketplaceContextLoading(true);
      setMarketplaceContextError(null);
      const ctx = await fetchMarketplaceTripByLoad(Number(id));
      setMarketplaceContext(ctx);
    } catch (err: any) {
      console.error("Error loading marketplace trip", err);
      setMarketplaceContext(null);
      setMarketplaceContextError(err?.message || "Trip not created yet.");
    } finally {
      setMarketplaceContextLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMarketplaceContext();
  }, [loadMarketplaceContext]);

  const loadResourceOptions = useCallback(async () => {
    try {
      setResourceLoading(true);
      setResourceError(null);
      const [driversResp, vehiclesResp] = await Promise.all([
        fetchHaulerDrivers(),
        fetchHaulerVehicles(),
      ]);
      setDriverOptions(driversResp.items ?? []);
      setVehicleOptions(vehiclesResp.items ?? []);
    } catch (err: any) {
      setResourceError(err?.message ?? "Failed to load drivers or vehicles.");
      setDriverOptions([]);
      setVehicleOptions([]);
    } finally {
      setResourceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserRole !== "hauler") {
      setDriverOptions([]);
      setVehicleOptions([]);
      return;
    }
    loadResourceOptions();
  }, [currentUserRole, loadResourceOptions]);

  useEffect(() => {
    if (!load || !load.id) return;

    const loadId = load.id;

    let cancelled = false;
    async function loadTripRecord() {
      try {
        setTripLoading(true);
        setTripError(null);
        const tripRecord = await fetchTripByLoadId(loadId);
        if (!cancelled) {
          setTrip(tripRecord);
        }
      } catch (err: any) {
        console.error("Error fetching trip for load", err);
        if (!cancelled) {
          setTripError(err?.message || "Trip not created yet.");
          setTrip(null);
        }
      } finally {
        if (!cancelled) {
          setTripLoading(false);
        }
      }
    }

    loadTripRecord();
    return () => {
      cancelled = true;
    };
  }, [load?.id]);

  useEffect(() => {
    const currentTripId = tripId;

    if (!currentTripId) {
      setExpenses([]);
      setExpensesLoading(false);
      setPayment(null);
      setPaymentLoading(false);
      setPaymentError(null);
      return;
    }

    const safeTripId: number = currentTripId;

    let cancelled = false;
    async function loadExpenses() {
      try {
        setExpensesLoading(true);
        setExpensesError(null);
        const data = await fetchTripExpenses(safeTripId);
        if (!cancelled) {
          setExpenses(data);
        }
      } catch (err: any) {
        console.error("Error loading trip expenses", err);
        if (!cancelled) {
          setExpensesError(
            err?.message || "Failed to load expenses for this trip."
          );
        }
      } finally {
        if (!cancelled) {
          setExpensesLoading(false);
        }
      }
    }

    loadExpenses();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    if (!tripId) {
      setPayment(null);
      setPaymentError(null);
      setPaymentLoading(false);
      return;
    }

    let cancelled = false;
    const safeTripId: number = tripId;
    async function loadPayment() {
      try {
        setPaymentLoading(true);
        setPaymentError(null);
        const data = await getPaymentByTrip(safeTripId);
        if (!cancelled) {
          setPayment(data);
        }
      } catch (err: any) {
        console.error("Error loading payment for trip", err);
        if (!cancelled) {
          setPayment(null);
          setPaymentError(
            err?.message || "Failed to load payment information."
          );
        }
      } finally {
        if (!cancelled) {
          setPaymentLoading(false);
        }
      }
    }

    loadPayment();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId) {
      setExpenseSubmitError("Trip has not been created yet.");
      return;
    }
    const safeTripId: number = tripId;

    const amountNumber = Number(expenseAmount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setExpenseSubmitError("Please enter a valid positive amount.");
      return;
    }

    try {
      setExpenseSubmitting(true);
      setExpenseSubmitError(null);

      if (!currentUserId) {
        setExpenseSubmitError("Please log in to submit expenses.");
        return;
      }

      const driverNumericId =
        currentUserId && !Number.isNaN(Number(currentUserId))
          ? Number(currentUserId)
          : null;

      const newExpense = await createTripExpense(safeTripId, {
        driver_id: driverNumericId,
        expense_type: expenseType.toUpperCase(),
        amount: amountNumber,
        currency: "USD",
        description: expenseNote || null,
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
      type: normalizeExpenseType(expense.expense_type),
      amount: Number(expense.amount ?? 0).toString(),
      note: expense.description ?? "",
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
    if (!tripId || editingExpenseId == null) return;
    const safeTripId: number = tripId;

    const amountNumber = Number(editingExpenseFields.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setEditError("Please enter a valid positive amount.");
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);
      const updated = await updateTripExpense(safeTripId, editingExpenseId, {
        expense_type: editingExpenseFields.type.toUpperCase(),
        amount: amountNumber,
        currency: editingExpenseFields.currency || "USD",
        description: editingExpenseFields.note ?? "",
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
    if (!tripId) return;
    const safeTripId: number = tripId;
    const confirmed = window.confirm("Remove this expense?");
    if (!confirmed) return;

    try {
      setDeletingExpenseId(expenseId);
      setExpensesError(null);
      await deleteTripExpense(safeTripId, expenseId);
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

  const handleFundEscrow = async () => {
    if (!marketplaceTripId) {
      setFundError("Trip has not been created yet.");
      return;
    }
    setFundError(null);
    try {
      setFunding(true);
      const intent = await createEscrowPaymentIntent(String(marketplaceTripId), {
        provider: "livestockway",
      });
      const intentId = intent.payment?.external_intent_id;
      if (intentId) {
        await triggerPaymentWebhook(intentId, "payment_succeeded");
      }
      toast.success("Escrow funded successfully.");
      await loadMarketplaceContext();
      try {
        const refreshed = await getPaymentByTrip(marketplaceTripId);
        setPayment(refreshed);
      } catch (err) {
        console.error("Failed to refresh payment after funding", err);
      }
    } catch (err: any) {
      console.error("Failed to fund escrow", err);
      setFundError(err?.message || "Unable to fund escrow right now.");
    } finally {
      setFunding(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!marketplaceContext?.trip) {
      toast.error("Trip not ready yet.");
      return;
    }
    if (!driverInput.trim()) {
      toast.error("Enter a driver ID.");
      return;
    }
    try {
      setAssignDriverLoading(true);
      await assignTripDriver(marketplaceContext.trip.id, driverInput.trim());
      toast.success("Driver assigned.");
      setDriverInput("");
      await loadMarketplaceContext();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to assign driver.");
    } finally {
      setAssignDriverLoading(false);
    }
  };

  const handleAssignVehicle = async () => {
    if (!marketplaceContext?.trip) {
      toast.error("Trip not ready yet.");
      return;
    }
    if (!vehicleInput.trim()) {
      toast.error("Enter a vehicle ID.");
      return;
    }
    try {
      setAssignVehicleLoading(true);
      await assignTripVehicle(marketplaceContext.trip.id, vehicleInput.trim());
      toast.success("Vehicle assigned.");
      setVehicleInput("");
      await loadMarketplaceContext();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to assign vehicle.");
    } finally {
      setAssignVehicleLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!marketplaceContext?.trip) return;
    try {
      setTripActionLoading(true);
      await startMarketplaceTrip(marketplaceContext.trip.id);
      toast.success("Trip started.");
      await loadMarketplaceContext();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to start trip.");
    } finally {
      setTripActionLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!marketplaceContext?.trip) return;
    try {
      setTripActionLoading(true);
      await markMarketplaceTripDelivered(marketplaceContext.trip.id);
      toast.success("Trip marked delivered.");
      await loadMarketplaceContext();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to mark delivered.");
    } finally {
      setTripActionLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!marketplaceContext?.trip) return;
    try {
      setTripActionLoading(true);
      await confirmMarketplaceTripDelivery(marketplaceContext.trip.id);
      toast.success("Delivery confirmed.");
      await loadMarketplaceContext();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to confirm delivery.");
    } finally {
      setTripActionLoading(false);
    }
  };

  const marketplaceTrip = marketplaceContext?.trip ?? null;
  const marketplacePayment = marketplaceContext?.payment ?? null;
  const assignedDriver = useMemo(() => {
    if (!marketplaceTrip?.assigned_driver_id) return null;
    return driverOptions.find(
      (driver) => String(driver.id) === String(marketplaceTrip.assigned_driver_id)
    );
  }, [driverOptions, marketplaceTrip?.assigned_driver_id]);
  const assignedVehicle = useMemo(() => {
    if (!marketplaceTrip?.assigned_vehicle_id) return null;
    return vehicleOptions.find(
      (vehicle) => String(vehicle.id) === String(marketplaceTrip.assigned_vehicle_id)
    );
  }, [vehicleOptions, marketplaceTrip?.assigned_vehicle_id]);

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
  const statusKey = normalizeLoadStatus(load.status);
  const badgeLabel = statusLabel[statusKey] ?? formatLoadStatusLabel(load.status);
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

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Marketplace Trip Status</h2>
          {marketplaceTrip && (
            <span className="text-xs font-medium text-gray-600">
              {marketplaceTrip.status.replace(/_/g, " ")}
            </span>
          )}
        </div>
        {marketplaceContextLoading ? (
          <p className="text-xs text-gray-500">Loading trip context…</p>
        ) : marketplaceContextError ? (
          <p className="text-xs text-rose-600">{marketplaceContextError}</p>
        ) : !marketplaceTrip ? (
          <p className="text-xs text-gray-500">Trip has not been created yet.</p>
        ) : (
          <>
            <div className="grid gap-3 text-xs text-gray-600 md:grid-cols-3">
              <div>
                <p className="font-semibold text-gray-900">Driver</p>
                <p className="text-gray-900">
                  {assignedDriver
                    ? `${assignedDriver.full_name}${assignedDriver.phone_number ? ` · ${assignedDriver.phone_number}` : ""
                      }`
                    : marketplaceTrip.assigned_driver_id
                      ? `Driver #${marketplaceTrip.assigned_driver_id}`
                      : "Not assigned"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Vehicle</p>
                <p className="text-gray-900">
                  {assignedVehicle
                    ? `${assignedVehicle.truck_name || assignedVehicle.plate_number || `Truck #${assignedVehicle.id}`
                    }${assignedVehicle.plate_number ? ` · ${assignedVehicle.plate_number}` : ""}`
                    : marketplaceTrip.assigned_vehicle_id
                      ? `Truck #${marketplaceTrip.assigned_vehicle_id}`
                      : "Not assigned"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Payment</p>
                <p>{marketplacePayment?.status ?? "Pending"}</p>
              </div>
            </div>
            {currentUserRole === "hauler" &&
              ["PENDING_ESCROW", "READY_TO_START"].includes(
                marketplaceTrip.status ?? ""
              ) && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Assign Driver</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={driverInput}
                      onChange={(e) => setDriverInput(e.target.value)}
                      onFocus={() => {
                        if (!resourceLoading) {
                          loadResourceOptions();
                        }
                      }}
                    >
                        <option value="">Select driver</option>
                        {driverOptions.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name || `Driver #${driver.id}`}
                            {driver.status ? ` (${driver.status})` : ""}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={handleAssignDriver}
                        disabled={
                          assignDriverLoading ||
                          !driverInput.trim() ||
                          resourceLoading ||
                          driverOptions.length === 0
                        }
                      >
                        {assignDriverLoading ? "Assigning…" : "Assign Driver"}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Assign Vehicle</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={vehicleInput}
                      onChange={(e) => setVehicleInput(e.target.value)}
                      onFocus={() => {
                        if (!resourceLoading) {
                          loadResourceOptions();
                        }
                      }}
                    >
                        <option value="">Select vehicle</option>
                        {vehicleOptions.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.plate_number || `Truck #${vehicle.id}`}
                            {vehicle.truck_type ? ` – ${vehicle.truck_type}` : ""}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={handleAssignVehicle}
                        disabled={
                          assignVehicleLoading ||
                          !vehicleInput.trim() ||
                          resourceLoading ||
                          vehicleOptions.length === 0
                        }
                      >
                        {assignVehicleLoading ? "Assigning…" : "Assign Vehicle"}
                      </Button>
                    </div>
                  </div>
                  {resourceLoading && (
                    <p className="text-[11px] text-gray-500">
                      Loading drivers and vehicles…
                    </p>
                  )}
                  {resourceError && (
                    <p className="text-[11px] text-rose-600">{resourceError}</p>
                  )}
                </>
              )}
            <div className="flex flex-wrap gap-2">
              {currentUserRole === "hauler" &&
                marketplaceTrip.status === "READY_TO_START" &&
                marketplacePayment?.status === "ESCROW_FUNDED" && (
                  <Button
                    size="sm"
                    onClick={handleStartTrip}
                    disabled={tripActionLoading}
                  >
                    {tripActionLoading ? "Processing…" : "Start Trip"}
                  </Button>
                )}
              {currentUserRole === "hauler" &&
                marketplaceTrip.status === "IN_PROGRESS" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleMarkDelivered}
                    disabled={tripActionLoading}
                  >
                    {tripActionLoading ? "Processing…" : "Mark Delivered"}
                  </Button>
                )}
              {currentUserRole === "shipper" &&
                marketplacePayment?.status === "AWAITING_FUNDING" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleFundEscrow}
                    disabled={funding}
                  >
                    {funding ? "Funding…" : "Fund Escrow"}
                  </Button>
                )}
              {currentUserRole === "shipper" &&
                marketplaceTrip.status === "DELIVERED_AWAITING_CONFIRMATION" &&
                marketplacePayment?.status === "ESCROW_FUNDED" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white"
                    onClick={handleConfirmDelivery}
                    disabled={tripActionLoading}
                  >
                    {tripActionLoading ? "Processing…" : "Confirm Delivery"}
                  </Button>
                )}
            </div>
            {fundError && (
              <p className="text-xs text-rose-600">{fundError}</p>
            )}
          </>
        )}
      </div>

      {load && (() => {
        const events = [
          {
            label: "Load posted",
            at: load.created_at,
            description:
              load.created_by || load.posted_by
                ? `Posted by ${load.created_by || load.posted_by}`
                : undefined,
            active: true,
          },
          {
            label: "Assigned to hauler",
            at: load.assigned_at || null,
            description: load.assigned_to
              ? `Assigned to ${load.assigned_to}`
              : undefined,
            active:
              load.status === "assigned" ||
              load.status === "in_transit" ||
              load.status === "delivered",
          },
          {
            label: "Trip started",
            at: load.started_at || null,
            description: "Driver departed with livestock",
            active:
              load.status === "in_transit" ||
              load.status === "delivered",
          },
          {
            label: "Trip completed",
            at: load.completed_at || null,
            description: load.epod_url
              ? "Delivery confirmed, ePOD captured"
              : "Marked delivered",
            active: load.status === "delivered",
          },
        ];
        return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Trip activity</h2>
            <p className="text-[11px] text-gray-500">
              Status changes for this load
            </p>
          </div>
          <ol className="relative border-l border-gray-200 pl-4 space-y-4">
            {events.map((event, index) => {
              const isDone = !!event.at;
              const isActive = event.active;
              return (
                <li key={index} className="ml-1">
                  <span
                    className={[
                      "absolute -left-[9px] flex h-3 w-3 items-center justify-center rounded-full border",
                      isDone
                        ? "border-emerald-500 bg-emerald-500"
                        : isActive
                          ? "border-emerald-500 bg-white"
                          : "border-gray-300 bg-white",
                    ].join(" ")}
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "text-xs font-medium",
                          isDone
                            ? "text-emerald-700"
                            : isActive
                              ? "text-gray-900"
                              : "text-gray-400",
                        ].join(" ")}
                      >
                        {event.label}
                      </span>
                      {!event.at && isActive && (
                        <span className="rounded-full bg-emerald-50 px-2 py-[1px] text-[10px] font-medium text-emerald-700">
                          current
                        </span>
                      )}
                    </div>
                    {event.at ? (
                      <p className="text-[11px] text-gray-500">
                        {new Date(event.at).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400">Not yet occurred</p>
                    )}
                    {event.description && (
                      <p className="text-[11px] text-gray-600">{event.description}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )})()}

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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate(`${trackingBase}/trips/${load.id}/tracking`)}
              className="inline-flex items-center rounded-md border border-emerald-200 px-3 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50"
            >
              View tracking
            </button>
            <button
              type="button"
              onClick={() => navigate(`${trackingBase}/trips/${load.id}/chat`)}
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Open chat
            </button>
          </div>
        </div>

      </div>

      {paymentLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-500">
          Loading escrow…
        </div>
      ) : paymentError ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-red-600">
          {paymentError}
        </div>
      ) : !payment ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-500">
          No payment record yet. Accept this load to initiate escrow.
        </div>
      ) : (
        <PaymentCard
          payment={payment}
          isShipper={currentUserRole?.toUpperCase() === "SHIPPER"}
          onFund={handleFundEscrow}
          funding={funding}
          fundError={fundError}
          paymentMode={(payment as any).payment_mode}
        />
      )}

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
            disabled={expenseSubmitting || !tripId}
              className="bg-[#29CA8D] hover:bg-[#24b67d] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {expenseSubmitting ? "Saving…" : "Add expense"}
            </Button>
          </div>
        </form>

        {!tripId && !tripLoading && (
          <div className="text-[11px] text-gray-500">
            Accept this load to create a trip before logging expenses.
          </div>
        )}

        <div className="border-t border-gray-100 pt-3">
          {!tripId ? (
            <div className="text-[11px] text-gray-500">
              Trip not created yet. Expenses will appear here once the trip
              starts.
            </div>
          ) : expensesLoading ? (
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
                            {normalizeExpenseType(exp.expense_type)} ·{" "}
                            {Number(exp.amount).toFixed(2)} {exp.currency}
                          </div>
                          {exp.description && (
                            <div className="text-gray-700">{exp.description}</div>
                          )}
                          <div className="text-[10px] text-gray-400">
                            {new Date(exp.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          {exp.driver_id && (
                            <div className="text-gray-500 text-right">
                              Driver ID
                              <br />
                              <span className="font-mono">{exp.driver_id}</span>
                            </div>
                          )}
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
