import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchLoadsByCreator, type Load as ApiLoad } from "../lib/api";
import {
  fetchLoadOffers,
  fetchOfferMessages,
  postOfferMessage,
  rejectOffer,
  updateLoadOffer,
  fetchHaulerSummary,
  type LoadOffer,
  type OfferMessage,
  type HaulerSummary,
  fetchContracts,
  createContract,
  updateContract,
  sendContract,
  type ContractRecord,
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
import { Switch } from "../components/ui/switch";
import { ScrollArea } from "../components/ui/scroll-area";
import { storage, STORAGE_KEYS } from "../lib/storage";
import {
  SOCKET_EVENTS,
  subscribeToSocketEvent,
} from "../lib/socket";
import { GenerateContractPopup } from "../components/GenerateContractPopup";

type ContractFormData = {
  priceAmount?: string | number;
  priceType?: string;
  paymentMethod?: string;
  paymentSchedule?: string;
  contractInfo?: {
    haulerName?: string;
    route?: { origin?: string; destination?: string };
    animalType?: string;
    headCount?: number;
  };
  [key: string]: unknown;
};

export default function ShipperOffersTab() {
  const shipperUserId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const [loads, setLoads] = useState<ApiLoad[]>([]);
  const [selectedLoadId, setSelectedLoadId] = useState<number | null>(null);
  const [offers, setOffers] = useState<LoadOffer[]>([]);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OfferMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [haulerSummary, setHaulerSummary] = useState<HaulerSummary | null>(null);
  const [contractsByOfferId, setContractsByOfferId] = useState<
    Record<string, ContractRecord>
  >({});
  const [contractModal, setContractModal] = useState<{
    open: boolean;
    offerId: string | null;
  }>({ open: false, offerId: null });
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

  const pendingOfferCount = useMemo(
    () => offers.filter((offer) => offer.status === "PENDING").length,
    [offers]
  );

  const canChat =
    !!currentOffer &&
    !["REJECTED", "WITHDRAWN", "EXPIRED"].includes(currentOffer.status);
  const chatEnabledByShipper = currentOffer?.chat_enabled_by_shipper ?? false;
  const canSendChat = canChat && chatEnabledByShipper;

  const currentPaymentMode = useMemo(() => {
    const modeFromOffer = currentOffer?.payment_mode;
    if (modeFromOffer === "DIRECT" || modeFromOffer === "ESCROW") {
      return modeFromOffer;
    }
    const activeLoad = loads.find((l) => Number(l.id) === Number(selectedLoadId));
    const modeFromLoad = (activeLoad as any)?.payment_mode;
    return modeFromLoad === "DIRECT" ? "DIRECT" : "ESCROW";
  }, [currentOffer, loads, selectedLoadId]);

  const selectedLoad = useMemo(
    () => loads.find((load) => Number(load.id) === Number(selectedLoadId)) || null,
    [loads, selectedLoadId]
  );

  const contractOffer = useMemo(
    () =>
      contractModal.offerId
        ? offers.find((offer) => offer.id === contractModal.offerId) || null
        : null,
    [contractModal.offerId, offers]
  );

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
      setContractsByOfferId({});
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
    fetchContracts({ load_id: String(selectedLoadId) })
      .then((resp) => {
        const next: Record<string, ContractRecord> = {};
        resp.items.forEach((contract) => {
          if (contract.offer_id) {
            next[String(contract.offer_id)] = contract;
          }
        });
        setContractsByOfferId(next);
      })
      .catch((err) =>
        toast.error(err?.message ?? "Failed to load contracts.")
      );
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
      fetchContracts({ load_id: String(selectedLoadId) })
        .then((resp) => {
          const next: Record<string, ContractRecord> = {};
          resp.items.forEach((contract) => {
            if (contract.offer_id) {
              next[String(contract.offer_id)] = contract;
            }
          });
          setContractsByOfferId(next);
        })
        .catch(() => {
          /* ignore contract refresh errors */
        });
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
    try {
      const resp = await fetchContracts({ load_id: String(loadId) });
      const next: Record<string, ContractRecord> = {};
      resp.items.forEach((contract) => {
        if (contract.offer_id) {
          next[String(contract.offer_id)] = contract;
        }
      });
      setContractsByOfferId(next);
    } catch {
      /* ignore contract refresh errors */
    }
  };

  const handleOpenContract = (offerId: string) => {
    setContractModal({ open: true, offerId });
  };

  const handleSaveContract = async (data: ContractFormData, sendNow: boolean) => {
    if (!contractModal.offerId) return;
    const offer = offers.find((o) => o.id === contractModal.offerId);
    const load = loads.find((l) => Number(l.id) === Number(selectedLoadId));
    if (!offer || !load) {
      toast.error("Missing offer or load details.");
      return;
    }
    const priceAmountRaw = Number(data.priceAmount ?? 0);
    const priceAmount = Number.isFinite(priceAmountRaw) ? priceAmountRaw : 0;
    const payload: Record<string, unknown> = {
      ...data,
      contractInfo: {
        haulerName: data.contractInfo?.haulerName,
        route: data.contractInfo?.route,
        animalType: data.contractInfo?.animalType,
        headCount: data.contractInfo?.headCount,
      },
    };
    const existing = contractsByOfferId[offer.id];
    try {
      if (existing) {
        await updateContract(existing.id, {
          price_amount: priceAmount,
          price_type: data.priceType,
          payment_method: data.paymentMethod,
          payment_schedule: data.paymentSchedule,
          contract_payload: payload,
        });
        if (sendNow) {
          await sendContract(existing.id);
        }
      } else {
        await createContract({
          load_id: String(load.id),
          offer_id: offer.id,
        status: sendNow ? "SENT" : "DRAFT",
        price_amount: priceAmount,
        price_type: data.priceType,
        payment_method: data.paymentMethod,
        payment_schedule: data.paymentSchedule,
        contract_payload: payload,
      });
      }
      toast.success(sendNow ? "Contract sent to hauler." : "Contract draft saved.");
      if (selectedLoadId) {
        await refreshOffers(selectedLoadId);
      }
      setContractModal({ open: false, offerId: null });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save contract.");
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

  const handleToggleChat = async (offerId: string, enabled: boolean) => {
    try {
      const { offer } = await updateLoadOffer(offerId, {
        chat_enabled_by_shipper: enabled,
      });
      setOffers((prev) =>
        prev.map((item) => (item.id === offerId ? offer : item))
      );
      toast.success(enabled ? "Chat enabled for hauler." : "Chat disabled for hauler.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update chat setting.");
    }
  };

  const handleSendMessage = async () => {
    if (!activeOfferId || !messageDraft.trim() || !canSendChat) return;
    try {
      const { message } = await postOfferMessage(activeOfferId, {
        text: messageDraft.trim(),
      });
      setMessages((prev) => {
        if (prev.some((existing) => existing.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
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
    <>
      <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Offers</h1>
          <p className="text-sm text-gray-500">
            Track bids, chat with haulers, and issue contracts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
            Loads: {loads.length}
          </Badge>
          {selectedLoadId && (
            <Badge variant="secondary" className="bg-sky-50 text-sky-700">
              Offers: {offers.length}
            </Badge>
          )}
          {pendingOfferCount > 0 && (
            <Badge variant="secondary" className="bg-amber-50 text-amber-700">
              Pending: {pendingOfferCount}
            </Badge>
          )}
        </div>
      </div>
        <div className="flex flex-row gap-4">
          <Card className="w-[40%]" style={{width:'40%'}}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Loads</CardTitle>
              <CardDescription>
                Pick a load to review active bids.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingLoads ? (
                <p className="text-sm text-gray-500">Loading loads…</p>
              ) : loads.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Post a load to start receiving offers.
                </p>
              ) : (
                <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-3 w-[60%]">
                  {loads.map((load) => {
                    const active = selectedLoadId === Number(load.id);
                    return (
                      <button
                        key={load.id}
                        onClick={() => setSelectedLoadId(Number(load.id))}
                        className={[
                          "relative rounded-lg border p-4 text-left transition-all",
                          active
                          ? "border-primary bg-white shadow-md ring-2 ring-primary/20"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm",
                        ].join(" ")}
                      >
                        {active && (
                          <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-primary-500" />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {load.species || "Livestock"} • {load.quantity ?? "?"} hd
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {load.pickup_location ?? "Unknown"} →{" "}
                              {load.dropoff_location ?? "Unknown"}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={
                              active
                                ? "bg-primary text-white"
                                : "bg-gray-100 text-gray-600"
                            }
                          >
                            #{load.id}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                          <span>
                            {load.created_at
                              ? new Date(load.created_at).toLocaleDateString()
                              : "—"}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-gray-300" />
                          <span className="capitalize">{load.status ?? "pending"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        <div className="w-[60%] w-full flex flex-col gap-4">

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Offers</CardTitle>
              <CardDescription>
                {selectedLoadId
                  ? `Load #${selectedLoadId}`
                  : "Select a load to view offers"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingOffers ? (
                <p className="text-sm text-gray-500">Loading offers…</p>
              ) : offers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No offers yet. Share your load to collect bids.
                </p>
              ) : (
                <ScrollArea className="h-[280px] pr-2">
                  <div className="space-y-3">
                    {offers.map((offer) => {
                      const isActive = activeOfferId === offer.id;
                      const offerContract = contractsByOfferId[offer.id];
                      const canToggleChat = !["REJECTED", "WITHDRAWN", "EXPIRED"].includes(
                        offer.status
                      );
                      const statusStyles =
                        offer.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : offer.status === "ACCEPTED"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-gray-100 text-gray-600 border border-gray-200";
                      return (
                        <div
                          key={offer.id}
                          onClick={() => setActiveOfferId(offer.id)}
                          className={[
                            "relative cursor-pointer rounded-2xl border p-4 transition",
                            isActive
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                              : "border-gray-200 hover:bg-gray-50",
                          ].join(" ")}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-4 h-8 w-1 rounded-r-full bg-primary" />
                          )}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-gray-900">
                                ${Number(offer.offered_amount).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                Offer #{offer.id} • Hauler #{offer.hauler_id}
                              </p>
                            </div>
                            <Badge className={statusStyles}>{offer.status}</Badge>
                          </div>
                          {offer.message && (
                            <p className="mt-2 text-sm text-gray-600">
                              "{offer.message}"
                            </p>
                          )}
                          {offerContract && (
                            <div className="mt-2 text-xs text-primary">
                              Contract {offerContract.status.toLowerCase()}
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                            <span className="text-gray-600">Chat enabled</span>
                            <Switch
                              checked={offer.chat_enabled_by_shipper ?? false}
                              onCheckedChange={(checked) => handleToggleChat(offer.id, checked)}
                              onClick={(event) => event.stopPropagation()}
                              disabled={!canToggleChat}
                            />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
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
                            {offer.status === "PENDING" && !offerContract && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-primary text-white hover:bg-primary-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenContract(offer.id);
                                  }}
                                >
                                  Create Contract
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
                            {offer.status === "PENDING" && offerContract && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenContract(offer.id);
                                }}
                              >
                                Edit Contract
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Offer Chat</CardTitle>
              <CardDescription>
                {activeOfferId
                  ? `Conversation for offer #${activeOfferId}`
                  : "Select an offer to view messages"}
              </CardDescription>
              {activeOfferId && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      currentPaymentMode === "DIRECT"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }
                  >
                    Payment: {currentPaymentMode === "DIRECT" ? "Direct" : "Escrow"}
                  </Badge>
                  {currentOffer && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      {currentOffer.status}
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {summaryLoading ? (
                <p className="text-sm text-gray-500">Loading hauler profile…</p>
              ) : haulerSummary ? (
                <Card className="border border-dashed">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-sm font-semibold text-gray-900">
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
              {canChat && currentOffer && !chatEnabledByShipper ? (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                  <span>Chat is disabled. Enable it to message this hauler.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleChat(currentOffer.id, true)}
                  >
                    Enable chat
                  </Button>
                </div>
              ) : null}
              <ScrollArea className="h-[320px] rounded-2xl border border-gray-200 bg-gray-50">
                {chatLoading ? (
                  <p className="p-4 text-sm text-gray-500">Loading chat…</p>
                ) : messages.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">
                    No messages yet. Enable chat to start messaging the hauler.
                  </p>
                ) : (
                  <div className="space-y-3 p-4">
                    {messages.map((msg) => {
                      const isShipperMessage = String(msg.sender_role)
                        .toLowerCase()
                        .includes("shipper");
                      return (
                        <div
                          key={msg.id}
                          className={[
                            "rounded-2xl border p-3 text-sm shadow-sm",
                            isShipperMessage
                              ? "ml-auto border-primary/20 bg-white"
                              : "mr-auto border-gray-200 bg-white",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span className="font-semibold text-gray-900">
                              {msg.sender_role}
                            </span>
                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                          </div>
                          {msg.text && <p className="mt-2 text-gray-700">{msg.text}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a message..."
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  className="flex-1"
                  disabled={!activeOfferId || !canSendChat}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!activeOfferId || !canSendChat}
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
      <GenerateContractPopup
        isOpen={contractModal.open}
        onClose={() => setContractModal({ open: false, offerId: null })}
        onGenerate={(data) => handleSaveContract(data, true)}
        onSaveDraft={(data) => handleSaveContract(data, false)}
      contractInfo={
        contractOffer && selectedLoad
          ? {
              haulerName:
                contractOffer.id === activeOfferId
                  ? haulerSummary?.name ?? `Hauler #${contractOffer.hauler_id}`
                  : `Hauler #${contractOffer.hauler_id}`,
              route: {
                origin: selectedLoad.pickup_location ?? "Unknown",
                destination: selectedLoad.dropoff_location ?? "Unknown",
              },
              animalType: selectedLoad.species ?? "Livestock",
              headCount: selectedLoad.quantity ?? 0,
              price: Number(
                contractsByOfferId[contractOffer.id]?.price_amount ??
                  contractOffer.offered_amount ??
                  0
              ),
              priceType:
                (contractsByOfferId[contractOffer.id]?.price_type as
                  | "per-mile"
                  | "total"
                  | undefined) ?? "total",
            }
          : undefined
      }
      initialData={
        contractOffer && contractsByOfferId[contractOffer.id]
          ? {
              ...(contractsByOfferId[contractOffer.id].contract_payload ?? {}),
              priceAmount:
                contractsByOfferId[contractOffer.id].price_amount ?? "",
              priceType:
                (contractsByOfferId[contractOffer.id].price_type as
                  | "per-mile"
                  | "total"
                  | undefined) ?? "total",
            }
          : undefined
      }
      />
    </>
  );
}
