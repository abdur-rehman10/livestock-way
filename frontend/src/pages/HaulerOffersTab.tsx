import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from '../lib/swal';
import {
  fetchHaulerOfferSummaries,
  fetchLoadOffers,
  fetchOfferMessages,
  postOfferMessage,
  updateLoadOffer,
  fetchTruckChats,
  fetchTruckChatMessages,
  sendTruckChatMessage,
  updateTruckChat,
  type HaulerOfferSummary,
  type LoadOffer,
  type OfferMessage,
  type TruckChatSummary,
  type TruckChatMessage,
} from "../api/marketplace";
import { fetchLoadById, type LoadDetail } from "../lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { MessageSquare } from "lucide-react";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { SOCKET_EVENTS, subscribeToSocketEvent } from "../lib/socket";

const HAULER_OFFER_LAST_SEEN_KEY = "haulerOfferLastSeen";

function formatCurrency(amount?: string | null, currency?: string | null) {
  if (!amount) return "—";
  const number = Number(amount);
  if (Number.isNaN(number)) return `${amount} ${currency ?? "USD"}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? "USD",
  }).format(number);
}

export default function HaulerOffersTab() {
  const haulerUserId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const [offersTab, setOffersTab] = useState<"sent" | "received">("sent");
  const [sentOffers, setSentOffers] = useState<HaulerOfferSummary[]>([]);
  const [receivedChats, setReceivedChats] = useState<TruckChatSummary[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeLoad, setActiveLoad] = useState<LoadDetail | null>(null);
  const [offerDetail, setOfferDetail] = useState<LoadOffer | null>(null);
  const [chatModal, setChatModal] = useState<{ open: boolean; offerId: string | null }>(
    { open: false, offerId: null }
  );
  const [offerMessages, setOfferMessages] = useState<OfferMessage[]>([]);
  const [offerDraft, setOfferDraft] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatEnableLoading, setChatEnableLoading] = useState(false);
  const [truckChatModal, setTruckChatModal] = useState<{
    open: boolean;
    chatId: string | null;
  }>({ open: false, chatId: null });
  const [truckMessages, setTruckMessages] = useState<TruckChatMessage[]>([]);
  const [truckDraft, setTruckDraft] = useState("");
  const [truckChatLoading, setTruckChatLoading] = useState(false);
  const [truckChatSending, setTruckChatSending] = useState(false);
  const offerScrollRef = useRef<HTMLDivElement | null>(null);
  const offerAutoScrollRef = useRef(true);
  const truckScrollRef = useRef<HTMLDivElement | null>(null);
  const truckAutoScrollRef = useRef(true);
  const [, setOfferLastSeen] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const stored = window.localStorage.getItem(HAULER_OFFER_LAST_SEEN_KEY);
    if (!stored) return {};
    try {
      const parsed = JSON.parse(stored);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  });

  const activeOffer = useMemo(
    () => sentOffers.find((offer) => offer.offer_id === activeOfferId) || null,
    [sentOffers, activeOfferId]
  );

  const activeTruckChat = useMemo(
    () => receivedChats.find((chat) => chat.chat.id === activeChatId) || null,
    [receivedChats, activeChatId]
  );

  const canSendOfferChat = useMemo(() => {
    const status = offerDetail?.status ?? activeOffer?.status ?? null;
    if (!status) return false;
    if (["REJECTED", "WITHDRAWN", "EXPIRED"].includes(status)) return false;
    return true;
  }, [offerDetail, activeOffer]);

  const canSendTruckChat = useMemo(() => {
    if (!activeTruckChat) return false;
    return activeTruckChat.chat.chat_enabled_by_shipper === true;
  }, [activeTruckChat]);

  const updateOfferLastSeen = (offerId: string, timestamp: string) => {
    setOfferLastSeen((prev) => {
      const next = { ...prev, [offerId]: timestamp };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(HAULER_OFFER_LAST_SEEN_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!haulerUserId) return;
    setLoadingSent(true);
    fetchHaulerOfferSummaries()
      .then((resp) => {
        setSentOffers(resp.items);
        if (!activeOfferId && resp.items[0]?.offer_id) {
          setActiveOfferId(resp.items[0].offer_id ?? null);
        }
      })
      .catch((err) => toast.error(err?.message ?? "Failed to load offers"))
      .finally(() => setLoadingSent(false));
  }, [haulerUserId]);

  useEffect(() => {
    if (!haulerUserId) return;
    setLoadingReceived(true);
    fetchTruckChats()
      .then((resp) => {
        setReceivedChats(resp.items);
        if (!activeChatId && resp.items[0]?.chat.id) {
          setActiveChatId(resp.items[0].chat.id ?? null);
        }
      })
      .catch((err) => toast.error(err?.message ?? "Failed to load truck chats"))
      .finally(() => setLoadingReceived(false));
  }, [haulerUserId]);

  useEffect(() => {
    if (!activeOffer) {
      setOfferDetail(null);
      setActiveLoad(null);
      return;
    }
    const loadId = Number(activeOffer.load_id);
    if (Number.isNaN(loadId)) {
      setActiveLoad(null);
      return;
    }
    fetchLoadById(loadId)
      .then(setActiveLoad)
      .catch((err) => toast.error(err?.message ?? "Failed to load load details"));
    fetchLoadOffers(String(activeOffer.load_id))
      .then((resp) => {
        const found = resp.items.find((item) => item.id === activeOffer.offer_id) || null;
        setOfferDetail(found);
      })
      .catch((err) => toast.error(err?.message ?? "Failed to load offer"));
  }, [activeOffer]);

  useEffect(() => {
    if (!chatModal.open || !chatModal.offerId) return;
    setChatLoading(true);
    fetchOfferMessages(chatModal.offerId)
      .then((resp) => {
        setOfferMessages(resp.items);
        const last = resp.items[resp.items.length - 1];
        if (last?.created_at && chatModal.offerId) {
          updateOfferLastSeen(chatModal.offerId, last.created_at);
        }
      })
      .catch((err) => toast.error(err?.message ?? "Failed to load messages"))
      .finally(() => setChatLoading(false));
  }, [chatModal.open, chatModal.offerId]);

  useEffect(() => {
    if (!truckChatModal.open || !truckChatModal.chatId) return;
    setTruckChatLoading(true);
    fetchTruckChatMessages(truckChatModal.chatId)
      .then((resp) => setTruckMessages(resp.items))
      .catch((err) => toast.error(err?.message ?? "Failed to load chat"))
      .finally(() => setTruckChatLoading(false));
  }, [truckChatModal.open, truckChatModal.chatId]);

  useEffect(() => {
    if (chatModal.open) {
      offerAutoScrollRef.current = true;
    }
  }, [chatModal.open]);

  useEffect(() => {
    if (!chatModal.open || !offerScrollRef.current) return;
    if (!offerAutoScrollRef.current) return;
    const target = offerScrollRef.current;
    requestAnimationFrame(() => {
      target.scrollTop = target.scrollHeight;
    });
  }, [offerMessages, chatModal.open]);

  useEffect(() => {
    if (truckChatModal.open) {
      truckAutoScrollRef.current = true;
    }
  }, [truckChatModal.open]);

  useEffect(() => {
    if (!truckChatModal.open || !truckScrollRef.current) return;
    if (!truckAutoScrollRef.current) return;
    const target = truckScrollRef.current;
    requestAnimationFrame(() => {
      target.scrollTop = target.scrollHeight;
    });
  }, [truckMessages, truckChatModal.open]);

  useEffect(() => {
    const unsubscribeOfferMessage = subscribeToSocketEvent(
      SOCKET_EVENTS.OFFER_MESSAGE,
      ({ message }) => {
        if (message.offer_id === chatModal.offerId) {
          setOfferMessages((prev) => {
            if (prev.some((existing) => existing.id === message.id)) return prev;
            return [...prev, message];
          });
          updateOfferLastSeen(message.offer_id, message.created_at);
        }
      }
    );
    const unsubscribeTruckMessage = subscribeToSocketEvent(
      SOCKET_EVENTS.TRUCK_CHAT_MESSAGE,
      ({ message }) => {
        const typedMessage = message as TruckChatMessage;
        setReceivedChats((prev) =>
          prev.map((item) =>
            item.chat.id === typedMessage.chat_id
              ? { ...item, last_message: typedMessage }
              : item
          )
        );
        if (typedMessage.chat_id === truckChatModal.chatId) {
          setTruckMessages((prev) => {
            if (prev.some((existing) => existing.id === typedMessage.id)) return prev;
            return [...prev, typedMessage];
          });
        }
      }
    );
    return () => {
      unsubscribeOfferMessage();
      unsubscribeTruckMessage();
    };
  }, [chatModal.offerId, truckChatModal.chatId]);

  const handleSendOfferMessage = async () => {
    if (!chatModal.offerId || !offerDraft.trim()) return;
    try {
      setChatSending(true);
      await postOfferMessage(chatModal.offerId, { text: offerDraft.trim() });
      setOfferDraft("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send message");
    } finally {
      setChatSending(false);
    }
  };

  const handleSendTruckMessage = async () => {
    if (!truckChatModal.chatId || !truckDraft.trim()) return;
    try {
      setTruckChatSending(true);
      await sendTruckChatMessage(truckChatModal.chatId, { message: truckDraft.trim() });
      setTruckDraft("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send message");
    } finally {
      setTruckChatSending(false);
    }
  };

  const handleEnableOfferChat = async () => {
    if (!offerDetail?.id) return;
    try {
      setChatEnableLoading(true);
      const resp = await updateLoadOffer(offerDetail.id, {
        chat_enabled_by_hauler: true,
      });
      setOfferDetail(resp.offer);
      setSentOffers((prev) =>
        prev.map((item) =>
          item.offer_id === offerDetail.id
            ? { ...item, chat_enabled_by_hauler: true }
            : item
        )
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to enable chat");
    } finally {
      setChatEnableLoading(false);
    }
  };

  const handleDisableOfferChat = async () => {
    if (!offerDetail?.id) return;
    try {
      setChatEnableLoading(true);
      const resp = await updateLoadOffer(offerDetail.id, {
        chat_enabled_by_hauler: false,
      });
      setOfferDetail(resp.offer);
      setSentOffers((prev) =>
        prev.map((item) =>
          item.offer_id === offerDetail.id
            ? { ...item, chat_enabled_by_hauler: false }
            : item
        )
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to close chat");
    } finally {
      setChatEnableLoading(false);
    }
  };

  const handleEnableTruckChat = async (chatId: string) => {
    try {
      setChatEnableLoading(true);
      const resp = await updateTruckChat(chatId, { chat_enabled_by_shipper: true });
      setReceivedChats((prev) =>
        prev.map((item) =>
          item.chat.id === chatId ? { ...item, chat: resp.chat } : item
        )
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to enable chat");
    } finally {
      setChatEnableLoading(false);
    }
  };

  const handleDisableTruckChat = async (chatId: string) => {
    try {
      setChatEnableLoading(true);
      const resp = await updateTruckChat(chatId, { chat_enabled_by_shipper: false });
      setReceivedChats((prev) =>
        prev.map((item) =>
          item.chat.id === chatId ? { ...item, chat: resp.chat } : item
        )
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to close chat");
    } finally {
      setChatEnableLoading(false);
    }
  };


  if (!haulerUserId) {
    return <div className="p-4 text-sm text-gray-500">Log in as a hauler to view offers.</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Offers</h1>
        <p className="text-xs text-gray-500">
          Track sent offers on loads and incoming requests from truck board.
        </p>
      </div>

      <Tabs value={offersTab} onValueChange={(value) => setOffersTab(value as "sent" | "received")}> 
        <TabsList>
          <TabsTrigger value="sent">
            Offer Sent
            <Badge className="ml-2" variant="secondary">
              {sentOffers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="received">
            Offer Received
            <Badge className="ml-2" variant="secondary">
              {receivedChats.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Your sent offers</CardTitle>
                <CardDescription>Offers you have submitted on the loadboard.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSent ? (
                  <p className="text-sm text-gray-500">Loading offers…</p>
                ) : sentOffers.length === 0 ? (
                  <p className="text-sm text-gray-500">No offers yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sentOffers.map((offer) => {
                      const selected = offer.offer_id === activeOfferId;
                      return (
                        <button
                          key={offer.offer_id ?? offer.load_id}
                          type="button"
                          onClick={() => setActiveOfferId(offer.offer_id ?? null)}
                          className={[
                            "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-primary/40",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">Load #{offer.load_id}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {offer.status.toLowerCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(offer.offered_amount, offer.currency)}
                          </p>
                          {offer.last_message_at && (
                            <p className="text-[11px] text-gray-400">
                              Last message {new Date(offer.last_message_at).toLocaleString()}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Offer details</CardTitle>
                <CardDescription>Review and chat with the shipper.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!activeOffer ? (
                  <p className="text-sm text-gray-500">Select an offer to view details.</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Load #{activeOffer.load_id}
                        </h3>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activeOffer.status.toLowerCase()}
                        </Badge>
                      </div>
                      {activeLoad && (
                        <p className="text-xs text-gray-500">
                          {activeLoad.pickup_location} → {activeLoad.dropoff_location}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                      <div className="text-xs uppercase text-gray-400">Offer amount</div>
                      <div className="text-gray-900 font-semibold">
                        {formatCurrency(activeOffer.offered_amount, activeOffer.currency)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          setChatModal({ open: true, offerId: activeOffer.offer_id ?? null })
                        }
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Open Chat
                      </Button>
                      {offerDetail?.chat_enabled_by_hauler ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDisableOfferChat}
                          disabled={chatEnableLoading}
                        >
                          {chatEnableLoading ? "Closing…" : "Close Chat"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEnableOfferChat}
                          disabled={chatEnableLoading}
                        >
                          {chatEnableLoading ? "Enabling…" : "Enable Chat"}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="received" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Incoming requests</CardTitle>
                <CardDescription>Shippers requesting space on your truck listings.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReceived ? (
                  <p className="text-sm text-gray-500">Loading requests…</p>
                ) : receivedChats.length === 0 ? (
                  <p className="text-sm text-gray-500">No requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {receivedChats.map((chat) => {
                      const selected = chat.chat.id === activeChatId;
                      return (
                        <button
                          key={chat.chat.id}
                          type="button"
                          onClick={() => setActiveChatId(chat.chat.id)}
                          className={[
                            "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-primary/40",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">
                              {chat.availability.origin_location_text}
                              {chat.availability.destination_location_text
                                ? ` → ${chat.availability.destination_location_text}`
                                : ""}
                            </span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {chat.chat.status}
                            </Badge>
                          </div>
                          {chat.last_message?.message && (
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {chat.last_message.message}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request details</CardTitle>
                <CardDescription>Chat with the shipper when enabled.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!activeTruckChat ? (
                  <p className="text-sm text-gray-500">Select a request to review.</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {activeTruckChat.availability.origin_location_text}
                          {activeTruckChat.availability.destination_location_text
                            ? ` → ${activeTruckChat.availability.destination_location_text}`
                            : ""}
                        </h3>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activeTruckChat.chat.status}
                        </Badge>
                      </div>
                      {activeTruckChat.chat.load_id && (
                        <p className="text-xs text-gray-500">Load #{activeTruckChat.chat.load_id}</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                      <div className="text-xs uppercase text-gray-400">Chat status</div>
                      <div className="text-gray-900">
                        {activeTruckChat.chat.chat_enabled_by_shipper
                          ? "Chat enabled by shipper"
                          : "Waiting on shipper to enable chat"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          setTruckChatModal({ open: true, chatId: activeTruckChat.chat.id })
                        }
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Open Chat
                      </Button>
                      {!activeTruckChat.chat.chat_enabled_by_shipper ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEnableTruckChat(activeTruckChat.chat.id)}
                          disabled={chatEnableLoading}
                        >
                          {chatEnableLoading ? "Enabling…" : "Enable chat"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisableTruckChat(activeTruckChat.chat.id)}
                          disabled={chatEnableLoading}
                        >
                          {chatEnableLoading ? "Closing…" : "Close chat"}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={chatModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setChatModal({ open: false, offerId: null });
            setOfferMessages([]);
            setOfferDraft("");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Offer Chat</DialogTitle>
          </DialogHeader>
          {chatLoading ? (
            <p className="text-sm text-gray-500">Loading messages…</p>
          ) : (
            <div className="space-y-3">
              {!offerDetail?.chat_enabled_by_hauler && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Enable chat so the shipper can reply.
                </div>
              )}
              <div
                ref={offerScrollRef}
                className="h-[50vh] overflow-y-auto rounded-xl border border-gray-200"
              >
                <div className="space-y-2 p-3">
                  {offerMessages.length === 0 ? (
                    <p className="text-xs text-gray-500">No messages yet.</p>
                  ) : (
                    offerMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-lg border border-gray-100 bg-white p-2 text-sm"
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-900">
                            {msg.sender_role}
                          </span>
                          <span>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        {msg.text && <p className="mt-1 text-gray-700">{msg.text}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={offerDraft}
              onChange={(e) => setOfferDraft(e.target.value)}
              placeholder={
                offerDetail?.chat_enabled_by_hauler
                  ? "Send a message…"
                  : "Enable chat to invite shipper replies"
              }
            />
            <Button
              onClick={handleSendOfferMessage}
              disabled={!offerDraft.trim() || chatSending || !canSendOfferChat}
            >
              {chatSending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={truckChatModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setTruckChatModal({ open: false, chatId: null });
            setTruckMessages([]);
            setTruckDraft("");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Truck Chat</DialogTitle>
          </DialogHeader>
          {truckChatLoading ? (
            <p className="text-sm text-gray-500">Loading messages…</p>
          ) : (
            <div className="space-y-3">
              {!canSendTruckChat && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Waiting for the shipper to enable chat.
                </div>
              )}
              <div
                ref={truckScrollRef}
                className="h-[50vh] overflow-y-auto rounded-xl border border-gray-200"
              >
                <div className="space-y-2 p-3">
                  {truckMessages.length === 0 ? (
                    <p className="text-xs text-gray-500">No messages yet.</p>
                  ) : (
                    truckMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-lg border border-gray-100 bg-white p-2 text-sm"
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-900">
                            {msg.sender_role}
                          </span>
                          <span>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        {msg.message && <p className="mt-1 text-gray-700">{msg.message}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={truckDraft}
              onChange={(e) => setTruckDraft(e.target.value)}
              placeholder={
                canSendTruckChat
                  ? "Send a message…"
                  : "Chat locked until shipper enables it"
              }
            />
            <Button
              onClick={handleSendTruckMessage}
              disabled={!truckDraft.trim() || truckChatSending || !canSendTruckChat}
            >
              {truckChatSending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
