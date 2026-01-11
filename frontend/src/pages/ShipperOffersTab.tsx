import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchLoadsByCreator, type Load as ApiLoad } from "../lib/api";
import {
  fetchLoadOffers,
  fetchOfferMessages,
  postOfferMessage,
  rejectOffer,
  fetchHaulerSummary,
  fetchTruckChats,
  fetchTruckChatMessages,
  sendTruckChatMessage,
  type LoadOffer,
  type OfferMessage,
  type HaulerSummary,
  type TruckChatMessage,
  type TruckChatSummary,
  fetchContracts,
  createContract,
  updateContract,
  sendContract,
  type ContractRecord,
  updateLoadOffer,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { MessageSquare } from "lucide-react";
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
  const [offersTab, setOffersTab] = useState<"received" | "sent">("received");
  const [sentTruckChats, setSentTruckChats] = useState<TruckChatSummary[]>([]);
  const [sentChatLoading, setSentChatLoading] = useState(false);
  const [truckChatModal, setTruckChatModal] = useState<{
    open: boolean;
    chatId: string | null;
  }>({ open: false, chatId: null });
  const [truckChatMessages, setTruckChatMessages] = useState<TruckChatMessage[]>([]);
  const [truckChatDraft, setTruckChatDraft] = useState("");
  const [truckChatSending, setTruckChatSending] = useState(false);
  const [truckChatLoading, setTruckChatLoading] = useState(false);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [chatModal, setChatModal] = useState<{ open: boolean; offerId: string | null }>({
    open: false,
    offerId: null,
  });
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<OfferMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [haulerSummary, setHaulerSummary] = useState<HaulerSummary | null>(null);
  const [contractsByOfferId, setContractsByOfferId] = useState<
    Record<string, ContractRecord>
  >({});
  const [contractsByBookingId, setContractsByBookingId] = useState<
    Record<string, ContractRecord>
  >({});
  const [contractModal, setContractModal] = useState<{
    open: boolean;
    offerId: string | null;
  }>({ open: false, offerId: null });
  const [truckContractModal, setTruckContractModal] = useState<{
    open: boolean;
    bookingId: string | null;
    chatId: string | null;
  }>({ open: false, bookingId: null, chatId: null });
  const [loadingLoads, setLoadingLoads] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const truckChatScrollRef = useRef<HTMLDivElement | null>(null);
  const truckChatAutoScrollRef = useRef(true);
  const selectedLoadIdRef = useRef<number | null>(null);
  const activeOfferIdRef = useRef<string | null>(null);
  const chatModalOpenRef = useRef(false);
  useEffect(() => {
    selectedLoadIdRef.current = selectedLoadId;
  }, [selectedLoadId]);
  useEffect(() => {
    activeOfferIdRef.current = activeOfferId;
  }, [activeOfferId]);
  useEffect(() => {
    chatModalOpenRef.current = chatModal.open;
    if (chatModal.open) {
      shouldAutoScrollRef.current = true;
    }
  }, [chatModal.open]);

  useEffect(() => {
    if (!chatModal.open || !chatScrollRef.current) return;
    if (!shouldAutoScrollRef.current) return;
    const target = chatScrollRef.current;
    requestAnimationFrame(() => {
      target.scrollTop = target.scrollHeight;
    });
  }, [messages, chatModal.open]);

  useEffect(() => {
    if (!truckChatModal.open || !truckChatModal.chatId) return;
    setTruckChatLoading(true);
    fetchTruckChatMessages(truckChatModal.chatId)
      .then((resp) => setTruckChatMessages(resp.items))
      .catch((err) =>
        toast.error(err?.message ?? "Failed to load chat messages.")
      )
      .finally(() => setTruckChatLoading(false));
  }, [truckChatModal.open, truckChatModal.chatId]);

  useEffect(() => {
    if (truckChatModal.open) {
      truckChatAutoScrollRef.current = true;
    }
  }, [truckChatModal.open]);

  useEffect(() => {
    if (!truckChatModal.open || !truckChatScrollRef.current) return;
    if (!truckChatAutoScrollRef.current) return;
    const target = truckChatScrollRef.current;
    requestAnimationFrame(() => {
      target.scrollTop = target.scrollHeight;
    });
  }, [truckChatMessages, truckChatModal.open]);
  useEffect(() => {
    if (offersTab === "sent") {
      setActiveOfferId(null);
      setMessages([]);
      setHaulerSummary(null);
      setChatModal({ open: false, offerId: null });
    }
  }, [offersTab]);

  const currentOffer = useMemo(
    () => offers.find((offer) => offer.id === activeOfferId) || null,
    [offers, activeOfferId]
  );

  const receivedOffers = useMemo(() => offers, [offers]);
  const sentOffers = useMemo(() => sentTruckChats, [sentTruckChats]);
  const activeTruckChat = useMemo(
    () => sentTruckChats.find((chat) => chat.chat.id === truckChatModal.chatId) || null,
    [sentTruckChats, truckChatModal.chatId]
  );
  const activeTruckContractChat = useMemo(
    () =>
      sentTruckChats.find((chat) => chat.chat.id === truckContractModal.chatId) ||
      null,
    [sentTruckChats, truckContractModal.chatId]
  );
  const activeTruckContract = useMemo(
    () =>
      truckContractModal.bookingId
        ? contractsByBookingId[truckContractModal.bookingId] || null
        : null,
    [contractsByBookingId, truckContractModal.bookingId]
  );
  const truckContractLoad = useMemo(
    () =>
      activeTruckContractChat
        ? loads.find(
            (item) =>
              String(item.id) === String(activeTruckContractChat.chat.load_id)
          ) || null
        : null,
    [activeTruckContractChat, loads]
  );

  const pendingOfferCount = useMemo(
    () => offers.filter((offer) => offer.status === "PENDING").length,
    [offers]
  );

  const unreadReceivedCount = useMemo(
    () =>
      receivedOffers.reduce(
        (sum, offer) => sum + (unreadCounts[offer.id] ?? 0),
        0
      ),
    [receivedOffers, unreadCounts]
  );

  useEffect(() => {
    storage.set(STORAGE_KEYS.SHIPPER_OFFERS_UNREAD, unreadReceivedCount);
    window.dispatchEvent(new Event("shipper-offers-unread"));
  }, [unreadReceivedCount]);

  const canChat =
    !!currentOffer &&
    !["REJECTED", "WITHDRAWN", "EXPIRED"].includes(currentOffer.status);
  const chatEnabledByHauler = currentOffer?.chat_enabled_by_hauler ?? false;
  const canSendChat = canChat && chatEnabledByHauler;

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
    if (!shipperUserId || offersTab !== "sent") return;
    setSentChatLoading(true);
    fetchTruckChats()
      .then((resp) => setSentTruckChats(resp.items))
      .catch((err) =>
        toast.error(err?.message ?? "Failed to load sent offers.")
      )
      .finally(() => setSentChatLoading(false));
  }, [shipperUserId, offersTab]);

  useEffect(() => {
    if (!shipperUserId || offersTab !== "sent") return;
    if (sentTruckChats.length === 0) {
      setContractsByBookingId({});
      return;
    }
    fetchContracts()
      .then((resp) => {
        const next: Record<string, ContractRecord> = {};
        resp.items.forEach((contract) => {
          if (contract.booking_id) {
            next[String(contract.booking_id)] = contract;
          }
        });
        setContractsByBookingId(next);
      })
      .catch(() => {
        /* ignore contract refresh errors */
      });
  }, [shipperUserId, offersTab, sentTruckChats]);

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
    return () => {
      /* cleanup */
    };
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
        const isActive = message.offer_id === activeOfferIdRef.current;
        const isShipperMessage = String(message.sender_role)
          .toLowerCase()
          .includes("shipper");
        if (isActive) {
          setMessages((prev) => {
            if (prev.some((existing) => existing.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
        }
        if (!isShipperMessage && (!isActive || !chatModalOpenRef.current)) {
          setUnreadCounts((prev) => ({
            ...prev,
            [message.offer_id]: (prev[message.offer_id] ?? 0) + 1,
          }));
        }
      }
    );
    const unsubscribeTruckChatMessage = subscribeToSocketEvent(
      SOCKET_EVENTS.TRUCK_CHAT_MESSAGE,
      ({ message }) => {
        setSentTruckChats((prev) =>
          prev.map((chat) =>
            chat.chat.id === message.chat_id
              ? { ...chat, last_message: message }
              : chat
          )
        );
        if (message.chat_id === truckChatModal.chatId) {
          setTruckChatMessages((prev) => {
            if (prev.some((existing) => existing.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
        }
      }
    );
    return () => {
      unsubscribeOfferCreated();
      unsubscribeOfferUpdated();
      unsubscribeOfferMessage();
      unsubscribeTruckChatMessage();
    };
  }, [truckChatModal.chatId]);

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

  const handleSendTruckChat = async () => {
    if (!truckChatModal.chatId || !truckChatDraft.trim()) return;
    try {
      setTruckChatSending(true);
      await sendTruckChatMessage(truckChatModal.chatId, {
        message: truckChatDraft.trim(),
      });
      setTruckChatDraft("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send message.");
    } finally {
      setTruckChatSending(false);
    }
  };


  const handleOpenContract = (offerId: string) => {
    setContractModal({ open: true, offerId });
  };

  const handleOpenTruckContract = (bookingId: string, chatId: string) => {
    setTruckContractModal({ open: true, bookingId, chatId });
  };

  const handleOpenChatModal = (offerId: string) => {
    setActiveOfferId(offerId);
    setChatModal({ open: true, offerId });
    setUnreadCounts((prev) => ({ ...prev, [offerId]: 0 }));
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

  const handleSaveTruckContract = async (data: ContractFormData, sendNow: boolean) => {
    if (!truckContractModal.bookingId) return;
    const chat = sentTruckChats.find(
      (item) => item.chat.id === truckContractModal.chatId
    );
    const load = chat
      ? loads.find((item) => String(item.id) === String(chat.chat.load_id))
      : null;
    if (!chat || !load) {
      toast.error("Missing truck offer details.");
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
    const bookingId = truckContractModal.bookingId;
    const existing = contractsByBookingId[bookingId];
    try {
      let contract = existing;
      if (existing) {
        const updated = await updateContract(existing.id, {
          price_amount: priceAmount,
          price_type: data.priceType,
          payment_method: data.paymentMethod,
          payment_schedule: data.paymentSchedule,
          contract_payload: payload,
        });
        contract = updated.contract;
      } else {
        const created = await createContract({
          booking_id: bookingId,
          status: sendNow ? "SENT" : "DRAFT",
          price_amount: priceAmount,
          price_type: data.priceType,
          payment_method: data.paymentMethod,
          payment_schedule: data.paymentSchedule,
          contract_payload: payload,
        });
        contract = created.contract;
      }
      if (sendNow && contract) {
        const sent = await sendContract(contract.id);
        contract = sent.contract;
      }
      if (contract?.booking_id) {
        setContractsByBookingId((prev) => ({
          ...prev,
          [String(contract.booking_id)]: contract,
        }));
      }
      toast.success(sendNow ? "Contract sent to hauler." : "Contract draft saved.");
      setTruckContractModal({ open: false, bookingId: null, chatId: null });
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

  const handleCloseChat = async (offerId: string) => {
    try {
      await updateLoadOffer(offerId, { chat_enabled_by_hauler: false });
      toast.success("Chat closed.");
      if (selectedLoadId) {
        await refreshOffers(selectedLoadId);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to close chat.");
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
        <Tabs value={offersTab} onValueChange={(value) => setOffersTab(value as "received" | "sent")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="received">
              Offers Received
              <Badge variant="secondary" className="ml-2">
                {receivedOffers.length}
              </Badge>
              {unreadReceivedCount > 0 && (
                <Badge className="ml-2 bg-primary text-white">
                  {unreadReceivedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              Offers Sent
              <Badge variant="secondary" className="ml-2">
                {sentOffers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Loads</CardTitle>
                <CardDescription>
                  Pick a load to review incoming offers.
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
                  <ScrollArea className="h-[220px] pr-2">
                    <div className="space-y-3">
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
                ) : receivedOffers.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No offers yet. Share your load to collect bids.
                  </p>
                ) : (
                  <ScrollArea className="h-[320px] pr-2">
                    <div className="space-y-3">
                      {receivedOffers.map((offer) => {
                        const isActive = activeOfferId === offer.id;
                        const offerContract = contractsByOfferId[offer.id];
                        const statusStyles =
                          offer.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : offer.status === "ACCEPTED"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-gray-100 text-gray-600 border border-gray-200";
                        const responseLabel =
                          offer.status === "PENDING" ? "Awaiting response" : "Responded";
                        const responseStyles =
                          offer.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-primary/10 text-primary border border-primary/20";
                        const unreadCount = unreadCounts[offer.id] ?? 0;
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
                              <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">
                                    <MessageSquare className="h-3 w-3" />
                                    {unreadCount}
                                  </span>
                                )}
                                <Badge className={statusStyles}>{offer.status}</Badge>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <Badge className={responseStyles}>{responseLabel}</Badge>
                              {offerContract && (
                                <Badge className="bg-slate-100 text-slate-600 border border-slate-200">
                                  Contract {offerContract.status.toLowerCase()}
                                </Badge>
                              )}
                            </div>
                            {offer.message && (
                              <p className="mt-2 text-sm text-gray-600">
                                "{offer.message}"
                              </p>
                            )}
                            <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                              <span className="text-gray-600">Chat status</span>
                              <Badge className={offer.chat_enabled_by_hauler ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"}>
                                {offer.chat_enabled_by_hauler ? "Enabled by hauler" : "Waiting on hauler"}
                              </Badge>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenChatModal(offer.id);
                                }}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Chat
                              </Button>
                              {offer.chat_enabled_by_hauler && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloseChat(offer.id);
                                  }}
                                >
                                  Close chat
                                </Button>
                              )}
                              {offer.status === "PENDING" && !offerContract && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-primary text-white hover:bg-primary/90"
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
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Offers Sent</CardTitle>
                <CardDescription>
                  Offers you sent to truck listings grouped by load.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {sentChatLoading ? (
                  <p className="text-sm text-gray-500">Loading sent offers…</p>
                ) : sentTruckChats.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No sent offers yet.
                  </p>
                ) : (
                  <ScrollArea className="h-[260px] pr-2">
                    <div className="space-y-3">
                      {sentTruckChats.map((chat) => {
                        const load = loads.find(
                          (item) => String(item.id) === String(chat.chat.load_id)
                        );
                        const bookingId = chat.booking?.id ?? null;
                        const bookingContract = bookingId
                          ? contractsByBookingId[bookingId]
                          : null;
                        return (
                          <div
                            key={chat.chat.id}
                            className="rounded-lg border border-gray-200 bg-white p-4 text-left"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {load?.title || `Load #${chat.chat.load_id ?? "—"}`}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {chat.availability.origin_location_text}
                                  {chat.availability.destination_location_text
                                    ? ` → ${chat.availability.destination_location_text}`
                                    : ""}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">
                                {chat.chat.status}
                              </Badge>
                            </div>
                            {load && (
                              <p className="mt-2 text-xs text-gray-500">
                                {load.pickup_location ?? "Unknown"} →{" "}
                                {load.dropoff_location ?? "Unknown"}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setTruckChatModal({
                                    open: true,
                                    chatId: chat.chat.id,
                                  })
                                }
                              >
                                Open chat
                              </Button>
                              {bookingId && (
                                <Button
                                  size="sm"
                                  className="bg-primary text-white hover:bg-primary/90"
                                  onClick={() =>
                                    handleOpenTruckContract(bookingId, chat.chat.id)
                                  }
                                >
                                  {bookingContract ? "Edit Contract" : "Create Contract"}
                                </Button>
                              )}
                              {!chat.chat.chat_enabled_by_shipper && (
                                <Badge className="bg-amber-50 text-amber-700" variant="outline">
                                  Waiting on hauler to enable chat
                                </Badge>
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
          </TabsContent>
        </Tabs>
      </div>
      <Dialog
        open={chatModal.open}
        onOpenChange={(open) =>
          setChatModal({ open, offerId: open ? chatModal.offerId : null })
        }
      >
        <DialogContent
          className="max-w-2xl overflow-hidden flex flex-col"
          style={{ height: "60vh" }}
        >
          <DialogHeader>
            <DialogTitle>
              {activeOfferId
                ? `Offer Chat • #${activeOfferId}`
                : "Offer Chat"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden space-y-3">
            {!canChat && currentOffer ? (
              <p className="text-xs text-gray-500">
                Chat closes once an offer is withdrawn or rejected.
              </p>
            ) : null}
            {canChat && currentOffer && !chatEnabledByHauler ? (
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Chat is locked until the hauler enables messaging.
              </div>
            ) : null}
            <div
              ref={chatScrollRef}
              onScroll={() => {
                if (!chatScrollRef.current) return;
                const target = chatScrollRef.current;
                const nearBottom =
                  target.scrollHeight - target.scrollTop - target.clientHeight < 80;
                shouldAutoScrollRef.current = nearBottom;
              }}
              className="h-full rounded-2xl border border-gray-200 bg-gray-50 overflow-y-auto"
            >
              {chatLoading ? (
                <p className="p-4 text-sm text-gray-500">Loading chat…</p>
              ) : messages.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">
                  No messages yet. Waiting on the hauler to enable chat.
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
            </div>
          </div>
          <DialogFooter className="pt-2">
            <div className="flex w-full gap-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={truckChatModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setTruckChatModal({ open: false, chatId: null });
            setTruckChatMessages([]);
            setTruckChatDraft("");
          }
        }}
      >
        <DialogContent
          className="max-w-2xl overflow-hidden flex flex-col"
          style={{ height: "60vh" }}
        >
          <DialogHeader>
            <DialogTitle>Truck Offer Chat</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden space-y-3">
            {!activeTruckChat?.chat.chat_enabled_by_shipper && (
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Chat is locked until the hauler enables messaging.
              </div>
            )}
            <div
              ref={truckChatScrollRef}
              onScroll={() => {
                if (!truckChatScrollRef.current) return;
                const target = truckChatScrollRef.current;
                const nearBottom =
                  target.scrollHeight - target.scrollTop - target.clientHeight < 80;
                truckChatAutoScrollRef.current = nearBottom;
              }}
              className="h-full rounded-2xl border border-gray-200 bg-gray-50 overflow-y-auto"
            >
              {truckChatLoading ? (
                <p className="p-4 text-sm text-gray-500">Loading chat…</p>
              ) : truckChatMessages.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No messages yet.</p>
              ) : (
                <div className="space-y-3 p-4">
                  {truckChatMessages.map((msg) => {
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
                        {msg.message && <p className="mt-2 text-gray-700">{msg.message}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <div className="flex w-full gap-2">
              <Textarea
                placeholder="Type a message..."
                value={truckChatDraft}
                onChange={(e) => setTruckChatDraft(e.target.value)}
                className="flex-1"
                disabled={
                  !truckChatModal.chatId ||
                  truckChatSending ||
                  !activeTruckChat?.chat.chat_enabled_by_shipper
                }
              />
              <Button
                onClick={handleSendTruckChat}
                disabled={
                  !truckChatModal.chatId ||
                  truckChatSending ||
                  !activeTruckChat?.chat.chat_enabled_by_shipper
                }
              >
                Send
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <GenerateContractPopup
        isOpen={truckContractModal.open}
        onClose={() =>
          setTruckContractModal({ open: false, bookingId: null, chatId: null })
        }
        onGenerate={(data) => handleSaveTruckContract(data, true)}
        onSaveDraft={(data) => handleSaveTruckContract(data, false)}
        contractInfo={
          activeTruckContractChat && truckContractLoad
            ? {
                haulerName: activeTruckContractChat.booking?.hauler_id
                  ? `Hauler #${activeTruckContractChat.booking.hauler_id}`
                  : "Hauler",
                route: {
                  origin: truckContractLoad.pickup_location ?? "Unknown",
                  destination: truckContractLoad.dropoff_location ?? "Unknown",
                },
                animalType: truckContractLoad.species ?? "Livestock",
                headCount: truckContractLoad.quantity ?? 0,
                price: Number(
                  activeTruckContract?.price_amount ??
                    activeTruckContractChat.booking?.offered_amount ??
                    0
                ),
                priceType:
                  (activeTruckContract?.price_type as
                    | "per-mile"
                    | "total"
                    | undefined) ?? "total",
              }
            : undefined
        }
        initialData={
          activeTruckContract
            ? {
                ...(activeTruckContract.contract_payload ?? {}),
                priceAmount: activeTruckContract.price_amount ?? "",
                priceType:
                  (activeTruckContract.price_type as
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
