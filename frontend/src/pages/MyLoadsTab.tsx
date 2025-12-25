import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchLoadsForShipper,
  type LoadSummary,
  API_BASE_URL,
  fetchPaymentsForUser,
} from "../lib/api";
import type { Payment } from "../lib/types";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { formatLoadStatusLabel } from "../lib/status";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
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
import { toast } from "sonner";
import {
  createEscrowPaymentIntent,
  triggerPaymentWebhook,
  createTripDispute,
  fetchTripDisputes,
  cancelDispute,
  fetchTripByLoadId as fetchMarketplaceTripByLoad,
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
    badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
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


function resolveEpodUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
}

export default function MyLoadsTab() {
  const [loads, setLoads] = useState<LoadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<number, Payment>>({});
  const [fundingLoadId, setFundingLoadId] = useState<number | null>(null);
  const navigate = useNavigate();
  const shipperId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const loadsRef = useRef<LoadSummary[]>([]);
  const [disputeDialog, setDisputeDialog] = useState<{
    open: boolean;
    loadId: number | null;
    tripId: number | null;
  disputes: DisputeRecord[];
  loading: boolean;
}>({ open: false, loadId: null, tripId: null, disputes: [], loading: false });
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
    } catch (err: any) {
      console.error("Error loading shipper loads", err);
      setError(err?.message || "Failed to load your trips.");
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
        toast.success("Escrow funded successfully.");
        tripContextCache.current[loadId] = await fetchMarketplaceTripByLoad(loadId);
        refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to fund escrow.");
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
      const payment = context?.payment ?? payments[loadId];
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
    } catch (err: any) {
      setDisputeDialog((prev) => ({ ...prev, loading: false }));
      toast.error(err?.message ?? "Failed to load disputes");
    }
  };

  const submitDispute = async () => {
    if (!disputeDialog.tripId || !disputeForm.reason_code.trim()) {
      toast.error("Reason code is required");
      return;
    }
    try {
      await createTripDispute(disputeDialog.tripId, disputeForm);
      toast.success("Dispute submitted.");
      setDisputeDialog((prev) => ({ ...prev, open: false }));
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit dispute");
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
  } catch (err: any) {
    toast.error(err?.message ?? "Failed to cancel dispute");
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

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">My Loads</h1>
        <p className="text-xs text-gray-500">
          These are all loads you’ve posted as a shipper.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr className="text-left text-[11px] font-semibold text-gray-500">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Route</th>
              <th className="px-4 py-2">Livestock</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Escrow</th>
              <th className="px-4 py-2">Assigned to</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => {
              const payment = payments[load.id];
              const loadIsDirect = (load as any)?.payment_mode === "DIRECT";

              return (
                <tr key={load.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-900">#{load.id}</td>
                  <td className="px-4 py-2 text-gray-700">
                    {load.pickup_location ?? "—"} → {load.dropoff_location ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {load.species ?? "Livestock"} · {load.quantity ?? "?"} head
                  </td>
                  <td className="px-4 py-2">
                    <Badge className="capitalize">
                      {formatLoadStatusLabel(load.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
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
                      <span className="text-gray-400 text-[11px]">No escrow</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {load.assigned_to || "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {load.created_at ? new Date(load.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button size="sm" variant="outline" className="text-xs" asChild>
                        <Link to={`/shipper/trips/${load.id}`}>View Trip</Link>
                      </Button>
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
                      {(() => {
                        const isDirect =
                          loadIsDirect ||
                          payment?.payment_mode === "DIRECT" ||
                          payment?.is_escrow === false ||
                          (payment?.status || "").toUpperCase() === "NOT_APPLICABLE";
                        return (
                          isDirect && (
                            <span className="text-[11px] text-gray-600">
                              Disputes disabled for Direct Payment
                            </span>
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
