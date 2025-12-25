import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchLoadsByCreator, type Load as ApiLoad } from "../lib/api";
import {
  fetchLoadOffers,
  fetchOfferMessages,
  postOfferMessage,
  rejectOffer,
  fetchHaulerSummary,
  type LoadOffer,
  type OfferMessage,
  type HaulerSummary,
  requestBookingForOffer,
} from "../api/marketplace";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { storage, STORAGE_KEYS } from "../lib/storage";
import {
  SOCKET_EVENTS,
  subscribeToSocketEvent,
} from "../lib/socket";

export default function ShipperOffersTab() {
  const shipperUserId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const [loads, setLoads] = useState<ApiLoad[]>([]);
  const [selectedLoadId, setSelectedLoadId] = useState<number | null>(null);
  const [offers, setOffers] = useState<LoadOffer[]>([]);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OfferMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [haulerSummary, setHaulerSummary] = useState<HaulerSummary | null>(null);
  const [loadingLoads, setLoadingLoads] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const selectedLoadIdRef = useRef<number | null>(null);
  const activeOfferIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedLoadIdRef.current = selectedLoadId;
  }, [selectedLoadId]);
  useEffect(() => {
    activeOfferIdRef.current = activeOfferId;
  }, [activeOfferId]);

  const currentOffer = useMemo(
    () => offers.find((offer) => offer.id === activeOfferId) || null,
    [offers, activeOfferId]
  );

  const canChat =
    !!currentOffer &&
    !["REJECTED", "WITHDRAWN", "EXPIRED"].includes(currentOffer.status);

  const currentPaymentMode = useMemo(() => {
    const modeFromOffer = currentOffer?.payment_mode;
    if (modeFromOffer === "DIRECT" || modeFromOffer === "ESCROW") {
      return modeFromOffer;
    }
    const activeLoad = loads.find((l) => Number(l.id) === Number(selectedLoadId));
    const modeFromLoad = (activeLoad as any)?.payment_mode;
    return modeFromLoad === "DIRECT" ? "DIRECT" : "ESCROW";
  }, [currentOffer, loads, selectedLoadId]);

  useEffect(() => {
    if (!shipperUserId) return;
    setLoadingLoads(true);
    fetchLoadsByCreator(shipperUserId)
      .then((data) => {
        setLoads(data);
        if (data.length && !selectedLoadId) {
          setSelectedLoadId(Number(data[0].id));
        }
      })
      .catch((err) =>
        toast.error(err?.message ?? "Failed to load your posted loads.")
      )
      .finally(() => setLoadingLoads(false));
  }, [shipperUserId, selectedLoadId]);

  useEffect(() => {
    if (!selectedLoadId) {
      setOffers([]);
      setActiveOfferId(null);
      return;
    }
    setLoadingOffers(true);
    fetchLoadOffers(String(selectedLoadId))
      .then((resp) => {
        setOffers(resp.items);
        setActiveOfferId(resp.items[0]?.id ?? null);
      })
      .catch((err) =>
        toast.error(err?.message ?? "Failed to load offers for this load.")
      )
      .finally(() => setLoadingOffers(false));
    const interval = setInterval(() => {
      fetchLoadOffers(String(selectedLoadId))
        .then((resp) => {
          setOffers(resp.items);
          if (!resp.items.some((o) => o.id === activeOfferId)) {
            setActiveOfferId(resp.items[0]?.id ?? null);
          }
        })
        .catch(() =>
          toast.error("Failed to refresh offers. Please check your connection.")
        );
    }, 8000);

    return () => clearInterval(interval);
  }, [selectedLoadId]);

  useEffect(() => {
    if (!activeOfferId) {
      setMessages([]);
      setHaulerSummary(null);
      return;
    }
    const offer = offers.find((o) => o.id === activeOfferId);
    if (!offer) {
      setMessages([]);
      setHaulerSummary(null);
      return;
    }
    setChatLoading(true);
    fetchOfferMessages(activeOfferId)
      .then((resp) => setMessages(resp.items))
      .catch((err) =>
        toast.error(err?.message ?? "Failed to load offer messages.")
      )
      .finally(() => setChatLoading(false));

    setSummaryLoading(true);
    fetchHaulerSummary(offer.hauler_id)
      .then((resp) => setHaulerSummary(resp.summary))
      .catch((err) =>
        toast.error(err?.message ?? "Failed to load hauler profile.")
      )
      .finally(() => setSummaryLoading(false));
  }, [activeOfferId, offers]);

  useEffect(() => {
    const unsubscribeOfferCreated = subscribeToSocketEvent(
      SOCKET_EVENTS.OFFER_CREATED,
      ({ offer }) => {
        if (!selectedLoadIdRef.current) {
          return;
        }
        if (offer.load_id !== String(selectedLoadIdRef.current)) {
          return;
        }
        setOffers((prev) => {
          if (prev.some((existing) => existing.id === offer.id)) {
            return prev.map((existing) =>
              existing.id === offer.id ? offer : existing
            );
          }
          return [offer, ...prev];
        });
        if (!activeOfferIdRef.current) {
          setActiveOfferId(offer.id);
        }
      }
    );
    const unsubscribeOfferUpdated = subscribeToSocketEvent(
      SOCKET_EVENTS.OFFER_UPDATED,
      ({ offer }) => {
        setOffers((prev) =>
          prev.some((existing) => existing.id === offer.id)
            ? prev.map((existing) =>
                existing.id === offer.id ? offer : existing
              )
            : prev
        );
      }
    );
    const unsubscribeOfferMessage = subscribeToSocketEvent(
      SOCKET_EVENTS.OFFER_MESSAGE,
      ({ message }) => {
        if (message.offer_id !== activeOfferIdRef.current) {
          return;
        }
        setMessages((prev) => {
          if (prev.some((existing) => existing.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    );
    return () => {
      unsubscribeOfferCreated();
      unsubscribeOfferUpdated();
      unsubscribeOfferMessage();
    };
  }, []);

  const refreshOffers = async (loadId: number) => {
    const refreshed = await fetchLoadOffers(String(loadId));
    setOffers(refreshed.items);
    setActiveOfferId(refreshed.items[0]?.id ?? null);
  };

  const handleAccept = async (offerId: string) => {
    try {
      await requestBookingForOffer(offerId);
      toast.success("Booking requested.");
      if (selectedLoadId) {
        await refreshOffers(selectedLoadId);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to request booking.");
    }
  };

  const handleReject = async (offerId: string) => {
    try {
      await rejectOffer(offerId);
      toast.success("Offer rejected.");
      if (selectedLoadId) {
        await refreshOffers(selectedLoadId);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reject offer.");
    }
  };

  const handleSendMessage = async () => {
    if (!activeOfferId || !messageDraft.trim() || !canChat) return;
    try {
      const { message } = await postOfferMessage(activeOfferId, {
        text: messageDraft.trim(),
      });
      setMessages((prev) => [...prev, message]);
      setMessageDraft("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send offer messages.");
    }
  };

  if (!shipperUserId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-gray-600">
            Log in as a shipper to view offers.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Your Loads</CardTitle>
          <CardDescription>Review bids per posted load</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <div className="flex gap-3">
              {loadingLoads ? (
                <p className="text-sm text-gray-500">Loading loads…</p>
              ) : loads.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Post a load to start receiving offers.
                </p>
              ) : (
                loads.map((load) => {
                  const active = selectedLoadId === Number(load.id);
                  return (
                    <button
                      key={load.id}
                      onClick={() => setSelectedLoadId(Number(load.id))}
                      className={`min-w-[200px] rounded-xl border p-3 text-left ${
                        active
                          ? "border-[#F97316] bg-[#F97316]/10"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-medium text-sm">
                        {load.species} • {load.quantity} hd
                      </p>
                      <p className="text-xs text-gray-500">
                        {load.pickup_location} → {load.dropoff_location}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Posted {new Date(load.created_at!).toLocaleDateString()}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Offers</CardTitle>
            <CardDescription>
              {selectedLoadId
                ? `Load #${selectedLoadId}`
                : "Select a load to view offers"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingOffers ? (
              <p className="text-sm text-gray-500">Loading offers…</p>
            ) : offers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No offers yet. Share your load to collect bids.
              </p>
            ) : (
              offers.map((offer) => {
                const isActive = activeOfferId === offer.id;
                return (
                  <div
                    key={offer.id}
                    onClick={() => setActiveOfferId(offer.id)}
                    className={`rounded-xl border p-4 cursor-pointer transition ${
                      isActive
                        ? "border-[#F97316] bg-[#F97316]/10"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold">
                          ${Number(offer.offered_amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Offer #{offer.id} • Hauler #{offer.hauler_id}
                        </p>
                      </div>
                      <Badge>{offer.status}</Badge>
                    </div>
                    {offer.message && (
                      <p className="mt-2 text-sm text-gray-600">
                        “{offer.message}”
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveOfferId(offer.id);
                        }}
                      >
                        Chat
                      </Button>
                      {offer.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-[#29CA8D]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccept(offer.id);
                            }}
                          >
                            Request Booking
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(offer.id);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Offer Chat</CardTitle>
            <CardDescription>
              {activeOfferId
                ? `Conversation for offer #${activeOfferId}`
                : "Select an offer to view messages"}
            </CardDescription>
            {activeOfferId && (
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className={
                    currentPaymentMode === "DIRECT"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }
                >
                  Payment: {currentPaymentMode === "DIRECT" ? "Direct" : "Escrow"}
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-3">
            {summaryLoading ? (
              <p className="text-sm text-gray-500">Loading hauler profile…</p>
            ) : haulerSummary ? (
              <Card className="border border-dashed">
                <CardContent className="p-4 space-y-1">
                  <p className="font-semibold text-sm">
                    {haulerSummary.name ?? `Hauler #${haulerSummary.id}`}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>Fleet: {haulerSummary.fleet_count}</span>
                    <span>Drivers: {haulerSummary.driver_count}</span>
                    <span>Trips: {haulerSummary.completed_trips}</span>
                    <span>Reviews: coming soon</span>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            {!canChat && currentOffer ? (
              <p className="text-xs text-gray-500">
                Chat closes once an offer is withdrawn or rejected.
              </p>
            ) : null}
            <ScrollArea className="h-64 rounded border">
              {chatLoading ? (
                <p className="p-4 text-sm text-gray-500">Loading chat…</p>
              ) : messages.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">
                  No messages yet. Send the first note to unlock chat for the hauler.
                </p>
              ) : (
                <div className="space-y-3 p-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{msg.sender_role}</span>
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      {msg.text && <p className="mt-2">{msg.text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                className="flex-1"
                disabled={!activeOfferId || !canChat}
              />
              <Button onClick={handleSendMessage} disabled={!activeOfferId || !canChat}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
