import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { FileText, CheckCircle, Clock, TruckIcon, AlertCircle, Users, DollarSign, FileCheck, Activity, X, MapPin, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import {
  fetchContracts,
  acceptContract,
  rejectContract,
  fetchBookings,
  fetchTruckAvailability,
  fetchLoadOffers,
  fetchHaulerOfferSummaries,
  type ContractRecord,
  type LoadBooking,
  type TruckAvailability,
  type HaulerOfferSummary,
} from '../api/marketplace';
import { fetchLoadById, type LoadDetail } from '../lib/api';
import { fetchUserLoadOfferThreads, type LoadOfferThread } from '../api/loadOfferMessages';
import { fetchUserTruckBookingThreads, type TruckBookingThread } from '../api/truckBookingMessages';
import { useNavigate } from 'react-router-dom';
import { storage, STORAGE_KEYS } from '../lib/storage';

interface ContractWithLoad extends ContractRecord {
  load?: LoadDetail | null;
  shipperName?: string;
}

interface AwaitingBooking {
  booking: LoadBooking;
  load: LoadDetail;
  truckAvailability: TruckAvailability | null;
}

interface AwaitingOffer {
  offer: HaulerOfferSummary;
  load: LoadDetail;
}

interface ActiveConversation {
  thread: LoadOfferThread | TruckBookingThread;
  load: LoadDetail;
  type: 'load-offer' | 'truck-booking';
}

export default function HaulerContractsTab() {
  const [contracts, setContracts] = useState<ContractWithLoad[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractWithLoad | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [awaitingBookings, setAwaitingBookings] = useState<AwaitingBooking[]>([]);
  const [awaitingOffers, setAwaitingOffers] = useState<AwaitingOffer[]>([]);
  const [loadingAwaiting, setLoadingAwaiting] = useState(false);
  const [activeConversations, setActiveConversations] = useState<ActiveConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const navigate = useNavigate();
  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);

  // Under Negotiation: Active conversations where hauler has replied
  // Note: SENT contracts go to "Awaiting Your Response" section
  const underNegotiationContracts: ContractWithLoad[] = useMemo(() => {
    // Only show active conversations, not contracts
    return [];
  }, []);
  
  // Awaiting Your Response: Contracts created by shipper (SENT) that need hauler's response
  const awaitingYourResponseContracts = useMemo(() => {
    return contracts.filter(c => {
      const status = c.status.toUpperCase();
      // SENT contracts created by shipper (not by hauler) that need hauler's response
      return status === 'SENT' && c.created_by_user_id !== userId;
    });
  }, [contracts, userId]);
  
  const confirmedContracts = useMemo(() => 
    contracts.filter(c => c.status.toUpperCase() === 'ACCEPTED'),
    [contracts]
  );

  const draftContracts = useMemo(() => 
    contracts.filter(c => c.status.toUpperCase() === 'DRAFT'),
    [contracts]
  );

  const totalEarnings = useMemo(() => {
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

  const loadContracts = async () => {
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
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  const loadAwaitingBookings = async () => {
    if (!userId) return;
    try {
      setLoadingAwaiting(true);
      // Fetch all bookings
      const bookingsResp = await fetchBookings();
      const truckAvailabilityResp = await fetchTruckAvailability({});
      
      // Filter bookings that are REQUESTED and don't have contracts
      const contractBookingIds = new Set(
        contracts.filter(c => c.booking_id).map(c => c.booking_id!)
      );
      
      // Also check for active conversations (where hauler has replied)
      // Fetch truck booking threads to see which bookings have active conversations
      const truckBookingThreads = await fetchUserTruckBookingThreads();
      const activeBookingIds = new Set(
        truckBookingThreads
          .filter(thread => 
            thread.is_active && 
            thread.first_message_sent && 
            thread.hauler_user_id === Number(userId)
          )
          .map(thread => String(thread.booking_id))
      );
      
      // Only show bookings that are REQUESTED, don't have contracts, AND don't have active conversations
      const requestedBookings = bookingsResp.items.filter(
        booking => 
          booking.status === "REQUESTED" && 
          !contractBookingIds.has(booking.id) &&
          !activeBookingIds.has(String(booking.id))
      );
      
      const bookingsWithLoads: AwaitingBooking[] = [];
      for (const booking of requestedBookings) {
        try {
          const load = await fetchLoadById(Number(booking.load_id));
          const truckAvailability = booking.truck_availability_id
            ? truckAvailabilityResp.items.find(ta => String(ta.id) === String(booking.truck_availability_id)) || null
            : null;
          bookingsWithLoads.push({ booking, load, truckAvailability });
        } catch (err) {
          console.warn(`Failed to load details for booking ${booking.id}:`, err);
        }
      }
      
      setAwaitingBookings(bookingsWithLoads);
    } catch (err: any) {
      console.error("Failed to load awaiting bookings:", err);
    } finally {
      setLoadingAwaiting(false);
    }
  };

  const loadAwaitingOffers = async () => {
    if (!userId) return;
    try {
      // Fetch hauler's offer summaries
      const offerSummariesResp = await fetchHaulerOfferSummaries();
      
      // Filter for PENDING offers that don't have contracts
      const contractOfferIds = new Set(
        contracts.filter(c => c.offer_id).map(c => String(c.offer_id!))
      );
      
      // Also check for active conversations (where hauler has replied)
      const loadOfferThreads = await fetchUserLoadOfferThreads();
      const activeOfferIds = new Set(
        loadOfferThreads
          .filter(thread => 
            thread.is_active && 
            thread.first_message_sent && 
            thread.hauler_user_id === Number(userId)
          )
          .map(thread => String(thread.offer_id))
      );
      
      // Only show PENDING offers that don't have contracts AND don't have active conversations
      const pendingOffers = offerSummariesResp.items.filter(
        offer => 
          offer.status === "PENDING" && 
          offer.offer_id &&
          !contractOfferIds.has(offer.offer_id) &&
          !activeOfferIds.has(offer.offer_id)
      );
      
      // Fetch load details for each offer
      const offersWithLoads: AwaitingOffer[] = [];
      for (const offer of pendingOffers) {
        try {
          const load = await fetchLoadById(Number(offer.load_id));
          offersWithLoads.push({ offer, load });
        } catch (err) {
          console.warn(`Failed to load load details for offer ${offer.offer_id}:`, err);
        }
      }
      
      setAwaitingOffers(offersWithLoads);
    } catch (err: any) {
      console.error("Failed to load awaiting offers:", err);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

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
      
      // Fetch active load-offer threads (where hauler has sent messages)
      const loadOfferThreads = await fetchUserLoadOfferThreads();
      const activeLoadOfferThreads = loadOfferThreads.filter(
        thread => 
          thread.is_active && 
          thread.first_message_sent && 
          thread.hauler_user_id === Number(userId) &&
          !contractOfferIds.has(String(thread.offer_id))
      );
      
      // Fetch active truck-booking threads (where hauler has sent messages)
      const truckBookingThreads = await fetchUserTruckBookingThreads();
      const activeTruckBookingThreads = truckBookingThreads.filter(
        thread => 
          thread.is_active && 
          thread.first_message_sent && 
          thread.hauler_user_id === Number(userId) &&
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
    if (contracts.length >= 0) {
      loadAwaitingBookings();
      loadAwaitingOffers();
      loadActiveConversations();
    }
  }, [contracts, userId]);

  const handleViewContract = (contract: ContractWithLoad) => {
    setSelectedContract(contract);
    setShowViewDialog(true);
  };

  const handleAccept = async () => {
    if (!selectedContract) return;
    try {
      await acceptContract(selectedContract.id);
      toast.success("Contract accepted successfully! You can now add this load to your trips.");
      setShowAcceptDialog(false);
      setShowViewDialog(false);
      setSelectedContract(null);
      await loadContracts();
      // Navigate to trips after a short delay
      setTimeout(() => {
        navigate('/hauler/trips');
      }, 1000);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to accept contract");
    }
  };

  const handleReject = async () => {
    if (!selectedContract) return;
    try {
      await rejectContract(selectedContract.id);
      toast.success("Contract rejected");
      setShowRejectDialog(false);
      setShowViewDialog(false);
      setSelectedContract(null);
      await loadContracts();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reject contract");
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
          Once contract is generated by shipper and confirmed by you, you can add this load to your trips
        </p>
      </div>

      {/* 4 Analytics Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#e8f7f1' }}>
              <Users className="w-5 h-5" style={{ color: '#42b883' }} />
            </div>
          </div>
          <div className="text-2xl mb-1">{contracts.length}</div>
          <div className="text-sm text-gray-600">Total Contracts</div>
          <div className="text-xs text-gray-500 mt-2">All contracts</div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl mb-1">${(totalEarnings / 1000).toFixed(1)}K</div>
          <div className="text-sm text-gray-600">Total Earnings</div>
          <div className="text-xs text-gray-500 mt-2">From confirmed contracts</div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
              <FileCheck className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl mb-1">{confirmedContracts.length}</div>
          <div className="text-sm text-gray-600">Confirmed Contracts</div>
          <div className="text-xs text-gray-500 mt-2">Ready for trips</div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl mb-1">{underNegotiationContracts.length + activeConversations.length + awaitingYourResponseContracts.length}</div>
          <div className="text-sm text-gray-600">Under Negotiation</div>
          <div className="text-xs text-gray-500 mt-2">In progress</div>
        </Card>
      </div>

      {/* Action Required Notification */}
      {awaitingYourResponseContracts.length > 0 && (
        <Card className="p-5 mb-8 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-orange-700">
                <strong>Action Required:</strong> You have {awaitingYourResponseContracts.length} contract(s) awaiting your response. Please review and accept or reject them.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Important Message */}
      <Card className="p-5 mb-8 border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-700">
              <strong>Important:</strong> Please review all contract terms carefully before accepting. Once accepted, the contract will be added to your available trips.
            </p>
          </div>
        </div>
      </Card>

      {/* Two Column Layout: Awaiting Counter Party Response and Under Negotiation */}
      <div className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Awaiting Counter Party Response */}
          {/* Left Column: Under Negotiation (merged with Awaiting Your Response) */}
          <Card className="p-6 border-2 flex flex-col" style={{ borderColor: '#42b883', minHeight: '600px' }}>
            <h3 className="mb-5 flex items-center gap-2 flex-shrink-0 text-lg font-semibold">
              <Clock className="w-5 h-5" style={{ color: '#42b883' }} />
              Under Negotiation ({underNegotiationContracts.length + activeConversations.length + awaitingYourResponseContracts.length})
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
                              {loadOfferThread?.shipper_name && (
                                <p className="text-xs text-gray-500 mt-1">With: {loadOfferThread.shipper_name}</p>
                              )}
                              {truckBookingThread?.shipper_name && (
                                <p className="text-xs text-gray-500 mt-1">With: {truckBookingThread.shipper_name}</p>
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
                                navigate('/hauler/messages');
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
                  );
                })}
                
                {/* Show SENT contracts from shipper (Awaiting Your Response) */}
                {awaitingYourResponseContracts.map((contract) => (
                  <Card key={contract.id} className="p-5 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4 p-2">
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
                              ${contract.price_amount ? Number(contract.price_amount).toLocaleString() : '0.00'}{contract.price_type === 'per-mile' ? '/mi' : ''}
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
                          <Button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowAcceptDialog(true);
                            }}
                            className="px-4 py-2 text-sm"
                            style={{ backgroundColor: '#42b883', color: 'white' }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirm Contract
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowRejectDialog(true);
                            }}
                            variant="outline"
                            className="px-4 py-2 text-sm text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* Show empty state if no items */}
                {activeConversations.length === 0 && awaitingYourResponseContracts.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No items under negotiation
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="p-6 border-2 flex flex-col" style={{ borderColor: '#f59e0b', minHeight: '600px' }}>
            <div className="flex items-center gap-2 mb-5 flex-shrink-0">
              <Clock className="w-5 h-5" style={{ color: '#f59e0b' }} />
              <h3 className="text-lg font-semibold">Awaiting Counter Party Response ({awaitingBookings.length + awaitingOffers.length + draftContracts.length})</h3>
            </div>
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {/* Show hauler's load offers awaiting shipper response */}
                {awaitingOffers.map(({ offer, load }) => (
                  <Card key={offer.offer_id} className="p-6 border-amber-200 bg-amber-50 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold">Load Offer #{offer.offer_id}</h3>
                      <Badge className="text-xs px-2 py-0.5" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                        Waiting for shipper response
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{load.pickup_location} → {load.dropoff_location}</span>
                      </div>
                      {load.species && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TruckIcon className="w-4 h-4" />
                          <span className="capitalize">{load.species}{load.quantity ? ` - ${load.quantity} head` : ''}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                        Offered Price: {offer.currency || "USD"} {Number(offer.offered_amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Sent: {new Date(offer.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[140px]">
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-5 py-2.5 text-sm whitespace-nowrap"
                      onClick={() => {
                        // Navigate to messages page and open the load-offer thread
                        if (offer.offer_id) {
                          window.dispatchEvent(new CustomEvent("open-load-offer-thread", {
                            detail: { offerId: Number(offer.offer_id) }
                          }));
                          navigate('/hauler/messages');
                        }
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Messages
                    </Button>
                  </div>
                </div>
                  </Card>
                ))}
                
                {/* Show shipper bookings awaiting response */}
                {awaitingBookings.map(({ booking, load, truckAvailability }) => (
                  <Card key={booking.id} className="p-6 border-amber-200 bg-amber-50 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold">Shipper Request #{booking.id}</h3>
                      <Badge className="text-xs px-2 py-0.5" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                        Waiting for your response
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{load.pickup_location} → {load.dropoff_location}</span>
                      </div>
                      {load.species && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TruckIcon className="w-4 h-4" />
                          <span className="capitalize">{load.species}{load.quantity ? ` - ${load.quantity} head` : ''}</span>
                        </div>
                      )}
                    </div>

                    {booking.offered_amount && (
                      <div className="flex items-center gap-4 mb-4">
                        <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                          Requested Price: {booking.offered_currency || "USD"} {Number(booking.offered_amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          Received: {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    {booking.notes && (
                      <p className="text-sm text-gray-600 mb-4 italic">"{booking.notes}"</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 min-w-[140px]">
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-5 py-2.5 text-sm whitespace-nowrap"
                      onClick={() => {
                        navigate('/hauler/messages');
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Messages
                    </Button>
                  </div>
                </div>
                  </Card>
                ))}
                
                {/* Show draft contracts */}
                {draftContracts.map((contract) => (
                  <Card key={contract.id} className="p-6 border-amber-200 bg-amber-50 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold">Draft Contract #{contract.id}</h3>
                      <Badge className="text-xs px-2 py-0.5" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                        Draft
                      </Badge>
                    </div>
                    
                    {contract.load && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                    <p className="text-xs text-gray-400">
                      Waiting for shipper to send contract...
                    </p>
                  </div>
                </div>
                  </Card>
                ))}
                
                {/* Show empty state if no items */}
                {awaitingBookings.length === 0 && awaitingOffers.length === 0 && draftContracts.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No items awaiting counter party response
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

         
        </div>
      </div>


      {/* Confirmed Contracts */}
      <div className="mb-10 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Confirmed Contracts ({confirmedContracts.length})
          </h3>
        </div>
        
        <div className="space-y-5">
          {confirmedContracts.map((contract) => (
            <Card key={contract.id} className="p-6 hover:shadow-md transition-all border-green-200 bg-green-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-600" />
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
                    <Badge className="px-2 py-1 text-xs" style={{ backgroundColor: '#42b883', color: 'white' }}>
                      Confirmed
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Agreed Price</p>
                      <p className="text-lg font-semibold text-green-600">
                        ${contract.price_amount ? Number(contract.price_amount).toLocaleString() : '0.00'}{contract.price_type === 'per-mile' ? '/mi' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Confirmed</p>
                      <p className="text-xs text-gray-600">
                        {contract.accepted_at ? new Date(contract.accepted_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={() => handleViewContract(contract)}
                      variant="outline"
                      className="px-5 py-2.5 text-sm flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      View Contract
                    </Button>
                    <Button
                      onClick={() => navigate('/hauler/trips')}
                      variant="outline"
                      className="px-5 py-2.5 text-sm flex items-center gap-1"
                    >
                      <TruckIcon className="w-4 h-4" />
                      View Trips
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* View Contract Dialog */}
      {selectedContract && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contract #{selectedContract.id}</DialogTitle>
              <DialogDescription>
                Contract Status: <Badge className="capitalize">{selectedContract.status.toLowerCase()}</Badge>
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
                    <p className="text-lg font-semibold" style={{ color: '#42b883' }}>
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
              {selectedContract.status.toUpperCase() === 'SENT' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      setShowViewDialog(false);
                      setShowAcceptDialog(true);
                    }}
                    className="flex-1"
                    style={{ backgroundColor: '#42b883', color: 'white' }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Contract
                  </Button>
                  <Button
                    onClick={() => {
                      setShowViewDialog(false);
                      setShowRejectDialog(true);
                    }}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject Contract
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Accept Confirmation Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Contract</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this contract? Once accepted, it will be added to your trips.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              style={{ backgroundColor: '#42b883', color: 'white' }}
            >
              Accept Contract
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Contract</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this contract? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Reject Contract
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
