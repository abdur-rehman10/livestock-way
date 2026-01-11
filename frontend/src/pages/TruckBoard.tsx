import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTruckAvailability,
  fetchBookings,
  fetchTruckChats,
  fetchTruckChatMessages,
  requestBookingForTruckListing,
  sendTruckChatMessage,
  startTruckChat,
  type TruckChatMessage,
  type TruckChatSummary,
  type TruckAvailability,
} from "../api/marketplace";
import { fetchLoadsForShipper, type LoadSummary } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { MessageSquare } from "lucide-react";
import { SOCKET_EVENTS, subscribeToSocketEvent } from "../lib/socket";

function extractErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    const raw = error.message ?? "";
    if (raw.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) {
          return String(parsed.error);
        }
      } catch {
        // ignore JSON parse failures
      }
    }
    return raw;
  }
  return "";
}

function formatTruckBoardError(error: unknown, fallback = "Unable to complete the request.") {
  const raw = extractErrorMessage(error);
  if (!raw) return fallback;
  const normalized = raw.toLowerCase();
  if (normalized.includes("headcount")) {
    return "This truck no longer has enough headcount capacity.";
  }
  if (normalized.includes("weight")) {
    return "This truck does not have enough remaining weight capacity.";
  }
  if (normalized.includes("load already has an active booking")) {
    return "That load is already booked. Pick another load or close the booking.";
  }
  if (normalized.includes("truck availability not found") || normalized.includes("no longer active")) {
    return "This truck listing is no longer available.";
  }
  if (normalized.includes("truck is currently assigned") || normalized.includes("already assigned")) {
    return "That truck is already assigned to another trip.";
  }
  if (normalized.includes("active availability listing")) {
    return "This truck is already posted. Edit the existing listing instead.";
  }
  if (normalized.includes("select the specific truck")) {
    return "Select one of your trucks before posting it on the board.";
  }
  return raw;
}

