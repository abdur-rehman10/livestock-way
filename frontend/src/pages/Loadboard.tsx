import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLoads } from "../lib/api";
import type { Load as ApiLoad } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { DialogFooter } from "../components/ui/dialog";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Search,
  Filter,
  DollarSign,
  Truck,
  TrendingUp,
  Star,
  Map as MapIcon,
  List,
  Save,
  X,
  MapPin,
  Navigation,
  Calendar,
  User,
  Building2,
  Info,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { filterLoads, searchFilter } from "../lib/filter-utils";
import {
  storage as appStorage,
  STORAGE_KEYS,
  saveFilterPreset,
  getFilterPresets,
  deleteFilterPreset,
} from "../lib/storage";
import { showUndoToast } from "../components/UndoToast";
import { undoManager } from "../lib/undo-manager";
import { normalizeLoadStatus } from "../lib/status";
import {
  createLoadOfferRequest,
  updateLoadOffer,
  fetchLoadOffers,
  fetchOfferMessages,
  postOfferMessage,
  type LoadOffer,
  type OfferMessage,
  fetchHaulerOfferSummaries,
  type HaulerOfferSummary,
  subscribeHauler,
} from "../api/marketplace";
import { fetchTrucks } from "../api/fleet";
import { useHaulerSubscription } from "../hooks/useHaulerSubscription";
import { SubscriptionCTA } from "../components/SubscriptionCTA";
import {
  SOCKET_EVENTS,
  subscribeToSocketEvent,
} from "../lib/socket";

