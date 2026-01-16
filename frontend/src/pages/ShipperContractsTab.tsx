import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, FileText, CheckCircle, Clock, TruckIcon, MapPin, Plus, AlertCircle, Flag, Users, DollarSign, FileCheck, Activity } from 'lucide-react';
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { GenerateContractPopup } from "../components/GenerateContractPopup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  fetchContracts,
  sendContract,
  updateContract,
  createContract,
  fetchLoadOffers,
  type ContractRecord,
  type LoadOffer,
} from "../api/marketplace";
import { fetchLoadById, fetchLoadsForShipper, type LoadDetail } from "../lib/api";
import { fetchUserLoadOfferThreads, fetchLoadOfferThreadByOfferId, type LoadOfferThread } from "../api/loadOfferMessages";
import { fetchUserTruckBookingThreads, fetchTruckBookingThreadByBookingId, type TruckBookingThread } from "../api/truckBookingMessages";
import { fetchBookings, type LoadBooking } from "../api/marketplace";
import { useNavigate } from "react-router-dom";
import { storage, STORAGE_KEYS } from "../lib/storage";

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

interface ContractWithLoad extends ContractRecord {
  load?: LoadDetail | null;
}

interface AwaitingOffer {
  offer: LoadOffer;
  load: LoadDetail;
}

interface AwaitingBooking {
  booking: LoadBooking;
  load: LoadDetail;
}

interface ActiveConversation {
  thread: LoadOfferThread | TruckBookingThread;
  load: LoadDetail;
  type: 'load-offer' | 'truck-booking';
}

