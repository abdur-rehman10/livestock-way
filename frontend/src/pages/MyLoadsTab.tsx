import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchLoadsForShipper,
  type LoadSummary,
  API_BASE_URL,
  fetchPaymentsForUser,
  deleteLoad,
  updateLoadStatus,
} from "../lib/api";
import type { Payment } from "../lib/types";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { formatLoadStatusLabel } from "../lib/status";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import MyJobsTab from "./MyJobsTab";
import MyResourcesTab from "./MyResourcesTab";
import MyBuyAndSellTab from "./MyBuyAndSellTab";
import { Eye, MessageSquare, Power, PowerOff, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  SOCKET_EVENTS,
  subscribeToSocketEvent,
} from "../lib/socket";
import { toast, swalConfirm } from '../lib/swal';
import {
  createEscrowPaymentIntent,
  triggerPaymentWebhook,
  createTripDispute,
  fetchTripDisputes,
  cancelDispute,
  fetchTripByLoadId as fetchMarketplaceTripByLoad,
  fetchLoadOffers,
  type LoadOffer,
  type DisputeRecord,
  type TripEnvelope,
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

const paymentStatusMeta: Record<
  string,
  { label: string; badgeClass: string }
> = {
  AWAITING_FUNDING: {
    label: "Awaiting Funding",
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  ESCROW_FUNDED: {
    label: "Escrow Funded",
    badgeClass: "bg-sky-50 text-sky-700 border border-sky-200",
  },
  RELEASED_TO_HAULER: {
    label: "Released",
    badgeClass: "bg-primary-50 text-emerald-700 border border-emerald-200",
  },
  REFUNDED_TO_SHIPPER: {
    label: "Refunded",
    badgeClass: "bg-rose-50 text-rose-700 border border-rose-200",
  },
  SPLIT_BETWEEN_PARTIES: {
    label: "Split",
    badgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  },
};

type LoadStatus = LoadSummary["status"] | "posted" | "cancelled" | "draft";

type ShipperLoadSummary = Omit<LoadSummary, "status"> & {
  status: LoadStatus;
  views?: number;
  contacts?: number;
  offer_count?: number;
};

function resolveEpodUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export default function MyLoadsTab() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "jobs" ? "jobs" : "loads";
  const [loads, setLoads] = useState<ShipperLoadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<number, Payment>>({});
  const [fundingLoadId, setFundingLoadId] = useState<number | null>(null);
  const [deletingLoadId, setDeletingLoadId] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const navigate = useNavigate();
  const shipperId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const loadsRef = useRef<ShipperLoadSummary[]>([]);
  const [disputeDialog, setDisputeDialog] = useState<{
    open: boolean;
    loadId: number | null;
    tripId: number | null;
    disputes: DisputeRecord[];
    loading: boolean;
  }>({ open: false, loadId: null, tripId: null, disputes: [], loading: false });
  const [offersDialog, setOffersDialog] = useState<{
    open: boolean;
    loadId: number | null;
    offers: LoadOffer[];
    total: number;
    loading: boolean;
    error: string | null;
  }>({ open: false, loadId: null, offers: [], total: 0, loading: false, error: null });
  const [disputeForm, setDisputeForm] = useState({
    reason_code: "",
    description: "",
    requested_action: "",
  });
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [disputeMessagesLoading, setDisputeMessagesLoading] = useState(false);
  const [disputeMessageError, setDisputeMessageError] = useState<string | null>(null);
  const [disputeMessageDraft, setDisputeMessageDraft] = useState("");
  const [disputeMessageSending, setDisputeMessageSending] = useState(false);
  const tripContextCache = useRef<Record<number, TripEnvelope | null>>({});

  const resetTripCache = useCallback(() => {
    tripContextCache.current = {};
  }, []);

  const refresh = useCallback(async () => {
    if (!shipperId) {
      setError("Please log in as a shipper to view your loads.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [loadsResult, paymentsResult] = await Promise.all([
        fetchLoadsForShipper(shipperId),
        fetchPaymentsForUser(shipperId, "shipper"),
      ]);
      setLoads(loadsResult);
      const map: Record<number, Payment> = {};
      paymentsResult.forEach((payment) => {
        if (payment.load_id != null) {
          map[Number(payment.load_id)] = payment;
        }
      });
      setPayments(map);
    } catch (err: unknown) {
      console.error("Error loading shipper loads", err);
      setError(getErrorMessage(err, "Failed to load your trips."));
    } finally {
      setLoading(false);
      resetTripCache();
    }
  }, [shipperId, resetTripCache]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    loadsRef.current = loads;
  }, [loads]);

  useEffect(() => {
    if (!shipperId) return;
    const unsubscribe = subscribeToSocketEvent(
      SOCKET_EVENTS.LOAD_UPDATED,
      ({ load }) => {
        if (String(load.shipper_user_id ?? "") !== shipperId) {
          if (
            !loadsRef.current.some(
              (existing) => Number(existing.id) === Number(load.id)
            )
          ) {
            return;
          }
        }
        refresh();
      }
    );
    return () => {
      unsubscribe();
    };
  }, [shipperId, refresh]);

  useEffect(() => {
    if (!shipperId) return;
    const unsubscribeCreated = subscribeToSocketEvent(
      SOCKET_EVENTS.OFFER_CREATED,
      ({ offer }) => {
        const loadId = Number(offer.load_id);
        if (loadsRef.current.some((existing) => Number(existing.id) === loadId)) {
          refresh();
        }
      }
    );
    const unsubscribeUpdated = subscribeToSocketEvent(
      SOCKET_EVENTS.OFFER_UPDATED,
      ({ offer }) => {
        const loadId = Number(offer.load_id);
        if (loadsRef.current.some((existing) => Number(existing.id) === loadId)) {
          refresh();
        }
      }
    );
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
    };
  }, [shipperId, refresh]);

  const getTripContext = useCallback(
    async (loadId: number) => {
      if (!tripContextCache.current[loadId]) {
        try {
          const ctx = await fetchMarketplaceTripByLoad(loadId);
          tripContextCache.current[loadId] = ctx;
        } catch (err) {
          console.error("failed to load trip context", err);
          tripContextCache.current[loadId] = null;
        }
      }
      return tripContextCache.current[loadId];
    },
    []
  );

  const handleFundEscrow = useCallback(
    async (loadId: number) => {
      const context = await getTripContext(loadId);
      const tripId = context?.trip?.id;
      if (!tripId) {
        toast.error("Trip has not been created yet.");
        return;
      }
      try {
        setFundingLoadId(loadId);
        const intent = await createEscrowPaymentIntent(String(tripId), {
          provider: "livestockway",
        });
        const intentId = intent.payment?.external_intent_id;
        if (intentId) {
          await triggerPaymentWebhook(intentId, "payment_succeeded");
        }
        toast.success("Escrow funded successfully.", {
          description: "Funds are secured and will be released upon delivery confirmation.",
        });
        tripContextCache.current[loadId] = await fetchMarketplaceTripByLoad(loadId);
        refresh();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, "Failed to fund escrow."));
      } finally {
        setFundingLoadId(null);
      }
    },
    [getTripContext, refresh]
  );

  const openDisputeDialog = async (loadId: number) => {
    const context = await getTripContext(loadId);
    const tripId = context?.trip?.id;
    if (!tripId) {
      toast.error("Trip not ready for disputes yet.");
      return;
    }
    setDisputeDialog({
      open: true,
      loadId,
      tripId: Number(tripId),
      disputes: [],
      loading: true,
    });
    setDisputeForm({
      reason_code: "",
      description: "",
      requested_action: "",
    });
    try {
      const resp = await fetchTripDisputes(tripId);
      setDisputeDialog((prev) => ({ ...prev, disputes: resp.items, loading: false }));
    } catch (err: unknown) {
      setDisputeDialog((prev) => ({ ...prev, loading: false }));
      toast.error(getErrorMessage(err, "Failed to load disputes"));
    }
  };

  const openOffersDialog = async (loadId: number) => {
    setOffersDialog({
      open: true,
      loadId,
      offers: [],
      total: 0,
      loading: true,
      error: null,
    });
    try {
      const resp = await fetchLoadOffers(String(loadId), 1, 50);
      setOffersDialog((prev) => ({
        ...prev,
        offers: resp.items ?? [],
        total: resp.total ?? 0,
        loading: false,
      }));
    } catch (err: unknown) {
      setOffersDialog((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, "Failed to load offers"),
      }));
    }
  };

  const handleDeleteLoad = async (loadId: number) => {
    const confirmed = await swalConfirm({
      title: 'Delete Load',
      text: 'Delete this load? This cannot be undone.',
      confirmText: 'Yes, delete',
    });
    if (!confirmed) return;
    try {
      setDeletingLoadId(loadId);
      await deleteLoad(loadId);
      toast.success("Load deleted.");
      refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete load"));
    } finally {
      setDeletingLoadId(null);
    }
  };

  const handleToggleLoadStatus = async (loadId: number, makeLive: boolean) => {
    try {
      setStatusUpdatingId(loadId);
      await updateLoadStatus(loadId, makeLive ? "posted" : "cancelled");
      toast.success(makeLive ? "Load set to live." : "Load set to offline.");
      refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update load status"));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const submitDispute = async () => {
    if (!disputeDialog.tripId || !disputeForm.reason_code.trim()) {
      toast.error("Reason code is required");
      return;
    }
    try {
      await createTripDispute(disputeDialog.tripId, disputeForm);
      toast.success("Dispute submitted.", {
        description: "Our team will review your case and respond shortly.",
      });
      setDisputeDialog((prev) => ({ ...prev, open: false }));
      refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to submit dispute"));
    }
  };

  const cancelExistingDispute = async (disputeId: string) => {
    try {
      await cancelDispute(disputeId);
      toast.success("Dispute cancelled.");
      if (disputeDialog.tripId) {
        const resp = await fetchTripDisputes(disputeDialog.tripId);
        setDisputeDialog((prev) => ({ ...prev, disputes: resp.items }));
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to cancel dispute"));
    }
  };

  const loadDisputeMessages = useCallback(async (disputeId: string) => {
    setDisputeMessagesLoading(true);
    setDisputeMessageError(null);
    try {
      const resp = await fetchDisputeMessages(disputeId);
      setDisputeMessages(resp.items ?? []);
    } catch (err: unknown) {
      setDisputeMessageError(getErrorMessage(err, "Failed to load messages"));
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
    () => filterMessagesForPerspective(disputeMessages, "shipper"),
    [disputeMessages]
  );

  const handleSendDisputeMessage = async () => {
    if (!selectedDisputeId || !disputeMessageDraft.trim()) return;
    try {
      setDisputeMessageSending(true);
      await sendDisputeMessage(selectedDisputeId, { text: disputeMessageDraft.trim() });
      setDisputeMessageDraft("");
      await loadDisputeMessages(selectedDisputeId);
    } catch (err: unknown) {
      setDisputeMessageError(getErrorMessage(err, "Failed to send message"));
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
    // preserve existing selection if still available
    if (
      selectedDisputeId &&
      disputeDialog.disputes.some((d) => d.id === selectedDisputeId)
    ) {
      return;
    }
    const firstDispute = disputeDialog.disputes[0];
    setSelectedDisputeId(firstDispute.id);
    loadDisputeMessages(firstDispute.id);
    setDisputeMessageDraft("");
  }, [disputeDialog.disputes, disputeDialog.open, loadDisputeMessages, selectedDisputeId]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Loading your loads…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-sm text-red-600">{error}</div>
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

  if (!loads.length) {
    return (
      <div className="p-4 text-sm text-gray-600">
        You haven’t posted any loads yet. Use the <strong>Post Load</strong> button to create your first shipment.
      </div>
    );
  }

  const liveLoads = loads.filter((load) => load.status !== "cancelled");
  const offlineLoads = loads.filter((load) => load.status === "cancelled");
  const totalViews = loads.reduce(
    (sum, load) => sum + Number(load.views ?? 0),
    0
  );
  const totalContacts = loads.reduce(
    (sum, load) => sum + Number(load.contacts ?? 0),
    0
  );

  const renderLoadCard = (load: ShipperLoadSummary) => {
    const payment = payments[load.id];
    const loadIsDirect = load.payment_mode === "DIRECT";
    const isLive = load.status === "posted";
    const statusLabel = formatLoadStatusLabel(load.status);
    const offerCount = Number(load.offer_count ?? 0);
    const canToggleStatus = ["posted", "cancelled", "draft"].includes(load.status);

    return (
      <Card key={load.id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {load.title || `${load.species ?? "Livestock"} Transport`}
              </h3>
              <Badge
                className="px-2 py-0.5 text-xs"
                style={
                  isLive
                    ? { backgroundColor: "#53ca97", color: "white" }
                    : load.status === "cancelled" || load.status === "draft"
                      ? { backgroundColor: "#9ca3af", color: "white" }
                      : { backgroundColor: "#e5e7eb", color: "#374151" }
                }
              >
                {isLive ? (
                  <>
                    <Power className="w-3 h-3 mr-1" />
                    Live
                  </>
                ) : load.status === "cancelled" || load.status === "draft" ? (
                  <>
                    <PowerOff className="w-3 h-3 mr-1" />
                    Offline
                  </>
                ) : (
                  statusLabel
                )}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Offers: {offerCount}
              </Badge>
            </div>

            <p className="mt-2 text-sm text-gray-600">
              {load.pickup_location ?? "—"} → {load.dropoff_location ?? "—"}
            </p>
            <p className="text-sm text-gray-500">
              {load.species ?? "Livestock"} · {load.quantity ?? "?"} head
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Posted {load.created_at ? new Date(load.created_at).toLocaleDateString() : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Status: {statusLabel}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {payment ? (
                <span
                  className={[
                    "inline-flex rounded-full px-2 py-[1px] text-[10px] font-medium",
                    paymentStatusMeta[payment.status]?.badgeClass ||
                      "bg-gray-100 text-gray-600 border border-gray-200",
                  ].join(" ")}
                >
                  {paymentStatusMeta[payment.status]?.label || payment.status}
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">No escrow</span>
              )}
              {loadIsDirect && (
                <span className="text-[11px] text-gray-500">
                  Direct payment (escrow disabled)
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="text-xs" asChild>
                <Link to={`/shipper/trips/${load.id}`}>View Trip</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => openOffersDialog(load.id)}
              >
                View Offers ({offerCount})
              </Button>
              {canToggleStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => handleToggleLoadStatus(load.id, !isLive)}
                  disabled={statusUpdatingId === load.id}
                >
                  {statusUpdatingId === load.id
                    ? "Updating…"
                    : isLive
                      ? "Set Offline"
                      : "Set Live"}
                </Button>
              )}
              <Button
                size="sm"
                className="bg-[#F97316] hover:bg-[#ea580c] text-white text-xs"
                onClick={() => navigate(`/shipper/trips/${load.id}/tracking`)}
              >
                Track
              </Button>
              {(() => {
                const isDirect =
                  loadIsDirect ||
                  payment?.payment_mode === "DIRECT" ||
                  payment?.is_escrow === false ||
                  (payment?.status || "").toUpperCase() === "NOT_APPLICABLE";
                return (
                  !isDirect &&
                  payment?.status === "AWAITING_FUNDING" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => handleFundEscrow(load.id)}
                      disabled={fundingLoadId === load.id}
                    >
                      {fundingLoadId === load.id ? "Funding…" : "Fund Escrow"}
                    </Button>
                  )
                );
              })()}
              {(() => {
                const isDirect =
                  loadIsDirect ||
                  payment?.payment_mode === "DIRECT" ||
                  payment?.is_escrow === false ||
                  (payment?.status || "").toUpperCase() === "NOT_APPLICABLE";
                return (
                  payment?.trip_id &&
                  !isDirect && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => openDisputeDialog(load.id)}
                    >
                      Dispute
                    </Button>
                  )
                );
              })()}
              {resolveEpodUrl(load.epod_url) && (
                <Button size="sm" variant="outline" className="text-xs" asChild>
                  <a
                    href={resolveEpodUrl(load.epod_url) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View ePOD
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-red-600 hover:text-red-700"
                onClick={() => handleDeleteLoad(load.id)}
                disabled={deletingLoadId === load.id}
              >
                {deletingLoadId === load.id ? "Deleting…" : "Delete"}
              </Button>
              {(() => {
                const isDirect =
                  loadIsDirect ||
                  payment?.payment_mode === "DIRECT" ||
                  payment?.is_escrow === false ||
                  (payment?.status || "").toUpperCase() === "NOT_APPLICABLE";
                return (
                  isDirect && (
                    <span className="text-[11px] text-gray-500">
                      Disputes disabled for Direct Payment
                    </span>
                  )
                );
              })()}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="loads">Load Listings</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="buy-sell">Buy & Sell</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="loads" className="space-y-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">My Listings</h1>
            <p className="text-xs text-gray-500">
              Manage your active and offline load listings.
            </p>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#53ca97" }} />
            <h3 className="text-sm">Total Listings</h3>
          </div>
          <p className="text-3xl" style={{ color: "#53ca97" }}>
            {loads.length}
          </p>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <Power className="w-5 h-5 text-green-500" />
            <h3 className="text-sm">Live</h3>
          </div>
          <p className="text-3xl text-green-600">{liveLoads.length}</p>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm">Total Views</h3>
          </div>
          <p className="text-3xl text-blue-600">{totalViews}</p>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm">Total Contacts</h3>
          </div>
          <p className="text-3xl text-purple-600">{totalContacts}</p>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 w-full md:w-auto">
          <TabsTrigger value="all">All ({loads.length})</TabsTrigger>
          <TabsTrigger value="live">Live ({liveLoads.length})</TabsTrigger>
          <TabsTrigger value="offline">Offline ({offlineLoads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loads.length ? (
            loads.map(renderLoadCard)
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No listings found</p>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="live" className="space-y-4">
          {liveLoads.length ? (
            liveLoads.map(renderLoadCard)
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No live listings</p>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="offline" className="space-y-4">
          {offlineLoads.length ? (
            offlineLoads.map(renderLoadCard)
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No offline listings</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={offersDialog.open}
        onOpenChange={(open) =>
          setOffersDialog((prev) => ({ ...prev, open, error: null }))
        }
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Offers for Load #{offersDialog.loadId}
              {offersDialog.total ? ` (${offersDialog.total})` : ""}
            </DialogTitle>
          </DialogHeader>
          {offersDialog.loading ? (
            <p className="text-sm text-gray-500">Loading offers…</p>
          ) : offersDialog.error ? (
            <p className="text-sm text-red-600">{offersDialog.error}</p>
          ) : offersDialog.offers.length === 0 ? (
            <p className="text-sm text-gray-500">No offers yet.</p>
          ) : (
            <div className="space-y-3">
              {offersDialog.offers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-lg border border-gray-200 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900">
                      ${offer.offered_amount} {offer.currency}
                    </div>
                    <Badge className="text-xs capitalize">
                      {offer.status.toLowerCase()}
                    </Badge>
                  </div>
                  {offer.message && (
                    <p className="mt-2 text-xs text-gray-600">{offer.message}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {offer.created_at
                      ? new Date(offer.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={disputeDialog.open}
        onOpenChange={(open) => setDisputeDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Disputes for Load #{disputeDialog.loadId}</DialogTitle>
          </DialogHeader>
          {disputeDialog.loading ? (
            <p className="text-sm text-gray-500">Loading disputes…</p>
          ) : disputeDialog.disputes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 space-y-4">
              <p className="text-sm font-semibold text-gray-800">Open a dispute</p>
              <p className="text-xs text-gray-500">
                Each load can have only one active dispute. Submit the form below to start the
                investigation with LivestockWay’s compliance team.
              </p>
              <div className="space-y-2">
                <Label className="text-xs">Reason Code</Label>
                <Input
                  value={disputeForm.reason_code}
                  onChange={(e) =>
                    setDisputeForm((prev) => ({ ...prev, reason_code: e.target.value }))
                  }
                  placeholder="e.g. DAMAGE"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Requested Action</Label>
                <Input
                  value={disputeForm.requested_action}
                  onChange={(e) =>
                    setDisputeForm((prev) => ({ ...prev, requested_action: e.target.value }))
                  }
                  placeholder="Refund, split, investigation…"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={disputeForm.description}
                  onChange={(e) =>
                    setDisputeForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={5}
                  placeholder="Describe the issue"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDisputeDialog((prev) => ({ ...prev, open: false }))}
                >
                  Close
                </Button>
                <Button onClick={submitDispute}>Submit Dispute</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Dispute tickets
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {disputeDialog.disputes.map((dispute) => {
                    const isActive = selectedDisputeId === dispute.id;
                    return (
                      <div
                        key={dispute.id}
                        className={[
                          "rounded-2xl border p-3 text-sm transition",
                          isActive
                            ? "border-[#172039] bg-[#172039]/5 text-gray-900"
                            : "border-gray-200 text-gray-600",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => handleSelectDispute(dispute.id)}
                            className="flex-1 text-left"
                          >
                            <p className="font-semibold text-gray-900">
                              {dispute.reason_code || `Dispute #${dispute.id}`}
                            </p>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">
                              Status: {dispute.status.replace(/_/g, " ")}
                            </p>
                          </button>
                          {dispute.status === "OPEN" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelExistingDispute(dispute.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Conversation with Compliance
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Only shows messages you or LivestockWay share with shippers.
                    </p>
                  </div>
                  {selectedDisputeId && (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      Ticket #{selectedDisputeId}
                    </Badge>
                  )}
                </div>

                <div className="h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  {!selectedDisputeId ? (
                    <p className="text-xs text-gray-500">
                      Select a ticket on the left to view its messages.
                    </p>
                  ) : disputeMessagesLoading ? (
                    <p className="text-xs text-gray-500">Loading conversation…</p>
                  ) : filteredDisputeMessages.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No messages yet. Send an update to the admin team below.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredDisputeMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-xl border border-white bg-white p-2 text-sm shadow-sm"
                        >
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span className="font-semibold text-gray-900 text-xs">
                              {formatDisputeRoleLabel(msg.sender_role)}
                            </span>
                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                          </div>
                          {normalizeDisputeRole(msg.sender_role).startsWith("super-admin") && (
                            <p className="text-[11px] text-gray-500">
                              → {formatDisputeRoleLabel(msg.recipient_role || "shipper")}
                            </p>
                          )}
                          {msg.text && <p className="mt-1 text-gray-700">{msg.text}</p>}
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
                    <Textarea
                      rows={3}
                      value={disputeMessageDraft}
                      onChange={(e) => setDisputeMessageDraft(e.target.value)}
                      placeholder="Share an update or respond to the compliance team…"
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
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <MyJobsTab />
        </TabsContent>

        <TabsContent value="buy-sell" className="space-y-6">
          <MyBuyAndSellTab />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <MyResourcesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