interface Load {
  id: string;
  rawId: number;
  species: string;
  quantity: string;
  origin: string;
  destination: string;
  distance: string;
  postedBy: string;
  postedDate: string;
  pickupDate: string;
  price?: string;
  status: 'open' | 'assigned' | 'in-transit' | 'delivered';
  bids?: number;
  paymentMode?: "ESCROW" | "DIRECT";
  isExternal?: boolean;
  postLink?: string | null;
  comments?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

// const mockLoads: Load[] = [ ... ];

const recommendedCarriers = [
  {
    id: 'C001',
    name: 'Texas Livestock Transport',
    rating: 4.8,
    reviews: 247,
    distance: '15 miles',
    vehicles: 12,
    pricePerMile: '$4.35',
    completedTrips: 1240,
  },
  {
    id: 'C002',
    name: 'Lone Star Hauling',
    rating: 4.9,
    reviews: 189,
    distance: '8 miles',
    vehicles: 8,
    pricePerMile: '$4.50',
    completedTrips: 890,
  },
  {
    id: 'C003',
    name: 'Hill Country Express',
    rating: 4.7,
    reviews: 156,
    distance: '22 miles',
    vehicles: 6,
    pricePerMile: '$4.20',
    completedTrips: 650,
  },
];

export function Loadboard() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isBidOpen, setIsBidOpen] = useState(false);
  const [isAutoMatchOpen, setIsAutoMatchOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [offerDialogLoad, setOfferDialogLoad] = useState<Load | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerDialogExistingOffer, setOfferDialogExistingOffer] = useState<LoadOffer | null>(null);
  const [offerDialogCheckingExisting, setOfferDialogCheckingExisting] = useState(false);
  const [activeHaulerOffer, setActiveHaulerOffer] = useState<LoadOffer | null>(null);
  const [haulerChatMessages, setHaulerChatMessages] = useState<OfferMessage[]>([]);
  const [haulerChatDraft, setHaulerChatDraft] = useState("");
  const [haulerChatLoading, setHaulerChatLoading] = useState(false);
  const [haulerChatAllowed, setHaulerChatAllowed] = useState(false);
  const [loads, setLoads] = useState<ApiLoad[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [haulerOffers, setHaulerOffers] = useState<Record<string, HaulerOfferSummary>>({});
  const [haulerTruckCount, setHaulerTruckCount] = useState<number | null>(null);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [oneTimeUpgradeOpen, setOneTimeUpgradeOpen] = useState(false);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const {
    data: subscriptionState,
    loading: subscriptionLoading,
    refresh: refreshSubscription,
  } = useHaulerSubscription();
  const [searchQuery, setSearchQuery] = useState('');
  const [saveFilterName, setSaveFilterName] = useState('');
  const currentHaulerId = appStorage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const HAULER_OFFER_LAST_SEEN_KEY = "haulerOfferLastSeen";
  const [offerLastSeen, setOfferLastSeen] = useState<Record<string, string>>(() => {
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
  const navigate = useNavigate();
  const isEditingOffer = !!offerDialogExistingOffer;
  const activeOfferIdRef = useRef<string | null>(null);
  const haulerChatAllowedRef = useRef(false);
  const activeHaulerOfferRef = useRef<LoadOffer | null>(null);
  useEffect(() => {
    activeOfferIdRef.current = activeHaulerOffer?.id ?? null;
    activeHaulerOfferRef.current = activeHaulerOffer ?? null;
  }, [activeHaulerOffer]);
  useEffect(() => {
    haulerChatAllowedRef.current = haulerChatAllowed;
  }, [haulerChatAllowed]);

  const updateOfferLastSeen = (offerId: string, timestamp: string) => {
    setOfferLastSeen((prev) => {
      const next = { ...prev, [offerId]: timestamp };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          HAULER_OFFER_LAST_SEEN_KEY,
          JSON.stringify(next)
        );
      }
      return next;
    });
  };

  useEffect(() => {
    if (subscriptionLoading) return;
  }, [subscriptionLoading]);
  
  // Filters with persistence
type LoadboardFilters = {
  species: string;
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  priceMin: number;
  priceMax: number | null;
  distance: number;
  status: string;
};

  const [filters, setFilters] = useState<LoadboardFilters>(() => {
    const saved = appStorage.get(STORAGE_KEYS.FILTERS, null);
    return (
      saved || {
        species: "",
        origin: "",
        destination: "",
        dateFrom: "",
        dateTo: "",
        priceMin: 0,
        priceMax: null,
        distance: 0,
        status: "open",
      }
    );
  });

  const numericPriceMin =
    typeof filters.priceMin === "number"
      ? filters.priceMin
      : Number(filters.priceMin) || 0;
  const numericPriceMax =
    typeof filters.priceMax === "number" ? filters.priceMax : 10000;
  const numericDistance =
    typeof filters.distance === "number"
      ? filters.distance
      : Number(filters.distance) || 0;

  const offerBlocked =
    subscriptionState?.hauler_type === "INDIVIDUAL" &&
    subscriptionState.subscription_status !== "ACTIVE" &&
    subscriptionState.free_trip_used === true;
  const hasFleet = haulerTruckCount === null ? true : haulerTruckCount > 0;
  const offerBlockedMessage = "You have used your one free trip. Please subscribe to keep using LivestockWay.";
  const individualPrice =
    subscriptionState?.current_individual_monthly_price !== null &&
    subscriptionState?.current_individual_monthly_price !== undefined
      ? subscriptionState.current_individual_monthly_price
      : null;

  const parseApiError = (err: any): { code?: string; message: string } => {
    const fallback = { message: "Failed to create offer." };
    if (!err?.message) return fallback;
    try {
      const parsed = JSON.parse(err.message);
      if (parsed && typeof parsed === "object") {
        return {
          code: parsed.error || parsed.code,
          message: parsed.message || parsed.error || fallback.message,
        };
      }
    } catch {
      /* message is not JSON */
    }
    return { message: err.message || fallback.message };
  };

  // Persist filters
  useEffect(() => {
    appStorage.set(STORAGE_KEYS.FILTERS, {
      ...filters,
      priceMin: numericPriceMin,
      priceMax: numericPriceMax,
      distance: numericDistance,
    });
  }, [filters, numericPriceMin, numericPriceMax, numericDistance]);

  useEffect(() => {
    const unsubscribeLoadPosted = subscribeToSocketEvent(
      SOCKET_EVENTS.LOAD_POSTED,
      ({ load }) => {
        const normalizedId =
          typeof load.id === "string" ? Number(load.id) : load.id;
        if (!normalizedId || Number.isNaN(normalizedId)) {
          return;
        }
        const normalizedLoad: ApiLoad = {
          ...load,
          id: normalizedId,
        };
        setLoads((prev) => {
          if (prev.some((existing) => Number(existing.id) === normalizedId)) {
            return prev;
          }
          return [normalizedLoad, ...prev];
        });
      }
    );
    const unsubscribeLoadUpdated = subscribeToSocketEvent(
      SOCKET_EVENTS.LOAD_UPDATED,
      ({ load }) => {
        const normalizedId =
          typeof load.id === "string" ? Number(load.id) : Number(load.id);
        if (!normalizedId || Number.isNaN(normalizedId)) {
          return;
        }
        setLoads((prev) =>
          prev.map((existing) =>
            Number(existing.id) === normalizedId
              ? {
                  ...existing,
                  status: (typeof load.status === "string"
                    ? load.status
                    : existing.status) as ApiLoad["status"],
                }
              : existing
          )
        );
      }
    );
    const unsubscribeOfferMessage = subscribeToSocketEvent(
      SOCKET_EVENTS.OFFER_MESSAGE,
      ({ message }) => {
        if (message.offer_id !== activeOfferIdRef.current) {
          setHaulerOffers((prev) => {
            const entry = Object.entries(prev).find(
              ([, summary]) => summary.offer_id === message.offer_id
            );
            if (!entry) return prev;
            const [loadId, summary] = entry;
            return {
              ...prev,
              [loadId]: {
                ...summary,
                offer_id: message.offer_id,
                last_message_at: message.created_at,
              },
            };
          });
          return;
        }
        setHaulerChatMessages((prev) => {
          if (prev.some((existing) => existing.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
        updateOfferLastSeen(message.offer_id, message.created_at);
        if (
          !haulerChatAllowedRef.current &&
          typeof message.sender_role === "string" &&
          message.sender_role.toUpperCase().startsWith("SHIPPER")
        ) {
          const activeOffer = activeHaulerOfferRef.current;
          if (activeOffer?.id === message.offer_id && activeOffer.chat_enabled_by_hauler) {
            setHaulerChatAllowed(true);
          }
        }
      }
    );
    const unsubscribeOfferUpdated = subscribeToSocketEvent(
      SOCKET_EVENTS.OFFER_UPDATED,
      ({ offer }) => {
        setActiveHaulerOffer((prev) => {
          if (prev && prev.id === offer.id) {
            return offer;
          }
          return prev;
        });
        if (
          offer.id === activeOfferIdRef.current &&
          offer.status === "ACCEPTED"
        ) {
          setHaulerChatAllowed(true);
        }
        setHaulerOffers((prev) => ({
          ...prev,
          [String(offer.load_id)]: {
            load_id: String(offer.load_id),
            offer_id: String(offer.id),
            status: offer.status,
            offered_amount: offer.offered_amount,
            currency: offer.currency,
            created_at: offer.created_at,
            chat_enabled_by_hauler: offer.chat_enabled_by_hauler ?? null,
            last_message_at: prev[String(offer.load_id)]?.last_message_at ?? null,
          },
        }));
        if (offer.id === activeOfferIdRef.current) {
          const chatAllowed =
            !["REJECTED", "WITHDRAWN", "EXPIRED"].includes(offer.status) &&
            !!offer.chat_enabled_by_hauler;
          setHaulerChatAllowed(chatAllowed);
        }
      }
    );
    const unsubscribeOfferCreated = subscribeToSocketEvent(
      SOCKET_EVENTS.OFFER_CREATED,
      ({ offer }) => {
        setHaulerOffers((prev) => ({
          ...prev,
          [String(offer.load_id)]: {
            load_id: String(offer.load_id),
            offer_id: String(offer.id),
            status: offer.status,
            offered_amount: offer.offered_amount,
            currency: offer.currency,
            created_at: offer.created_at,
            chat_enabled_by_hauler: offer.chat_enabled_by_hauler ?? null,
            last_message_at: prev[String(offer.load_id)]?.last_message_at ?? null,
          },
        }));
      }
    );
    return () => {
      unsubscribeLoadPosted();
      unsubscribeLoadUpdated();
      unsubscribeOfferMessage();
      unsubscribeOfferUpdated();
      unsubscribeOfferCreated();
    };
  }, []);

  const handlePlaceBid = () => {
    if (!bidAmount) {
      toast.error('Please enter a bid amount');
      return;
    }
    toast.success(`Bid of $${bidAmount} placed for Load #${selectedLoad?.id}`);
    setIsBidOpen(false);
    setBidAmount('');
  };

  const handleAutoMatch = () => {
    setIsAutoMatchOpen(true);
  };

  const handleAcceptCarrier = (carrierId: string) => {
    toast.success('Carrier assigned! Trip will begin as scheduled.');
    setIsAutoMatchOpen(false);
  };

  const handleViewBids = (load: Load) => {
    toast.info(`Viewing ${load.bids || 0} bids for Load #${load.id}`);
  };

  const UPGRADE_MODAL_KEY = "haulerUpgradeModalSeenAt";
  const shouldShowOneTimeUpgrade = () => {
    if (typeof window === "undefined") return false;
    const last = window.localStorage.getItem(UPGRADE_MODAL_KEY);
    if (!last) return true;
    const lastDate = new Date(last);
    if (!Number.isFinite(lastDate.getTime())) return true;
    const now = new Date();
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    return diffHours >= 24;
  };

  const markUpgradeModalSeen = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(UPGRADE_MODAL_KEY, new Date().toISOString());
  };

  const handleOfferClick = (load: Load) => {
    if (!hasFleet) {
      toast.error("Add a vehicle in My Fleet before placing offers.");
      navigate("/hauler/fleet");
      return;
    }
    if (offerBlocked) {
      if (shouldShowOneTimeUpgrade()) {
        setOneTimeUpgradeOpen(true);
        markUpgradeModalSeen();
      } else {
        setSubscriptionDialogOpen(true);
      }
      return;
    }
    void openOfferDialog(load);
  };

  const openOfferDialog = async (load: Load) => {
    if (load.isExternal) {
      toast.info("This external load is read-only.");
      return;
    }
    if (!hasFleet) {
      toast.error("Add a vehicle in My Fleet before placing offers.");
      navigate("/hauler/fleet");
      return;
    }
    setOfferDialogLoad(load);
    setOfferDialogExistingOffer(null);
    const preset = load.price?.replace(/[^0-9.]/g, "");
    setOfferAmount(preset || "");
    setOfferMessage("");
    if (!currentHaulerId) return;
    setOfferDialogCheckingExisting(true);
    let shouldClose = false;
    try {
      const existing = await loadUserOffer(load, { silent: true });
      if (existing) {
        if (existing.status === "PENDING") {
          setOfferDialogExistingOffer(existing);
          setOfferAmount(existing.offered_amount);
          setOfferMessage(existing.message ?? "");
        } else if (existing.status === "ACCEPTED") {
          toast.error("This load already has an accepted offer from you.");
          shouldClose = true;
        }
      }
    } finally {
      setOfferDialogCheckingExisting(false);
      if (shouldClose) {
        setOfferDialogLoad(null);
        setOfferDialogExistingOffer(null);
      }
    }
  };

  const openUpgradeDialog = () => {
    setSubscriptionDialogOpen(true);
  };

  const handleSubscribe = async () => {
    setSubscriptionSaving(true);
    try {
      await subscribeHauler({ billing_cycle: "MONTHLY" });
      toast.success("Subscription activated. You can now place offers.");
      setSubscriptionDialogOpen(false);
    } catch (err: any) {
      const message = err?.message || err?.error || "Failed to activate subscription.";
      toast.error(message);
    } finally {
      setSubscriptionSaving(false);
      await refreshSubscription();
    }
  };

const submitOffer = async () => {
    if (!offerDialogLoad) return;
    const amountValue = Number(offerAmount);
    if (!amountValue || Number.isNaN(amountValue)) {
      toast.error("Enter a valid offer amount.");
      return;
    }
    try {
      setOfferSubmitting(true);
      const loadIdNumeric = String(offerDialogLoad.rawId ?? offerDialogLoad.id).replace(/\D/g, "");
      if (offerDialogExistingOffer) {
        await updateLoadOffer(offerDialogExistingOffer.id, {
          offered_amount: amountValue,
          currency: "USD",
          message: offerMessage || undefined,
        });
        toast.success("Offer updated.");
      } else {
        await createLoadOfferRequest(loadIdNumeric, {
          offered_amount: amountValue,
          currency: "USD",
          message: offerMessage || undefined,
        });
        toast.success("Offer submitted to shipper.");
      }
      setOfferDialogLoad(null);
      setOfferDialogExistingOffer(null);
      setOfferAmount("");
      setOfferMessage("");
    } catch (err: any) {
      const parsed = parseApiError(err);
      const normalizedMessage = parsed.message?.toLowerCase() ?? "";
      if (
        parsed.code === "PAYMENT_REQUIRED" ||
        normalizedMessage.includes("payment_required")
      ) {
        toast.error("Complete payment to continue with the Paid plan.");
        navigate("/hauler/payment");
      } else if (
        parsed.code === "SUBSCRIPTION_REQUIRED" ||
        parsed.message.includes("SUBSCRIPTION_REQUIRED") ||
        normalizedMessage.includes("subscribe")
      ) {
        setSubscriptionDialogOpen(true);
        toast.error(offerBlockedMessage);
      } else {
        toast.error(parsed.message || "Failed to submit offer.");
      }
    } finally {
      setOfferSubmitting(false);
    }
  };

const loadUserOffer = async (load: Load, options: { silent?: boolean } = {}) => {
  if (!currentHaulerId) {
    toast.error("Log in as a hauler to chat.");
    return null;
  }
  try {
      const result = await fetchLoadOffers(
        String(load.rawId ?? load.id).replace(/\D/g, "")
      );
      return result.items.find(
        (offer) => offer.created_by_user_id === String(currentHaulerId)
      );
    } catch (err: any) {
      if (!options.silent) {
        toast.error(err?.message ?? "Failed to fetch offers.");
      }
      return null;
    }
  };

  const openHaulerChat = async (load: Load) => {
    if (load.isExternal) {
      toast.info("Chat is disabled for external loads.");
      return;
    }
    setHaulerChatLoading(true);
    try {
      let offer = await loadUserOffer(load);
      if (!offer) {
        toast.error("Submit an offer before starting a chat.");
        return;
      }
      const resp = await fetchLoadOffers(
        String(load.rawId ?? load.id).replace(/\D/g, "")
      );
      const refreshed = resp.items.find((o) => o.id === offer!.id);
      if (refreshed) offer = refreshed;
      const messagesResp = await fetchOfferMessages(offer.id);
      const chatAllowed =
        !["REJECTED", "WITHDRAWN", "EXPIRED"].includes(offer.status) &&
        !!offer.chat_enabled_by_hauler;
      setActiveHaulerOffer(offer);
      setHaulerChatMessages(messagesResp.items);
      setHaulerChatAllowed(chatAllowed);
      const latestMessageAt =
        messagesResp.items.length > 0
          ? messagesResp.items[messagesResp.items.length - 1].created_at
          : new Date().toISOString();
      updateOfferLastSeen(offer.id, latestMessageAt);

      const poll = setInterval(async () => {
        try {
          const { items } = await fetchOfferMessages(offer!.id);
          setHaulerChatMessages(items);
        } catch {
          /* ignore small polling errors */
        }
      }, 5000);

      return () => clearInterval(poll);
    } finally {
      setHaulerChatLoading(false);
    }
  };

  useEffect(() => {
    let pollId: ReturnType<typeof setInterval> | null = null;
    if (!activeHaulerOffer) {
      setHaulerChatMessages([]);
      setHaulerChatAllowed(false);
    } else {
      pollId = setInterval(async () => {
        try {
          const { items } = await fetchOfferMessages(activeHaulerOffer.id);
          setHaulerChatMessages(items);
        } catch {
          /* ignore */
        }
      }, 5000);
    }
    return () => {
      if (pollId) clearInterval(pollId);
    };
  }, [activeHaulerOffer]);

  const sendHaulerChatMessage = async () => {
    if (!activeHaulerOffer || !haulerChatDraft.trim() || !haulerChatAllowed) return;
    try {
      const { message } = await postOfferMessage(activeHaulerOffer.id, {
        text: haulerChatDraft.trim(),
      });
      setHaulerChatMessages((prev) => {
        if (prev.some((existing) => existing.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
      setHaulerChatDraft("");
      updateOfferLastSeen(activeHaulerOffer.id, message.created_at);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send message.");
    }
  };

  const enableHaulerChat = async () => {
    if (!activeHaulerOffer) return;
    try {
      const { offer } = await updateLoadOffer(activeHaulerOffer.id, {
        chat_enabled_by_hauler: true,
      });
      setActiveHaulerOffer(offer);
      setHaulerChatAllowed(true);
      setHaulerOffers((prev) => ({
        ...prev,
        [String(offer.load_id)]: {
          load_id: String(offer.load_id),
          offer_id: String(offer.id),
          status: offer.status,
          offered_amount: offer.offered_amount,
          currency: offer.currency,
          created_at: offer.created_at,
          chat_enabled_by_hauler: offer.chat_enabled_by_hauler ?? null,
          last_message_at: prev[String(offer.load_id)]?.last_message_at ?? null,
        },
      }));
      toast.success("Chat enabled for this offer.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to enable chat.");
    }
  };
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await fetchLoads();

    if (isMounted) {
      setLoads(data);
    }
  } catch (err: any) {
        console.error("Failed to fetch loads:", err);
        if (isMounted) {
          setError("Failed to load loads. Please try again.");
    }
  } finally {
    if (isMounted) {
      setIsLoading(false);
    }
  }
}

    loadData();
    if (currentHaulerId) {
      fetchHaulerOfferSummaries()
        .then((resp) => {
          const next: Record<string, HaulerOfferSummary> = {};
          resp.items.forEach((item) => {
            if (item.load_id) {
              next[String(item.load_id)] = item;
            }
          });
          setHaulerOffers(next);
        })
        .catch(() => {
          setHaulerOffers({});
        });
      fetchTrucks()
        .then((resp) => {
          setHaulerTruckCount(resp.items?.length ?? 0);
        })
        .catch(() => {
          setHaulerTruckCount(0);
        });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const transformedLoads: Load[] = loads.map((load) => {
    const mappedStatus = normalizeLoadStatus(load.status);
    const normalizedStatus: "open" | "assigned" | "in-transit" | "delivered" =
      mappedStatus === "in_transit"
        ? "in-transit"
        : mappedStatus === "delivered"
          ? "delivered"
          : mappedStatus;

    return {
      id: `L${load.id}`,
      rawId: load.id,
      species: load.species,
      quantity: `${load.quantity} head`,
      origin: load.pickup_location,
      destination: load.dropoff_location,
      distance: "0 miles",
      postedBy: load.created_by ?? "Unknown shipper",
      postedDate: load.created_at ? new Date(load.created_at).toLocaleDateString() : "—",
      pickupDate: load.pickup_date ? new Date(load.pickup_date).toLocaleString() : "—",
      price: load.offer_price
        ? `$${Number(load.offer_price).toFixed(0)}`
        : "",
      status: normalizedStatus,
      bids: undefined,
      paymentMode: (load as any)?.payment_mode === "DIRECT" ? "DIRECT" : "ESCROW",
      isExternal: Boolean((load as any)?.is_external),
      postLink: (load as any)?.post_link ?? null,
      comments: (load as any)?.description ?? null,
      contactEmail: (load as any)?.external_contact_email ?? null,
      contactPhone: (load as any)?.external_contact_phone ?? null,
    };
  });

  // Apply real filtering
  const filteredLoads = filterLoads(transformedLoads, {
    species: filters.species || undefined,
    origin: filters.origin || undefined,
    destination: filters.destination || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    priceMin: filters.priceMin ?? 0,
    priceMax: filters.priceMax ?? undefined,
    distance: numericDistance,
    status: filters.status || undefined,
    searchQuery: searchQuery || undefined,
  });

  const loadsToDisplay = filteredLoads;

  const hasUnreadForLoad = (loadId: string) => {
    const summary = haulerOffers[loadId];
    if (summary?.chat_enabled_by_hauler === false) return false;
    if (!summary?.offer_id || !summary?.last_message_at) return false;
    const lastSeen = offerLastSeen[summary.offer_id];
    if (!lastSeen) return true;
    return (
      new Date(summary.last_message_at).getTime() >
      new Date(lastSeen).getTime()
    );
  };

  const handleClearFilters = () => {
    const previousFilters = { ...filters };
    const newFilters = {
      species: '',
      origin: '',
      destination: '',
      dateFrom: '',
      dateTo: '',
      priceMin: 0,
      priceMax: null,
      distance: 0,
      status: 'open',
    };
    setFilters(newFilters);
    setSearchQuery('');
    
    // Add undo action
    undoManager.add({
      id: `clear-filters-${Date.now()}`,
      description: 'Cleared filters',
      undo: () => setFilters(previousFilters),
      redo: () => setFilters(newFilters),
    });
    
    showUndoToast('Filters cleared', () => setFilters(previousFilters));
  };

  const handleSaveFilters = () => {
    if (!saveFilterName.trim()) {
      toast.error('Please enter a name for this filter preset');
      return;
    }
    
    saveFilterPreset(saveFilterName, filters);
    toast.success(`Filter preset "${saveFilterName}" saved`);
    setSaveFilterName('');
  };

  const handleLoadFilterPreset = (name: string) => {
    const presets = getFilterPresets();
    const preset = presets[name];
    if (preset) {
      setFilters(preset);
      toast.success(`Filter preset "${name}" loaded`);
      setIsFilterOpen(false);
    }
  };

  return (
    <div className="p-6 space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#172039]">Loadboard</h1>
          <p className="text-gray-600">Find loads and carriers for your fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleAutoMatch}
            className="bg-[#29CA8D] hover:bg-[#24b67d]"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Auto Match
          </Button>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="list">
                <List className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="map">
                <MapIcon className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by species, location, or shipper..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {Object.values(filters).filter(v => v && v !== 'open' && v !== 0).length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {Object.values(filters).filter(v => v && v !== 'open' && v !== 0).length}
                </Badge>
              )}
            </Button>
            {(searchQuery || Object.values(filters).filter(v => v && v !== 'open' && v !== 0).length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-[#172039] mb-1">{loadsToDisplay.length}</div>
            <div className="text-sm text-gray-600">Available Loads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-[#F97316] mb-1">
              {loadsToDisplay.reduce((sum, l) => sum + (l.bids || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Active Bids</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-blue-600 mb-1">
              {loadsToDisplay.length
                ? Math.round(
                    loadsToDisplay.reduce(
                      (sum, l) => sum + parseInt(l.distance.replace(" miles", "")),
                      0
                    ) / loadsToDisplay.length
                  )
                : 0}
            </div>
            <div className="text-sm text-gray-600">Avg Distance (mi)</div>
          </CardContent>
        </Card>
      </div>

      {offerBlocked && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="text-sm text-amber-900 font-medium">
              {offerBlockedMessage}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white text-amber-900 border-amber-200">
                Individual plan
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/hauler/subscription")}
                className="border-amber-300 text-amber-900 hover:bg-white"
              >
                Upgrade
              </Button>
            </div>
          </CardContent>
      </Card>
    )}

      {subscriptionState?.hauler_type === "INDIVIDUAL" &&
        subscriptionState.subscription_status !== "ACTIVE" && (
          <div className="sticky bottom-4 z-20">
            <SubscriptionCTA
              variant={subscriptionState.free_trip_used ? "BLOCKED_UPGRADE" : "REMINDER"}
              monthlyPrice={
                subscriptionState.monthly_price ??
                subscriptionState.current_individual_monthly_price ??
                undefined
              }
              yearlyPrice={
                subscriptionState.yearly_price ??
                (subscriptionState.monthly_price ?? subscriptionState.current_individual_monthly_price
                  ? Number(
                      (((subscriptionState.monthly_price ??
                        subscriptionState.current_individual_monthly_price) as number) *
                        10).toFixed(2)
                    )
                  : undefined)
              }
              onUpgradeClick={() => navigate("/hauler/subscription")}
            />
          </div>
        )}

      {/* View Modes */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          {isLoading && (
            <div className="p-4 text-gray-500">Loading loads...</div>
          )}
          {error && (
            <div className="p-4 text-red-500 text-sm">{error}</div>
          )}
          {!isLoading && !error && loadsToDisplay.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Filter className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg text-gray-900 mb-2">No loads found</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {searchQuery || Object.values(filters).filter(v => v && v !== 'open' && v !== 0).length > 0
                    ? 'Try adjusting your search or filters'
                    : 'Check back later for new loads'}
                </p>
                {(searchQuery || Object.values(filters).filter(v => v && v !== 'open' && v !== 0).length > 0) && (
                  <Button onClick={handleClearFilters} variant="outline">
                    Clear Filters
                  </Button>
                )}
                {subscriptionState?.hauler_type === "INDIVIDUAL" &&
                  subscriptionState.subscription_status !== "ACTIVE" && (
                    <div className="mt-4">
                      <SubscriptionCTA
                        variant="REMINDER"
                        monthlyPrice={
                          subscriptionState.monthly_price ??
                          subscriptionState.current_individual_monthly_price ??
                          undefined
                        }
                        yearlyPrice={
                          subscriptionState.yearly_price ??
                          (subscriptionState.monthly_price ??
                          subscriptionState.current_individual_monthly_price
                            ? Number(
                                (((subscriptionState.monthly_price ??
                                  subscriptionState.current_individual_monthly_price) as number) *
                                  10).toFixed(2)
                              )
                            : undefined)
                        }
                        onUpgradeClick={() => navigate("/hauler/subscription")}
                      />
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
          {!isLoading && !error && loadsToDisplay.length > 0 && (
            <>
              {loadsToDisplay.map((load) => (
                <Card key={load.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg text-gray-900">Load #{load.id}</h3>
                        <p className="text-sm text-gray-500">
                          {load.species} • {load.quantity}
                        </p>
                        <p className="text-sm text-gray-600">
                          {load.origin} → {load.destination}
                        </p>
                        <p className="text-xs text-gray-400">
                          Pickup: {load.pickupDate}
                        </p>
                        {load.isExternal && (
                          <div className="mt-2">
                            <Badge variant="outline" className="border-dashed text-gray-500">
                              External
                            </Badge>
                          </div>
                        )}
                        {haulerOffers[String(load.rawId)] && !load.isExternal && (
                          <div className="mt-1 text-xs text-blue-700">
                            Your offer: ${haulerOffers[String(load.rawId)].offered_amount}{" "}
                            {haulerOffers[String(load.rawId)].currency} ·{" "}
                            {haulerOffers[String(load.rawId)].status.toLowerCase()}
                          </div>
                        )}
                      </div>
                  <div className="text-right">
                    {!load.isExternal && (
                      <div className="mb-2">
                        <div className="text-lg text-gray-900">{load.price || "—"}</div>
                        {load.paymentMode && (
                          <div className="text-xs text-gray-500">
                            {load.paymentMode === "DIRECT" ? "Direct pay" : "Escrow"}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      {!load.isExternal && (
                        <>
                          <div className="relative flex flex-col gap-2">
                           
                              {offerBlocked
                                ? "Offers Disabled"
                                : haulerOffers[String(load.rawId)]
                                  ? 
                                    <div className="mt-2">
                                      <Badge className="bg-primary text-white border border-primary-200">
                                        Offer placed
                                      </Badge>
                                    </div>
                                  :  <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOfferClick(load)}
                                  disabled={offerBlocked}
                                >Place Offer</Button>}
                            
                            {offerBlocked && (
                              <>
                                <div
                                  className="absolute inset-0 cursor-pointer"
                                  onClick={() => handleOfferClick(load)}
                                />
                                <SubscriptionCTA
                                  variant="BLOCKED_UPGRADE"
                                  monthlyPrice={
                                    subscriptionState?.monthly_price ??
                                    subscriptionState?.current_individual_monthly_price ??
                                    undefined
                                  }
                                  yearlyPrice={
                                    subscriptionState?.yearly_price ??
                                    (subscriptionState?.monthly_price ??
                                    subscriptionState?.current_individual_monthly_price
                                      ? Number(
                                          (((subscriptionState?.monthly_price ??
                                            subscriptionState?.current_individual_monthly_price) as number) *
                                            10).toFixed(2)
                                        )
                                      : undefined)
                                  }
                                  onUpgradeClick={() => navigate("/hauler/subscription")}
                                />
                              </>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="relative gap-2"
                            onClick={() => openHaulerChat(load)}
                          >
                            <MessageCircle className="h-4 w-4" />
                            Chat
                            {hasUnreadForLoad(String(load.rawId ?? load.id)) && (
                              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white shadow">
                                New
                              </span>
                            )}
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setDetailLoad(load)}>
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 h-[600px] bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapIcon className="w-16 h-16 mx-auto mb-3 text-gray-400" />
              <p className="text-lg">Map View</p>
              <p className="text-sm">Loads displayed on interactive map</p>
              <p className="text-xs mt-2">(Google Maps/Mapbox integration)</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filter Loads</DialogTitle>
            <DialogDescription>
              Refine your search criteria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Species</Label>
                <Select
                  value={filters.species || "all"}
                  onValueChange={(v) =>
                    setFilters({ ...filters, species: v === "all" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All species" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Species</SelectItem>
                    <SelectItem value="Cattle">Cattle</SelectItem>
                    <SelectItem value="Sheep">Sheep</SelectItem>
                    <SelectItem value="Pigs">Pigs</SelectItem>
                    <SelectItem value="Goats">Goats</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(v) =>
                    setFilters({ ...filters, status: v === "all" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in-transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Input
                  placeholder="City, State"
                  value={filters.origin}
                  onChange={(e) =>
                    setFilters({ ...filters, origin: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input
                  placeholder="City, State"
                  value={filters.destination}
                  onChange={(e) =>
                    setFilters({ ...filters, destination: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Max Distance: {numericDistance} miles{" "}
                {numericDistance === 0 ? "(Any)" : ""}
              </Label>
              <Slider
                value={[numericDistance]}
                onValueChange={(v) =>
                  setFilters({ ...filters, distance: v[0] })
                }
                max={500}
                step={10}
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label>Save Filter Preset</Label>
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  placeholder="Preset name..."
                  value={saveFilterName}
                  onChange={(e) => setSaveFilterName(e.target.value)}
                />
                <Button onClick={handleSaveFilters} variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
              {Object.keys(getFilterPresets()).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">
                    Load preset
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(getFilterPresets()).map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleLoadFilterPreset(name)}
                      >
                        {name}
                        <X
                          className="ml-1 h-3 w-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFilterPreset(name);
                            toast.success(`Preset "${name}" deleted`);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  handleClearFilters();
                  setIsFilterOpen(false);
                }}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={oneTimeUpgradeOpen} onOpenChange={setOneTimeUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to keep hauling</DialogTitle>
            <DialogDescription>
              Your free trip is used. Subscribe to continue placing offers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-2">
              <Button
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
                onClick={() => navigate("/hauler/subscription")}
              >
                View Plans
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => navigate("/hauler/subscription")}
              >
                Pay Monthly
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => navigate("/hauler/subscription")}
              >
                Pay Yearly
              </Button>
            </div>
            <DialogFooter className="sm:justify-end">
              <Button variant="ghost" onClick={() => setOneTimeUpgradeOpen(false)}>
                Maybe later
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!offerDialogLoad}
        onOpenChange={(open) => {
          if (!open) {
            setOfferDialogLoad(null);
            setOfferDialogExistingOffer(null);
            setOfferAmount("");
            setOfferMessage("");
            setOfferDialogCheckingExisting(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingOffer ? "Update Offer" : "Submit Offer"}</DialogTitle>
            <DialogDescription>
              {isEditingOffer
                ? `Edit your bid for load #${offerDialogLoad?.id}`
                : `Negotiate directly with the shipper for load #${offerDialogLoad?.id}`}
            </DialogDescription>
          </DialogHeader>
          {offerDialogCheckingExisting && (
            <p className="text-xs text-gray-500">Checking your existing offer…</p>
          )}
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500">Offer amount (USD)</Label>
              <Input
                type="number"
                min="1"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="15000"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-500">Message to shipper</Label>
              <textarea
                className="w-full rounded-md border p-2 text-sm"
                rows={4}
                placeholder="Share availability, special equipment, etc."
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOfferDialogLoad(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
                onClick={submitOffer}
                disabled={offerSubmitting || offerDialogCheckingExisting}
              >
                {offerSubmitting
                  ? isEditingOffer
                    ? "Saving..."
                    : "Submitting..."
                  : isEditingOffer
                    ? "Save Changes"
                    : "Send Offer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to place offers</DialogTitle>
            <DialogDescription>
              You have used your one free trip. Please subscribe to keep using LivestockWay.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              {individualPrice !== null ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-[#172039]">
                    ${individualPrice.toFixed(2)}
                  </span>
                  <span className="text-gray-500">per month</span>
                </div>
              ) : (
                <p className="text-gray-600">Pricing unavailable right now.</p>
              )}
              {subscriptionState?.subscription_status === "ACTIVE" && (
                <p className="text-xs text-emerald-700 mt-2">
                  Already active — you can place offers.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSubscriptionDialogOpen(false)}
                disabled={subscriptionSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
                onClick={handleSubscribe}
                disabled={subscriptionSaving || individualPrice === null}
              >
                {subscriptionSaving ? "Activating..." : "Pay & Activate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!activeHaulerOffer}
        onOpenChange={(open) => {
          if (!open) {
            setActiveHaulerOffer(null);
            setHaulerChatDraft("");
            setHaulerChatMessages([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offer Chat</DialogTitle>
            <DialogDescription>
              {activeHaulerOffer
                ? `Conversation for offer #${activeHaulerOffer.id}`
                : "Select an offer to chat"}
            </DialogDescription>
          </DialogHeader>
          {haulerChatLoading ? (
            <p className="text-sm text-gray-500">Loading conversation…</p>
          ) : (
            <div className="space-y-3">
              {!haulerChatAllowed && activeHaulerOffer && (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <span>Enable chat to let the shipper reply.</span>
                  <Button size="sm" variant="outline" onClick={enableHaulerChat}>
                    Enable chat
                  </Button>
                </div>
              )}
              <ScrollArea className="h-60 rounded border">
                {haulerChatMessages.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">
                    No messages yet. Say hello!
                  </p>
                ) : (
                  <div className="space-y-3 p-4">
                    {haulerChatMessages.map((msg) => (
                      <div key={msg.id} className="rounded border p-2 text-sm">
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
                  className="flex-1"
                  placeholder="Type a message…"
                  value={haulerChatDraft}
                  onChange={(e) => setHaulerChatDraft(e.target.value)}
                  disabled={!haulerChatAllowed}
                />
                <Button
                  onClick={sendHaulerChatMessage}
                  disabled={!activeHaulerOffer || !haulerChatAllowed}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Place Bid Dialog */}
      <Dialog open={isBidOpen} onOpenChange={setIsBidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Bid</DialogTitle>
            <DialogDescription>
              Load #{selectedLoad?.id} - {selectedLoad?.species}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Bid Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Your bid will be visible to the shipper. Competitive bids have a higher chance of acceptance.
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsBidOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handlePlaceBid} className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]">
                Submit Bid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto Match Dialog */}
      <Dialog open={isAutoMatchOpen} onOpenChange={setIsAutoMatchOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Auto Match - Recommended Carriers</DialogTitle>
            <DialogDescription>
              AI-powered recommendations based on distance and rating
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {recommendedCarriers.map((carrier) => (
              <Card key={carrier.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="text-base text-gray-900 mb-1">{carrier.name}</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{carrier.rating}</span>
                          </div>
                          <span className="text-sm text-gray-600">({carrier.reviews} reviews)</span>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <div>{carrier.distance} away</div>
                          <div>{carrier.vehicles} vehicles</div>
                          <div>{carrier.completedTrips} trips</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptCarrier(carrier.id)}
                        className="bg-[#29CA8D] hover:bg-[#24b67d]"
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!detailLoad} onOpenChange={(open) => !open && setDetailLoad(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Details</DialogTitle>
            <DialogDescription>View the full load information.</DialogDescription>
          </DialogHeader>
          {detailLoad && (
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <div className="text-xs uppercase text-gray-400">Route</div>
                <div className="text-gray-900">
                  {detailLoad.origin} → {detailLoad.destination}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs uppercase text-gray-400">Species</div>
                  <div className="text-gray-900">{detailLoad.species}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Quantity</div>
                  <div className="text-gray-900">{detailLoad.quantity}</div>
                </div>
                {detailLoad.contactEmail && (
                  <div>
                    <div className="text-xs uppercase text-gray-400">Email</div>
                    <div className="text-gray-900 break-all">{detailLoad.contactEmail}</div>
                  </div>
                )}
                {detailLoad.contactPhone && (
                  <div>
                    <div className="text-xs uppercase text-gray-400">Contact</div>
                    <div className="text-gray-900">{detailLoad.contactPhone}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase text-gray-400">Pickup</div>
                  <div className="text-gray-900">{detailLoad.pickupDate}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">Posted</div>
                  <div className="text-gray-900">{detailLoad.postedDate}</div>
                </div>
              </div>
              {detailLoad.comments && (
                <div>
                  <div className="text-xs uppercase text-gray-400">Notes</div>
                  <div className="text-gray-900 whitespace-pre-line">{detailLoad.comments}</div>
                </div>
              )}
              {detailLoad.postLink && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(detailLoad.postLink!, "_blank")}
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
