import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Send, MessageSquare, Briefcase, User, Clock, MapPin, DollarSign, Calendar, Building, Eye, Phone, Mail, X, FileText, Truck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { fetchUserThreads, fetchThreadMessages, sendMessage, fetchThreadById, type JobApplicationThread, type JobApplicationMessage } from "../api/jobMessages";
import { fetchUserBuySellThreads, fetchBuySellThreadMessages, sendBuySellMessage, fetchBuySellThreadById, type BuySellApplicationThread, type BuySellApplicationMessage } from "../api/buySellMessages";
import { fetchUserResourcesThreads, fetchResourcesThreadMessages, sendResourcesMessage, fetchResourcesThreadById, type ResourcesApplicationThread, type ResourcesApplicationMessage } from "../api/resourcesMessages";
import { fetchUserLoadOfferThreads, fetchLoadOfferThreadMessages, sendLoadOfferMessage, fetchLoadOfferThreadById, fetchLoadOfferThreadByOfferId, type LoadOfferThread, type LoadOfferMessage } from "../api/loadOfferMessages";
import { fetchUserTruckBookingThreads, fetchTruckBookingThreadMessages, sendTruckBookingMessage, fetchTruckBookingThreadById, fetchTruckBookingThreadByBookingId, type TruckBookingThread, type TruckBookingMessage } from "../api/truckBookingMessages";
import { fetchJobById, type JobListing } from "../api/jobs";
import { fetchJobApplications } from "../api/jobs";
import { fetchBuyAndSellById, type BuyAndSellListing } from "../api/buyAndSell";
import { fetchBuyAndSellApplications } from "../api/buyAndSell";
import { fetchResourcesById, type ResourcesListing } from "../api/resources";
import { fetchResourcesApplications } from "../api/resources";
import { fetchLoadById, type LoadDetail } from "../lib/api";
import { fetchLoadOffers, type LoadOffer, fetchBookings, fetchTruckAvailability } from "../api/marketplace";
import { fetchTrucks, type TruckRecord } from "../api/fleet";
import { createContract, sendContract, updateContract, fetchContracts, type ContractRecord } from "../api/marketplace";
import { GenerateContractPopup } from "../components/GenerateContractPopup";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { API_BASE_URL } from "../lib/api";
import { getSocket, subscribeToSocketEvent, joinSocketRoom, SOCKET_EVENTS } from "../lib/socket";

type ThreadType = "job" | "buy-sell" | "resources" | "load-offer" | "truck-booking";
type UnifiedThread = (JobApplicationThread & { type: "job" }) | (BuySellApplicationThread & { type: "buy-sell" }) | (ResourcesApplicationThread & { type: "resources" }) | (LoadOfferThread & { type: "load-offer" }) | (TruckBookingThread & { type: "truck-booking" });
type UnifiedMessage = (JobApplicationMessage & { type: "job" }) | (BuySellApplicationMessage & { type: "buy-sell" }) | (ResourcesApplicationMessage & { type: "resources" }) | (LoadOfferMessage & { type: "load-offer" }) | (TruckBookingMessage & { type: "truck-booking" });