export default function TruckBoard() {
  const [listings, setListings] = useState<TruckAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const queryRef = useRef<{ origin?: string; nearLat?: number; nearLng?: number; radiusKm?: number }>({});
  const [filters, setFilters] = useState({
    origin: "",
    nearLat: "",
    nearLng: "",
    radiusKm: "200",
  });
  const [interestForm, setInterestForm] = useState<
    Record<string, { loadId: string; message: string }>
  >({});
  const [detailListing, setDetailListing] = useState<TruckAvailability | null>(null);
  const userRole = storage.get<string | null>(STORAGE_KEYS.USER_ROLE, null);
  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const [shipperLoads, setShipperLoads] = useState<LoadSummary[]>([]);
  const [shipperLoadsLoading, setShipperLoadsLoading] = useState(false);
  const [requestDialog, setRequestDialog] = useState<{
    open: boolean;
    listing: TruckAvailability | null;
    load: LoadSummary | null;
    submitting: boolean;
    error: string | null;
    offeredAmount: string;
  }>({ open: false, listing: null, load: null, submitting: false, error: null, offeredAmount: "" });
  const [requestedPairs, setRequestedPairs] = useState<Set<string>>(new Set());
  const [truckChats, setTruckChats] = useState<TruckChatSummary[]>([]);
  const [chatModal, setChatModal] = useState<{ open: boolean; chatId: string | null }>({
    open: false,
    chatId: null,
  });
  const [chatMessages, setChatMessages] = useState<TruckChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const refresh = async (nextQuery?: { origin?: string; nearLat?: number; nearLng?: number; radiusKm?: number }) => {
    try {
      setLoading(true);
      const finalQuery = nextQuery ?? queryRef.current;
      if (nextQuery) {
        queryRef.current = nextQuery;
      }
      const resp = await fetchTruckAvailability(finalQuery);
      setListings(resp.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load truck board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (userRole !== "shipper" || !userId) return;
    let active = true;
    setShipperLoadsLoading(true);
    fetchLoadsForShipper(userId)
      .then((loads) => {
        if (!active) return;
        setShipperLoads(loads);
      })
      .catch((err: any) => {
        if (!active) return;
        toast.error(err?.message ?? "Failed to load your loads");
      })
      .finally(() => {
        if (active) {
          setShipperLoadsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [userRole, userId]);

  useEffect(() => {
    if (userRole !== "shipper") return;
    let active = true;
    fetchBookings()
      .then((resp) => {
        if (!active) return;
        const next = new Set<string>();
        resp.items.forEach((booking) => {
          if (booking.truck_availability_id && booking.load_id) {
            next.add(getRequestKey(booking.truck_availability_id, booking.load_id));
          }
        });
        setRequestedPairs(next);
      })
      .catch(() => {
        if (active) setRequestedPairs(new Set());
      });
    fetchTruckChats()
      .then((resp) => {
        if (active) setTruckChats(resp.items);
      })
      .catch(() => {
        if (active) setTruckChats([]);
      });
    return () => {
      active = false;
    };
  }, [userRole]);

  useEffect(() => {
    const unsubscribe = subscribeToSocketEvent(
      SOCKET_EVENTS.TRUCK_CHAT_MESSAGE,
      ({ message }) => {
        setTruckChats((prev) =>
          prev.map((item) =>
            item.chat.id === message.chat_id
              ? { ...item, last_message: message }
              : item
          )
        );
        if (message.chat_id === chatModal.chatId) {
          setChatMessages((prev) => {
            if (prev.some((existing) => existing.id === message.id)) return prev;
            return [...prev, message];
          });
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [chatModal.chatId]);

  useEffect(() => {
    if (!chatModal.open || !chatModal.chatId) return;
    setChatLoading(true);
    fetchTruckChatMessages(chatModal.chatId)
      .then((resp) => setChatMessages(resp.items))
      .catch((err: any) => toast.error(err?.message ?? "Failed to load chat"))
      .finally(() => setChatLoading(false));
  }, [chatModal.open, chatModal.chatId]);

  useEffect(() => {
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
  }, [chatMessages, chatModal.open]);

  const selectableLoads = useMemo(() => {
    if (userRole !== "shipper") return [];
    const allowedStatuses = new Set([
      "open",
      "posted",
      "awaiting_escrow",
      "matched",
      "in_transit",
    ]);
    return shipperLoads.filter((load) => {
      const normalized = (load.status || "").toLowerCase();
      return allowedStatuses.has(normalized);
    });
  }, [shipperLoads, userRole]);

  const chatByListingId = useMemo(() => {
    const map: Record<string, TruckChatSummary> = {};
    truckChats.forEach((chat) => {
      map[chat.chat.truck_availability_id] = chat;
    });
    return map;
  }, [truckChats]);

  const activeChat = useMemo(
    () => truckChats.find((chat) => chat.chat.id === chatModal.chatId) || null,
    [truckChats, chatModal.chatId]
  );

  const canSendChat = activeChat?.chat.chat_enabled_by_shipper === true;

  const getRequestKey = (listingId: string, loadId: string) =>
    `${listingId}-${loadId}`;

  const parseOptionalCoordinate = (
    value: string,
    label: string,
    min: number,
    max: number,
    { allowEmpty = true }: { allowEmpty?: boolean } = {}
  ): number | null => {
    if (value === undefined || value === null || value.toString().trim() === "") {
      if (allowEmpty) return null;
      throw new Error(`${label} is required.`);
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`${label} must be a valid number.`);
    }
    if (parsed < min || parsed > max) {
      throw new Error(`${label} must be between ${min} and ${max}.`);
    }
    return parsed;
  };

  const handleApplyFilters = () => {
    try {
      const query: { origin?: string; nearLat?: number; nearLng?: number; radiusKm?: number } = {};
      if (filters.origin.trim()) {
        query.origin = filters.origin.trim();
      }
      const hasLat = filters.nearLat.trim() !== "";
      const hasLng = filters.nearLng.trim() !== "";
      if (hasLat || hasLng) {
        if (!hasLat || !hasLng) {
          toast.error("Enter both latitude and longitude to filter by distance.");
          return;
        }
        const lat = parseOptionalCoordinate(filters.nearLat, "Latitude filter", -90, 90, {
          allowEmpty: false,
        });
        const lng = parseOptionalCoordinate(filters.nearLng, "Longitude filter", -180, 180, {
          allowEmpty: false,
        });
        const radiusValue = filters.radiusKm.trim() ? Number(filters.radiusKm) : 200;
        if (Number.isNaN(radiusValue) || radiusValue <= 0) {
          toast.error("Radius must be greater than zero.");
          return;
        }
        query.nearLat = lat ?? undefined;
        query.nearLng = lng ?? undefined;
        query.radiusKm = radiusValue;
      }
      refresh(query);
    } catch (err: any) {
      toast.error(err?.message ?? "Invalid filter values");
    }
  };

  const handleClearFilters = () => {
    setFilters({ origin: "", nearLat: "", nearLng: "", radiusKm: "200" });
    refresh({});
  };

  const formatCoordinate = (value: number | null) => {
    if (value === null || value === undefined) return null;
    return Number(value).toFixed(2);
  };

  const coordinateLabel = (lat: number | null, lng: number | null) => {
    const latText = formatCoordinate(lat);
    const lngText = formatCoordinate(lng);
    if (!latText || !lngText) return null;
    return `${latText}, ${lngText}`;
  };

  const updateInterest = (id: string, field: "loadId" | "message", value: string) => {
    setInterestForm((prev) => {
      const existing = prev[id] ?? { loadId: "", message: "" };
      return {
        ...prev,
        [id]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleStartChat = async (availabilityId: string) => {
    const listing = listings.find((item) => item.id === availabilityId) || null;
    if (listing?.is_external) {
      toast.info("Chat is disabled for external listings.");
      return;
    }
    const interest = interestForm[availabilityId] ?? { loadId: "", message: "" };
    if (!interest.loadId.trim()) {
      toast.error("Select a load and place an offer before starting chat.");
      return;
    }
    const key = getRequestKey(availabilityId, interest.loadId);
    if (!requestedPairs.has(key)) {
      toast.error("Place an offer before starting chat.");
      return;
    }
    try {
      const resp = await startTruckChat(availabilityId, {
        load_id: interest.loadId || undefined,
        message: interest.message || undefined,
      });
      toast.success("Chat started with hauler.");
      updateInterest(availabilityId, "message", "");
      setTruckChats((prev) => {
        const exists = prev.some((item) => item.chat.id === resp.chat.id);
        if (exists) return prev;
        return [
          {
            chat: resp.chat,
            availability: {
              origin_location_text: listing?.origin_location_text ?? "",
              destination_location_text: listing?.destination_location_text ?? null,
              capacity_headcount: listing?.capacity_headcount ?? null,
            },
            last_message: resp.message ?? null,
          },
          ...prev,
        ];
      });
      setChatModal({ open: true, chatId: resp.chat.id });
    } catch (err: any) {
      toast.error(formatTruckBoardError(err, "Failed to start chat."));
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatModal.chatId || !chatDraft.trim()) return;
    try {
      setChatSending(true);
      await sendTruckChatMessage(chatModal.chatId, { message: chatDraft.trim() });
      setChatDraft("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send message.");
    } finally {
      setChatSending(false);
    }
  };


  const handleRequestBooking = async (availabilityId: string) => {
    const interest = interestForm[availabilityId] ?? { loadId: "", message: "" };
    if (!interest.loadId.trim()) {
      toast.error("Select which load you want to book onto this truck.");
      return;
    }
    const key = getRequestKey(availabilityId, interest.loadId);
    if (requestedPairs.has(key)) {
      toast.info("You already requested this truck for that load.");
      return;
    }
    const load = selectableLoads.find((l) => String(l.id) === interest.loadId) || null;
    const listing = listings.find((l) => l.id === availabilityId) || null;
    if (listing?.is_external) {
      toast.info("This external listing is read-only.");
      return;
    }
    setRequestDialog({
      open: true,
      listing,
      load,
      submitting: false,
      error: null,
      offeredAmount: "",
    });
  };

  const handleConfirmRequest = async () => {
    if (!requestDialog.listing || !requestDialog.load) {
      setRequestDialog((prev) => ({ ...prev, error: "Select a load to request." }));
      return;
    }
    if (requestDialog.listing.is_external) {
      setRequestDialog((prev) => ({ ...prev, error: "External listings are read-only." }));
      return;
    }
    if (!requestDialog.offeredAmount.trim()) {
      setRequestDialog((prev) => ({ ...prev, error: "Enter an offer amount." }));
      return;
    }
    const key = `${requestDialog.listing.id}-${requestDialog.load.id}`;
    if (requestedPairs.has(key)) {
      setRequestDialog((prev) => ({ ...prev, error: "You already requested this truck for that load." }));
      return;
    }
    try {
      setRequestDialog((prev) => ({ ...prev, submitting: true, error: null }));
      await requestBookingForTruckListing(requestDialog.listing.id, {
        load_id: requestDialog.load.id,
        requested_headcount: undefined,
        offered_amount: requestDialog.offeredAmount || undefined,
        offered_currency: requestDialog.offeredAmount ? "USD" : undefined,
      });
      const nextSet = new Set(requestedPairs);
      nextSet.add(key);
      setRequestedPairs(nextSet);
      const interest = interestForm[requestDialog.listing.id] ?? { loadId: "", message: "" };
      const chatResp = await startTruckChat(requestDialog.listing.id, {
        load_id: String(requestDialog.load.id),
        message: interest.message || undefined,
      });
      setTruckChats((prev) => {
        const exists = prev.some((item) => item.chat.id === chatResp.chat.id);
        if (exists) return prev;
        return [
          {
            chat: chatResp.chat,
            availability: {
              origin_location_text: requestDialog.listing?.origin_location_text ?? "",
              destination_location_text: requestDialog.listing?.destination_location_text ?? null,
              capacity_headcount: requestDialog.listing?.capacity_headcount ?? null,
            },
            last_message: chatResp.message ?? null,
          },
          ...prev,
        ];
      });
      setChatModal({ open: true, chatId: chatResp.chat.id });
      updateInterest(requestDialog.listing.id, "message", "");
      toast.success("Offer submitted.");
      setRequestDialog({
        open: false,
        listing: null,
        load: null,
        submitting: false,
        error: null,
        offeredAmount: "",
      });
    } catch (err: any) {
      const msg = formatTruckBoardError(err, "Unable to request this booking.");
      setRequestDialog((prev) => ({ ...prev, error: msg, submitting: false }));
      toast.error(msg);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Truck Board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Search origin text</Label>
              <Input
                value={filters.origin}
                onChange={(e) => setFilters((prev) => ({ ...prev, origin: e.target.value }))}
                placeholder="City, state or keyword"
              />
            </div>
            <div>
              <Label className="text-xs">Near latitude</Label>
              <Input
                type="number"
                value={filters.nearLat}
                onChange={(e) => setFilters((prev) => ({ ...prev, nearLat: e.target.value }))}
                placeholder="e.g. 34.0522"
                step="0.0001"
              />
            </div>
            <div>
              <Label className="text-xs">Near longitude</Label>
              <Input
                type="number"
                value={filters.nearLng}
                onChange={(e) => setFilters((prev) => ({ ...prev, nearLng: e.target.value }))}
                placeholder="-118.2437"
                step="0.0001"
              />
            </div>
            <div>
              <Label className="text-xs">Radius (km)</Label>
              <Input
                type="number"
                min={1}
                value={filters.radiusKm}
                onChange={(e) => setFilters((prev) => ({ ...prev, radiusKm: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
            <Button size="sm" variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
            <Button size="sm" variant="ghost" onClick={() => refresh()}>
              Refresh
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading trucks…</p>
          ) : listings.length === 0 ? (
            <p className="text-sm text-gray-500">No active trucks posted.</p>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => {
                const originCoords = coordinateLabel(listing.origin_lat, listing.origin_lng);
                const destinationCoords = coordinateLabel(
                  listing.destination_lat,
                  listing.destination_lng
                );
                return (
                  <div
                    key={listing.id}
                    className="border rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex flex-wrap items-center gap-2">
                        <span>
                          {listing.origin_location_text}
                          {listing.destination_location_text
                            ? ` → ${listing.destination_location_text}`
                            : ""}
                        </span>
                        {listing.is_external && (
                          <Badge variant="outline" className="border-dashed text-gray-500">
                            External
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Available {new Date(listing.available_from).toLocaleDateString()}
                      </div>
                      {listing.capacity_headcount && (
                        <div className="text-xs text-gray-600">
                          Capacity: {listing.capacity_headcount} head
                        </div>
                      )}
                      {typeof listing.capacity_weight_kg === "number" && listing.capacity_weight_kg > 0 && (
                        <div className="text-xs text-gray-600">
                          Weight cap: {listing.capacity_weight_kg} kg
                        </div>
                      )}
                      {originCoords && (
                        <div className="text-[11px] text-gray-500">Origin coords: {originCoords}</div>
                      )}
                      {destinationCoords && (
                        <div className="text-[11px] text-gray-500">
                          Destination coords: {destinationCoords}
                        </div>
                      )}
                      {listing.notes && (
                        <p className="text-xs text-gray-600 mt-1">
                          {listing.notes}
                        </p>
                      )}
                    </div>
                    {listing.is_external && (
                      <div className="flex flex-col gap-3 w-full md:max-w-sm md:pl-4 md:border-l md:border-dashed md:border-gray-200">
                        <div className="flex">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setDetailListing(listing)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    )}
                    {!listing.is_external && userRole === "shipper" && (
                      <div className="flex flex-col gap-3 w-full md:max-w-sm md:pl-4 md:border-l md:border-dashed md:border-gray-200">
                        {selectableLoads.length === 0 ? (
                          <p className="text-xs text-white-500">
                            Post a load before requesting this truck.
                          </p>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">Select your load</Label>
                              <select
                                value={interestForm[listing.id]?.loadId ?? ""}
                                onChange={(e) =>
                                  updateInterest(listing.id, "loadId", e.target.value)
                                }
                                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-primary focus:outline-none"
                              >
                                <option value="">Select a load</option>
                                {selectableLoads.map((load) => (
                                  <option key={load.id} value={load.id}>
                                    {load.title || `Load #${load.id}`} · {load.pickup_location} →{" "}
                                    {load.dropoff_location}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Message</Label>
                              <Textarea
                                rows={3}
                                value={interestForm[listing.id]?.message ?? ""}
                                onChange={(e) =>
                                  updateInterest(listing.id, "message", e.target.value)
                                }
                                placeholder="Share details for the hauler…"
                              />
                            </div>
                            {(() => {
                              const listingChat = chatByListingId[listing.id];
                              const chatEnabled =
                                listingChat?.chat.chat_enabled_by_shipper ?? false;
                              const selectedLoadId = interestForm[listing.id]?.loadId ?? "";
                              const requestKey = selectedLoadId
                                ? getRequestKey(listing.id, selectedLoadId)
                                : null;
                              const alreadyRequested = requestKey
                                ? requestedPairs.has(requestKey)
                                : false;
                              return (
                                <>
                                  <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          listingChat
                            ? setChatModal({
                                open: true,
                                chatId: listingChat.chat.id,
                              })
                            : handleStartChat(listing.id)
                        }
                        disabled={
                          !interestForm[listing.id]?.loadId ||
                          !requestedPairs.has(
                            getRequestKey(listing.id, interestForm[listing.id]?.loadId ?? "")
                          )
                        }
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {listingChat ? "Open chat" : "Start chat"}
                      </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRequestBooking(listing.id)}
                                      disabled={!selectedLoadId || alreadyRequested}
                                    >
                                      {alreadyRequested ? "Offer placed" : "Place offer"}
                                    </Button>
                                  </div>
                                  {listingChat && (
                                    <p className="text-[11px] text-gray-500">
                                      {chatEnabled
                                        ? "Chat enabled by hauler"
                                        : "Chat locked until hauler enables it"}
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={requestDialog.open}
        onOpenChange={(open) => {
          if (!open)
            setRequestDialog({
              open: false,
              listing: null,
              load: null,
              submitting: false,
              error: null,
              offeredAmount: "",
            });
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Place Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {requestDialog.listing && (
              <div className="text-sm text-gray-700">
                <div className="font-semibold">
                  {requestDialog.listing.origin_location_text}
                  {requestDialog.listing.destination_location_text
                    ? ` → ${requestDialog.listing.destination_location_text}`
                    : ""}
                </div>
                <div className="text-xs text-gray-500">
                  Available {new Date(requestDialog.listing.available_from).toLocaleString()}
                </div>
              </div>
            )}
            {requestDialog.load && (
              <div className="rounded-md border px-3 py-2 text-sm">
                <div className="font-semibold">{requestDialog.load.title || `Load #${requestDialog.load.id}`}</div>
                <div className="text-xs text-gray-600">
                  {requestDialog.load.pickup_location} → {requestDialog.load.dropoff_location}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Offer amount (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={requestDialog.offeredAmount}
                onChange={(e) =>
                  setRequestDialog((prev) => ({ ...prev, offeredAmount: e.target.value }))
                }
                placeholder="e.g. 2500"
              />
            </div>
            {requestDialog.error && <p className="text-sm text-rose-600">{requestDialog.error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setRequestDialog({ open: false, listing: null, load: null, submitting: false, error: null })
              }
              disabled={requestDialog.submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmRequest} disabled={requestDialog.submitting}>
              {requestDialog.submitting ? "Submitting…" : "Submit Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={chatModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setChatModal({ open: false, chatId: null });
            setChatMessages([]);
            setChatDraft("");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Truck Chat</DialogTitle>
          </DialogHeader>
          {chatLoading ? (
            <p className="text-sm text-gray-500">Loading messages…</p>
          ) : (
            <div className="space-y-3">
              <div
                ref={chatScrollRef}
                className="h-[50vh] overflow-y-auto rounded-xl border border-gray-200"
              >
                <div className="space-y-2 p-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-gray-500">No messages yet.</p>
                  ) : (
                    chatMessages.map((msg) => (
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
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder={
                canSendChat
                  ? "Send a message…"
                  : "Chat locked until hauler enables it"
              }
            />
            <Button
              onClick={handleSendChatMessage}
              disabled={!chatDraft.trim() || chatSending || !canSendChat}
            >
              {chatSending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailListing} onOpenChange={(open) => !open && setDetailListing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Truck Listing Details</DialogTitle>
          </DialogHeader>
          {detailListing && (
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <div className="text-xs uppercase text-gray-400">Route</div>
                <div className="text-gray-900">
                  {detailListing.origin_location_text}
                  {detailListing.destination_location_text
                    ? ` → ${detailListing.destination_location_text}`
                    : ""}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs uppercase text-gray-400">Available From</div>
                  <div className="text-gray-900">
                    {new Date(detailListing.available_from).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Available Until</div>
                  <div className="text-gray-900">
                    {detailListing.available_until
                      ? new Date(detailListing.available_until).toLocaleString()
                      : "—"}
                  </div>
                </div>
                {detailListing.external_contact_email && (
                  <div>
                    <div className="text-xs uppercase text-gray-400">Email</div>
                    <div className="text-gray-900 break-all">
                      {detailListing.external_contact_email}
                    </div>
                  </div>
                )}
                {detailListing.external_contact_phone && (
                  <div>
                    <div className="text-xs uppercase text-gray-400">Contact</div>
                    <div className="text-gray-900">
                      {detailListing.external_contact_phone}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase text-gray-400">Capacity</div>
                  <div className="text-gray-900">
                    {[
                      typeof detailListing.capacity_headcount === "number" &&
                      detailListing.capacity_headcount > 0
                        ? `${detailListing.capacity_headcount} head`
                        : null,
                      typeof detailListing.capacity_weight_kg === "number" &&
                      detailListing.capacity_weight_kg > 0
                        ? `${detailListing.capacity_weight_kg} kg`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "Not specified"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Shared</div>
                  <div className="text-gray-900">
                    {detailListing.allow_shared ? "Yes" : "No"}
                  </div>
                </div>
              </div>
              {detailListing.notes && (
                <div>
                  <div className="text-xs uppercase text-gray-400">Notes</div>
                  <div className="text-gray-900 whitespace-pre-line">
                    {detailListing.notes}
                  </div>
                </div>
              )}
              {detailListing.post_link && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(detailListing.post_link!, "_blank")}
                >
                  Visit Post Link
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
