import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Load } from "../lib/api";
import {
  API_BASE_URL,
  fetchLoadsByAssigned,
  startLoad,
  completeLoad,
  uploadEpod,
} from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Separator } from "../components/ui/separator";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  Package,
  Play,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

const CURRENT_HAULER_ID = "demo_hauler_1";
const FILTERS = ["all", "assigned", "in_transit", "delivered", "pending"] as const;
type FilterOption = (typeof FILTERS)[number];

type LoadStatus = "open" | "assigned" | "in_transit" | "delivered";

interface ConfirmDialogState {
  open: boolean;
  type: "start" | "deliver" | null;
  load: Load | null;
}

interface DetailsDialogState {
  open: boolean;
  load: Load | null;
}

const badgeStyles: Record<LoadStatus, string> = {
  open: "bg-slate-100 text-slate-700 border border-slate-200",
  assigned: "bg-amber-50 text-amber-700 border border-amber-200",
  in_transit: "bg-[#29CA8D]/10 text-[#29CA8D] border border-[#29CA8D]/30",
  delivered: "bg-slate-100 text-slate-700 border border-slate-200",
};

function normalizeStatus(status?: string | null): LoadStatus {
  const normalized = (status ?? "open").toString().trim().toLowerCase();
  if (normalized === "assigned" || normalized === "in_transit" || normalized === "delivered") {
    return normalized as LoadStatus;
  }
  return "open";
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function formatCurrency(value?: string | number | null) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (numeric == null || Number.isNaN(numeric)) return "N/A";
  return `$${Number(numeric).toFixed(2)}`;
}

function resolveEpodUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
}

