import React, { useCallback, useEffect, useRef, useState } from "react";
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
  type DisputeRecord,
} from "../api/marketplace";

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
    }
  }, [shipperId]);

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

  const handleFundEscrow = useCallback(
    async (loadId: number) => {
      const payment = payments[loadId];
      if (!payment || !payment.trip_id) {
        toast.error("Escrow payment not ready for this load yet.");
        return;
      }
      try {
        setFundingLoadId(loadId);
        const intent = await createEscrowPaymentIntent(String(payment.trip_id), {
          provider: "livestockway",
        });
        const intentId = intent.payment?.external_intent_id;
        if (intentId) {
          await triggerPaymentWebhook(intentId, "payment_succeeded");
        }
        toast.success("Escrow funded successfully.");
        refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to fund escrow.");
      } finally {
        setFundingLoadId(null);
      }
    },
    [payments, refresh]
  );

  const openDisputeDialog = async (loadId: number) => {
    const payment = payments[loadId];
    if (!payment?.trip_id) {
      toast.error("Trip not ready for disputes yet.");
      return;
    }
    setDisputeDialog({
      open: true,
      loadId,
      tripId: Number(payment.trip_id),
      disputes: [],
      loading: true,
    });
    setDisputeForm({
      reason_code: "",
      description: "",
      requested_action: "",
    });
    try {
      const resp = await fetchTripDisputes(payment.trip_id);
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
                      {payment?.status === "AWAITING_FUNDING" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => handleFundEscrow(load.id)}
                          disabled={fundingLoadId === load.id}
                        >
                          {fundingLoadId === load.id ? "Funding…" : "Fund Escrow"}
                        </Button>
                      )}
                      {payment?.trip_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => openDisputeDialog(load.id)}
                        >
                          Dispute
                        </Button>
                      )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispute Load #{disputeDialog.loadId}</DialogTitle>
          </DialogHeader>
          {disputeDialog.loading ? (
            <p className="text-sm text-gray-500">Loading disputes…</p>
          ) : (
            <div className="space-y-4">
              {disputeDialog.disputes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Existing disputes</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {disputeDialog.disputes.map((d) => (
                      <div
                        key={d.id}
                        className="rounded border p-2 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold">{d.reason_code}</p>
                          <p className="text-gray-500">Status: {d.status}</p>
                        </div>
                        {d.status === "OPEN" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelExistingDispute(d.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  rows={4}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