export default function JobMessages() {
  const [jobThreads, setJobThreads] = useState<JobApplicationThread[]>([]);
  const [buySellThreads, setBuySellThreads] = useState<BuySellApplicationThread[]>([]);
  const [resourcesThreads, setResourcesThreads] = useState<ResourcesApplicationThread[]>([]);
  const [loadOfferThreads, setLoadOfferThreads] = useState<LoadOfferThread[]>([]);
  const [truckBookingThreads, setTruckBookingThreads] = useState<TruckBookingThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<UnifiedThread | null>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [jobDetails, setJobDetails] = useState<JobListing | null>(null);
  const [buySellDetails, setBuySellDetails] = useState<BuyAndSellListing | null>(null);
  const [resourcesDetails, setResourcesDetails] = useState<ResourcesListing | null>(null);
  const [loadOfferDetails, setLoadOfferDetails] = useState<{ load: LoadDetail; offer: LoadOffer; truck: TruckRecord | null } | null>(null);
  const [truckBookingDetails, setTruckBookingDetails] = useState<{ load: LoadDetail; booking: any; truckAvailability: any; truck: TruckRecord | null } | null>(null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false); // For mobile responsiveness
  const [hideThreadList, setHideThreadList] = useState(false); // Hide thread list when opening from loadboard
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [applicantInfo, setApplicantInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const userRole = storage.get<string | null>(STORAGE_KEYS.USER_ROLE, null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const currentThreadRoomRef = useRef<string | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      setLoading(true);
      const [jobResult, buySellResult, resourcesResult, loadOfferResult, truckBookingResult] = await Promise.all([
        fetchUserThreads().catch(() => []),
        fetchUserBuySellThreads().catch(() => []),
        fetchUserResourcesThreads().catch(() => []),
        fetchUserLoadOfferThreads().catch(() => []),
        fetchUserTruckBookingThreads().catch(() => []),
      ]);
      setJobThreads(jobResult);
      setBuySellThreads(buySellResult);
      setResourcesThreads(resourcesResult);
      setLoadOfferThreads(loadOfferResult);
      setTruckBookingThreads(truckBookingResult);
      // Don't auto-select first thread - let user choose or open via custom event
    } catch (err: any) {
      console.error("Error loading threads:", err);
      toast.error(err?.message ?? "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  const allThreads: UnifiedThread[] = [
    ...jobThreads.map(t => ({ ...t, type: "job" as const })),
    ...buySellThreads.map(t => ({ ...t, type: "buy-sell" as const })),
    ...resourcesThreads.map(t => ({ ...t, type: "resources" as const })),
    ...loadOfferThreads.map(t => ({ ...t, type: "load-offer" as const })),
    ...truckBookingThreads.map(t => ({ ...t, type: "truck-booking" as const })),
  ].sort((a, b) => {
    const aTime = a.last_message_at || a.updated_at;
    const bTime = b.last_message_at || b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const loadJobDetails = useCallback(async (jobId: number) => {
    try {
      const job = await fetchJobById(jobId);
      setJobDetails(job);
    } catch (err: any) {
      console.error("Error loading job details:", err);
    }
  }, []);

  const loadBuySellDetails = useCallback(async (listingId: number) => {
    try {
      const listing = await fetchBuyAndSellById(listingId);
      setBuySellDetails(listing);
    } catch (err: any) {
      console.error("Error loading listing details:", err);
    }
  }, []);

  const loadResourcesDetails = useCallback(async (listingId: number) => {
    try {
      const listing = await fetchResourcesById(listingId);
      setResourcesDetails(listing);
    } catch (err: any) {
      console.error("Error loading resource details:", err);
    }
  }, []);

  const loadLoadOfferDetails = useCallback(async (offerId: number, loadId: number) => {
    try {
      const [load, offersResult] = await Promise.all([
        fetchLoadById(loadId),
        fetchLoadOffers(String(loadId)),
      ]);
      const offer = offersResult.items.find(o => String(o.id) === String(offerId));
      if (!offer) {
        console.error("Offer not found");
        return;
      }
      
      // Get truck details - first from offer.truck (included in API response), then fallback
      let truck: TruckRecord | null = null;
      try {
        // First, use truck details from offer response (available to both shipper and hauler)
        if (offer.truck) {
          truck = {
            id: Number(offer.truck.id),
            hauler_id: Number(offer.hauler_id),
            plate_number: offer.truck.plate_number,
            truck_type: offer.truck.truck_type,
            truck_name: offer.truck.truck_name,
            capacity: offer.truck.capacity,
            species_supported: offer.truck.species_supported,
            status: "active",
            created_at: "",
          } as TruckRecord;
        } else if (offer.truck_id) {
          // Fallback: try to fetch truck if not included in response (for backward compatibility)
          try {
            const trucksResult = await fetchTrucks();
            truck = trucksResult.items.find(t => String(t.id) === String(offer.truck_id)) || null;
          } catch (err) {
            // If fetchTrucks fails (e.g., shipper can't access hauler's trucks), continue without truck
            console.warn("Could not fetch truck details:", err);
          }
        }
        
        // Additional fallback: try to get truck from booking if still not found
        if (!truck) {
          try {
            const bookingsResult = await fetchBookings();
            const booking = bookingsResult.items.find(b => b.offer_id === String(offerId));
            
            if (booking?.truck_availability_id) {
              const truckAvailability = await fetchTruckAvailability({});
              const availability = truckAvailability.items.find(ta => String(ta.id) === booking.truck_availability_id);
              
              if (availability?.truck_id) {
                try {
                  const trucksResult = await fetchTrucks();
                  truck = trucksResult.items.find(t => String(t.id) === availability.truck_id) || null;
                } catch (err) {
                  console.warn("Could not fetch truck from availability:", err);
                }
              }
            }
          } catch (err) {
            console.warn("Could not fetch truck from booking:", err);
          }
        }
      } catch (err) {
        console.error("Error loading truck:", err);
        // Continue without truck details if there's an error
      }
      
      setLoadOfferDetails({ load, offer, truck });
    } catch (err: any) {
      console.error("Error loading load offer details:", err);
    }
  }, []);

  const loadTruckBookingDetails = useCallback(async (bookingId: number, loadId: number, truckAvailabilityId: number) => {
    try {
      // Fetch all data in parallel
      const [load, bookingsResult, truckAvailabilityResult] = await Promise.all([
        fetchLoadById(loadId).catch((err) => {
          console.error("Error fetching load:", err);
          return null;
        }),
        fetchBookings().catch((err) => {
          console.error("Error fetching bookings:", err);
          return { items: [] };
        }),
        fetchTruckAvailability({}).catch((err) => {
          console.error("Error fetching truck availability:", err);
          return { items: [] };
        }),
      ]);
      
      if (!load) {
        console.error("Load not found for loadId:", loadId);
        toast.error("Could not load load details");
        return;
      }
      
      const booking = bookingsResult.items.find(b => String(b.id) === String(bookingId));
      const truckAvailability = truckAvailabilityResult.items.find(ta => String(ta.id) === String(truckAvailabilityId));
      
      if (!booking) {
        console.error("Booking not found for bookingId:", bookingId);
        toast.error("Could not load booking details");
      }
      
      if (!truckAvailability) {
        console.error("Truck availability not found for truckAvailabilityId:", truckAvailabilityId);
        toast.error("Could not load truck availability details");
      }
      
      // Set details even if some are missing (partial data is better than nothing)
      if (!booking || !truckAvailability) {
        // Still set what we have so at least load details show
        setTruckBookingDetails({ 
          load, 
          booking: booking || null, 
          truckAvailability: truckAvailability || null, 
          truck: null 
        });
        return;
      }
      
      // Get truck details if available
      // Only haulers can fetch their own trucks via fetchTrucks()
      // For shippers, we need to check if truck details are included in the booking/availability response
      let truck: TruckRecord | null = null;
      if (truckAvailability.truck_id) {
        // Check if booking response includes truck details (similar to load offers)
        if ((booking as any)?.truck) {
          // Use truck details from booking response (available to both shipper and hauler)
          const bookingTruck = (booking as any).truck;
          truck = {
            id: Number(bookingTruck.id),
            hauler_id: Number(booking.hauler_id),
            plate_number: bookingTruck.plate_number,
            truck_type: bookingTruck.truck_type,
            truck_name: bookingTruck.truck_name || null,
            capacity: bookingTruck.capacity || null,
            species_supported: bookingTruck.species_supported || null,
            status: "active",
            created_at: "",
          } as TruckRecord;
        } else if ((truckAvailability as any)?.truck) {
          // Check if truck availability response includes truck details
          const availabilityTruck = (truckAvailability as any).truck;
          truck = {
            id: Number(availabilityTruck.id),
            hauler_id: Number(truckAvailability.hauler_id),
            plate_number: availabilityTruck.plate_number,
            truck_type: availabilityTruck.truck_type,
            truck_name: availabilityTruck.truck_name || null,
            capacity: availabilityTruck.capacity || null,
            species_supported: availabilityTruck.species_supported || null,
            status: "active",
            created_at: "",
          } as TruckRecord;
        } else if (userRole === "hauler") {
          // Only haulers can fetch their own trucks
          try {
            const trucksResult = await fetchTrucks();
            truck = trucksResult.items.find(t => String(t.id) === String(truckAvailability.truck_id)) || null;
          } catch (err) {
            console.warn("Could not fetch truck details:", err);
            // Continue without truck - it's optional
          }
        } else {
          // For shippers, we can't fetch hauler's trucks, so truck will remain null
          console.log("Truck details not available in booking/availability response, and user is not a hauler");
        }
      }
      
      setTruckBookingDetails({ load, booking, truckAvailability, truck });
    } catch (err: any) {
      console.error("Error loading truck booking details:", err);
      toast.error(err?.message ?? "Failed to load truck booking details");
    }
  }, []);

  const loadMessages = useCallback(async (thread: UnifiedThread) => {
    try {
      setMessagesLoading(true);
      shouldScrollRef.current = true; // Enable scrolling when loading messages
      if (thread.type === "job") {
        const result = await fetchThreadMessages(thread.id);
        setMessages(result.map(m => ({ ...m, type: "job" as const })));
        await loadJobDetails(thread.job_id);
      } else if (thread.type === "buy-sell") {
        const result = await fetchBuySellThreadMessages(thread.id);
        setMessages(result.map(m => ({ ...m, type: "buy-sell" as const })));
        await loadBuySellDetails(thread.listing_id);
      } else if (thread.type === "resources") {
        const result = await fetchResourcesThreadMessages(thread.id);
        setMessages(result.map(m => ({ ...m, type: "resources" as const })));
        await loadResourcesDetails(thread.listing_id);
      } else if (thread.type === "load-offer") {
        const result = await fetchLoadOfferThreadMessages(thread.id);
        // Filter out any messages with empty content
        const validMessages = result.filter(m => m.message && m.message.trim());
        setMessages(validMessages.map(m => ({ ...m, type: "load-offer" as const })));
        await loadLoadOfferDetails(thread.offer_id, thread.load_id);
      } else if (thread.type === "truck-booking") {
        const result = await fetchTruckBookingThreadMessages(thread.id);
        // Filter out any messages with empty content
        const validMessages = result.filter(m => m.message && m.message.trim());
        setMessages(validMessages.map(m => ({ ...m, type: "truck-booking" as const })));
        if (thread.booking_id && thread.load_id && thread.truck_availability_id) {
          await loadTruckBookingDetails(thread.booking_id, thread.load_id, thread.truck_availability_id);
        } else {
          console.error("Missing required IDs for truck booking:", { booking_id: thread.booking_id, load_id: thread.load_id, truck_availability_id: thread.truck_availability_id });
          toast.error("Missing booking information");
        }
      }
    } catch (err: any) {
      console.error("Error loading messages:", err);
      toast.error(err?.message ?? "Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  }, [loadJobDetails, loadBuySellDetails, loadResourcesDetails, loadLoadOfferDetails, loadTruckBookingDetails]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Initialize socket connection and set up listeners
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    socketRef.current = socket;

    // Join thread room when a thread is selected
    if (selectedThread) {
      const threadRoom = selectedThread.type === "job" 
        ? `job-thread-${selectedThread.id}`
        : selectedThread.type === "buy-sell"
          ? `buy-sell-thread-${selectedThread.id}`
          : selectedThread.type === "resources"
            ? `resources-thread-${selectedThread.id}`
            : selectedThread.type === "load-offer"
              ? `load-offer-thread-${selectedThread.id}`
              : `truck-booking-thread-${selectedThread.id}`;
      if (currentThreadRoomRef.current !== threadRoom) {
        // Leave previous room if any
        if (currentThreadRoomRef.current) {
          socket.emit("leave", currentThreadRoomRef.current);
        }
        // Join new thread room
        joinSocketRoom(threadRoom);
        currentThreadRoomRef.current = threadRoom;
      }
    } else {
      // Leave room if no thread is selected
      if (currentThreadRoomRef.current) {
        socket.emit("leave", currentThreadRoomRef.current);
        currentThreadRoomRef.current = null;
      }
    }

    // Subscribe to job message events
    const unsubscribeJobMessage = subscribeToSocketEvent(
      SOCKET_EVENTS.JOB_MESSAGE,
      (payload) => {
        const { message, thread } = payload;
        
        // Only add message if it's for the currently selected thread
        if (selectedThread && selectedThread.type === "job" && thread.id === selectedThread.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id && m.type === "job")) {
              return prev;
            }
            return [...prev, { ...message, type: "job" as const }];
          });
          // Scroll will be handled by the messages.length useEffect
        }
        
        // Update thread in list
        setJobThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  last_message: message.message,
                  last_message_at: message.created_at,
                  first_message_sent: true,
                  unread_count: 
                    Number(message.sender_user_id) !== Number(userId) && 
                    (!selectedThread || selectedThread.type !== "job" || selectedThread.id !== thread.id)
                      ? (t.unread_count || 0) + 1 
                      : t.unread_count,
                }
              : t
          )
        );
      }
    );

    // Subscribe to buy-sell message events
    const unsubscribeBuySellMessage = subscribeToSocketEvent(
      "buy-sell:message" as any,
      (payload: any) => {
        const { message, thread } = payload;
        
        if (selectedThread && selectedThread.type === "buy-sell" && thread.id === selectedThread.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id && m.type === "buy-sell")) {
              return prev;
            }
            return [...prev, { ...message, type: "buy-sell" as const }];
          });
          // Scroll will be handled by the messages.length useEffect
        }
        
        setBuySellThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  last_message: message.message,
                  last_message_at: message.created_at,
                  first_message_sent: true,
                  unread_count: 
                    Number(message.sender_user_id) !== Number(userId) && 
                    (!selectedThread || selectedThread.type !== "buy-sell" || selectedThread.id !== thread.id)
                      ? (t.unread_count || 0) + 1 
                      : t.unread_count,
                }
              : t
          )
        );
      }
    );

    // Subscribe to resources message events
    const unsubscribeResourcesMessage = subscribeToSocketEvent(
      "resources:message" as any,
      (payload: any) => {
        const { message, thread } = payload;
        
        if (selectedThread && selectedThread.type === "resources" && thread.id === selectedThread.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id && m.type === "resources")) {
              return prev;
            }
            return [...prev, { ...message, type: "resources" as const }];
          });
          // Scroll will be handled by the messages.length useEffect
        }
        
        setResourcesThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  last_message: message.message,
                  last_message_at: message.created_at,
                  first_message_sent: true,
                  unread_count: 
                    Number(message.sender_user_id) !== Number(userId) && 
                    (!selectedThread || selectedThread.type !== "resources" || selectedThread.id !== thread.id)
                      ? (t.unread_count || 0) + 1 
                      : t.unread_count,
                }
              : t
          )
        );
      }
    );

    // Subscribe to thread list updates
    const unsubscribeJobThreadUpdate = subscribeToSocketEvent(
      SOCKET_EVENTS.JOB_THREAD_UPDATED,
      (payload) => {
        const { threads } = payload;
        setJobThreads(threads);
        
        if (selectedThread && selectedThread.type === "job") {
          const updatedThread = threads.find((t) => t.id === selectedThread.id);
          if (updatedThread) {
            setSelectedThread((prev) => {
              if (prev && prev.type === "job" && prev.id === updatedThread.id) {
                return { ...prev, ...updatedThread };
              }
              return prev;
            });
          }
        }
      }
    );

    const unsubscribeBuySellThreadUpdate = subscribeToSocketEvent(
      "buy-sell:thread:updated" as any,
      (payload: any) => {
        const { threads } = payload;
        setBuySellThreads(threads);
        
        if (selectedThread && selectedThread.type === "buy-sell") {
          const updatedThread = threads.find((t: BuySellApplicationThread) => t.id === selectedThread.id);
          if (updatedThread) {
            setSelectedThread((prev) => {
              if (prev && prev.type === "buy-sell" && prev.id === updatedThread.id) {
                return { ...prev, ...updatedThread };
              }
              return prev;
            });
          }
        }
      }
    );

    // Subscribe to load-offer message events
    const unsubscribeLoadOfferMessage = subscribeToSocketEvent(
      "load-offer:message" as any,
      (payload: any) => {
        const { message, thread } = payload;
        
        // Validate message has content before adding - check both message.message and message.text
        const messageContent = message?.message || message?.text || "";
        if (!message || !messageContent || !messageContent.trim()) {
          console.warn("Received empty message via WebSocket, ignoring", message);
          return;
        }
        
        // Validate message has valid created_at
        if (!message.created_at || isNaN(new Date(message.created_at).getTime())) {
          console.warn("Received message with invalid date via WebSocket, ignoring", message);
          return;
        }
        
        if (selectedThread && selectedThread.type === "load-offer" && thread.id === selectedThread.id) {
          // Double-check message has valid ID and content before adding
          if (!message.id || !messageContent.trim()) {
            console.warn("Skipping message with invalid ID or empty content", message);
            return;
          }
          
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id && m.type === "load-offer")) {
              return prev;
            }
            return [...prev, { ...message, type: "load-offer" as const }];
          });
          // Scroll will be handled by the messages.length useEffect
        }
        
        setLoadOfferThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  last_message: messageContent,
                  last_message_at: message.created_at,
                  first_message_sent: true,
                  unread_count: 
                    Number(message.sender_user_id) !== Number(userId) && 
                    (!selectedThread || selectedThread.type !== "load-offer" || selectedThread.id !== thread.id)
                      ? (t.unread_count || 0) + 1 
                      : t.unread_count,
                }
              : t
          )
        );
      }
    );

    const unsubscribeLoadOfferThreadUpdate = subscribeToSocketEvent(
      "load-offer:thread:updated" as any,
      (payload: any) => {
        const { threads } = payload;
        setLoadOfferThreads(threads);
        
        if (selectedThread && selectedThread.type === "load-offer") {
          const updatedThread = threads.find((t: LoadOfferThread) => t.id === selectedThread.id);
          if (updatedThread) {
            setSelectedThread((prev) => {
              if (prev && prev.type === "load-offer" && prev.id === updatedThread.id) {
                return { ...prev, ...updatedThread };
              }
              return prev;
            });
          }
        }
      }
    );

    // Subscribe to truck-booking message events
    const unsubscribeTruckBookingMessage = subscribeToSocketEvent(
      SOCKET_EVENTS.TRUCK_BOOKING_MESSAGE,
      (payload: any) => {
        const { message, thread } = payload;
        
        // Validate message has content before adding - check both message.message and message.text
        const messageContent = message?.message || message?.text || "";
        if (!message || !messageContent || !messageContent.trim()) {
          console.warn("Received empty message via WebSocket, ignoring", message);
          return;
        }
        
        // Validate message has valid created_at
        if (!message.created_at || isNaN(new Date(message.created_at).getTime())) {
          console.warn("Received message with invalid date via WebSocket, ignoring", message);
          return;
        }
        
        if (selectedThread && selectedThread.type === "truck-booking" && thread.id === selectedThread.id) {
          // Double-check message has valid ID and content before adding
          if (!message.id || !messageContent.trim()) {
            console.warn("Skipping message with invalid ID or empty content", message);
            return;
          }
          
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id && m.type === "truck-booking")) {
              return prev;
            }
            return [...prev, { ...message, type: "truck-booking" as const }];
          });
          // Scroll will be handled by the messages.length useEffect
        }
        
        setTruckBookingThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  last_message: messageContent,
                  last_message_at: message.created_at,
                  first_message_sent: true,
                  unread_count: 
                    Number(message.sender_user_id) !== Number(userId) && 
                    (!selectedThread || selectedThread.type !== "truck-booking" || selectedThread.id !== thread.id)
                      ? (t.unread_count || 0) + 1 
                      : t.unread_count,
                }
              : t
          )
        );
      }
    );

    const unsubscribeTruckBookingThreadUpdate = subscribeToSocketEvent(
      SOCKET_EVENTS.TRUCK_BOOKING_THREAD_UPDATED,
      (payload: any) => {
        const { threads } = payload;
        setTruckBookingThreads(threads);
        
        if (selectedThread && selectedThread.type === "truck-booking") {
          const updatedThread = threads.find((t: TruckBookingThread) => t.id === selectedThread.id);
          if (updatedThread) {
            setSelectedThread((prev) => {
              if (prev && prev.type === "truck-booking" && prev.id === updatedThread.id) {
                return { ...prev, ...updatedThread };
              }
              return prev;
            });
          }
        }
      }
    );

    return () => {
      unsubscribeJobMessage();
      unsubscribeBuySellMessage();
      unsubscribeResourcesMessage();
      unsubscribeJobThreadUpdate();
      unsubscribeBuySellThreadUpdate();
      unsubscribeLoadOfferMessage();
      unsubscribeLoadOfferThreadUpdate();
      unsubscribeTruckBookingMessage();
      unsubscribeTruckBookingThreadUpdate();
      // Leave thread room on cleanup
      if (currentThreadRoomRef.current && socket) {
        socket.emit("leave", currentThreadRoomRef.current);
        currentThreadRoomRef.current = null;
      }
    };
  }, [userId, selectedThread]);

  const loadApplicantInfo = useCallback(async () => {
    if (!selectedThread || selectedThread.type !== "job") return;
    try {
      const result = await fetchJobApplications(selectedThread.job_id);
      const application = result.items.find((app) => app.id === selectedThread.application_id);
      if (application) {
        setApplicantInfo({
          name: application.applicant_name,
          email: application.applicant_email,
          phone: application.applicant_phone,
          cover_letter: application.cover_letter,
          resume_url: application.resume_url,
          status: application.status,
          applied_at: application.created_at,
        });
      }
    } catch (err: any) {
      console.error("Error loading applicant info:", err);
    }
  }, [selectedThread]);

  const loadBuySellApplicantInfo = useCallback(async () => {
    if (!selectedThread || selectedThread.type !== "buy-sell") return;
    try {
      const result = await fetchBuyAndSellApplications(selectedThread.listing_id);
      const application = result.items.find((app) => app.id === selectedThread.application_id);
      if (application) {
        setApplicantInfo({
          name: application.applicant_name,
          email: application.applicant_email,
          phone: application.applicant_phone,
          message: application.message,
          offered_price: application.offered_price,
          status: application.status,
          applied_at: application.created_at,
        });
      }
    } catch (err: any) {
      console.error("Error loading applicant info:", err);
    }
  }, [selectedThread]);

  const loadResourcesApplicantInfo = useCallback(async () => {
    if (!selectedThread || selectedThread.type !== "resources") return;
    try {
      const result = await fetchResourcesApplications(selectedThread.listing_id);
      const application = result.items.find((app) => app.id === selectedThread.application_id);
      if (application) {
        setApplicantInfo({
          name: application.applicant_name,
          email: application.applicant_email,
          phone: application.applicant_phone,
          message: application.message,
          status: application.status,
          applied_at: application.created_at,
        });
      }
    } catch (err: any) {
      console.error("Error loading applicant info:", err);
    }
  }, [selectedThread]);

  const previousThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedThread) {
      const threadId = selectedThread.id;
      const threadType = selectedThread.type;
      const isNewThread = previousThreadIdRef.current !== `${threadType}-${threadId}`;
      
      // Only reload messages if this is a different thread
      if (isNewThread) {
        previousThreadIdRef.current = `${threadType}-${threadId}`;
        loadMessages(selectedThread);
        
        // Load applicant info if user is poster
        if (threadType === "job") {
          if (Number(selectedThread.job_poster_user_id) === Number(userId)) {
            loadApplicantInfo();
          } else {
            setApplicantInfo(null);
          }
        } else if (threadType === "buy-sell") {
          if (Number(selectedThread.listing_poster_user_id) === Number(userId)) {
            loadBuySellApplicantInfo();
          } else {
            setApplicantInfo(null);
          }
        } else if (threadType === "resources") {
          if (Number(selectedThread.listing_poster_user_id) === Number(userId)) {
            loadResourcesApplicantInfo();
          } else {
            setApplicantInfo(null);
          }
        } else if (threadType === "load-offer") {
          // For load-offer, we don't need applicant info, but we might want to show hauler/shipper info
          setApplicantInfo(null);
        }
        
        // Reload threads after a short delay to update unread counts
        const timer = setTimeout(() => {
          loadThreads();
        }, 1000);
        
        return () => clearTimeout(timer);
      }
      
      setShowChat(true); // Show chat on mobile when thread is selected
      
      // Reset unread count for this thread when viewing
      if (threadType === "job") {
        setJobThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          )
        );
      } else if (threadType === "buy-sell") {
        setBuySellThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          )
        );
      } else if (threadType === "resources") {
        setResourcesThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          )
        );
      } else if (threadType === "load-offer") {
        setLoadOfferThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          )
        );
      } else if (threadType === "truck-booking") {
        setTruckBookingThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          )
        );
      }
    } else {
      previousThreadIdRef.current = null;
    }
  }, [selectedThread, loadMessages, loadJobDetails, loadBuySellDetails, loadResourcesDetails, loadLoadOfferDetails, loadTruckBookingDetails, loadApplicantInfo, loadBuySellApplicantInfo, loadResourcesApplicantInfo, userId, loadThreads]);

  // Listen for custom events to open specific threads
  useEffect(() => {
    const handleOpenJobThread = async (event: CustomEvent) => {
      const threadId = (event.detail as { threadId: number }).threadId;
      try {
        const thread = await fetchThreadById(threadId);
        const unifiedThread = { ...thread, type: "job" as const };
        setSelectedThread(unifiedThread);
        setShowChat(true);
        // Load messages immediately
        await loadMessages(unifiedThread);
        const [updatedJobThreads, updatedBuySellThreads, updatedResourcesThreads] = await Promise.all([
          fetchUserThreads().catch(() => []),
          fetchUserBuySellThreads().catch(() => []),
          fetchUserResourcesThreads().catch(() => []),
        ]);
        setJobThreads(updatedJobThreads);
        setBuySellThreads(updatedBuySellThreads);
        setResourcesThreads(updatedResourcesThreads);
      } catch (err) {
        console.error("Error loading thread:", err);
        toast.error("Failed to load thread");
      }
    };

    const handleOpenBuySellThread = async (event: CustomEvent) => {
      const threadId = (event.detail as { threadId: number }).threadId;
      try {
        const thread = await fetchBuySellThreadById(threadId);
        const unifiedThread = { ...thread, type: "buy-sell" as const };
        setSelectedThread(unifiedThread);
        setShowChat(true);
        // Load messages immediately
        await loadMessages(unifiedThread);
        const [updatedJobThreads, updatedBuySellThreads, updatedResourcesThreads] = await Promise.all([
          fetchUserThreads().catch(() => []),
          fetchUserBuySellThreads().catch(() => []),
          fetchUserResourcesThreads().catch(() => []),
        ]);
        setJobThreads(updatedJobThreads);
        setBuySellThreads(updatedBuySellThreads);
        setResourcesThreads(updatedResourcesThreads);
      } catch (err) {
        console.error("Error loading thread:", err);
        toast.error("Failed to load thread");
      }
    };

    const handleOpenResourcesThread = async (event: CustomEvent) => {
      const threadId = (event.detail as { threadId: number }).threadId;
      try {
        const thread = await fetchResourcesThreadById(threadId);
        const unifiedThread = { ...thread, type: "resources" as const };
        setSelectedThread(unifiedThread);
        setShowChat(true);
        // Load messages immediately
        await loadMessages(unifiedThread);
        const [updatedJobThreads, updatedBuySellThreads, updatedResourcesThreads] = await Promise.all([
          fetchUserThreads().catch(() => []),
          fetchUserBuySellThreads().catch(() => []),
          fetchUserResourcesThreads().catch(() => []),
        ]);
        setJobThreads(updatedJobThreads);
        setBuySellThreads(updatedBuySellThreads);
        setResourcesThreads(updatedResourcesThreads);
      } catch (err) {
        console.error("Error loading thread:", err);
        toast.error("Failed to load thread");
      }
    };

    const handleOpenLoadOfferThread = async (event: CustomEvent) => {
      const offerId = (event.detail as { offerId: number }).offerId;
      try {
        const thread = await fetchLoadOfferThreadByOfferId(offerId);
        const unifiedThread = { ...thread, type: "load-offer" as const };
        setSelectedThread(unifiedThread);
        setShowChat(true); // Show chat view
        setHideThreadList(true); // Hide thread list when opening from loadboard (show chat directly)
        // Load messages immediately
        await loadMessages(unifiedThread);
        const [updatedJobThreads, updatedBuySellThreads, updatedResourcesThreads, updatedLoadOfferThreads, updatedTruckBookingThreads] = await Promise.all([
          fetchUserThreads().catch(() => []),
          fetchUserBuySellThreads().catch(() => []),
          fetchUserResourcesThreads().catch(() => []),
          fetchUserLoadOfferThreads().catch(() => []),
          fetchUserTruckBookingThreads().catch(() => []),
        ]);
        setJobThreads(updatedJobThreads);
        setBuySellThreads(updatedBuySellThreads);
        setResourcesThreads(updatedResourcesThreads);
        setLoadOfferThreads(updatedLoadOfferThreads);
        setTruckBookingThreads(updatedTruckBookingThreads);
      } catch (err) {
        console.error("Error loading thread:", err);
        toast.error("Failed to load thread");
      }
    };

    const handleOpenTruckBookingThread = async (event: CustomEvent) => {
      const bookingId = (event.detail as { bookingId: number }).bookingId;
      try {
        const thread = await fetchTruckBookingThreadByBookingId(bookingId);
        const unifiedThread = { ...thread, type: "truck-booking" as const };
        setSelectedThread(unifiedThread);
        setShowChat(true); // Show chat view
        setHideThreadList(true); // Hide thread list when opening from truck board (show chat directly)
        // Load messages immediately
        await loadMessages(unifiedThread);
        const [updatedJobThreads, updatedBuySellThreads, updatedResourcesThreads, updatedLoadOfferThreads, updatedTruckBookingThreads] = await Promise.all([
          fetchUserThreads().catch(() => []),
          fetchUserBuySellThreads().catch(() => []),
          fetchUserResourcesThreads().catch(() => []),
          fetchUserLoadOfferThreads().catch(() => []),
          fetchUserTruckBookingThreads().catch(() => []),
        ]);
        setJobThreads(updatedJobThreads);
        setBuySellThreads(updatedBuySellThreads);
        setResourcesThreads(updatedResourcesThreads);
        setLoadOfferThreads(updatedLoadOfferThreads);
        setTruckBookingThreads(updatedTruckBookingThreads);
      } catch (err) {
        console.error("Error loading thread:", err);
        toast.error("Failed to load thread");
      }
    };

    window.addEventListener("open-job-thread", handleOpenJobThread as unknown as EventListener);
    window.addEventListener("open-buy-sell-thread", handleOpenBuySellThread as unknown as EventListener);
    window.addEventListener("open-resources-thread", handleOpenResourcesThread as unknown as EventListener);
    window.addEventListener("open-load-offer-thread", handleOpenLoadOfferThread as unknown as EventListener);
    window.addEventListener("open-truck-booking-thread", handleOpenTruckBookingThread as unknown as EventListener);
    return () => {
      window.removeEventListener("open-job-thread", handleOpenJobThread as unknown as EventListener);
      window.removeEventListener("open-buy-sell-thread", handleOpenBuySellThread as unknown as EventListener);
      window.removeEventListener("open-resources-thread", handleOpenResourcesThread as unknown as EventListener);
      window.removeEventListener("open-load-offer-thread", handleOpenLoadOfferThread as unknown as EventListener);
      window.removeEventListener("open-truck-booking-thread", handleOpenTruckBookingThread as unknown as EventListener);
    };
  }, [loadMessages]);


  // Only auto-scroll when messages are added, not when component re-renders
  const previousMessagesLengthRef = useRef<number>(0);
  const shouldScrollRef = useRef<boolean>(true);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const scrollToBottom = useCallback((force = false) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        // Only scroll if we should scroll or if forced
        if (shouldScrollRef.current || force) {
          // Use scrollTop for more reliable scrolling
          container.scrollTop = container.scrollHeight;
        }
      }
    }, 50);
  }, []);
  
  // Check if user is near bottom of scroll (within 100px)
  const isNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const container = messagesContainerRef.current;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);
  
  // Reset scroll state when thread changes (using existing previousThreadIdRef from line 543)
  useEffect(() => {
    if (selectedThread) {
      const threadId = `${selectedThread.type}-${selectedThread.id}`;
      // Check if this is a new thread (previousThreadIdRef is managed in the useEffect at line 545)
      // We'll reset scroll state when messages are first loaded for a new thread
      shouldScrollRef.current = true;
      previousMessagesLengthRef.current = 0;
    }
  }, [selectedThread?.id, selectedThread?.type]);
  
  useEffect(() => {
    // Only scroll if new messages were added (length increased)
    if (messages.length > previousMessagesLengthRef.current) {
      // Check if user is near bottom - if so, auto-scroll. Otherwise, don't interrupt their reading.
      if (isNearBottom() || previousMessagesLengthRef.current === 0) {
        scrollToBottom();
      }
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom, isNearBottom]);
  
  // Scroll to bottom when messages finish loading initially
  useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      // Small delay to ensure DOM is updated
      scrollToBottom(true);
    }
  }, [messagesLoading, scrollToBottom]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = async () => {
    // Validate message text is not empty
    const trimmedText = messageText.trim();
    if (!trimmedText || !selectedThread) {
      if (!trimmedText) {
        toast.error("Message cannot be empty");
      }
      return;
    }

    if (!selectedThread.first_message_sent) {
      if (selectedThread.type === "truck-booking") {
        // For truck-booking, only hauler can send first message
        const isShipper = Number(selectedThread.shipper_user_id) === Number(userId);
        if (isShipper) {
          toast.error("Waiting for the hauler to send the first message");
          return;
        }
      } else {
        const isPoster = selectedThread.type === "job"
          ? Number(selectedThread.job_poster_user_id) === Number(userId)
          : selectedThread.type === "load-offer"
            ? Number(selectedThread.shipper_user_id) === Number(userId) // Only shipper can send first message
            : Number(selectedThread.listing_poster_user_id) === Number(userId);
        if (!isPoster) {
          toast.error(`Only the ${selectedThread.type === "job" ? "job poster" : selectedThread.type === "load-offer" ? "shipper" : "listing poster"} can send the first message`);
          return;
        }
      }
    }

    // Save original message for error recovery
    const originalMessage = messageText;
    const trimmedMessage = messageText.trim();
    
    try {
      setSending(true);
      
      // Clear input immediately after validation passes (optimistic UI update)
      setMessageText("");
      
      const sentMessage = selectedThread.type === "job"
        ? await sendMessage(selectedThread.id, trimmedMessage)
        : selectedThread.type === "buy-sell"
          ? await sendBuySellMessage(selectedThread.id, trimmedMessage)
          : selectedThread.type === "resources"
            ? await sendResourcesMessage(selectedThread.id, trimmedMessage)
            : selectedThread.type === "load-offer"
              ? await sendLoadOfferMessage(selectedThread.id, trimmedMessage)
              : await sendTruckBookingMessage(selectedThread.id, trimmedMessage);
      
      // Validate sent message is an object, not a string
      if (typeof sentMessage === "string") {
        console.error("API returned string instead of message object:", sentMessage);
        toast.error("Invalid response from server, please try again");
        setMessageText(originalMessage);
        return;
      }
      
      // Validate sent message has content before adding to state
      const sentMessageContent = sentMessage?.message || "";
      if (!sentMessageContent || !sentMessageContent.trim()) {
        console.error("Received empty message from API, not adding to state", sentMessage);
        toast.error("Message was empty, please try again");
        setMessageText(originalMessage);
        return;
      }
      
      // Ensure sentMessage has valid content and created_at before adding
      if (!sentMessage.id || !sentMessage.created_at || isNaN(new Date(sentMessage.created_at).getTime())) {
        console.error("Received invalid message from API", sentMessage);
        toast.error("Message data is invalid, please try again");
        setMessageText(originalMessage);
        return;
      }
      
      // Add message to state (duplicate check prevents duplicates from WebSocket)
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMessage.id && m.type === selectedThread.type)) {
          return prev;
        }
        return [...prev, { ...sentMessage, type: selectedThread.type }];
      });
      
      // Scroll will happen automatically via the messages.length useEffect
      
      // Thread list will be updated via WebSocket event
    } catch (err: any) {
      console.error("Error sending message:", err);
      toast.error(err?.message ?? "Failed to send message");
      // Restore message text on error so user doesn't lose their message
      setMessageText(originalMessage);
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = allThreads.filter(
    (thread) => {
      const title = thread.type === "job" 
        ? thread.job_title 
        : thread.type === "load-offer" || thread.type === "truck-booking"
          ? thread.load_title
          : thread.listing_title;
      const applicantName = thread.type === "load-offer" || thread.type === "truck-booking"
        ? (Number(thread.shipper_user_id) === Number(userId) ? thread.hauler_name : thread.shipper_name)
        : thread.applicant_name;
      const posterName = thread.type === "job" 
        ? thread.job_poster_name 
        : thread.type === "load-offer" || thread.type === "truck-booking"
          ? (Number(thread.shipper_user_id) === Number(userId) ? thread.hauler_name : thread.shipper_name)
          : thread.listing_poster_name;
      const query = searchQuery.toLowerCase();
      return (
        title?.toLowerCase().includes(query) ||
        applicantName?.toLowerCase().includes(query) ||
        posterName?.toLowerCase().includes(query) ||
        thread.last_message?.toLowerCase().includes(query)
      );
    }
  );

  const isPoster = selectedThread 
    ? (selectedThread.type === "job"
        ? Number(selectedThread.job_poster_user_id) === Number(userId)
        : selectedThread.type === "load-offer" || selectedThread.type === "truck-booking"
          ? Number(selectedThread.shipper_user_id) === Number(userId)
          : Number(selectedThread.listing_poster_user_id) === Number(userId))
    : false;
  const isJobPoster = isPoster;
  const otherPersonName = selectedThread
    ? isPoster
      ? (selectedThread.type === "load-offer" || selectedThread.type === "truck-booking"
          ? selectedThread.hauler_name 
          : selectedThread.applicant_name)
      : (selectedThread.type === "job" 
          ? selectedThread.job_poster_name 
          : selectedThread.type === "load-offer" || selectedThread.type === "truck-booking"
            ? selectedThread.shipper_name
            : selectedThread.listing_poster_name)
    : "";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-900">
      {/* Left Sidebar - Chat List */}
      <div className={`${showChat && hideThreadList ? "hidden" : showChat ? "hidden md:flex" : "flex"} w-full md:w-80 border-r border-gray-200 dark:border-gray-800 flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Messages</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              style={{ "--tw-ring-color": "#53ca97" } as any}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = selectedThread?.id === thread.id && selectedThread?.type === thread.type;
              const isPoster = thread.type === "job" 
                ? Number(thread.job_poster_user_id) === Number(userId)
                : thread.type === "load-offer" || thread.type === "truck-booking"
                  ? Number(thread.shipper_user_id) === Number(userId)
                  : Number(thread.listing_poster_user_id) === Number(userId);
              const otherName = isPoster 
                ? (thread.type === "load-offer" || thread.type === "truck-booking" ? thread.hauler_name : thread.applicant_name)
                : (thread.type === "job" 
                    ? thread.job_poster_name 
                    : thread.type === "load-offer" || thread.type === "truck-booking"
                      ? thread.shipper_name
                      : thread.listing_poster_name);
              const threadTitle = thread.type === "job" 
                ? thread.job_title 
                : thread.type === "load-offer" || thread.type === "truck-booking"
                  ? thread.load_title
                  : thread.listing_title;

              return (
                <div
                  key={`${thread.type}-${thread.id}`}
                  onClick={() => {
                    setSelectedThread(thread);
                    setShowChat(true);
                    setHideThreadList(false); // Show thread list when manually selecting a thread
                  }}
                  className={`p-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/20 border-l-4"
                      : "border-l-4 border-l-transparent"
                  }`}
                  style={isSelected ? { borderLeftColor: "#53ca97" } : {}}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        {thread.type === "job" ? (
                          <Briefcase className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        ) : thread.type === "buy-sell" ? (
                          <DollarSign className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        ) : thread.type === "load-offer" || thread.type === "truck-booking" ? (
                          <Truck className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <Briefcase className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                          {threadTitle}
                        </h3>
                        {thread.last_message_at && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                            {new Date(thread.last_message_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">
                        {isPoster 
                          ? (thread.type === "load-offer" || thread.type === "truck-booking" ? "Hauler" : "Applicant")
                          : (thread.type === "job" 
                              ? "Job Poster" 
                              : thread.type === "buy-sell" 
                                ? "Listing Poster" 
                                : thread.type === "load-offer" || thread.type === "truck-booking"
                                  ? "Shipper"
                                  : "Resource Poster")}: {otherName}
                      </p>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {thread.last_message || "No messages yet"}
                        </p>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          {!thread.first_message_sent && (
                            <Badge variant="outline" className="text-xs">
                              Waiting
                            </Badge>
                          )}
                          {thread.unread_count && thread.unread_count > 0 && (
                            <Badge
                              className="text-xs px-2 py-0.5"
                              style={{ backgroundColor: "#53ca97", color: "white" }}
                            >
                              {thread.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side - Active Chat */}
      {selectedThread ? (
        <div className={`${showChat ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
          {/* Chat Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-4 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Show back button when hideThreadList is true, or on mobile when chat is open */}
                <button
                  onClick={() => {
                    setShowChat(false);
                    setHideThreadList(false); // Show thread list when going back
                  }}
                  className={`mr-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${
                    hideThreadList ? "block" : "block md:hidden"
                  }`}
                  title="Back to threads"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{otherPersonName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isPoster 
                      ? (selectedThread.type === "load-offer" || selectedThread.type === "truck-booking" ? "Hauler" : "Applicant")
                      : (selectedThread.type === "job" 
                          ? "Job Poster" 
                          : selectedThread.type === "buy-sell" 
                            ? "Listing Poster" 
                            : selectedThread.type === "load-offer" || selectedThread.type === "truck-booking"
                              ? "Shipper"
                              : "Resource Poster")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPoster && applicantInfo && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setShowProfile(true)}
                  >
                    <User className="w-3 h-3 mr-1" />
                    View Profile
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Job/Listing/Resource/Load Offer/Truck Booking Details - Pinned */}
          {((selectedThread?.type === "job" && jobDetails) || (selectedThread?.type === "buy-sell" && buySellDetails) || (selectedThread?.type === "resources" && resourcesDetails) || (selectedThread?.type === "load-offer" && loadOfferDetails) || (selectedThread?.type === "truck-booking" && truckBookingDetails)) && (
            <div className="px-4 md:px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: "#53ca97" }}
                    >
                      {selectedThread?.type === "job" ? (
                        <Briefcase className="w-4 h-4 text-white" />
                      ) : selectedThread?.type === "buy-sell" ? (
                        <DollarSign className="w-4 h-4 text-white" />
                      ) : selectedThread?.type === "load-offer" || selectedThread?.type === "truck-booking" ? (
                        <Truck className="w-4 h-4 text-white" />
                      ) : (
                        <Briefcase className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Regarding:</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedThread?.type === "job" 
                          ? jobDetails?.title 
                          : selectedThread?.type === "buy-sell" 
                            ? buySellDetails?.title 
                            : selectedThread?.type === "load-offer"
                              ? loadOfferDetails?.load?.title || `${loadOfferDetails?.load?.pickup_location} → ${loadOfferDetails?.load?.dropoff_location}`
                              : selectedThread?.type === "truck-booking"
                                ? truckBookingDetails?.load?.title || `${truckBookingDetails?.load?.pickup_location} → ${truckBookingDetails?.load?.dropoff_location}`
                                : resourcesDetails?.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedThread?.type === "load-offer" && isPoster && (
                      <Button
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowContractDialog(true)}
                        style={{ backgroundColor: "#53ca97", color: "white" }}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Create Contract
                      </Button>
                    )}
                    {selectedThread?.type === "truck-booking" && userRole === "shipper" && (
                      <Button
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowContractDialog(true)}
                        style={{ backgroundColor: "#53ca97", color: "white" }}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Create Contract
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setShowJobDetails(true)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Job/Listing/Resource Details Card - Clickable */}
                {selectedThread?.type === "job" && jobDetails ? (
                  <div 
                    className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer"
                    onClick={() => setShowJobDetails(true)}
                  >
                    {jobDetails.location && (
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">{jobDetails.location}</span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Job Type</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {jobDetails.job_type.replace("-", " ")}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Location Type</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {jobDetails.location_type.replace("-", " ")}
                      </p>
                    </div>
                    
                    {jobDetails.salary && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Salary</p>
                        <p className="text-sm" style={{ color: "#53ca97" }}>
                          {jobDetails.salary}
                          {jobDetails.salary_frequency && ` / ${jobDetails.salary_frequency}`}
                        </p>
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-center" style={{ color: "#53ca97" }}>
                        Click to view full job details →
                      </p>
                    </div>
                  </div>
                ) : buySellDetails ? (
                  <div 
                    className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer"
                    onClick={() => setShowJobDetails(true)}
                  >
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">{buySellDetails.city}, {buySellDetails.state}</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {buySellDetails.category}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {buySellDetails.listing_type.replace("-", " ")}
                      </p>
                    </div>
                    
                    {buySellDetails.price && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
                        <p className="text-sm" style={{ color: "#53ca97" }}>
                          ${buySellDetails.price.toLocaleString()}
                          {buySellDetails.price_type && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({buySellDetails.price_type.replace("-", " ")})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-center" style={{ color: "#53ca97" }}>
                        Click to view full listing details →
                      </p>
                    </div>
                  </div>
                ) : resourcesDetails ? (
                  <div className="space-y-4">
                    {resourcesDetails.description && (
                      <div>
                        <h4 className="mb-2 font-semibold">Description</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{resourcesDetails.description}</p>
                      </div>
                    )}
                    {resourcesDetails.type_specific_data && Object.keys(resourcesDetails.type_specific_data).length > 0 && (
                      <div>
                        <h4 className="mb-2 font-semibold">Details</h4>
                        <div className="space-y-2">
                          {Object.entries(resourcesDetails.type_specific_data).map(([key, value]) => {
                            if (!value) return null;
                            return (
                              <div key={key} className="text-sm">
                                <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                <span className="text-gray-900 dark:text-white">{String(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="pt-4 border-t">
                      <h4 className="mb-2 font-semibold">Contact Information</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {resourcesDetails.contact_name && (
                          <p><strong>Contact Person:</strong> {resourcesDetails.contact_name}</p>
                        )}
                        <p><strong>Phone:</strong> {resourcesDetails.contact_phone}</p>
                        {resourcesDetails.contact_email && (
                          <p><strong>Email:</strong> {resourcesDetails.contact_email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : selectedThread?.type === "load-offer" && loadOfferDetails ? (
                  <div 
                    className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer"
                    onClick={() => setShowJobDetails(true)}
                  >
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {loadOfferDetails.load.pickup_location} → {loadOfferDetails.load.dropoff_location}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Species</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {loadOfferDetails.load.species}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Quantity</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {loadOfferDetails.load.quantity} head
                      </p>
                    </div>
                    
                    {loadOfferDetails.offer && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Offered Price</p>
                        <p className="text-lg font-semibold" style={{ color: "#53ca97" }}>
                          {loadOfferDetails.offer.currency} {Number(loadOfferDetails.offer.offered_amount).toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    {loadOfferDetails.truck && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Vehicle</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {loadOfferDetails.truck.truck_name || loadOfferDetails.truck.plate_number} ({loadOfferDetails.truck.truck_type})
                        </p>
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-center" style={{ color: "#53ca97" }}>
                        Click to view full load offer details →
                      </p>
                    </div>
                  </div>
                ) : selectedThread?.type === "truck-booking" && truckBookingDetails ? (
                  <div 
                    className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer"
                    onClick={() => setShowJobDetails(true)}
                  >
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {truckBookingDetails.load.pickup_location} → {truckBookingDetails.load.dropoff_location}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Species</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {truckBookingDetails.load.species}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Quantity</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {truckBookingDetails.load.quantity} head
                      </p>
                    </div>
                    
                    {truckBookingDetails.booking && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Offered Price</p>
                        <p className="text-lg font-semibold" style={{ color: "#53ca97" }}>
                          {truckBookingDetails.booking.offered_currency || "USD"} {truckBookingDetails.booking.offered_amount ? Number(truckBookingDetails.booking.offered_amount).toLocaleString() : "0.00"}
                        </p>
                      </div>
                    )}
                    
                    {truckBookingDetails.truckAvailability && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Truck Route</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {truckBookingDetails.truckAvailability.origin_location_text}
                          {truckBookingDetails.truckAvailability.destination_location_text ? ` → ${truckBookingDetails.truckAvailability.destination_location_text}` : ''}
                        </p>
                      </div>
                    )}
                    
                    {truckBookingDetails.truck && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Vehicle</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {truckBookingDetails.truck.truck_name || truckBookingDetails.truck.plate_number} ({truckBookingDetails.truck.truck_type})
                        </p>
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-center" style={{ color: "#53ca97" }}>
                        Click to view full truck booking details →
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50 dark:bg-gray-900"
          >
            {messagesLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  <p className="text-sm">No messages yet</p>
                {!selectedThread.first_message_sent && (
                  <p className="text-xs mt-2">
                    {selectedThread.type === "truck-booking" && isPoster
                      ? "Waiting for the hauler to send the first message"
                      : selectedThread.type === "truck-booking" && !isPoster
                        ? "Start the conversation by sending the first message"
                        : isPoster
                          ? "Start the conversation by sending the first message"
                          : `Waiting for the ${selectedThread.type === "job" 
                              ? "job poster" 
                              : selectedThread.type === "buy-sell" 
                                ? "listing poster" 
                                : selectedThread.type === "load-offer"
                                  ? "shipper"
                                  : "resource poster"} to send the first message`}
                  </p>
                )}
              </div>
            ) : (
              messages
                .filter((message) => {
                  // Filter out messages with empty content
                  const messageContent = message.message || "";
                  return messageContent && messageContent.trim();
                })
                .map((message) => {
                  const isCurrentUser = Number(message.sender_user_id) === Number(userId);
                  const messageContent = message.message || "";
                  
                  // Format date safely
                  let formattedTime = "Just now";
                  if (message.created_at) {
                    try {
                      const date = new Date(message.created_at);
                      if (!isNaN(date.getTime())) {
                        formattedTime = date.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      }
                    } catch (e) {
                      console.warn("Error formatting date:", message.created_at, e);
                    }
                  }
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-md px-4 py-3 rounded-lg ${
                          isCurrentUser
                            ? "text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        }`}
                        style={isCurrentUser ? { backgroundColor: "#53ca97" } : {}}
                      >
                        <p className="text-sm">{messageContent}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isCurrentUser ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {formattedTime}
                        </p>
                      </div>
                    </div>
                  );
                })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 md:px-6 py-4 bg-white dark:bg-gray-900">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    selectedThread.type === "truck-booking" && !selectedThread.first_message_sent && isPoster
                      ? "Waiting for the hauler to send the first message"
                      : selectedThread.type === "truck-booking" && !selectedThread.first_message_sent && !isPoster
                        ? "Type a message to start the conversation..."
                        : !selectedThread.first_message_sent && !isPoster
                          ? `Waiting for ${selectedThread.type === "job" 
                              ? "job poster" 
                              : selectedThread.type === "buy-sell" 
                                ? "listing poster" 
                                : selectedThread.type === "load-offer"
                                  ? "shipper"
                                  : "resource poster"} to send first message...`
                          : "Type a message..."
                  }
                  rows={1}
                  disabled={
                    selectedThread.type === "truck-booking" && !selectedThread.first_message_sent && isPoster
                      ? true
                      : selectedThread.type !== "truck-booking" && !selectedThread.first_message_sent && !isPoster
                  }
                  className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ "--tw-ring-color": "#53ca97" } as any}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={
                  !messageText.trim() || 
                  sending || 
                  (selectedThread.type === "truck-booking" && !selectedThread.first_message_sent && isPoster) ||
                  (!selectedThread.first_message_sent && !isPoster && selectedThread.type !== "truck-booking")
                }
                className="px-4 py-2 text-sm"
                style={{ backgroundColor: "#53ca97", color: "white" }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Select a conversation to start messaging</p>
          </div>
        </div>
      )}

      {/* Job/Listing/Resource/Load Offer/Truck Booking Details Dialog */}
      {((selectedThread?.type === "job" && jobDetails) || (selectedThread?.type === "buy-sell" && buySellDetails) || (selectedThread?.type === "resources" && resourcesDetails) || (selectedThread?.type === "load-offer" && loadOfferDetails) || (selectedThread?.type === "truck-booking" && truckBookingDetails)) && (
        <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedThread?.type === "job" 
                  ? jobDetails?.title 
                  : selectedThread?.type === "buy-sell" 
                    ? buySellDetails?.title 
                    : selectedThread?.type === "load-offer"
                      ? loadOfferDetails?.load?.title || `Load Offer`
                      : selectedThread?.type === "truck-booking"
                        ? truckBookingDetails?.load?.title || `Truck Booking`
                        : resourcesDetails?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedThread?.type === "job" && jobDetails
                  ? `${jobDetails.posted_by_role?.charAt(0).toUpperCase() + jobDetails.posted_by_role?.slice(1)} Job`
                  : selectedThread?.type === "buy-sell" && buySellDetails
                    ? `${buySellDetails.listing_type?.replace("-", " ").charAt(0).toUpperCase() + buySellDetails.listing_type?.replace("-", " ").slice(1)} • ${buySellDetails.category?.charAt(0).toUpperCase() + buySellDetails.category?.slice(1)}`
                    : selectedThread?.type === "resources" && resourcesDetails
                      ? `Resource • ${resourcesDetails.resource_type?.charAt(0).toUpperCase() + resourcesDetails.resource_type?.slice(1)}`
                      : selectedThread?.type === "load-offer" && loadOfferDetails
                        ? `Load Offer • ${loadOfferDetails.offer?.status}`
                        : selectedThread?.type === "truck-booking" && truckBookingDetails
                          ? `Truck Booking • ${truckBookingDetails.booking?.status || "REQUESTED"}`
                          : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedThread?.type === "job" && jobDetails && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="capitalize">{jobDetails.posted_by_role}</span>
                  </div>
                  {jobDetails.location && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{jobDetails.location}</span>
                      </div>
                    </>
                  )}
                  <Badge
                    className="px-2 py-1 text-xs capitalize"
                    style={{ backgroundColor: "#53ca97", color: "white" }}
                  >
                    {jobDetails.job_type.replace("-", " ")}
                  </Badge>
                </div>
              )}
              {selectedThread?.type === "buy-sell" && buySellDetails && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{buySellDetails.city}, {buySellDetails.state}</span>
                  </div>
                  <Badge
                    className="px-2 py-1 text-xs capitalize"
                    style={{ backgroundColor: "#53ca97", color: "white" }}
                  >
                    {buySellDetails.category}
                  </Badge>
                </div>
              )}
              {selectedThread?.type === "resources" && resourcesDetails && (
                <div className="flex items-center gap-4 text-sm">
                  {resourcesDetails.city && resourcesDetails.state && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{resourcesDetails.city}, {resourcesDetails.state}</span>
                    </div>
                  )}
                  <Badge
                    className="px-2 py-1 text-xs capitalize"
                    style={{ backgroundColor: "#53ca97", color: "white" }}
                  >
                    {resourcesDetails.resource_type}
                  </Badge>
                </div>
              )}
              {selectedThread?.type === "load-offer" && loadOfferDetails && (
                <div className="space-y-4">
                  {/* Offer Price - Prominently Displayed */}
                  {loadOfferDetails.offer && (
                    <div className="py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Offered Price</div>
                      <div className="text-2xl font-bold" style={{ color: "#53ca97" }}>
                        {loadOfferDetails.offer.currency} {Number(loadOfferDetails.offer.offered_amount).toLocaleString()}
                      </div>
                      <div className="mt-1">
                        <Badge
                          className="px-2 py-1 text-xs capitalize"
                          style={{ backgroundColor: "#53ca97", color: "white" }}
                        >
                          {loadOfferDetails.offer.status || "PENDING"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {/* Load Details Section */}
                  <div className="pt-4 border-t">
                    <h4 className="mb-3 font-semibold text-lg">Load Details</h4>
                    
                    <div className="flex items-center gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{loadOfferDetails.load.pickup_location} → {loadOfferDetails.load.dropoff_location}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Species</p>
                        <p className="text-sm text-gray-900 dark:text-white capitalize font-medium">
                          {loadOfferDetails.load.species}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {loadOfferDetails.load.quantity} {loadOfferDetails.load.quantity === 1 ? 'head' : 'head'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pickup Date</p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {loadOfferDetails.load.pickup_date 
                            ? new Date(loadOfferDetails.load.pickup_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Not specified"}
                        </p>
                      </div>
                      {(loadOfferDetails.load as any).weight && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Weight</p>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {Number((loadOfferDetails.load as any).weight).toLocaleString()} kg
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {loadOfferDetails.load.description && (
                      <div className="mt-4">
                        <h5 className="mb-2 text-sm font-semibold">Load Description</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{loadOfferDetails.load.description}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Vehicle Attached by Hauler Section */}
                  {loadOfferDetails.truck && (
                    <div className="pt-4 border-t">
                      <h4 className="mb-3 font-semibold text-lg">Vehicle Attached by Hauler</h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Plate Number</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{loadOfferDetails.truck.plate_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Truck Type</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium capitalize">{loadOfferDetails.truck.truck_type}</p>
                          </div>
                          {loadOfferDetails.truck.truck_name && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Truck Name</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">{loadOfferDetails.truck.truck_name}</p>
                            </div>
                          )}
                          {loadOfferDetails.truck.capacity && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Capacity</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {Number(loadOfferDetails.truck.capacity).toLocaleString()} kg
                              </p>
                            </div>
                          )}
                          {loadOfferDetails.truck.species_supported && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Species Supported</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">{loadOfferDetails.truck.species_supported}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Offer Message Section */}
                  {loadOfferDetails.offer?.message && (
                    <div className="pt-4 border-t">
                      <h4 className="mb-2 font-semibold">Offer Message</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{loadOfferDetails.offer.message}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedThread?.type === "truck-booking" && truckBookingDetails && (
                <div className="space-y-4">
                  {/* Booking Price - Prominently Displayed */}
                  {truckBookingDetails.booking && (
                    <div className="py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Offered Price</div>
                      <div className="text-2xl font-bold" style={{ color: "#53ca97" }}>
                        {truckBookingDetails.booking.offered_currency || "USD"} {truckBookingDetails.booking.offered_amount ? Number(truckBookingDetails.booking.offered_amount).toLocaleString() : "0.00"}
                      </div>
                      <div className="mt-1">
                        <Badge
                          className="px-2 py-1 text-xs capitalize"
                          style={{ backgroundColor: "#53ca97", color: "white" }}
                        >
                          {truckBookingDetails.booking.status || "REQUESTED"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {/* Load Details Section */}
                  <div className="pt-4 border-t">
                    <h4 className="mb-3 font-semibold text-lg">Load Details</h4>
                    
                    <div className="flex items-center gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{truckBookingDetails.load.pickup_location} → {truckBookingDetails.load.dropoff_location}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Species</p>
                        <p className="text-sm text-gray-900 dark:text-white capitalize font-medium">
                          {truckBookingDetails.load.species}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {truckBookingDetails.load.quantity} {truckBookingDetails.load.quantity === 1 ? 'head' : 'head'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pickup Date</p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {truckBookingDetails.load.pickup_date 
                            ? new Date(truckBookingDetails.load.pickup_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Not specified"}
                        </p>
                      </div>
                      {truckBookingDetails.booking?.requested_weight_kg && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Requested Weight</p>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {Number(truckBookingDetails.booking.requested_weight_kg).toLocaleString()} kg
                          </p>
                        </div>
                      )}
                      {truckBookingDetails.booking?.requested_headcount && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Requested Headcount</p>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {truckBookingDetails.booking.requested_headcount} head
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {truckBookingDetails.load.description && (
                      <div className="mt-4">
                        <h5 className="mb-2 text-sm font-semibold">Load Description</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{truckBookingDetails.load.description}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Truck Availability Details Section */}
                  {truckBookingDetails.truckAvailability && (
                    <div className="pt-4 border-t">
                      <h4 className="mb-3 font-semibold text-lg">Truck Availability Details</h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {truckBookingDetails.truckAvailability.origin_location_text}
                            {truckBookingDetails.truckAvailability.destination_location_text 
                              ? ` → ${truckBookingDetails.truckAvailability.destination_location_text}`
                              : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available From</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                              {new Date(truckBookingDetails.truckAvailability.available_from).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          {truckBookingDetails.truckAvailability.available_until && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available Until</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {new Date(truckBookingDetails.truckAvailability.available_until).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          )}
                          {truckBookingDetails.truckAvailability.capacity_headcount && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Capacity (Headcount)</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {truckBookingDetails.truckAvailability.capacity_headcount} head
                              </p>
                            </div>
                          )}
                          {truckBookingDetails.truckAvailability.capacity_weight_kg && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Capacity (Weight)</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {Number(truckBookingDetails.truckAvailability.capacity_weight_kg).toLocaleString()} kg
                              </p>
                            </div>
                          )}
                        </div>
                        {truckBookingDetails.truckAvailability.notes && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                            <p className="text-sm text-gray-900 dark:text-white">{truckBookingDetails.truckAvailability.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Vehicle Attached by Hauler Section */}
                  {truckBookingDetails.truck && (
                    <div className="pt-4 border-t">
                      <h4 className="mb-3 font-semibold text-lg">Vehicle Attached by Hauler</h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Plate Number</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{truckBookingDetails.truck.plate_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Truck Type</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium capitalize">{truckBookingDetails.truck.truck_type}</p>
                          </div>
                          {truckBookingDetails.truck.truck_name && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Truck Name</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">{truckBookingDetails.truck.truck_name}</p>
                            </div>
                          )}
                          {truckBookingDetails.truck.capacity && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Capacity</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {Number(truckBookingDetails.truck.capacity).toLocaleString()} kg
                              </p>
                            </div>
                          )}
                          {truckBookingDetails.truck.species_supported && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Species Supported</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">{truckBookingDetails.truck.species_supported}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Booking Notes Section */}
                  {truckBookingDetails.booking?.notes && (
                    <div className="pt-4 border-t">
                      <h4 className="mb-2 font-semibold">Booking Notes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{truckBookingDetails.booking.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedThread?.type === "job" && jobDetails && (
                <>
                  {jobDetails.salary && (
                    <div className="py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Salary Range</div>
                      <div className="text-lg" style={{ color: "#53ca97" }}>
                        {jobDetails.salary}
                        {jobDetails.salary_frequency && ` / ${jobDetails.salary_frequency}`}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="mb-2 font-semibold">Job Description</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{jobDetails.description}</p>
                  </div>

                  {jobDetails.required_skills && (
                    <div>
                      <h4 className="mb-2 font-semibold">Required Skills / Experience</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{jobDetails.required_skills}</p>
                    </div>
                  )}

                  {(jobDetails.benefits_accommodation ||
                    jobDetails.benefits_food ||
                jobDetails.benefits_fuel ||
                jobDetails.benefits_vehicle ||
                jobDetails.benefits_bonus ||
                jobDetails.benefits_others) && (
                <div>
                  <h4 className="mb-2 font-semibold">Benefits</h4>
                  <div className="flex flex-wrap gap-2">
                    {jobDetails.benefits_accommodation && <Badge variant="outline">Accommodation</Badge>}
                    {jobDetails.benefits_food && <Badge variant="outline">Food</Badge>}
                    {jobDetails.benefits_fuel && <Badge variant="outline">Fuel Allowance</Badge>}
                    {jobDetails.benefits_vehicle && <Badge variant="outline">Vehicle</Badge>}
                    {jobDetails.benefits_bonus && <Badge variant="outline">Bonus</Badge>}
                    {jobDetails.benefits_others && <Badge variant="outline">Others</Badge>}
                  </div>
                </div>
              )}
              </>
              )}

              {selectedThread?.type === "job" && jobDetails && (
                <div className="pt-4 border-t">
                  <h4 className="mb-2 font-semibold">Contact Information</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>
                      <strong>Contact Person:</strong> {jobDetails.contact_person}
                    </p>
                    <p>
                      <strong>Phone:</strong> {jobDetails.contact_phone}
                    </p>
                    {jobDetails.preferred_call_time && (
                      <p>
                        <strong>Preferred Call Time:</strong> {jobDetails.preferred_call_time}
                      </p>
                    )}
                    {jobDetails.contact_email && (
                      <p>
                        <strong>Email:</strong> {jobDetails.contact_email}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedThread?.type === "buy-sell" && buySellDetails && (
                <div className="pt-4 border-t">
                  <h4 className="mb-2 font-semibold">Contact Information</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>
                      <strong>Contact Person:</strong> {buySellDetails.contact_name}
                    </p>
                    <p>
                      <strong>Phone:</strong> {buySellDetails.contact_phone}
                    </p>
                    {buySellDetails.contact_email && (
                      <p>
                        <strong>Email:</strong> {buySellDetails.contact_email}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedThread?.type === "resources" && resourcesDetails && (
                <div className="pt-4 border-t">
                  <h4 className="mb-2 font-semibold">Contact Information</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {resourcesDetails.contact_name && (
                      <p>
                        <strong>Contact Person:</strong> {resourcesDetails.contact_name}
                      </p>
                    )}
                    <p>
                      <strong>Phone:</strong> {resourcesDetails.contact_phone}
                    </p>
                    {resourcesDetails.contact_email && (
                      <p>
                        <strong>Email:</strong> {resourcesDetails.contact_email}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Applicant Profile Dialog */}
      {applicantInfo && selectedThread && (
        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Applicant Profile</DialogTitle>
              <DialogDescription>{applicantInfo.name}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{applicantInfo.name}</h3>
                  <Badge
                    className="text-xs mt-1"
                    style={
                      applicantInfo.status === "accepted"
                        ? { backgroundColor: "#10b981", color: "white" }
                        : applicantInfo.status === "rejected"
                          ? { backgroundColor: "#ef4444", color: "white" }
                          : applicantInfo.status === "reviewing"
                            ? { backgroundColor: "#3b82f6", color: "white" }
                            : { backgroundColor: "#6b7280", color: "white" }
                    }
                  >
                    {applicantInfo.status}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Mail className="w-4 h-4" />
                    <strong>Email:</strong>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white ml-6">{applicantInfo.email}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Phone className="w-4 h-4" />
                    <strong>Phone:</strong>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white ml-6">{applicantInfo.phone}</p>
                </div>

                {applicantInfo.cover_letter && (
                  <div>
                    <h4 className="mb-2 font-semibold">Cover Letter</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{applicantInfo.cover_letter}</p>
                  </div>
                )}

                {applicantInfo.resume_url && (
                  <div>
                    <h4 className="mb-2 font-semibold">Resume</h4>
                    <a
                      href={`${API_BASE_URL}${applicantInfo.resume_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      View Resume
                    </a>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Applied on {new Date(applicantInfo.applied_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Contract Creation Dialog for Load Offers */}
      {selectedThread?.type === "load-offer" && loadOfferDetails && (
        <GenerateContractPopup
          isOpen={showContractDialog}
          onClose={() => setShowContractDialog(false)}
          onGenerate={async (data) => {
            try {
              const priceAmount = data.priceAmount 
                ? (typeof data.priceAmount === "string" ? parseFloat(data.priceAmount) : data.priceAmount)
                : parseFloat(loadOfferDetails.offer.offered_amount);
              
              const payload = {
                priceAmount,
                priceType: data.priceType,
                paymentMethod: data.paymentMethod,
                paymentSchedule: data.paymentSchedule,
                contractInfo: {
                  haulerName: loadOfferDetails.offer.hauler_id,
                  route: {
                    origin: loadOfferDetails.load.pickup_location,
                    destination: loadOfferDetails.load.dropoff_location,
                  },
                  animalType: loadOfferDetails.load.species,
                  headCount: loadOfferDetails.load.quantity,
                },
              };
              
              await createContract({
                load_id: String(loadOfferDetails.load.id),
                offer_id: String(loadOfferDetails.offer.id),
                status: "SENT",
                price_amount: priceAmount,
                price_type: data.priceType,
                payment_method: data.paymentMethod,
                payment_schedule: data.paymentSchedule,
                contract_payload: payload,
              });
              
              toast.success("Contract sent to hauler.");
              setShowContractDialog(false);
              // Refresh threads to show updated status
              loadThreads();
            } catch (err: any) {
              console.error("Error creating contract:", err);
              toast.error(err?.message ?? "Failed to create contract");
            }
          }}
          onSaveDraft={async (data) => {
            try {
              const priceAmount = data.priceAmount 
                ? (typeof data.priceAmount === "string" ? parseFloat(data.priceAmount) : data.priceAmount)
                : parseFloat(loadOfferDetails.offer.offered_amount);
              
              const payload = {
                priceAmount,
                priceType: data.priceType,
                paymentMethod: data.paymentMethod,
                paymentSchedule: data.paymentSchedule,
                contractInfo: {
                  haulerName: loadOfferDetails.offer.hauler_id,
                  route: {
                    origin: loadOfferDetails.load.pickup_location,
                    destination: loadOfferDetails.load.dropoff_location,
                  },
                  animalType: loadOfferDetails.load.species,
                  headCount: loadOfferDetails.load.quantity,
                },
              };
              
              await createContract({
                load_id: String(loadOfferDetails.load.id),
                offer_id: String(loadOfferDetails.offer.id),
                status: "DRAFT",
                price_amount: priceAmount,
                price_type: data.priceType,
                payment_method: data.paymentMethod,
                payment_schedule: data.paymentSchedule,
                contract_payload: payload,
              });
              
              toast.success("Contract draft saved.");
              setShowContractDialog(false);
            } catch (err: any) {
              console.error("Error saving contract draft:", err);
              toast.error(err?.message ?? "Failed to save contract draft");
            }
          }}
          contractInfo={{
            haulerName: loadOfferDetails.offer.hauler_id,
            route: {
              origin: loadOfferDetails.load.pickup_location,
              destination: loadOfferDetails.load.dropoff_location,
            },
            animalType: loadOfferDetails.load.species,
            headCount: loadOfferDetails.load.quantity,
            price: parseFloat(loadOfferDetails.offer.offered_amount),
            priceType: "total",
          }}
        />
      )}

      {/* Contract Creation Dialog for Truck Bookings */}
      {selectedThread?.type === "truck-booking" && truckBookingDetails && (
        <GenerateContractPopup
          isOpen={showContractDialog}
          onClose={() => setShowContractDialog(false)}
          onGenerate={async (data) => {
            try {
              const priceAmount = data.priceAmount 
                ? (typeof data.priceAmount === "string" ? parseFloat(data.priceAmount) : data.priceAmount)
                : (truckBookingDetails.booking?.offered_amount ? parseFloat(truckBookingDetails.booking.offered_amount) : 0);
              
              const payload = {
                priceAmount,
                priceType: data.priceType,
                paymentMethod: data.paymentMethod,
                paymentSchedule: data.paymentSchedule,
                contractInfo: {
                  haulerName: truckBookingDetails.booking?.hauler_id || "Hauler",
                  route: {
                    origin: truckBookingDetails.load.pickup_location,
                    destination: truckBookingDetails.load.dropoff_location,
                  },
                  animalType: truckBookingDetails.load.species,
                  headCount: truckBookingDetails.load.quantity,
                },
              };
              
              await createContract({
                load_id: String(truckBookingDetails.load.id),
                booking_id: String(truckBookingDetails.booking.id),
                status: "SENT",
                price_amount: priceAmount,
                price_type: data.priceType,
                payment_method: data.paymentMethod,
                payment_schedule: data.paymentSchedule,
                contract_payload: payload,
              });
              
              toast.success("Contract sent to hauler.");
              setShowContractDialog(false);
              // Refresh threads to show updated status
              loadThreads();
            } catch (err: any) {
              console.error("Error creating contract:", err);
              toast.error(err?.message ?? "Failed to create contract");
            }
          }}
          onSaveDraft={async (data) => {
            try {
              const priceAmount = data.priceAmount 
                ? (typeof data.priceAmount === "string" ? parseFloat(data.priceAmount) : data.priceAmount)
                : (truckBookingDetails.booking?.offered_amount ? parseFloat(truckBookingDetails.booking.offered_amount) : 0);
              
              const payload = {
                priceAmount,
                priceType: data.priceType,
                paymentMethod: data.paymentMethod,
                paymentSchedule: data.paymentSchedule,
                contractInfo: {
                  haulerName: truckBookingDetails.booking?.hauler_id || "Hauler",
                  route: {
                    origin: truckBookingDetails.load.pickup_location,
                    destination: truckBookingDetails.load.dropoff_location,
                  },
                  animalType: truckBookingDetails.load.species,
                  headCount: truckBookingDetails.load.quantity,
                },
              };
              
              await createContract({
                load_id: String(truckBookingDetails.load.id),
                booking_id: String(truckBookingDetails.booking.id),
                status: "DRAFT",
                price_amount: priceAmount,
                price_type: data.priceType,
                payment_method: data.paymentMethod,
                payment_schedule: data.paymentSchedule,
                contract_payload: payload,
              });
              
              toast.success("Contract draft saved.");
              setShowContractDialog(false);
            } catch (err: any) {
              console.error("Error saving contract draft:", err);
              toast.error(err?.message ?? "Failed to save contract draft");
            }
          }}
          contractInfo={{
            haulerName: truckBookingDetails.booking?.hauler_id || "Hauler",
            route: {
              origin: truckBookingDetails.load.pickup_location,
              destination: truckBookingDetails.load.dropoff_location,
            },
            animalType: truckBookingDetails.load.species,
            headCount: truckBookingDetails.load.quantity,
            price: truckBookingDetails.booking?.offered_amount ? parseFloat(truckBookingDetails.booking.offered_amount) : 0,
            priceType: "total",
          }}
        />
      )}
    </div>
  );
}
