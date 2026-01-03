import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Load } from "../lib/api";
import {
  API_BASE_URL,
  fetchLoadById,
  startLoad,
  completeLoad,
  uploadEpod,
} from "../lib/api";
import { normalizeLoadStatus } from "../lib/status";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
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
import { toast } from "sonner";
import {
  fetchBookings,
  respondToBooking,
  type LoadBooking,
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

export default function HaulerBookingsTab() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<LoadBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [selectedLoadLoading, setSelectedLoadLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDialogMessage, setBlockDialogMessage] = useState(
    "Free trip already used or active trip exists. Please upgrade your subscription."
  );
  const [epodFile, setEpodFile] = useState<Record<number, File | null>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "start" | "deliver" | null;
  }>({ open: false, type: null });
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
  const [directDialog, setDirectDialog] = useState<{
    open: boolean;
    tripId: number | null;
    loadId: number | null;
  }>({ open: false, tripId: null, loadId: null });
  const [directAmount, setDirectAmount] = useState("");
  const [directMethod, setDirectMethod] = useState<
    "CASH" | "BANK_TRANSFER" | "OTHER" | ""
  >("");
  const [directReference, setDirectReference] = useState("");
  const [directReceivedAt, setDirectReceivedAt] = useState("");
  const [directError, setDirectError] = useState<string | null>(null);
  const [directSubmitting, setDirectSubmitting] = useState(false);
  const tripContextCache = useRef<Record<number, TripEnvelope | null>>({});

  const refresh = async () => {
    try {
      setLoading(true);
      const resp = await fetchBookings();
      setBookings(resp.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (bookings.length === 0) {
      setSelectedBookingId(null);
      return;
    }
    if (!selectedBookingId) {
      setSelectedBookingId(bookings[0].id);
      return;
    }
    if (!bookings.some((booking) => booking.id === selectedBookingId)) {
      setSelectedBookingId(bookings[0].id);
    }
  }, [bookings, selectedBookingId]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) || null,
    [bookings, selectedBookingId]
  );

  useEffect(() => {
    if (!selectedBooking?.load_id) {
      setSelectedLoad(null);
      return;
    }
    const loadId = Number(selectedBooking.load_id);
    if (Number.isNaN(loadId)) {
      setSelectedLoad(null);
      return;
    }
    setSelectedLoadLoading(true);
    fetchLoadById(loadId)
      .then((load) => setSelectedLoad(load))
      .catch((err: any) => {
        toast.error(err?.message ?? "Failed to load booking details.");
        setSelectedLoad(null);
      })
      .finally(() => setSelectedLoadLoading(false));
  }, [selectedBooking]);

  const getTripContext = useCallback(async (loadId: number) => {
    if (!tripContextCache.current[loadId]) {
      try {
        const ctx = await fetchMarketplaceTripByLoad(loadId);
        tripContextCache.current[loadId] = ctx;
      } catch {
        tripContextCache.current[loadId] = null;
      }
    }
    return tripContextCache.current[loadId];
  }, []);

  const openConfirm = (type: "start" | "deliver") => {
    setConfirmDialog({ open: true, type });
  };

  const handleStart = async (loadId: number) => {
    try {
      setActionBusyId(loadId);
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
      setActionBusyId(null);
    }
  };

  const handleComplete = async (loadId: number) => {
    try {
      setActionBusyId(loadId);
      const context = await getTripContext(loadId);
      const mode =
        (context?.trip as any)?.payment_mode ||
        (context?.load as any)?.payment_mode ||
        (context?.payment as any)?.payment_mode;
      if (context?.trip?.id) {
        if (mode === "DIRECT") {
          setDirectDialog({ open: true, tripId: Number(context.trip.id), loadId });
          setActionBusyId(null);
          return;
        }
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
      setActionBusyId(null);
    }
  };

  const confirmAction = async () => {
    if (!selectedLoad || !confirmDialog.type) {
      setConfirmDialog({ open: false, type: null });
      return;
    }
    const numericId =
      typeof selectedLoad.id === "number"
        ? selectedLoad.id
        : Number(selectedLoad.id);
    if (Number.isNaN(numericId)) {
      setConfirmDialog({ open: false, type: null });
      return;
    }
    if (confirmDialog.type === "start") {
      await handleStart(numericId);
    } else {
      await handleComplete(numericId);
    }
    setConfirmDialog({ open: false, type: null });
  };

  const resetDirectDialog = () => {
    setDirectDialog({ open: false, tripId: null, loadId: null });
    setDirectAmount("");
    setDirectMethod("");
    setDirectReference("");
    setDirectReceivedAt("");
    setDirectError(null);
    setDirectSubmitting(false);
  };

  const submitDirectPayment = async () => {
    if (!directDialog.tripId) {
      resetDirectDialog();
      return;
    }
    setDirectError(null);
    const amountNum = Number(directAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setDirectError("Enter a valid received amount.");
      return;
    }
    if (!directMethod) {
      setDirectError("Select a payment method.");
      return;
    }
    try {
      setDirectSubmitting(true);
      await markMarketplaceTripDelivered(directDialog.tripId, {
        received_amount: amountNum,
        received_payment_method: directMethod,
        received_reference: directReference.trim() || null,
        received_at: directReceivedAt ? new Date(directReceivedAt).toISOString() : null,
      });
      toast.success("Load marked as delivered");
      if (directDialog.loadId) {
        tripContextCache.current[directDialog.loadId] = await fetchMarketplaceTripByLoad(
          directDialog.loadId
        );
      }
      await refresh();
      resetDirectDialog();
    } catch (err: any) {
      setDirectError(err?.message ?? "Failed to submit direct payment receipt.");
    } finally {
      setDirectSubmitting(false);
      setActionBusyId(null);
    }
  };

  const openDisputeDialog = async (loadId: number) => {
    const context = await getTripContext(loadId);
    const tripId = context?.trip?.id;
    if (!tripId) {
      toast.error("Trip not ready for disputes yet.");
      return;
    }
    const mode =
      (context?.trip as any)?.payment_mode ||
      (context?.load as any)?.payment_mode ||
      (context?.payment as any)?.payment_mode;
    if (mode === "DIRECT") {
      toast.error("Disputes disabled for Direct Payment trips.");
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
      setDisputeDialog((prev) => ({
        ...prev,
        disputes: resp.items,
        loading: false,
      }));
    } catch (err: any) {
      setDisputeDialog((prev) => ({ ...prev, loading: false }));
      toast.error(err?.message ?? "Failed to load disputes.");
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
  const handleAction = async (bookingId: string, action: "accept" | "reject") => {
    try {
      setBusyId(bookingId);
      await respondToBooking(bookingId, action);
      toast.success(action === "accept" ? "Booking accepted" : "Booking rejected");
      refresh();
    } catch (err: any) {
      const rawMessage: string = err?.message ?? "Failed to update booking";
      const normalized = rawMessage.toLowerCase();
      if (
        normalized.includes("free trip already used") ||
        normalized.includes("subscription_required") ||
        normalized.includes("upgrade required")
      ) {
        setBlockDialogMessage(
          "Free trip already used or active trip exists. Please upgrade your subscription."
        );
        setBlockDialogOpen(true);
      } else if (normalized.includes("payment_required")) {
        setBlockDialogMessage(
          "Payment required to activate your Paid plan. Complete payment to continue."
        );
        setBlockDialogOpen(true);
        navigate("/hauler/payment");
      } else {
        toast.error(rawMessage);
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading bookings…</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Booking Requests</h1>
          <p className="text-sm text-gray-500">
            Review incoming booking requests from shippers.
          </p>
        </div>
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
          Requests: {bookings.length}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!selectedBooking ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                Select a request to view the full details.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedLoadLoading && (
                  <p className="text-sm text-gray-500">Loading load details…</p>
                )}
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        Load #{selectedBooking.load_id}
                      </p>
                      <p className="text-sm text-gray-500">
                        Requested{" "}
                        {selectedBooking.requested_headcount
                          ? `${selectedBooking.requested_headcount} head`
                          : "capacity"}
                      </p>
                    </div>
                    <Badge className="capitalize">{selectedBooking.status.toLowerCase()}</Badge>
                  </div>
                  {(() => {
                    const mode = (selectedBooking.payment_mode ?? "ESCROW")
                      .toString()
                      .toUpperCase();
                    const isDirect = mode === "DIRECT";
                    return (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            isDirect
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }
                        >
                          Payment: {isDirect ? "Direct" : "Escrow"}
                        </Badge>
                        {isDirect && (
                          <span className="text-[11px] text-amber-700">
                            Direct payment. Escrow & disputes disabled.
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {selectedBooking.notes && (
                  <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-600">
                    {selectedBooking.notes}
                  </div>
                )}

                {selectedBooking.status === "REQUESTED" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busyId === selectedBooking.id}
                      onClick={() => handleAction(selectedBooking.id, "reject")}
                    >
                      Reject
                    </Button>
                    <Button
                      className="bg-[#29CA8D]"
                      disabled={busyId === selectedBooking.id}
                      onClick={() => handleAction(selectedBooking.id, "accept")}
                    >
                      {busyId === selectedBooking.id ? "Processing…" : "Accept"}
                    </Button>
                  </div>
                )}

                {selectedBooking.status === "ACCEPTED" && selectedLoad && (
                  <div className="rounded-2xl border border-gray-200 p-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedLoad.title ||
                          `${selectedLoad.species ?? "Livestock"} • ${
                            selectedLoad.quantity ?? "?"
                          } head`}
                      </p>
                      <div className="mt-1 text-sm text-gray-600">
                        {selectedLoad.pickup_location ?? "—"} →{" "}
                        {selectedLoad.dropoff_location ?? "—"}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>Pickup: {formatDateTime(selectedLoad.pickup_date)}</span>
                        <span>•</span>
                        <span>Offer: {formatCurrency(selectedLoad.offer_price)}</span>
                      </div>
                    </div>

                    {(() => {
                      const status = normalizeLoadStatus(selectedLoad.status);
                      const loadId =
                        typeof selectedLoad.id === "number"
                          ? selectedLoad.id
                          : Number(selectedLoad.id);
                      const epodLink = resolveEpodUrl(selectedLoad.epod_url);
                      return (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="capitalize">{status.replace("_", " ")}</Badge>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/hauler/trips/${selectedLoad.id}`}>View Trip</Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/hauler/trips/${selectedLoad.id}/chat`)}
                            >
                              Open Chat
                            </Button>
                          </div>

                          {status === "in_transit" && (
                            <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-300">
                              <span>{epodFile[loadId]?.name ?? "Attach ePOD"}</span>
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

                          <div className="flex flex-wrap gap-2">
                            {status === "assigned" && (
                              <Button
                                className="bg-[#29CA8D]"
                                disabled={actionBusyId === loadId}
                                onClick={() => openConfirm("start")}
                              >
                                {actionBusyId === loadId ? "Starting…" : "Start Trip"}
                              </Button>
                            )}
                            {status === "in_transit" && (
                              <Button
                                className="bg-[#29CA8D]"
                                disabled={actionBusyId === loadId}
                                onClick={() => openConfirm("deliver")}
                              >
                                {actionBusyId === loadId ? "Marking…" : "Mark as Delivered"}
                              </Button>
                            )}
                            {status === "delivered" && epodLink && (
                              <Button
                                variant="outline"
                                onClick={() => window.open(epodLink, "_blank")}
                              >
                                View ePOD
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => openDisputeDialog(loadId)}
                            >
                              Disputes
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>{blockDialogMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setBlockDialogOpen(false)} className="bg-[#29CA8D] hover:bg-[#24b67d]">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, type: null });
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
                ? "Are you sure you want to start this trip? This will change the status to In Transit."
                : "Are you sure you want to mark this trip as delivered?"}
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Disputes for Load #{disputeDialog.loadId}</DialogTitle>
          </DialogHeader>
          {disputeDialog.loading ? (
            <p className="text-sm text-gray-500">Loading disputes…</p>
          ) : disputeDialog.disputes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              No disputes have been filed for this trip yet.
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
                      <button
                        key={dispute.id}
                        type="button"
                        onClick={() => handleSelectDispute(dispute.id)}
                        className={[
                          "w-full rounded-2xl border p-3 text-left text-sm transition",
                          isActive
                            ? "border-emerald-200 bg-emerald-50 text-gray-900"
                            : "border-gray-200 text-gray-600",
                        ].join(" ")}
                      >
                        <p className="font-semibold text-gray-900">
                          {dispute.reason_code || `Dispute #${dispute.id}`}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">
                          Status: {dispute.status.replace(/_/g, " ")}
                        </p>
                      </button>
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
                      Only shows messages shared with the hauler.
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
                              → {formatDisputeRoleLabel(msg.recipient_role || "hauler")}
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
                    <Label className="text-xs text-gray-500">
                      Send an update to Super Admin
                    </Label>
                    <Textarea
                      rows={3}
                      value={disputeMessageDraft}
                      onChange={(e) => setDisputeMessageDraft(e.target.value)}
                      placeholder="Share clarifications or supporting information…"
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

      <Dialog open={directDialog.open} onOpenChange={(open) => !open && resetDirectDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Direct Payment</DialogTitle>
            <DialogDescription>
              Enter receipt details before completing this direct-payment trip.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Received Amount</Label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={directAmount}
                onChange={(e) => setDirectAmount(e.target.value)}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Method</Label>
              <select
                value={directMethod}
                onChange={(e) =>
                  setDirectMethod(
                    e.target.value as "CASH" | "BANK_TRANSFER" | "OTHER" | ""
                  )
                }
                className="w-full rounded-md border px-2 py-1.5 text-sm"
              >
                <option value="">Select method</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reference (optional)</Label>
              <input
                type="text"
                value={directReference}
                onChange={(e) => setDirectReference(e.target.value)}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="Receipt/transfer reference"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Received At (optional)</Label>
              <input
                type="datetime-local"
                value={directReceivedAt}
                onChange={(e) => setDirectReceivedAt(e.target.value)}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
              />
            </div>
            {directError && <p className="text-xs text-rose-600">{directError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetDirectDialog}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitDirectPayment} disabled={directSubmitting}>
                {directSubmitting ? "Submitting…" : "Submit & Complete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
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