export default function ShipperContractsTab() {
  const [contracts, setContracts] = useState<ContractWithLoad[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [awaitingOffers, setAwaitingOffers] = useState<AwaitingOffer[]>([]);
  const [awaitingBookings, setAwaitingBookings] = useState<AwaitingBooking[]>([]);
  const [loadingAwaiting, setLoadingAwaiting] = useState(false);
  const [activeConversations, setActiveConversations] = useState<ActiveConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ActiveConversation | null>(null);
  const [showConversationContractDialog, setShowConversationContractDialog] = useState(false);
  const navigate = useNavigate();
  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedId) ?? null,
    [contracts, selectedId]
  );

  // Under Negotiation: Contracts created by shipper (SENT) - excludes ACCEPTED contracts
  const underNegotiationContracts = useMemo(() => {
    return contracts.filter(c => {
      const status = c.status.toUpperCase();
      // Only contracts created by shipper with SENT status (ACCEPTED contracts appear in Confirmed Contracts)
      return status === 'SENT' && c.created_by_user_id === userId;
    });
  }, [contracts, userId]);
  
  // Awaiting Your Response: Contracts sent by hauler waiting for shipper response
  // (In this flow, shipper creates contracts, so this might be empty or for future use)
  const awaitingYourResponseContracts = useMemo(() => {
    return contracts.filter(c => {
      return c.status.toUpperCase() === 'SENT' && c.created_by_user_id !== userId;
    });
  }, [contracts, userId]);
  
  const draftContracts = useMemo(() => 
    contracts.filter(c => c.status.toUpperCase() === 'DRAFT'),
    [contracts]
  );
  
  const confirmedContracts = useMemo(() => 
    contracts.filter(c => c.status.toUpperCase() === 'ACCEPTED'),
    [contracts]
  );

  const totalNegotiatedCost = useMemo(() => {
    return confirmedContracts.reduce((total, contract) => {
      if (contract.price_amount) {
        const amount = Number(contract.price_amount);
        if (contract.price_type === 'per-mile') {
          return total + (amount * 200); // Assuming 200 miles average
        }
        return total + amount;
      }
      return total;
    }, 0);
  }, [confirmedContracts]);

  const refresh = async () => {
    try {
      setLoading(true);
      const resp = await fetchContracts();
      const contractsWithLoads = await Promise.all(
        resp.items.map(async (contract) => {
          let load: LoadDetail | null = null;
          try {
            load = await fetchLoadById(Number(contract.load_id));
          } catch (err) {
            console.warn('Failed to load load details:', err);
          }
          return { ...contract, load };
        })
      );
      setContracts(contractsWithLoads);
      if (!selectedId && contractsWithLoads.length) {
        setSelectedId(contractsWithLoads[0].id);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load contracts.");
    } finally {
      setLoading(false);
    }
  };

  const loadAwaitingOffers = async () => {
    if (!userId) return;
    try {
      setLoadingAwaiting(true);
      // Fetch all shipper loads
      const loads = await fetchLoadsForShipper(userId);
      
      // Fetch all threads to check first_message_sent status
      const allLoadOfferThreads = await fetchUserLoadOfferThreads();
      // Create a set of offer_ids (as strings) that have messages (first_message_sent === true)
      // These should NOT appear in "Awaiting Your Response"
      const offerIdsWithMessages = new Set<string>();
      allLoadOfferThreads.forEach(thread => {
        if (thread.first_message_sent && thread.is_active) {
          // Store as string to match offer.id type
          offerIdsWithMessages.add(String(thread.offer_id));
        }
      });
      
      // For each load, fetch offers and check for PENDING offers without contracts
      const offersWithLoads: AwaitingOffer[] = [];
      const contractOfferIds = new Set(
        contracts.filter(c => c.offer_id).map(c => c.offer_id!)
      );
      
      for (const load of loads) {
        try {
          const offersResp = await fetchLoadOffers(String(load.id));
          const pendingOffers = offersResp.items.filter(
            offer => {
              // Must be PENDING and not have a contract
              if (offer.status !== "PENDING" || contractOfferIds.has(offer.id)) {
                return false;
              }
              // EXCLUDE offers that have messages (first_message_sent === true)
              // These will appear in "Under Negotiation" instead
              // offer.id is a string, so we check against string set
              return !offerIdsWithMessages.has(offer.id);
            }
          );
          
          for (const offer of pendingOffers) {
            const loadDetail = await fetchLoadById(Number(load.id));
            offersWithLoads.push({ offer, load: loadDetail });
          }
        } catch (err) {
          console.warn(`Failed to load offers for load ${load.id}:`, err);
        }
      }
      
      setAwaitingOffers(offersWithLoads);
    } catch (err: any) {
      console.error("Failed to load awaiting offers:", err);
    } finally {
      setLoadingAwaiting(false);
    }
  };

  const loadAwaitingBookings = async () => {
    if (!userId) return;
    try {
      // Fetch all truck booking threads to check first_message_sent status
      const allTruckBookingThreads = await fetchUserTruckBookingThreads();
      // Create a set of booking_ids (as strings) that have messages (first_message_sent === true)
      // These should NOT appear in "Awaiting Your Response"
      const bookingIdsWithMessages = new Set<string>();
      allTruckBookingThreads.forEach(thread => {
        if (thread.first_message_sent && thread.is_active) {
          // Store as string to match booking.id type
          bookingIdsWithMessages.add(String(thread.booking_id));
        }
      });
      
      // Fetch all bookings
      const bookingsResp = await fetchBookings();
      const contractBookingIds = new Set(
        contracts.filter(c => c.booking_id).map(c => c.booking_id!)
      );
      
      // Filter for REQUESTED bookings without contracts and without messages
      const bookingsWithLoads: AwaitingBooking[] = [];
      const requestedBookings = bookingsResp.items.filter(
        booking => {
          // Must be REQUESTED and not have a contract
          if (booking.status !== "REQUESTED" || contractBookingIds.has(booking.id)) {
            return false;
          }
          // EXCLUDE bookings that have messages (first_message_sent === true)
          // These will appear in "Under Negotiation" instead
          // booking.id is a string, so we check against string set
          return !bookingIdsWithMessages.has(booking.id);
        }
      );
      
      for (const booking of requestedBookings) {
        try {
          const load = await fetchLoadById(Number(booking.load_id));
          bookingsWithLoads.push({ booking, load });
        } catch (err) {
          console.warn(`Failed to load load details for booking ${booking.id}:`, err);
        }
      }
      
      setAwaitingBookings(bookingsWithLoads);
    } catch (err: any) {
      console.error("Failed to load awaiting bookings:", err);
    }
  };

  const loadActiveConversations = async () => {
    if (!userId) return;
    try {
      setLoadingConversations(true);
      
      // Get contract IDs that already have contracts
      const contractOfferIds = new Set(
        contracts.filter(c => c.offer_id).map(c => String(c.offer_id!))
      );
      const contractBookingIds = new Set(
        contracts.filter(c => c.booking_id).map(c => String(c.booking_id!))
      );
      
      // Fetch active load-offer threads
      const loadOfferThreads = await fetchUserLoadOfferThreads();
      const activeLoadOfferThreads = loadOfferThreads.filter(
        thread => 
          thread.is_active && 
          thread.first_message_sent && 
          thread.shipper_user_id === Number(userId) &&
          !contractOfferIds.has(String(thread.offer_id))
      );
      
      // Fetch active truck-booking threads
      const truckBookingThreads = await fetchUserTruckBookingThreads();
      const activeTruckBookingThreads = truckBookingThreads.filter(
        thread => 
          thread.is_active && 
          thread.first_message_sent && 
          thread.shipper_user_id === Number(userId) &&
          !contractBookingIds.has(String(thread.booking_id))
      );
      
      // Fetch load details for all threads
      const conversations: ActiveConversation[] = [];
      
      for (const thread of activeLoadOfferThreads) {
        try {
          const load = await fetchLoadById(thread.load_id);
          conversations.push({ thread, load, type: 'load-offer' });
        } catch (err) {
          console.warn(`Failed to load load details for thread ${thread.id}:`, err);
        }
      }
      
      for (const thread of activeTruckBookingThreads) {
        try {
          const load = await fetchLoadById(thread.load_id);
          conversations.push({ thread, load, type: 'truck-booking' });
        } catch (err) {
          console.warn(`Failed to load load details for thread ${thread.id}:`, err);
        }
      }
      
      setActiveConversations(conversations);
    } catch (err: any) {
      console.error("Failed to load active conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (contracts.length >= 0) {
      loadAwaitingOffers();
      loadAwaitingBookings();
      loadActiveConversations();
    }
  }, [contracts, userId]);

  const handleSave = async (data: ContractFormData, sendNow: boolean) => {
    if (!selectedContract) return;
    const priceAmountRaw = Number(data.priceAmount ?? 0);
    const priceAmount = Number.isFinite(priceAmountRaw) ? priceAmountRaw : 0;
    const payload: Record<string, unknown> = {
      ...data,
      contractInfo: data.contractInfo,
    };
    try {
      await updateContract(selectedContract.id, {
        price_amount: priceAmount,
        price_type: data.priceType,
        payment_method: data.paymentMethod,
        payment_schedule: data.paymentSchedule,
        contract_payload: payload,
      });
      if (sendNow) {
        await sendContract(selectedContract.id);
      }
      toast.success(sendNow ? "Contract sent." : "Contract updated.");
      setModalOpen(false);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update contract.");
    }
  };

  const handleViewContract = (contract: ContractWithLoad) => {
    setSelectedId(contract.id);
    if (contract.status.toUpperCase() === 'ACCEPTED') {
      setShowViewDialog(true);
    } else {
      setModalOpen(true);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading contracts…</div>;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold">My Contracts</h1>
        <p className="text-sm text-gray-500">
          Once contract is generated and confirmed by hauler, Hauler can generate trip and you can view it in your Trips
        </p>
      </div>

      {/* 4 Analytics Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#e8f7f1' }}>
              <Users className="w-5 h-5" style={{ color: '#53ca97' }} />
            </div>
          </div>
          <div className="text-2xl mb-1">{contracts.length}</div>
          <div className="text-sm text-gray-600">Total Connections Made</div>
          <div className="text-xs text-gray-500 mt-2">With haulers</div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl mb-1">${(totalNegotiatedCost / 1000).toFixed(1)}K</div>
          <div className="text-sm text-gray-600">Total Cost Negotiated</div>
          <div className="text-xs text-gray-500 mt-2">Across all contracts</div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
              <FileCheck className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl mb-1">{confirmedContracts.length}</div>
          <div className="text-sm text-gray-600">Confirmed Contracts</div>
          <div className="text-xs text-gray-500 mt-2">Accepted by hauler</div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl mb-1">{underNegotiationContracts.length}</div>
          <div className="text-sm text-gray-600">Under Negotiation</div>
          <div className="text-xs text-gray-500 mt-2">In progress</div>
        </Card>
      </div>

      {/* Important Message */}
      <Card className="p-5 mb-8 border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-700">
              <strong>Important:</strong> Please negotiate all terms, pricing, and conditions through messages or phone calls before submitting a contract. This ensures both parties are aligned on expectations.
            </p>
          </div>
        </div>
      </Card>


      {/* Two Box Layout for Negotiations */}
      <div className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box 1: Under Negotiation */}
          <Card className="p-6 border-2 flex flex-col" style={{ borderColor: '#53ca97', minHeight: '600px' }}>
            <h3 className="mb-5 flex items-center gap-2 flex-shrink-0 text-lg font-semibold">
              <Clock className="w-5 h-5" style={{ color: '#53ca97' }} />
              Under Negotiation ({underNegotiationContracts.length + activeConversations.length})
            </h3>
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {/* Show active conversations first */}
                {activeConversations.map((conv) => {
                  const thread = conv.thread;
                  const isLoadOffer = conv.type === 'load-offer';
                  const loadOfferThread = isLoadOffer ? thread as LoadOfferThread : null;
                  const truckBookingThread = !isLoadOffer ? thread as TruckBookingThread : null;
                  
                  return (
                    <Card key={`conv-${thread.id}`} className="p-6 hover:shadow-md transition-all border-blue-200 bg-blue-50">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#dbeafe' }}>
                          <MessageSquare className="w-6 h-6" style={{ color: '#3b82f6' }} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold mb-2 truncate">
                                {isLoadOffer ? 'Active Conversation' : 'Truck Booking Conversation'}
                              </h4>
                              {conv.load && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <TruckIcon className="w-3 h-3" />
                                    {conv.load.pickup_location} → {conv.load.dropoff_location}
                                  </span>
                                  {conv.load.species && (
                                    <>
                                      <span>•</span>
                                      <span className="capitalize">{conv.load.species}</span>
                                    </>
                                  )}
                                  {conv.load.quantity && (
                                    <>
                                      <span>•</span>
                                      <span>{conv.load.quantity} head</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {loadOfferThread?.hauler_name && (
                                <p className="text-xs text-gray-500 mt-1">With: {loadOfferThread.hauler_name}</p>
                              )}
                              {truckBookingThread?.hauler_name && (
                                <p className="text-xs text-gray-500 mt-1">With: {truckBookingThread.hauler_name}</p>
                              )}
                            </div>
                            <Badge className="px-2 py-1 text-xs" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                              Active Chat
                            </Badge>
                          </div>

                          {thread.last_message && (
                            <p className="text-xs text-gray-600 mb-3 italic truncate">
                              "{thread.last_message}"
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="text-xs text-gray-500">
                              {thread.last_message_at 
                                ? `Last message: ${new Date(thread.last_message_at).toLocaleDateString()}`
                                : `Started: ${new Date(thread.created_at).toLocaleDateString()}`}
                            </div>
                            {loadOfferThread?.offer_amount && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500 mb-1">Offered</p>
                                <p className="text-sm font-semibold" style={{ color: '#3b82f6' }}>
                                  {loadOfferThread.offer_currency || 'USD'} {Number(loadOfferThread.offer_amount).toLocaleString()}
                                </p>
                              </div>
                            )}
                            {truckBookingThread?.booking_amount && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500 mb-1">Requested</p>
                                <p className="text-sm font-semibold" style={{ color: '#3b82f6' }}>
                                  {truckBookingThread.booking_currency || 'USD'} {Number(truckBookingThread.booking_amount).toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-3 flex-wrap">
                            <Button
                              onClick={() => {
                                navigate('/shipper/messages');
                              }}
                              variant="outline"
                              className="px-4 py-2 text-sm flex items-center gap-1"
                            >
                              <MessageSquare className="w-4 h-4" />
                              View Messages
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedConversation(conv);
                                setShowConversationContractDialog(true);
                              }}
                              className="px-4 py-2 text-sm flex items-center gap-1"
                              style={{ backgroundColor: '#53ca97', color: 'white' }}
                            >
                              <FileText className="w-4 h-4" />
                              Generate Contract
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                
                {/* Show contracts */}
                {underNegotiationContracts.length > 0 ? (
                  underNegotiationContracts.map((contract) => (
                    <Card key={contract.id} className="p-5 hover:shadow-md transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e8f7f1' }}>
                          <FileText className="w-6 h-6" style={{ color: '#53ca97' }} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold mb-2 truncate">Contract #{contract.id}</h4>
                              {contract.load && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <TruckIcon className="w-3 h-3" />
                                    {contract.load.pickup_location} → {contract.load.dropoff_location}
                                  </span>
                                  {contract.load.species && (
                                    <>
                                      <span>•</span>
                                      <span className="capitalize">{contract.load.species}</span>
                                    </>
                                  )}
                                  {contract.load.quantity && (
                                    <>
                                      <span>•</span>
                                      <span>{contract.load.quantity} head</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <Badge className="px-2 py-1 text-xs" style={{ 
                              backgroundColor: contract.status.toUpperCase() === 'ACCEPTED' ? '#53ca97' : '#3b82f6', 
                              color: 'white' 
                            }}>
                              {contract.status.toUpperCase() === 'ACCEPTED' ? 'Accepted' : 'Sent'}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Contract Price</p>
                              <p className="text-lg font-semibold" style={{ color: '#53ca97' }}>
                                ${contract.price_amount ? Number(contract.price_amount).toLocaleString() : '0.00'}{contract.price_type === 'per-mile' ? '/mile' : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">
                                {contract.status.toUpperCase() === 'ACCEPTED' ? 'Accepted' : 'Sent'}
                              </p>
                              <p className="text-xs text-gray-600">
                                {contract.status.toUpperCase() === 'ACCEPTED' 
                                  ? (contract.accepted_at ? new Date(contract.accepted_at).toLocaleDateString() : '—')
                                  : (contract.sent_at ? new Date(contract.sent_at).toLocaleDateString() : '—')}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3 flex-wrap">
                            <Button
                              onClick={() => handleViewContract(contract)}
                              variant="outline"
                              className="px-4 py-2 text-sm flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              {contract.status.toUpperCase() === 'ACCEPTED' ? 'View Contract' : 'View & Edit'}
                            </Button>
                            {contract.status.toUpperCase() === 'ACCEPTED' && (
                              <Button
                                onClick={() => navigate('/shipper/trips')}
                                variant="outline"
                                className="px-4 py-2 text-sm flex items-center gap-1"
                              >
                                <TruckIcon className="w-4 h-4" />
                                View Trips
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : activeConversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No contracts under negotiation
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </Card>

          {/* Box 2: Awaiting Your Response (merged with Awaiting Counter Party Response) */}
          <Card className="p-6 border-2 flex flex-col" style={{ borderColor: '#f59e0b', minHeight: '600px' }}>
            <h3 className="mb-5 flex items-center gap-2 flex-shrink-0 text-lg font-semibold">
              <Clock className="w-5 h-5" style={{ color: '#f59e0b' }} />
              Awaiting Response ({awaitingOffers.length + awaitingBookings.length + draftContracts.length + awaitingYourResponseContracts.length})
            </h3>
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {/* Show hauler offers awaiting response */}
                {awaitingOffers.map(({ offer, load }) => (
                  <Card key={offer.id} className="p-5 border-amber-200 bg-amber-50 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4 p-2">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef3c7' }}>
                        <MessageSquare className="w-6 h-6" style={{ color: '#f59e0b' }} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold mb-2 truncate">Hauler Offer #{offer.id}</h4>
                            {load && (
                              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <TruckIcon className="w-3 h-3" />
                                  {load.pickup_location} → {load.dropoff_location}
                                </span>
                                {load.species && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{load.species}</span>
                                  </>
                                )}
                                {load.quantity && (
                                  <>
                                    <span>•</span>
                                    <span>{load.quantity} head</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge className="px-2 py-1 text-xs" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                            Waiting for your response
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Offered Price</p>
                            <p className="text-lg font-semibold" style={{ color: '#f59e0b' }}>
                              {offer.currency} {Number(offer.offered_amount).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Received</p>
                            <p className="text-xs text-gray-600">
                              {new Date(offer.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {offer.message && (
                          <p className="text-xs text-gray-600 mb-3 italic truncate">"{offer.message}"</p>
                        )}

                        <div className="flex gap-3 flex-wrap">
                          <Button
                            onClick={() => {
                              navigate('/shipper/messages');
                            }}
                            variant="outline"
                            className="px-4 py-2 text-sm flex items-center gap-1"
                          >
                            <MessageSquare className="w-4 h-4" />
                            View Messages
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* Show truck bookings awaiting response (no messages yet) */}
                {awaitingBookings.map(({ booking, load }) => (
                  <Card key={booking.id} className="p-5 border-amber-200 bg-amber-50 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4 p-2">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef3c7' }}>
                        <TruckIcon className="w-6 h-6" style={{ color: '#f59e0b' }} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold mb-2 truncate">Truck Request #{booking.id}</h4>
                            {load && (
                              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {load.pickup_location} → {load.dropoff_location}
                                </span>
                                {load.species && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{load.species}</span>
                                  </>
                                )}
                                {load.quantity && (
                                  <>
                                    <span>•</span>
                                    <span>{load.quantity} head</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge className="px-2 py-1 text-xs" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                            Waiting for your response
                          </Badge>
                        </div>

                        {booking.offered_amount && (
                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Requested Price</p>
                              <p className="text-lg font-semibold" style={{ color: '#f59e0b' }}>
                                {booking.offered_currency || 'USD'} {Number(booking.offered_amount).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Received</p>
                              <p className="text-xs text-gray-600">
                                {new Date(booking.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {booking.notes && (
                          <p className="text-xs text-gray-600 mb-3 italic truncate">"{booking.notes}"</p>
                        )}

                        <div className="flex gap-3 flex-wrap">
                          <Button
                            onClick={() => {
                              navigate('/shipper/messages');
                            }}
                            variant="outline"
                            className="px-4 py-2 text-sm flex items-center gap-1"
                          >
                            <MessageSquare className="w-4 h-4" />
                            View Messages
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* Show draft contracts */}
                {draftContracts.map((contract) => (
                  <Card key={contract.id} className="p-5 border-amber-200 bg-amber-50 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef3c7' }}>
                        <FileText className="w-6 h-6" style={{ color: '#f59e0b' }} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold mb-2 truncate">Draft Contract #{contract.id}</h4>
                            {contract.load && (
                              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <TruckIcon className="w-3 h-3" />
                                  {contract.load.pickup_location} → {contract.load.dropoff_location}
                                </span>
                                {contract.load.species && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{contract.load.species}</span>
                                  </>
                                )}
                                {contract.load.quantity && (
                                  <>
                                    <span>•</span>
                                    <span>{contract.load.quantity} head</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge className="px-2 py-1 text-xs" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                            Draft
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Draft Price</p>
                            <p className="text-lg font-semibold" style={{ color: '#f59e0b' }}>
                              ${contract.price_amount ? Number(contract.price_amount).toLocaleString() : '0.00'}{contract.price_type === 'per-mile' ? '/mile' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Created</p>
                            <p className="text-xs text-gray-600">
                              {new Date(contract.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                          <Button
                            onClick={() => handleViewContract(contract)}
                            variant="outline"
                            className="px-4 py-2 text-sm flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            View & Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* Show contracts awaiting shipper response */}
                {awaitingYourResponseContracts.map((contract) => (
                    <Card key={contract.id} className="p-5 hover:shadow-md transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef3c7' }}>
                          <FileText className="w-6 h-6" style={{ color: '#f59e0b' }} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold mb-2 truncate">Contract #{contract.id}</h4>
                              {contract.load && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <TruckIcon className="w-3 h-3" />
                                    {contract.load.pickup_location} → {contract.load.dropoff_location}
                                  </span>
                                  {contract.load.species && (
                                    <>
                                      <span>•</span>
                                      <span className="capitalize">{contract.load.species}</span>
                                    </>
                                  )}
                                  {contract.load.quantity && (
                                    <>
                                      <span>•</span>
                                      <span>{contract.load.quantity} head</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <Badge className="px-2 py-1 text-xs" style={{ backgroundColor: '#ef4444', color: 'white' }}>
                              New
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Contract Price</p>
                              <p className="text-lg font-semibold" style={{ color: '#f59e0b' }}>
                                ${contract.price_amount ? Number(contract.price_amount).toLocaleString() : '0.00'}{contract.price_type === 'per-mile' ? '/mile' : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Sent</p>
                              <p className="text-xs text-gray-600">
                                {contract.sent_at ? new Date(contract.sent_at).toLocaleDateString() : '—'}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3 flex-wrap">
                            <Button
                              onClick={() => handleViewContract(contract)}
                              variant="outline"
                              className="px-4 py-2 text-sm flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              View Contract
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                
                {/* Show empty state if no items */}
                {awaitingOffers.length === 0 && awaitingBookings.length === 0 && draftContracts.length === 0 && awaitingYourResponseContracts.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No items awaiting your response
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Confirmed Contracts Section */}
      <div className="pt-6">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5" style={{ color: '#53ca97' }} />
          <h2 className="text-xl font-semibold">Confirmed Contracts ({confirmedContracts.length})</h2>
        </div>

        <div className="space-y-5">
          {confirmedContracts.map((contract) => (
            <Card key={contract.id} className="p-6 border-green-200 bg-green-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-base">Contract #{contract.id}</h3>
                    <Badge
                      className="text-xs px-2 py-0.5"
                      style={{ backgroundColor: '#53ca97', color: 'white' }}
                    >
                      Confirmed
                    </Badge>
                  </div>
                  
                  {contract.load && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{contract.load.pickup_location} → {contract.load.dropoff_location}</span>
                      </div>
                      {contract.load.species && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TruckIcon className="w-4 h-4" />
                          <span className="capitalize">{contract.load.species}{contract.load.quantity ? ` - ${contract.load.quantity} head` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <p className="text-sm font-medium" style={{ color: '#53ca97' }}>
                      Contract Value: ${contract.price_amount ? Number(contract.price_amount).toLocaleString() : '0.00'}{contract.price_type === 'per-mile' ? '/mile' : ' total'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {contract.accepted_at ? `Accepted: ${new Date(contract.accepted_at).toLocaleDateString()}` : `Confirmed: ${new Date(contract.updated_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[140px]">
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-5 py-2.5 text-sm whitespace-nowrap"
                    onClick={() => handleViewContract(contract)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Contract
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-5 py-2.5 text-sm whitespace-nowrap"
                    onClick={() => navigate('/shipper/trips')}
                  >
                    <TruckIcon className="w-4 h-4 mr-2" />
                    View Trips
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>


      {selectedContract && ['DRAFT', 'SENT'].includes(selectedContract.status.toUpperCase()) && (
        <GenerateContractPopup
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onGenerate={(data) => handleSave(data, true)}
          onSaveDraft={(data) => handleSave(data, false)}
          isEditMode={true}
          contractInfo={
            (() => {
              const payload = selectedContract.contract_payload as ContractFormData | undefined;
              const info = payload?.contractInfo;
              if (!info && selectedContract.load) {
                // Build from load data if contractInfo is missing
                return {
                  haulerName: 'Hauler',
                  route: {
                    origin: selectedContract.load.pickup_location || '',
                    destination: selectedContract.load.dropoff_location || '',
                  },
                  animalType: selectedContract.load.species || '',
                  headCount: selectedContract.load.quantity || 0,
                  price: selectedContract.price_amount ? Number(selectedContract.price_amount) : 0,
                  priceType: (selectedContract.price_type === 'per-mile' ? 'per-mile' : 'total') as 'per-mile' | 'total',
                };
              }
              if (!info) return undefined;
              // Ensure all required fields are present, otherwise return undefined
              if (
                info.haulerName &&
                info.route?.origin &&
                info.route?.destination &&
                info.animalType &&
                info.headCount !== undefined &&
                info.headCount !== null
              ) {
                const price = selectedContract.price_amount 
                  ? Number(selectedContract.price_amount) 
                  : (typeof (payload as any)?.price === 'number' ? (payload as any).price : 0);
                const priceType = selectedContract.price_type === 'per-mile' 
                  ? 'per-mile' 
                  : 'total';
                return {
                  haulerName: info.haulerName,
                  route: {
                    origin: info.route.origin,
                    destination: info.route.destination,
                  },
                  animalType: info.animalType,
                  headCount: info.headCount,
                  price,
                  priceType: priceType as 'per-mile' | 'total',
                };
              }
              return undefined;
            })()
          }
          initialData={{
            ...(selectedContract.contract_payload ?? {}),
            priceAmount: selectedContract.price_amount ? String(selectedContract.price_amount) : "",
            priceType: (selectedContract.price_type === 'per-mile' ? 'per-mile' : 'total') as 'per-mile' | 'total',
            paymentMethod: selectedContract.payment_method ?? undefined,
            paymentSchedule: selectedContract.payment_schedule ?? undefined,
          }}
        />
      )}

      {/* Generate Contract Dialog for Active Conversations */}
      {selectedConversation && (
        <GenerateContractPopup
          isOpen={showConversationContractDialog}
          onClose={() => {
            setShowConversationContractDialog(false);
            setSelectedConversation(null);
          }}
          onGenerate={async (data) => {
            try {
              const isLoadOffer = selectedConversation.type === 'load-offer';
              const loadOfferThread = isLoadOffer ? selectedConversation.thread as LoadOfferThread : null;
              const truckBookingThread = !isLoadOffer ? selectedConversation.thread as TruckBookingThread : null;
              
              const priceAmount = data.priceAmount
                ? (typeof data.priceAmount === "string" ? parseFloat(data.priceAmount) : data.priceAmount)
                : (isLoadOffer && loadOfferThread?.offer_amount 
                    ? parseFloat(loadOfferThread.offer_amount) 
                    : (truckBookingThread?.booking_amount ? parseFloat(truckBookingThread.booking_amount) : 0));

              const payload = {
                priceAmount,
                priceType: data.priceType,
                paymentMethod: data.paymentMethod,
                paymentSchedule: data.paymentSchedule,
                contractInfo: {
                  haulerName: isLoadOffer ? (loadOfferThread?.hauler_name || "Hauler") : (truckBookingThread?.hauler_name || "Hauler"),
                  route: {
                    origin: selectedConversation.load.pickup_location,
                    destination: selectedConversation.load.dropoff_location,
                  },
                  animalType: selectedConversation.load.species || "",
                  headCount: selectedConversation.load.quantity || 0,
                },
              };

              if (isLoadOffer && loadOfferThread) {
                await createContract({
                  load_id: String(selectedConversation.load.id),
                  offer_id: String(loadOfferThread.offer_id),
                  status: "SENT",
                  price_amount: priceAmount,
                  price_type: data.priceType || "total",
                  payment_method: data.paymentMethod || undefined,
                  payment_schedule: data.paymentSchedule || undefined,
                  contract_payload: payload,
                });
              } else if (truckBookingThread) {
                await createContract({
                  load_id: String(selectedConversation.load.id),
                  booking_id: String(truckBookingThread.booking_id),
                  status: "SENT",
                  price_amount: priceAmount,
                  price_type: data.priceType || "total",
                  payment_method: data.paymentMethod || undefined,
                  payment_schedule: data.paymentSchedule || undefined,
                  contract_payload: payload,
                });
              }

              toast.success("Contract sent to hauler.");
              setShowConversationContractDialog(false);
              setSelectedConversation(null);
              await refresh();
              await loadActiveConversations();
            } catch (err: any) {
              console.error("Error creating contract:", err);
              toast.error(err?.message ?? "Failed to create contract");
            }
          }}
          onSaveDraft={async (data) => {
            try {
              const isLoadOffer = selectedConversation.type === 'load-offer';
              const loadOfferThread = isLoadOffer ? selectedConversation.thread as LoadOfferThread : null;
              const truckBookingThread = !isLoadOffer ? selectedConversation.thread as TruckBookingThread : null;
              
              const priceAmount = data.priceAmount
                ? (typeof data.priceAmount === "string" ? parseFloat(data.priceAmount) : data.priceAmount)
                : (isLoadOffer && loadOfferThread?.offer_amount 
                    ? parseFloat(loadOfferThread.offer_amount) 
                    : (truckBookingThread?.booking_amount ? parseFloat(truckBookingThread.booking_amount) : 0));

              const payload = {
                priceAmount,
                priceType: data.priceType,
                paymentMethod: data.paymentMethod,
                paymentSchedule: data.paymentSchedule,
                contractInfo: {
                  haulerName: isLoadOffer ? (loadOfferThread?.hauler_name || "Hauler") : (truckBookingThread?.hauler_name || "Hauler"),
                  route: {
                    origin: selectedConversation.load.pickup_location,
                    destination: selectedConversation.load.dropoff_location,
                  },
                  animalType: selectedConversation.load.species || "",
                  headCount: selectedConversation.load.quantity || 0,
                },
              };

              if (isLoadOffer && loadOfferThread) {
                await createContract({
                  load_id: String(selectedConversation.load.id),
                  offer_id: String(loadOfferThread.offer_id),
                  status: "DRAFT",
                  price_amount: priceAmount,
                  price_type: data.priceType || "total",
                  payment_method: data.paymentMethod || undefined,
                  payment_schedule: data.paymentSchedule || undefined,
                  contract_payload: payload,
                });
              } else if (truckBookingThread) {
                await createContract({
                  load_id: String(selectedConversation.load.id),
                  booking_id: String(truckBookingThread.booking_id),
                  status: "DRAFT",
                  price_amount: priceAmount,
                  price_type: data.priceType || "total",
                  payment_method: data.paymentMethod || undefined,
                  payment_schedule: data.paymentSchedule || undefined,
                  contract_payload: payload,
                });
              }

              toast.success("Contract draft saved.");
              setShowConversationContractDialog(false);
              setSelectedConversation(null);
              await refresh();
              await loadActiveConversations();
            } catch (err: any) {
              console.error("Error saving contract draft:", err);
              toast.error(err?.message ?? "Failed to save contract draft");
            }
          }}
          contractInfo={{
            haulerName: selectedConversation.type === 'load-offer' 
              ? ((selectedConversation.thread as LoadOfferThread)?.hauler_name || "Hauler")
              : ((selectedConversation.thread as TruckBookingThread)?.hauler_name || "Hauler"),
            route: {
              origin: selectedConversation.load.pickup_location,
              destination: selectedConversation.load.dropoff_location,
            },
            animalType: selectedConversation.load.species || "",
            headCount: selectedConversation.load.quantity || 0,
            price: selectedConversation.type === 'load-offer'
              ? ((selectedConversation.thread as LoadOfferThread)?.offer_amount ? parseFloat(String((selectedConversation.thread as LoadOfferThread).offer_amount)) : 0)
              : ((selectedConversation.thread as TruckBookingThread)?.booking_amount ? parseFloat(String((selectedConversation.thread as TruckBookingThread).booking_amount)) : 0),
            priceType: "total",
          }}
        />
      )}

      {/* View Contract Dialog for Confirmed Contracts */}
      {selectedContract && selectedContract.status.toUpperCase() === 'ACCEPTED' && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contract #{selectedContract.id}</DialogTitle>
              <DialogDescription>
                Contract Status: <Badge className="capitalize" style={{ backgroundColor: '#53ca97', color: 'white' }}>Confirmed</Badge>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedContract.load && (
                <>
                  <div>
                    <h4 className="font-semibold mb-2">Route</h4>
                    <p className="text-sm text-gray-600">
                      {selectedContract.load.pickup_location} → {selectedContract.load.dropoff_location}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedContract.load.species && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Species</p>
                        <p className="text-sm font-medium capitalize">{selectedContract.load.species}</p>
                      </div>
                    )}
                    {selectedContract.load.quantity && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Quantity</p>
                        <p className="text-sm font-medium">{selectedContract.load.quantity} head</p>
                      </div>
                    )}
                    {(selectedContract.load as any).weight && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Weight</p>
                        <p className="text-sm font-medium">{Number((selectedContract.load as any).weight).toLocaleString()} kg</p>
                      </div>
                    )}
                    {selectedContract.load.pickup_date && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pickup Date</p>
                        <p className="text-sm font-medium">
                          {new Date(selectedContract.load.pickup_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
              <div>
                <h4 className="font-semibold mb-2">Contract Terms</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-lg font-semibold" style={{ color: '#53ca97' }}>
                      ${selectedContract.price_amount ? Number(selectedContract.price_amount).toLocaleString() : '0.00'}{selectedContract.price_type === 'per-mile' ? '/mile' : ' total'}
                    </p>
                  </div>
                  {selectedContract.payment_method && (
                    <div>
                      <p className="text-xs text-gray-500">Payment Method</p>
                      <p className="text-sm">{selectedContract.payment_method}</p>
                    </div>
                  )}
                  {selectedContract.payment_schedule && (
                    <div>
                      <p className="text-xs text-gray-500">Payment Schedule</p>
                      <p className="text-sm">{selectedContract.payment_schedule}</p>
                    </div>
                  )}
                </div>
              </div>
              {selectedContract.contract_payload && Object.keys(selectedContract.contract_payload).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Contract Details</h4>
                  <div className="space-y-4">
                    {(() => {
                      const payload = selectedContract.contract_payload as Record<string, any>;
                      const sections: JSX.Element[] = [];
                      
                      // Basic Contract Info
                      if (payload.contractType || payload.contractDuration) {
                        sections.push(
                          <div key="basic" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Basic Information</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.contractType && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Contract Type</p>
                                  <p className="text-sm font-medium capitalize">{payload.contractType.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                              {payload.contractDuration && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                                  <p className="text-sm font-medium capitalize">{payload.contractDuration.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Payment Terms
                      if (payload.paymentMethod || payload.paymentSchedule || payload.depositRequired) {
                        sections.push(
                          <div key="payment" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Payment Terms</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.paymentMethod && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                                  <p className="text-sm font-medium capitalize">{payload.paymentMethod.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                              {payload.paymentSchedule && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Payment Schedule</p>
                                  <p className="text-sm font-medium capitalize">{payload.paymentSchedule.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                              {payload.depositRequired && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Deposit Required</p>
                                  <p className="text-sm font-medium capitalize">{payload.depositRequired === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.depositPercentage && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Deposit Percentage</p>
                                  <p className="text-sm font-medium">{payload.depositPercentage}%</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Trip Details
                      if (payload.pickupDate || payload.deliveryDate || payload.estimatedDistance || payload.routeType) {
                        sections.push(
                          <div key="trip" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Trip Details</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.pickupDate && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Pickup Date</p>
                                  <p className="text-sm font-medium">
                                    {payload.pickupDate} {payload.pickupTime ? `at ${payload.pickupTime}` : ''}
                                  </p>
                                </div>
                              )}
                              {payload.deliveryDate && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Delivery Date</p>
                                  <p className="text-sm font-medium">
                                    {payload.deliveryDate} {payload.deliveryTime ? `at ${payload.deliveryTime}` : ''}
                                  </p>
                                </div>
                              )}
                              {payload.estimatedDistance && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Estimated Distance</p>
                                  <p className="text-sm font-medium">{payload.estimatedDistance} miles</p>
                                </div>
                              )}
                              {payload.routeType && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Route Type</p>
                                  <p className="text-sm font-medium capitalize">{payload.routeType}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Animal Welfare
                      if (payload.restStopsRequired || payload.temperatureMonitoring || payload.ventilationRequired || payload.waterAccessRequired) {
                        sections.push(
                          <div key="welfare" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Animal Welfare</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.restStopsRequired && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Rest Stops Required</p>
                                  <p className="text-sm font-medium capitalize">{payload.restStopsRequired === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.restStopInterval && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Rest Stop Interval</p>
                                  <p className="text-sm font-medium">{payload.restStopInterval} hours</p>
                                </div>
                              )}
                              {payload.temperatureMonitoring && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Temperature Monitoring</p>
                                  <p className="text-sm font-medium capitalize">{payload.temperatureMonitoring === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.temperatureRange && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Temperature Range</p>
                                  <p className="text-sm font-medium">{payload.temperatureRange}°F</p>
                                </div>
                              )}
                              {payload.ventilationRequired && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Ventilation Required</p>
                                  <p className="text-sm font-medium capitalize">{payload.ventilationRequired === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.waterAccessRequired && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Water Access Required</p>
                                  <p className="text-sm font-medium capitalize">{payload.waterAccessRequired === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.feedingSchedule && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-500 mb-1">Feeding Schedule</p>
                                  <p className="text-sm font-medium">{payload.feedingSchedule}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Insurance & Liability
                      if (payload.insuranceCoverage || payload.liabilityLimit || payload.cargoInsurance) {
                        sections.push(
                          <div key="insurance" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Insurance & Liability</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.insuranceCoverage && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Insurance Coverage</p>
                                  <p className="text-sm font-medium capitalize">{payload.insuranceCoverage}</p>
                                </div>
                              )}
                              {payload.liabilityLimit && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Liability Limit</p>
                                  <p className="text-sm font-medium">${Number(payload.liabilityLimit).toLocaleString()}</p>
                                </div>
                              )}
                              {payload.cargoInsurance && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Cargo Insurance</p>
                                  <p className="text-sm font-medium capitalize">{payload.cargoInsurance === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.additionalInsurance && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-500 mb-1">Additional Insurance</p>
                                  <p className="text-sm font-medium">{payload.additionalInsurance}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Compliance & Documentation
                      if (payload.healthCertificates || payload.movementPermits || payload.dotCompliance || payload.animalWelfareCompliance) {
                        sections.push(
                          <div key="compliance" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Compliance & Documentation</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.healthCertificates && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Health Certificates</p>
                                  <p className="text-sm font-medium capitalize">{payload.healthCertificates}</p>
                                </div>
                              )}
                              {payload.movementPermits && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Movement Permits</p>
                                  <p className="text-sm font-medium capitalize">{payload.movementPermits}</p>
                                </div>
                              )}
                              {payload.dotCompliance && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">DOT Compliance</p>
                                  <p className="text-sm font-medium capitalize">{payload.dotCompliance}</p>
                                </div>
                              )}
                              {payload.animalWelfareCompliance && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Animal Welfare Compliance</p>
                                  <p className="text-sm font-medium capitalize">{payload.animalWelfareCompliance}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Special Requirements
                      if (payload.specialHandling || payload.equipmentRequirements || payload.emergencyContact) {
                        sections.push(
                          <div key="special" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Special Requirements</h5>
                            <div className="space-y-2">
                              {payload.specialHandling && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Special Handling</p>
                                  <p className="text-sm font-medium">{payload.specialHandling}</p>
                                </div>
                              )}
                              {payload.equipmentRequirements && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Equipment Requirements</p>
                                  <p className="text-sm font-medium">{payload.equipmentRequirements}</p>
                                </div>
                              )}
                              {payload.emergencyContact && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Emergency Contact</p>
                                    <p className="text-sm font-medium">{payload.emergencyContact}</p>
                                  </div>
                                  {payload.emergencyPhone && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Emergency Phone</p>
                                      <p className="text-sm font-medium">{payload.emergencyPhone}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {payload.veterinarianOnCall && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Veterinarian On Call</p>
                                  <p className="text-sm font-medium">{payload.veterinarianOnCall}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Terms & Conditions
                      if (payload.cancellationPolicy || payload.lateFeePolicy || payload.disputeResolution || payload.forcemajeure) {
                        sections.push(
                          <div key="terms" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Terms & Conditions</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.cancellationPolicy && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Cancellation Policy</p>
                                  <p className="text-sm font-medium capitalize">{payload.cancellationPolicy.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                              {payload.lateFeePolicy && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Late Fee Policy</p>
                                  <p className="text-sm font-medium capitalize">{payload.lateFeePolicy === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.disputeResolution && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Dispute Resolution</p>
                                  <p className="text-sm font-medium capitalize">{payload.disputeResolution}</p>
                                </div>
                              )}
                              {payload.forcemajeure && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Force Majeure</p>
                                  <p className="text-sm font-medium capitalize">{payload.forcemajeure === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Additional Notes
                      if (payload.additionalTerms || payload.specialInstructions) {
                        sections.push(
                          <div key="notes" className="pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Additional Notes</h5>
                            <div className="space-y-2">
                              {payload.additionalTerms && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Additional Terms</p>
                                  <p className="text-sm font-medium">{payload.additionalTerms}</p>
                                </div>
                              )}
                              {payload.specialInstructions && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Special Instructions</p>
                                  <p className="text-sm font-medium">{payload.specialInstructions}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      return sections.length > 0 ? sections : null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