export default function HaulerMyLoads() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [epodFile, setEpodFile] = useState<Record<number, File | null>>({});
  const [filter, setFilter] = useState<FilterOption>("all");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    type: null,
    load: null,
  });
  const [detailsDialog, setDetailsDialog] = useState<DetailsDialogState>({
    open: false,
    load: null,
  });
  const navigate = useNavigate();

  async function refresh() {
    try {
      setLoading(true);
      const data = await fetchLoadsByAssigned(CURRENT_HAULER_ID);
      setLoads(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load your accepted loads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredLoads = useMemo(() => {
    if (filter === "all") return loads;
    if (filter === "pending") {
      return loads.filter((load) => normalizeStatus(load.status) === "open");
    }
    return loads.filter((load) => normalizeStatus(load.status) === filter);
  }, [filter, loads]);

  const openConfirm = (type: "start" | "deliver", load: Load) => {
    setConfirmDialog({ open: true, type, load });
  };

  const openDetails = (load: Load) => {
    setDetailsDialog({ open: true, load });
  };

  const closeDetails = () => {
    setDetailsDialog({ open: false, load: null });
  };

  const handleStart = async (loadId: number) => {
    try {
      setBusyId(loadId);
      await startLoad(loadId);
      toast.success("Trip started");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to start trip");
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (loadId: number) => {
    try {
      setBusyId(loadId);
      let epodUrl: string | undefined;
      const file = epodFile[loadId] ?? null;
      if (file) {
        epodUrl = await uploadEpod(file);
      }
      await completeLoad(loadId, epodUrl);
      toast.success("Load marked as delivered");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to mark as delivered");
    } finally {
      setBusyId(null);
    }
  };

  const confirmAction = async () => {
    if (!confirmDialog.load || !confirmDialog.type) {
      setConfirmDialog({ open: false, type: null, load: null });
      return;
    }
    const numericId =
      typeof confirmDialog.load.id === "number"
        ? confirmDialog.load.id
        : Number(confirmDialog.load.id);
    if (Number.isNaN(numericId)) {
      setConfirmDialog({ open: false, type: null, load: null });
      return;
    }
    if (confirmDialog.type === "start") {
      await handleStart(numericId);
    } else {
      await handleComplete(numericId);
    }
    setConfirmDialog({ open: false, type: null, load: null });
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading your loads…</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-3xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                My Loads
              </p>
              <p className="text-base font-semibold text-slate-900">
                Loads you have accepted and are responsible for delivering
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="text-sm font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50"
            onClick={() => {
              setFilter("all");
              refresh();
              toast.success("Demo refreshed");
            }}
          >
            Reset Demo
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FILTERS.map((option) => {
            const label =
              option === "all"
                ? "All"
                : option === "assigned"
                  ? "Assigned"
                  : option === "in_transit"
                    ? "In Transit"
                    : option === "delivered"
                      ? "Delivered"
                      : "Pending";
            const isActive = filter === option;
            return (
              <Button
                key={option}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={
                  isActive
                    ? "bg-[#29CA8D] hover:bg-[#24b67d] text-white"
                    : "text-slate-600"
                }
                onClick={() => setFilter(option)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-900">
          <FileText className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold">My Loads</h2>
        </div>

        {!filteredLoads.length ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No loads match this filter.
          </div>
        ) : (
          filteredLoads.map((load) => {
            const status = normalizeStatus(load.status);
            const pickupTime = formatDateTime(load.pickup_date);
            const assignedTime = formatDateTime(load.assigned_at);
            const startedTime = formatDateTime(load.started_at);
            const deliveredTime = formatDateTime(load.completed_at);
            const offer = formatCurrency(load.offer_price);
            const epodLink = resolveEpodUrl(load.epod_url);
            const loadId = typeof load.id === "number" ? load.id : Number(load.id);
            return (
              <Card
                key={load.id}
                className="mb-4 rounded-[24px] border border-slate-100 shadow-[0_10px_40px_rgba(15,23,42,0.05)]"
              >
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {load.title ||
                          `${load.species ?? "Livestock"} • ${load.quantity ?? "?"} head`}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <span>{load.pickup_location ?? "—"}</span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                        <span>{load.dropoff_location ?? "—"}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>Pickup: {pickupTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <span>Offer: {offer}</span>
                      </div>
                    </div>
                    <Badge
                      className={`rounded-full px-4 py-1 text-xs font-semibold ${badgeStyles[status]}`}
                    >
                      {status === "in_transit"
                        ? "In Transit"
                        : status === "open"
                          ? "Pending"
                          : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-500 space-x-2 flex flex-wrap items-center">
                    {assignedTime !== "—" && <span>Assigned {assignedTime}</span>}
                    {startedTime !== "—" && <span>• Started {startedTime}</span>}
                    {deliveredTime !== "—" && <span>• Delivered {deliveredTime}</span>}
                  </div>

                  {status === "in_transit" && (
                    <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-slate-500" />
                        <span>{epodFile[loadId]?.name ?? "Attach ePOD"}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="sr-only"
                        onChange={(e) =>
                          setEpodFile((prev) => ({
                            ...prev,
                            [loadId]: e.target.files?.[0] ?? null,
                          }))
                        }
                      />
                    </label>
                  )}

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-full text-sm font-semibold"
                      asChild
                    >
                      <Link to={`/hauler/trips/${load.id}`}>View Trip</Link>
                    </Button>
                    {status === "assigned" && (
                      <Button
                        className="w-full rounded-full bg-[#29CA8D] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(41,202,141,0.45)] hover:bg-[#24b67d]"
                        disabled={busyId === loadId}
                        onClick={() => openConfirm("start", load)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {busyId === loadId ? "Starting…" : "Start Trip"}
                      </Button>
                    )}

                    {status === "in_transit" && (
                      <Button
                        className="w-full rounded-full bg-[#29CA8D] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(41,202,141,0.45)] hover:bg-[#24b67d]"
                        disabled={busyId === loadId}
                        onClick={() => openConfirm("deliver", load)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {busyId === loadId ? "Marking…" : "Mark as Delivered"}
                      </Button>
                    )}

                    {status === "delivered" && epodLink && (
                      <Button
                        variant="outline"
                        className="w-full rounded-full"
                        onClick={() => window.open(epodLink, "_blank")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View ePOD
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      onClick={() => openDetails(load)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, type: null, load: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === "start" ? "Start Trip?" : "Mark as Delivered?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === "start"
                ? `Are you sure you want to start the trip for ${confirmDialog.load?.title ?? "this load"}? This will change the status to "In Transit".`
                : `Are you sure you want to mark ${confirmDialog.load?.title ?? "this load"} as delivered? This will complete the trip.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#29CA8D] hover:bg-[#24b67d] text-white"
              onClick={confirmAction}
            >
              {confirmDialog.type === "start" ? "Start Trip" : "Mark as Delivered"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={detailsDialog.open}
        onOpenChange={(open) => {
          if (!open) closeDetails();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Load Details</span>
              {detailsDialog.load && (
                <Badge className={`rounded-full px-4 py-1 text-xs font-semibold ${badgeStyles[normalizeStatus(detailsDialog.load.status)]}`}>
                  {normalizeStatus(detailsDialog.load.status) === "in_transit"
                    ? "In Transit"
                    : normalizeStatus(detailsDialog.load.status) === "open"
                      ? "Pending"
                      : normalizeStatus(detailsDialog.load.status).charAt(0).toUpperCase() +
                        normalizeStatus(detailsDialog.load.status).slice(1)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete information for {detailsDialog.load?.title ?? "this load"}
            </DialogDescription>
          </DialogHeader>

          {detailsDialog.load && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-600">Load Information</h3>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Load ID:</span>
                    <span className="text-slate-900">{detailsDialog.load.id}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-slate-500">Title:</span>
                    <span className="text-slate-900">
                      {detailsDialog.load.title || detailsDialog.load.species || "Livestock Load"}
                    </span>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <MapPin className="h-4 w-4" />
                  Route Details
                </h3>
                <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Pickup Location</p>
                    <p className="text-sm text-slate-900">{detailsDialog.load.pickup_location ?? "—"}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-[#29CA8D]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Dropoff Location</p>
                    <p className="text-sm text-slate-900">{detailsDialog.load.dropoff_location ?? "—"}</p>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </h3>
                <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pickup Date</span>
                    <span className="text-slate-900">{formatDateTime(detailsDialog.load.pickup_date)}</span>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Package className="h-4 w-4" />
                  Livestock Details
                </h3>
                <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Species</span>
                    <span className="text-slate-900">{detailsDialog.load.species ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity</span>
                    <span className="text-slate-900">
                      {detailsDialog.load.quantity != null ? `${detailsDialog.load.quantity} head` : "—"}
                    </span>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <DollarSign className="h-4 w-4" />
                  Payment
                </h3>
                <div className="rounded-xl bg-slate-50 p-4 text-right text-xl font-semibold text-[#29CA8D]">
                  {formatCurrency(detailsDialog.load.offer_price)}
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Clock className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="rounded-xl bg-slate-50 p-4 space-y-3 text-sm">
                  {detailsDialog.load.assigned_at && (
                    <div>
                      <p className="text-slate-900">Load Assigned</p>
                      <p className="text-xs text-slate-500">{formatDateTime(detailsDialog.load.assigned_at)}</p>
                    </div>
                  )}
                  {detailsDialog.load.started_at && (
                    <div>
                      <p className="text-slate-900">Trip Started</p>
                      <p className="text-xs text-slate-500">{formatDateTime(detailsDialog.load.started_at)}</p>
                    </div>
                  )}
                  {detailsDialog.load.completed_at && (
                    <div>
                      <p className="text-slate-900">Delivered</p>
                      <p className="text-xs text-slate-500">{formatDateTime(detailsDialog.load.completed_at)}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="flex flex-wrap gap-2 pt-2">
                {normalizeStatus(detailsDialog.load.status) === "assigned" && (
                  <Button
                    className="flex-1 rounded-full bg-[#29CA8D] text-white hover:bg-[#24b67d]"
                    onClick={() => {
                      closeDetails();
                      openConfirm("start", detailsDialog.load);
                    }}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Trip
                  </Button>
                )}
                {normalizeStatus(detailsDialog.load.status) === "in_transit" && (
                  <Button
                    className="flex-1 rounded-full bg-[#29CA8D] text-white hover:bg-[#24b67d]"
                    onClick={() => {
                      closeDetails();
                      openConfirm("deliver", detailsDialog.load);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Delivered
                  </Button>
                )}
                {normalizeStatus(detailsDialog.load.status) === "delivered" && resolveEpodUrl(detailsDialog.load.epod_url) && (
                  <Button
                    className="flex-1 rounded-full bg-[#29CA8D] text-white hover:bg-[#24b67d]"
                    onClick={() =>
                      window.open(resolveEpodUrl(detailsDialog.load.epod_url) ?? "#", "_blank")
                    }
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View ePOD
                  </Button>
                )}
                <Button variant="outline" className="flex-1 rounded-full" onClick={closeDetails}>
                  Close
                </Button>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
