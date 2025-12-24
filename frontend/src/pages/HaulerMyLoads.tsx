import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Load } from "../lib/api";
import {
  API_BASE_URL,
  fetchLoadsByAssigned,
  startLoad,
  completeLoad,
  uploadEpod,
} from "../lib/api";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { normalizeLoadStatus } from "../lib/status";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
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
import { Textarea } from "../components/ui/textarea";
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
import {
  SOCKET_EVENTS,
  subscribeToSocketEvent,
} from "../lib/socket";
import {
  fetchTripByLoadId as fetchMarketplaceTripByLoad,
  startMarketplaceTrip,
  markMarketplaceTripDelivered,
  fetchTripDisputes,
  type TripEnvelope,
  type DisputeRecord,
} from "../api/marketplace";
import {
  fetchDisputeMessages,
  sendDisputeMessage,
  type DisputeMessage,
} from "../api/disputes";
import {
  filterMessagesForPerspective,
  formatDisputeRoleLabel,
  normalizeDisputeRole,
} from "../lib/disputeMessages";

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
const [disputeDialog, setDisputeDialog] = useState<{
  open: boolean;
  loadId: number | null;
  tripId: number | null;
  disputes: DisputeRecord[];
  loading: boolean;
}>({ open: false, loadId: null, tripId: null, disputes: [], loading: false });
const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
const [disputeMessagesLoading, setDisputeMessagesLoading] = useState(false);
const [disputeMessageError, setDisputeMessageError] = useState<string | null>(null);
const [disputeMessageDraft, setDisputeMessageDraft] = useState("");
const [disputeMessageSending, setDisputeMessageSending] = useState(false);
  const loadsRef = useRef<Load[]>([]);
  const tripContextCache = useRef<Record<number, TripEnvelope | null>>({});
  const dialogLoad = detailsDialog.load;
  const navigate = useNavigate();
  const haulerId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);

  const refresh = useCallback(async () => {
    if (!haulerId) {
      setError("Please log in as a hauler to view loads.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchLoadsByAssigned(haulerId);
      setLoads(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load your accepted loads.");
    } finally {
      setLoading(false);
    }
  }, [haulerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    loadsRef.current = loads;
    tripContextCache.current = {};
  }, [loads]);

  useEffect(() => {
    if (!haulerId) return;
    const unsubscribe = subscribeToSocketEvent(
      SOCKET_EVENTS.LOAD_UPDATED,
      ({ load }) => {
        const assigned = load.assigned_to_user_id
          ? String(load.assigned_to_user_id)
          : undefined;
        const loadId = Number(load.id);
        const alreadyTracked = loadsRef.current.some(
          (existing) => Number(existing.id) === loadId
        );
        if (assigned === String(haulerId) || alreadyTracked) {
          refresh();
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [haulerId, refresh]);

  const filteredLoads = useMemo(() => {
    if (filter === "all") return loads;
    if (filter === "pending") {
      return loads.filter((load) => normalizeLoadStatus(load.status) === "open");
    }
    return loads.filter((load) => normalizeLoadStatus(load.status) === filter);
  }, [filter, loads]);

const getTripContext = useCallback(async (loadId: number) => {
  if (!tripContextCache.current[loadId]) {
    try {
      const ctx = await fetchMarketplaceTripByLoad(loadId);
      tripContextCache.current[loadId] = ctx;
      } catch (err) {
        console.error("failed to fetch trip context", err);
        tripContextCache.current[loadId] = null;
      }
    }
  return tripContextCache.current[loadId];
}, []);

const openDisputeDialog = async (loadId: number) => {
  const context = await getTripContext(loadId);
  const tripId = context?.trip?.id;
  const paymentMode = context?.trip?.payment_mode || context?.payment?.payment_mode;
  if (paymentMode === "DIRECT") {
    toast.error("Disputes disabled for Direct Payment trips.");
    return;
  }
  if (!tripId) {
    toast.error("Trip has not been created yet.");
    return;
  }
  setDisputeDialog({
    open: true,
    loadId,
    tripId: Number(tripId),
    disputes: [],
    loading: true,
  });
  try {
    const resp = await fetchTripDisputes(Number(tripId));
    setDisputeDialog((prev) => ({ ...prev, disputes: resp.items, loading: false }));
  } catch (err: any) {
    setDisputeDialog((prev) => ({ ...prev, loading: false }));
    toast.error(err?.message ?? "Failed to load disputes");
  }
};

const loadDisputeMessages = useCallback(async (disputeId: string) => {
  setDisputeMessagesLoading(true);
  setDisputeMessageError(null);
  try {
    const resp = await fetchDisputeMessages(disputeId);
    setDisputeMessages(resp.items ?? []);
  } catch (err: any) {
    setDisputeMessageError(err?.message ?? "Failed to load messages");
  } finally {
    setDisputeMessagesLoading(false);
  }
}, []);

const handleSelectDispute = useCallback(
  (disputeId: string) => {
    setSelectedDisputeId(disputeId);
    loadDisputeMessages(disputeId);
  },
  [loadDisputeMessages]
);

const filteredDisputeMessages = useMemo(
  () => filterMessagesForPerspective(disputeMessages, "hauler"),
  [disputeMessages]
);

const handleSendDisputeMessage = async () => {
  if (!selectedDisputeId || !disputeMessageDraft.trim()) return;
  try {
    setDisputeMessageSending(true);
    await sendDisputeMessage(selectedDisputeId, { text: disputeMessageDraft.trim() });
    setDisputeMessageDraft("");
    await loadDisputeMessages(selectedDisputeId);
  } catch (err: any) {
    setDisputeMessageError(err?.message ?? "Failed to send message");
  } finally {
    setDisputeMessageSending(false);
  }
};

useEffect(() => {
  if (!disputeDialog.open) {
    setSelectedDisputeId(null);
    setDisputeMessages([]);
    setDisputeMessageDraft("");
    setDisputeMessageError(null);
    setDisputeMessagesLoading(false);
    return;
  }
}, [disputeDialog.open]);

useEffect(() => {
  if (!disputeDialog.open) return;
  if (disputeDialog.disputes.length === 0) {
    setSelectedDisputeId(null);
    setDisputeMessages([]);
    return;
  }
  if (selectedDisputeId && disputeDialog.disputes.some((d) => d.id === selectedDisputeId)) {
    return;
  }
  const first = disputeDialog.disputes[0];
  setSelectedDisputeId(first.id);
  loadDisputeMessages(first.id);
  setDisputeMessageDraft("");
}, [disputeDialog.disputes, disputeDialog.open, loadDisputeMessages, selectedDisputeId]);
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
      const context = await getTripContext(loadId);
      if (context?.trip?.id) {
        await startMarketplaceTrip(context.trip.id);
        tripContextCache.current[loadId] = await fetchMarketplaceTripByLoad(loadId);
      } else {
        await startLoad(loadId);
      }
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
      const context = await getTripContext(loadId);
      if (context?.trip?.id) {
        await markMarketplaceTripDelivered(context.trip.id);
        tripContextCache.current[loadId] = await fetchMarketplaceTripByLoad(loadId);
      } else {
        let epodUrl: string | undefined;
        const file = epodFile[loadId] ?? null;
        if (file) {
          epodUrl = await uploadEpod(file);
        }
        await completeLoad(loadId, epodUrl);
      }
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
            const status = normalizeLoadStatus(load.status);
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
                    <Button
                      variant="outline"
                      className="w-full rounded-full text-sm font-semibold"
                      onClick={() => navigate(`/hauler/trips/${load.id}/chat`)}
                    >
                      Open Chat
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
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      onClick={() => openDisputeDialog(loadId)}
                    >
                      Disputes
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
        open={disputeDialog.open}
        onOpenChange={(open) => setDisputeDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Disputes for Load #{disputeDialog.loadId}</DialogTitle>
          </DialogHeader>
          {disputeDialog.loading ? (
            <p className="text-sm text-slate-500">Loading disputes…</p>
          ) : disputeDialog.disputes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No disputes have been filed for this trip yet.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dispute tickets
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {disputeDialog.disputes.map((dispute) => {
                    const isActive = selectedDisputeId === dispute.id;
                    return (
                      <button
                        key={dispute.id}
                        type="button"
                        onClick={() => handleSelectDispute(dispute.id)}
                        className={[
                          "w-full rounded-2xl border p-3 text-left text-xs transition",
                          isActive
                            ? "border-[#29CA8D] bg-[#29CA8D]/5 text-slate-900"
                            : "border-slate-200 text-slate-600 hover:border-slate-300",
                        ].join(" ")}
                      >
                        <p className="font-semibold text-slate-900">
                          {dispute.reason_code || `Dispute #${dispute.id}`}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          Status: {dispute.status.replace(/_/g, " ")}
                        </p>
                        {dispute.requested_action && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Requested: {dispute.requested_action}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Conversation with Compliance
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Only shows messages you or LivestockWay share with haulers.
                    </p>
                  </div>
                  {selectedDisputeId && (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      Ticket #{selectedDisputeId}
                    </Badge>
                  )}
                </div>

                <div className="h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {!selectedDisputeId ? (
                    <p className="text-xs text-slate-500">
                      Select a ticket on the left to view its messages.
                    </p>
                  ) : disputeMessagesLoading ? (
                    <p className="text-xs text-slate-500">Loading conversation…</p>
                  ) : filteredDisputeMessages.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No messages yet. Send an update to the admin team below.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredDisputeMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-xl border border-white bg-white p-2 text-sm shadow-sm"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-900 text-xs">
                              {formatDisputeRoleLabel(msg.sender_role)}
                            </span>
                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                          </div>
                          {normalizeDisputeRole(msg.sender_role).startsWith("super-admin") && (
                            <p className="text-[11px] text-slate-500">
                              → {formatDisputeRoleLabel(msg.recipient_role || "hauler")}
                            </p>
                          )}
                          {msg.text && <p className="mt-1 text-slate-700">{msg.text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedDisputeId && (
                  <div className="space-y-2">
                    {disputeMessageError && (
                      <p className="text-xs text-red-600">{disputeMessageError}</p>
                    )}
                    <Label className="text-xs text-slate-500">
                      Send an update to Super Admin
                    </Label>
                    <Textarea
                      rows={3}
                      value={disputeMessageDraft}
                      onChange={(e) => setDisputeMessageDraft(e.target.value)}
                      placeholder="Share clarifications, supporting information, or your proposed resolution…"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSendDisputeMessage}
                        disabled={!disputeMessageDraft.trim() || disputeMessageSending}
                      >
                        {disputeMessageSending ? "Sending…" : "Send Message"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              {dialogLoad && (
                <Badge className={`rounded-full px-4 py-1 text-xs font-semibold ${badgeStyles[normalizeLoadStatus(dialogLoad.status)]}`}>
                  {normalizeLoadStatus(dialogLoad.status) === "in_transit"
                    ? "In Transit"
                    : normalizeLoadStatus(dialogLoad.status) === "open"
                      ? "Pending"
                      : normalizeLoadStatus(dialogLoad.status).charAt(0).toUpperCase() +
                        normalizeLoadStatus(dialogLoad.status).slice(1)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete information for {dialogLoad?.title ?? "this load"}
            </DialogDescription>
          </DialogHeader>

              {dialogLoad && (
                <div className="space-y-6">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-600">Load Information</h3>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Load ID:</span>
                    <span className="text-slate-900">{dialogLoad.id}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-slate-500">Title:</span>
                    <span className="text-slate-900">
                      {dialogLoad.title || dialogLoad.species || "Livestock Load"}
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
                    <p className="text-sm text-slate-900">{dialogLoad.pickup_location ?? "—"}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-[#29CA8D]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Dropoff Location</p>
                    <p className="text-sm text-slate-900">{dialogLoad.dropoff_location ?? "—"}</p>
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
                    <span className="text-slate-900">{formatDateTime(dialogLoad.pickup_date)}</span>
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
                    <span className="text-slate-900">{dialogLoad.species ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity</span>
                    <span className="text-slate-900">
                      {dialogLoad.quantity != null ? `${dialogLoad.quantity} head` : "—"}
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
                  {formatCurrency(dialogLoad.offer_price)}
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Clock className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="rounded-xl bg-slate-50 p-4 space-y-3 text-sm">
                  {dialogLoad.assigned_at && (
                    <div>
                      <p className="text-slate-900">Load Assigned</p>
                      <p className="text-xs text-slate-500">{formatDateTime(dialogLoad.assigned_at)}</p>
                    </div>
                  )}
                  {dialogLoad.started_at && (
                    <div>
                      <p className="text-slate-900">Trip Started</p>
                      <p className="text-xs text-slate-500">{formatDateTime(dialogLoad.started_at)}</p>
                    </div>
                  )}
                  {dialogLoad.completed_at && (
                    <div>
                      <p className="text-slate-900">Delivered</p>
                      <p className="text-xs text-slate-500">{formatDateTime(dialogLoad.completed_at)}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="flex flex-wrap gap-2 pt-2">
                {normalizeLoadStatus(dialogLoad.status) === "assigned" && (
                  <Button
                    className="flex-1 rounded-full bg-[#29CA8D] text-white hover:bg-[#24b67d]"
                    onClick={() => {
                      closeDetails();
                      openConfirm("start", dialogLoad);
                    }}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Trip
                  </Button>
                )}
                {normalizeLoadStatus(dialogLoad.status) === "in_transit" && (
                  <Button
                    className="flex-1 rounded-full bg-[#29CA8D] text-white hover:bg-[#24b67d]"
                    onClick={() => {
                      closeDetails();
                      openConfirm("deliver", dialogLoad);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Delivered
                  </Button>
                )}
                {normalizeLoadStatus(dialogLoad.status) === "delivered" && resolveEpodUrl(dialogLoad.epod_url) && (
                  <Button
                    className="flex-1 rounded-full bg-[#29CA8D] text-white hover:bg-[#24b67d]"
                    onClick={() =>
                      window.open(resolveEpodUrl(dialogLoad.epod_url) ?? "#", "_blank")
                    }
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View ePOD
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => {
                    closeDetails();
                    navigate(`/hauler/trips/${dialogLoad.id}/chat`);
                  }}
                >
                  Open Chat
                </Button>
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
