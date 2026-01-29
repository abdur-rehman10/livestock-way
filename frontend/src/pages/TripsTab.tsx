import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Flag,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Phone,
  PlayCircle,
  Plus,
  Star,
} from 'lucide-react';
import { SubscriptionCTA } from '../components/SubscriptionCTA';
import { useHaulerSubscription } from '../hooks/useHaulerSubscription';
import { toast } from 'sonner';
import {
  fetchHaulerTrips,
  fetchShipperTrips,
  confirmMarketplaceTripDelivery,
  markMarketplaceTripDelivered,
  startMarketplaceTrip,
  type HaulerTripSummary,
  type ShipperTripSummary,
} from '../api/marketplace';
import { generateTripRoutePlan } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { CreateTripModal } from '../components/CreateTripModal';

interface Trip {
  id: string;
  species: string;
  quantity: string;
  pickup: string;
  dropoff: string;
  distance: string;
  payout: string;
  pickupTime: string;
  status: 'scheduled' | 'in-transit' | 'completed';
  progress?: number;
  date?: string;
  rating?: number;
}

interface TripsTabProps {
  onViewTrip?: (trip: Trip) => void;
  role?: 'shipper' | 'hauler' | 'driver';
}

const mockTrips: Trip[] = [
  {
    id: 'T001',
    species: 'Cattle',
    quantity: '50 head',
    pickup: 'Austin, TX',
    dropoff: 'Dallas, TX',
    distance: '195 miles',
    payout: '$850',
    pickupTime: 'Today, 8:00 AM',
    status: 'in-transit',
    progress: 65,
  },
  {
    id: 'T002',
    species: 'Sheep',
    quantity: '120 head',
    pickup: 'San Antonio, TX',
    dropoff: 'Houston, TX',
    distance: '197 miles',
    payout: '$920',
    pickupTime: 'Tomorrow, 6:00 AM',
    status: 'scheduled',
  },
  {
    id: 'T003',
    species: 'Pigs',
    quantity: '80 head',
    pickup: 'Waco, TX',
    dropoff: 'Fort Worth, TX',
    distance: '95 miles',
    payout: '$520',
    pickupTime: 'Tomorrow, 2:00 PM',
    status: 'scheduled',
  },
];

const completedTrips: Trip[] = [
  {
    id: 'T004',
    species: 'Cattle',
    quantity: '40 head',
    pickup: 'Houston, TX',
    dropoff: 'Austin, TX',
    distance: '165 miles',
    payout: '$720',
    pickupTime: 'Oct 27, 2025',
    status: 'completed',
    date: 'Oct 27, 2025',
    rating: 5,
  },
  {
    id: 'T005',
    species: 'Goats',
    quantity: '30 head',
    pickup: 'Dallas, TX',
    dropoff: 'Waco, TX',
    distance: '95 miles',
    payout: '$450',
    pickupTime: 'Oct 26, 2025',
    status: 'completed',
    date: 'Oct 26, 2025',
    rating: 4,
  },
  {
    id: 'T006',
    species: 'Sheep',
    quantity: '100 head',
    pickup: 'Fort Worth, TX',
    dropoff: 'San Antonio, TX',
    distance: '275 miles',
    payout: '$1,100',
    pickupTime: 'Oct 25, 2025',
    status: 'completed',
    date: 'Oct 25, 2025',
    rating: 5,
  },
];

export function TripsTab({ onViewTrip, role = 'hauler' }: TripsTabProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'scheduled' | 'completed'>('all');
  const { isIndividualHauler, subscriptionStatus, freeTripUsed, monthlyPrice, yearlyPrice } =
    useHaulerSubscription();
  const navigate = useNavigate();
  const isShipperView = role === 'shipper';
  const [shipperTripSummaries, setShipperTripSummaries] = useState<ShipperTripSummary[]>([]);
  const [shipperTripsLoading, setShipperTripsLoading] = useState(false);
  const [shipperTripsError, setShipperTripsError] = useState<string | null>(null);
  const [haulerTripSummaries, setHaulerTripSummaries] = useState<HaulerTripSummary[]>([]);
  const [haulerTripsLoading, setHaulerTripsLoading] = useState(false);
  const [haulerTripsError, setHaulerTripsError] = useState<string | null>(null);
  const [routePlanLoadingId, setRoutePlanLoadingId] = useState<string | null>(null);
  const [startTripLoadingId, setStartTripLoadingId] = useState<string | null>(null);
  const [completeTripLoadingId, setCompleteTripLoadingId] = useState<string | null>(null);
  const [confirmDeliveryLoadingId, setConfirmDeliveryLoadingId] = useState<string | null>(null);
  const [directDialog, setDirectDialog] = useState<{
    open: boolean;
    tripId: string | null;
  }>({ open: false, tripId: null });
  const [directAmount, setDirectAmount] = useState("");
  const [directMethod, setDirectMethod] = useState<"CASH" | "BANK_TRANSFER" | "OTHER" | "">("");
  const [directReference, setDirectReference] = useState("");
  const [directReceivedAt, setDirectReceivedAt] = useState("");
  const [directError, setDirectError] = useState<string | null>(null);
  const [directSubmitting, setDirectSubmitting] = useState(false);
  const [createTripModalOpen, setCreateTripModalOpen] = useState(false);

  const activeTrips = mockTrips.filter(t => t.status === 'in-transit');
  const upcomingTrips = mockTrips.filter(t => t.status === 'scheduled');

  const renderTripCard = (trip: Trip) => {
    const isCompleted = trip.status === 'completed';
    const isActive = trip.status === 'in-transit';

    return (
      <Card key={trip.id} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm text-gray-600 mb-1">Trip #{trip.id}</div>
              <h3 className="text-base text-gray-900">{trip.species} - {trip.quantity}</h3>
            </div>
            <Badge 
              variant={isActive ? 'default' : isCompleted ? 'secondary' : 'outline'}
              className={isActive ? 'bg-[#29CA8D]' : ''}
            >
              {trip.status === 'in-transit' ? 'In Transit' :
               trip.status === 'completed' ? 'Completed' :
               'Scheduled'}
            </Badge>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-[#29CA8D] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-gray-900">{trip.pickup}</div>
                <div className="text-gray-600">{trip.dropoff}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {trip.status === 'completed' ? trip.date : trip.pickupTime}
              </div>
              <div>{trip.distance}</div>
            </div>

            {isActive && trip.progress !== undefined && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{trip.progress}%</span>
                </div>
                <Progress value={trip.progress} className="h-2" />
              </div>
            )}

            {isCompleted && trip.rating && (
              <div className="flex items-center gap-1 pt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < trip.rating! ? 'fill-[#F97316] text-[#F97316]' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-1 text-[#29CA8D]">
              <DollarSign className="w-4 h-4" />
              <span className="text-lg">{trip.payout}</span>
            </div>
            <Button
                  onClick={() => onViewTrip?.(trip)}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={isActive ? 'bg-[#29CA8D] hover:bg-[#24b67d]' : ''}
            >
              {isActive ? 'View Details' :
               isCompleted ? 'View Summary' :
               'Start Checklist'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  type ShipperTripStatus = 'scheduled' | 'in-progress' | 'completed' | 'waiting-for-trip';

  interface ShipperTrip {
    id: string;
    status: ShipperTripStatus;
    rawStatus: string;
    escrowRequired?: boolean;
    routePlanAvailable?: boolean;
    paymentStatus?: string | null;
    loadId: string;
    origin: string;
    destination: string;
    pickupDate: string;
    deliveryDate: string;
    animalType: string;
    headCount: number;
    revenue: number;
    driver?: {
      name: string;
      phone: string;
    };
    shipper: {
      name: string;
      phone: string;
    };
    truck?: {
      model: string;
      plateNumber: string;
    };
    currentLocation?: string;
    isWaitingForTrip?: boolean;
    progress?: number;
    notes?: string;
  }

  useEffect(() => {
    if (!isShipperView) return;
    let isActive = true;
    setShipperTripsLoading(true);
    setShipperTripsError(null);
    fetchShipperTrips()
      .then((response) => {
        if (!isActive) return;
        setShipperTripSummaries(response.items ?? []);
      })
      .catch((err: any) => {
        if (!isActive) return;
        setShipperTripsError(err?.message ?? 'Failed to load trips.');
      })
      .finally(() => {
        if (!isActive) return;
        setShipperTripsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [isShipperView]);

  useEffect(() => {
    if (isShipperView || role === 'driver') return;
    let isActive = true;
    setHaulerTripsLoading(true);
    setHaulerTripsError(null);
    fetchHaulerTrips()
      .then((response) => {
        if (!isActive) return;
        setHaulerTripSummaries(response.items ?? []);
      })
      .catch((err: any) => {
        if (!isActive) return;
        setHaulerTripsError(err?.message ?? 'Failed to load trips.');
      })
      .finally(() => {
        if (!isActive) return;
        setHaulerTripsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [isShipperView, role]);

  const shipperTrips = useMemo<ShipperTrip[]>(() => {
    const parseNumber = (value: unknown) => {
      if (value === null || value === undefined) return 0;
      const parsed = Number(String(value).replace(/[^0-9.]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const resolvePayloadField = (payload: Record<string, unknown>, key: string) => {
      const value = payload?.[key];
      return typeof value === 'string' && value.trim().length > 0 ? value : null;
    };

    const toStatus = (status: string | null | undefined, tripId: string, contractId: string | null): ShipperTripStatus => {
      // Check if this is a contract waiting for trip creation
      // If trip status is null/undefined/WAITING_FOR_TRIP and we have a contract, it's waiting
      const normalized = (status ?? '').toUpperCase();
      
      // If we have a contract ID and the status indicates waiting or is empty/null
      if (contractId) {
        // Check if trip ID matches contract ID (backend uses contract ID as trip ID for contracts without trips)
        const tripIdStr = String(tripId);
        const contractIdStr = String(contractId);
        
        if (normalized === 'WAITING_FOR_TRIP' || 
            !status || 
            normalized === '' ||
            tripIdStr === contractIdStr) {
          return 'waiting-for-trip';
        }
      }
      
      if (['IN_PROGRESS', 'DELIVERED_AWAITING_CONFIRMATION', 'DISPUTED'].includes(normalized)) {
        return 'in-progress';
      }
      if (['DELIVERED_CONFIRMED', 'CLOSED'].includes(normalized)) {
        return 'completed';
      }
      return 'scheduled';
    };

    return shipperTripSummaries.map((summary) => {
      const payload = summary.contract?.contract_payload ?? {};
      const pickupDate =
        resolvePayloadField(payload, 'pickupDate') ??
        summary.load.pickup_window_start ??
        summary.trip.created_at;
      const deliveryDate =
        resolvePayloadField(payload, 'deliveryDate') ??
        summary.load.delivery_window_end ??
        summary.trip.created_at;
      const price =
        summary.contract?.price_amount ??
        summary.load.price_offer_amount ??
        '0';
      const haulerSource = summary.hauler;

      const normalizedStatus = summary.trip.status?.toUpperCase?.() ?? '';
      const tripStatus = toStatus(summary.trip.status, summary.trip.id, summary.contract?.id ?? null);
      const isWaitingForTrip = tripStatus === 'waiting-for-trip' || summary.trip.status === 'WAITING_FOR_TRIP' || (!summary.trip.status && summary.contract?.id);
      
      return {
        id: summary.trip.id,
        status: tripStatus,
        rawStatus: isWaitingForTrip ? 'WAITING_FOR_TRIP' : normalizedStatus,
        escrowRequired: normalizedStatus === 'PENDING_ESCROW',
        routePlanAvailable: Boolean(summary.route_plan_id),
        paymentStatus: summary.payment_status ?? null,
        loadId: summary.load.id,
        origin: summary.load.pickup_location_text ?? '—',
        destination: summary.load.dropoff_location_text ?? '—',
        pickupDate,
        deliveryDate,
        animalType: summary.load.species ?? 'Livestock',
        headCount: parseNumber(summary.load.animal_count),
        revenue: parseNumber(price),
        driver: haulerSource
          ? {
              name: haulerSource.name ?? '—',
              phone: haulerSource.phone ?? '—',
            }
          : undefined,
        shipper: {
          name: summary.shipper?.name ?? '—',
          phone: summary.shipper?.phone ?? '—',
        },
        truck: summary.truck
          ? {
              model: summary.truck.truck_type ?? 'Truck',
              plateNumber: summary.truck.plate_number ?? '—',
            }
          : undefined,
        isWaitingForTrip, // Flag to identify contracts waiting for trip creation
      };
    });
  }, [shipperTripSummaries]);

  type HaulerTripStatus = ShipperTripStatus;

  interface HaulerTrip {
    id: string;
    status: HaulerTripStatus;
    rawStatus: string;
    origin: string;
    destination: string;
    pickupDate: string;
    deliveryDate: string;
    animalType: string;
    headCount: number;
    revenue: number;
    shipper: { name: string; phone: string };
    truck?: { model: string; plateNumber: string };
    loadId: string;
    paymentStatus: string | null;
    paymentMode?: string | null;
    routePlanAvailable: boolean;
    pickupLat: number | null;
    pickupLng: number | null;
    dropoffLat: number | null;
    dropoffLng: number | null;
    latestLocation: { lat: number; lng: number; recorded_at: string } | null;
  }

  const haulerTrips = useMemo<HaulerTrip[]>(() => {
    const parseNumber = (value: unknown) => {
      if (value === null || value === undefined) return 0;
      const parsed = Number(String(value).replace(/[^0-9.]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const resolvePayloadField = (payload: Record<string, unknown>, key: string) => {
      const value = payload?.[key];
      return typeof value === 'string' && value.trim().length > 0 ? value : null;
    };

    const toStatus = (status: string): HaulerTripStatus => {
      const normalized = status.toUpperCase();
      if (['IN_PROGRESS', 'DISPUTED'].includes(normalized)) {
        return 'in-progress';
      }
      if (['DELIVERED_AWAITING_CONFIRMATION', 'DELIVERED_CONFIRMED', 'CLOSED'].includes(normalized)) {
        return 'completed';
      }
      return 'scheduled';
    };

    return haulerTripSummaries.map((summary) => {
      const payload = summary.contract?.contract_payload ?? {};
      const pickupDate =
        resolvePayloadField(payload, 'pickupDate') ??
        summary.load.pickup_window_start ??
        summary.trip.created_at;
      const deliveryDate =
        resolvePayloadField(payload, 'deliveryDate') ??
        summary.load.delivery_window_end ??
        summary.trip.created_at;
      const price =
        summary.contract?.price_amount ??
        summary.load.price_offer_amount ??
        '0';

      return {
        id: summary.trip.id,
        status: toStatus(summary.trip.status ?? ''),
        rawStatus: summary.trip.status?.toUpperCase?.() ?? '',
        origin: summary.load.pickup_location_text ?? '—',
        destination: summary.load.dropoff_location_text ?? '—',
        pickupDate,
        deliveryDate,
        animalType: summary.load.species ?? 'Livestock',
        headCount: parseNumber(summary.load.animal_count),
        revenue: parseNumber(price),
        shipper: {
          name: summary.shipper?.name ?? '—',
          phone: summary.shipper?.phone ?? '—',
        },
        truck: summary.truck
          ? {
              model: summary.truck.truck_type ?? 'Truck',
              plateNumber: summary.truck.plate_number ?? '—',
            }
          : undefined,
        loadId: summary.load.id,
        paymentStatus: summary.payment_status,
        paymentMode: summary.trip.payment_mode ?? null,
        routePlanAvailable: Boolean(summary.route_plan_id),
        pickupLat: summary.load.pickup_lat ?? null,
        pickupLng: summary.load.pickup_lng ?? null,
        dropoffLat: summary.load.dropoff_lat ?? null,
        dropoffLng: summary.load.dropoff_lng ?? null,
        latestLocation: summary.latest_location ?? null,
      };
    });
  }, [haulerTripSummaries]);

  const computeProgress = (trip: HaulerTrip) => {
    if (
      trip.pickupLat === null ||
      trip.pickupLng === null ||
      trip.dropoffLat === null ||
      trip.dropoffLng === null ||
      !trip.latestLocation
    ) {
      return null;
    }
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const distanceKm = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ) => {
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const total = distanceKm(
      trip.pickupLat,
      trip.pickupLng,
      trip.dropoffLat,
      trip.dropoffLng
    );
    if (!Number.isFinite(total) || total <= 0) return null;
    const current = distanceKm(
      trip.pickupLat,
      trip.pickupLng,
      trip.latestLocation.lat,
      trip.latestLocation.lng
    );
    const percent = Math.min(Math.max((current / total) * 100, 0), 100);
    return Number.isFinite(percent) ? Math.round(percent) : null;
  };

  const handleGenerateRoutePlan = async (tripId: string) => {
    const numericTripId = Number(tripId);
    if (Number.isNaN(numericTripId)) return;
    try {
      setRoutePlanLoadingId(tripId);
      const plan = await generateTripRoutePlan(numericTripId);
      setHaulerTripSummaries((prev) =>
        prev.map((item) =>
          item.trip.id === tripId
            ? { ...item, route_plan_id: String(plan.id) }
            : item
        )
      );
      toast.success('Route plan generated.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to generate route plan.');
    } finally {
      setRoutePlanLoadingId(null);
    }
  };

  const handleStartTrip = async (tripId: string) => {
    try {
      setStartTripLoadingId(tripId);
      await startMarketplaceTrip(tripId);
      toast.success('Trip started.');
      const response = await fetchHaulerTrips();
      setHaulerTripSummaries(response.items ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to start trip.');
    } finally {
      setStartTripLoadingId(null);
    }
  };

  const resetDirectDialog = () => {
    setDirectDialog({ open: false, tripId: null });
    setDirectAmount("");
    setDirectMethod("");
    setDirectReference("");
    setDirectReceivedAt("");
    setDirectError(null);
    setDirectSubmitting(false);
  };

  const handleMarkDelivered = async (trip: HaulerTrip) => {
    if (!trip.id) return;
    const isDirect = (trip.paymentMode ?? "").toUpperCase() === "DIRECT";
    if (isDirect) {
      setDirectDialog({ open: true, tripId: trip.id });
      return;
    }
    try {
      setCompleteTripLoadingId(trip.id);
      await markMarketplaceTripDelivered(trip.id);
      toast.success("Load marked as delivered.");
      const response = await fetchHaulerTrips();
      setHaulerTripSummaries(response.items ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to mark as delivered.");
    } finally {
      setCompleteTripLoadingId(null);
    }
  };

  const submitDirectPayment = async () => {
    if (!directDialog.tripId) {
      resetDirectDialog();
      return;
    }
    setDirectError(null);
    const amountNum = Number(directAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setDirectError("Enter a valid received amount.");
      return;
    }
    if (!directMethod) {
      setDirectError("Select a payment method.");
      return;
    }
    try {
      setDirectSubmitting(true);
      await markMarketplaceTripDelivered(directDialog.tripId, {
        received_amount: amountNum,
        received_payment_method: directMethod,
        received_reference: directReference.trim() || null,
        received_at: directReceivedAt ? new Date(directReceivedAt).toISOString() : null,
      });
      toast.success("Load marked as delivered.");
      const response = await fetchHaulerTrips();
      setHaulerTripSummaries(response.items ?? []);
      resetDirectDialog();
    } catch (err: any) {
      setDirectError(err?.message ?? "Failed to submit direct payment receipt.");
    } finally {
      setDirectSubmitting(false);
      setCompleteTripLoadingId(null);
    }
  };

  const shipperActiveTrips = shipperTrips.filter((t) => t.status === 'in-progress');
  const shipperUpcomingTrips = shipperTrips.filter((t) => t.status === 'scheduled' || t.status === 'waiting-for-trip');
  const shipperCompletedTrips = shipperTrips.filter((t) => t.status === 'completed');

  const haulerAllTrips = haulerTrips;
  const haulerInProgressTrips = haulerTrips.filter((t) => t.status === 'in-progress');
  const haulerScheduledTrips = haulerTrips.filter((t) => t.status === 'scheduled');
  const haulerCompletedTrips = haulerTrips.filter((t) => t.status === 'completed');

  const handleEditTrip = (trip: ShipperTrip) => {
    toast.info(`Trip #${trip.id} editing is coming soon.`);
  };

  const handleOpenChat = (trip: ShipperTrip) => {
    navigate(`/shipper/trips/${trip.loadId}/chat`);
  };

  const handleConfirmDelivery = async (tripId: string) => {
    try {
      setConfirmDeliveryLoadingId(tripId);
      await confirmMarketplaceTripDelivery(tripId);
      toast.success('Delivery confirmed.');
      const response = await fetchShipperTrips();
      setShipperTripSummaries(response.items ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to confirm delivery.');
    } finally {
      setConfirmDeliveryLoadingId(null);
    }
  };

  const handleOpenHaulerChat = (loadId: string) => {
    navigate(`/hauler/trips/${loadId}/chat`);
  };

  const handleCall = (contact: { name: string; phone: string }) => {
    toast.info(`Call ${contact.name} at ${contact.phone}`);
  };

  const renderShipperTripCard = (trip: ShipperTrip, editable: boolean = false) => (
    <Card key={trip.id} className="p-4 hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-sm md:text-base">
                  {trip.isWaitingForTrip ? `Contract #${trip.id}` : `Trip #${trip.id}`}
                </h3>
                <Badge
                  className={`px-2 py-0.5 text-xs ${
                    trip.status === 'waiting-for-trip'
                      ? 'bg-orange-100 text-orange-700'
                      : trip.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-700'
                        : trip.status === 'scheduled'
                          ? 'bg-yellow-100 text-yellow-700'
                          : trip.rawStatus === 'DELIVERED_AWAITING_CONFIRMATION'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                  }`}
                >
                  {trip.status === 'waiting-for-trip' ? (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      Waiting for Trip Creation
                    </>
                  ) : trip.status === 'in-progress' ? (
                    <>
                      <PlayCircle className="w-3 h-3 mr-1" />
                      In Progress
                    </>
                  ) : trip.status === 'scheduled' ? (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      Scheduled
                    </>
                  ) : trip.rawStatus === 'DELIVERED_AWAITING_CONFIRMATION' ? (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      Awaiting confirmation
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {trip.animalType} - {trip.headCount} head
                </span>
                <span>•</span>
                <span className="flex items-center gap-1" style={{ color: '#42b883' }}>
                  <DollarSign className="w-3 h-3" />
                  ${trip.revenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2 mb-3 text-sm">
            <div className="flex items-start gap-1 text-gray-700 min-w-0">
              <MapPin className="w-4 h-4" style={{ color: '#42b883' }} />
              <span className="whitespace-normal break-words">{trip.origin}</span>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex items-start gap-1 text-gray-700 min-w-0">
              <Navigation className="w-4 h-4 text-red-500" />
              <span className="whitespace-normal break-words">{trip.destination}</span>
            </div>
          </div>

          {trip.status === 'in-progress' && trip.progress !== undefined && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{trip.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${trip.progress}%`,
                    backgroundColor: '#42b883',
                  }}
                />
              </div>
              {trip.currentLocation && (
                <p className="text-xs text-gray-500 mt-1">
                  Current: {trip.currentLocation}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(trip.pickupDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Delivery</p>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(trip.deliveryDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-500 mb-1">Hauler</p>
              <p className="font-medium">{trip.driver?.name || 'Not assigned'}</p>
              {trip.driver?.phone && (
                <p className="text-gray-600">{trip.driver.phone}</p>
              )}
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-500 mb-1">Shipper</p>
              <p className="font-medium">{trip.shipper.name}</p>
              <p className="text-gray-600">{trip.shipper.phone}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-500 mb-1">Truck</p>
              <p className="font-medium">{trip.truck?.model || 'N/A'}</p>
              {trip.truck?.plateNumber && (
                <p className="text-gray-600">{trip.truck.plateNumber}</p>
              )}
            </div>
          </div>

          {trip.isWaitingForTrip && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900 mb-1">
                    Waiting for hauler to create trip
                  </p>
                  <p className="text-xs text-orange-700">
                    Your contract has been confirmed. The hauler will create a trip soon. You'll be notified when the trip is created.
                  </p>
                </div>
              </div>
            </div>
          )}

          {trip.notes && (
            <div className="bg-blue-50 p-2 rounded mb-3">
              <p className="text-xs text-blue-700">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {trip.notes}
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {editable && trip.status === 'scheduled' && !trip.isWaitingForTrip && trip.status !== 'waiting-for-trip' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditTrip(trip)}
                className="px-3 py-1 text-xs"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            {trip.escrowRequired && !trip.isWaitingForTrip && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/shipper/my-loads')}
                className="px-3 py-1 text-xs"
              >
                <DollarSign className="w-3 h-3 mr-1" />
                View Escrow
              </Button>
            )}
            {trip.routePlanAvailable && !trip.isWaitingForTrip && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/shipper/trips/${trip.loadId}/route-plan`)}
                className="px-3 py-1 text-xs"
              >
                <Navigation className="w-3 h-3 mr-1" />
                View Plan
              </Button>
            )}
            {trip.rawStatus === 'DELIVERED_AWAITING_CONFIRMATION' && (
              <Button
                size="sm"
                onClick={() => handleConfirmDelivery(trip.id)}
                disabled={confirmDeliveryLoadingId === trip.id}
                className="px-3 py-1 text-xs bg-primary text-white hover:bg-primary/90"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {confirmDeliveryLoadingId === trip.id ? 'Confirming…' : 'Confirm Delivery'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenChat(trip)}
              className="px-3 py-1 text-xs"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Message
            </Button>
            {!trip.isWaitingForTrip && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCall(trip.shipper)}
                  className="px-3 py-1 text-xs"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/shipper/trips/${trip.loadId}`)}
                  className="px-3 py-1 text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info(`Dispute flow for Trip #${trip.id} coming soon.`)}
                  className="px-3 py-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Flag className="w-3 h-3 mr-1" />
                  Dispute
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderHaulerTripCard = (trip: HaulerTrip) => (
    <Card key={trip.id} className="p-4 hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-sm md:text-base">Trip #{trip.id}</h3>
                <Badge
                  className={`px-2 py-0.5 text-xs ${
                    trip.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-700'
                      : trip.status === 'scheduled'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                  }`}
                >
                  {trip.status === 'in-progress' ? (
                    <>
                      <PlayCircle className="w-3 h-3 mr-1" />
                      In Progress
                    </>
                  ) : trip.status === 'scheduled' ? (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      Scheduled
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {trip.animalType} - {trip.headCount} head
                </span>
                <span>•</span>
                <span className="flex items-center gap-1" style={{ color: '#42b883' }}>
                  <DollarSign className="w-3 h-3" />
                  ${trip.revenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2 mb-3 text-sm">
            <div className="flex items-start gap-1 text-gray-700 min-w-0">
              <MapPin className="w-4 h-4" style={{ color: '#42b883' }} />
              <span className="whitespace-normal break-words">{trip.origin}</span>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex items-start gap-1 text-gray-700 min-w-0">
              <Navigation className="w-4 h-4 text-red-500" />
              <span className="whitespace-normal break-words">{trip.destination}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(trip.pickupDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Delivery</p>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(trip.deliveryDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-500 mb-1">Shipper</p>
              <p className="font-medium">{trip.shipper.name}</p>
              <p className="text-gray-600">{trip.shipper.phone}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-500 mb-1">Truck</p>
              <p className="font-medium">{trip.truck?.model || 'N/A'}</p>
              {trip.truck?.plateNumber && (
                <p className="text-gray-600">{trip.truck.plateNumber}</p>
              )}
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-500 mb-1">Payment</p>
              <p className="font-medium">{trip.paymentStatus ?? 'Pending'}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenHaulerChat(trip.loadId)}
              className="px-3 py-1 text-xs"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Message
            </Button>
            {trip.rawStatus === 'READY_TO_START' && (
              <Button
                size="sm"
                onClick={() => handleStartTrip(trip.id)}
                disabled={
                  startTripLoadingId === trip.id ||
                  (trip.paymentStatus ?? '').toUpperCase() === 'AWAITING_FUNDING'
                }
                className="px-3 py-1 text-xs"
                style={{ backgroundColor: '#42b883', color: 'white' }}
              >
                <PlayCircle className="w-3 h-3 mr-1" />
                {startTripLoadingId === trip.id ? 'Starting…' : 'Start Trip'}
              </Button>
            )}
            {trip.rawStatus === 'IN_PROGRESS' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMarkDelivered(trip)}
                disabled={completeTripLoadingId === trip.id}
                className="px-3 py-1 text-xs"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {completeTripLoadingId === trip.id ? 'Completing…' : 'Mark Delivered'}
              </Button>
            )}
            {trip.rawStatus === 'READY_TO_START' && !trip.routePlanAvailable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateRoutePlan(trip.id)}
                disabled={routePlanLoadingId === trip.id}
                className="px-3 py-1 text-xs"
              >
                <Navigation className="w-3 h-3 mr-1" />
                {routePlanLoadingId === trip.id ? 'Generating…' : 'Generate Plan'}
              </Button>
            )}
            {trip.routePlanAvailable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/hauler/trips/${trip.loadId}/route-plan`)}
                className="px-3 py-1 text-xs"
              >
                <Navigation className="w-3 h-3 mr-1" />
                View Plan
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/hauler/trips/${trip.loadId}`)}
              className="px-3 py-1 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              View Trip
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderEmptyState = (type: string) => (
    <div className="text-center py-12">
      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <h3 className="text-lg text-gray-900 mb-2">No {type} trips</h3>
      <p className="text-sm text-gray-600">
        {type === 'active' && 'You have no trips in progress'}
        {type === 'upcoming' && 'No upcoming trips scheduled'}
        {type === 'completed' && 'No completed trips yet'}
        {type === 'all' && 'You have no trips yet'}
        {type === 'in-progress' && 'You have no trips in progress'}
        {type === 'scheduled' && 'No scheduled trips yet'}
      </p>
    </div>
  );

  if (isShipperView) {
    if (shipperTripsLoading) {
      return (
        <div className="p-4 text-sm text-gray-600">
          Loading your trips…
        </div>
      );
    }
    if (shipperTripsError) {
      return (
        <div className="p-4 text-sm text-red-600">
          {shipperTripsError}
        </div>
      );
    }
    return (
      <div className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="active">
              Active
              <Badge variant="secondary" className="ml-2">
                {shipperActiveTrips.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming
              <Badge variant="secondary" className="ml-2">
                {shipperUpcomingTrips.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              <Badge variant="secondary" className="ml-2">
                {shipperCompletedTrips.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-4">
            {shipperActiveTrips.length === 0
              ? renderEmptyState('active')
              : shipperActiveTrips.map((trip) => renderShipperTripCard(trip, true))}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {shipperUpcomingTrips.length === 0
              ? renderEmptyState('upcoming')
              : shipperUpcomingTrips.map((trip) => renderShipperTripCard(trip, true))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 mt-4">
            {shipperCompletedTrips.length === 0
              ? renderEmptyState('completed')
              : shipperCompletedTrips.map((trip) => renderShipperTripCard(trip, false))}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (haulerTripsLoading) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Loading your trips…
      </div>
    );
  }

  if (haulerTripsError) {
    return (
      <div className="p-4 text-sm text-red-600">
        {haulerTripsError}
      </div>
    );
  }

  const handleTripCreated = async () => {
    // Refresh trips after creation
    if (role === 'hauler') {
      try {
        const response = await fetchHaulerTrips();
        setHaulerTripSummaries(response.items ?? []);
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to refresh trips');
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      {isIndividualHauler && (subscriptionStatus ?? '').toUpperCase() !== 'ACTIVE' && (
        <SubscriptionCTA
          variant={freeTripUsed ? 'BLOCKED_UPGRADE' : 'INFO_FREE_TRIP'}
          monthlyPrice={monthlyPrice ?? undefined}
          yearlyPrice={yearlyPrice ?? undefined}
          onUpgradeClick={() => (window.location.href = '/hauler/subscription')}
        />
      )}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        {role === 'hauler' ? (
          <>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-2">
                  {haulerAllTrips.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress
                <Badge variant="secondary" className="ml-2">
                  {haulerInProgressTrips.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                Scheduled
                <Badge variant="secondary" className="ml-2">
                  {haulerScheduledTrips.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                <Badge variant="secondary" className="ml-2">
                  {haulerCompletedTrips.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {haulerAllTrips.length === 0
                ? renderEmptyState('all')
                : haulerAllTrips.map(renderHaulerTripCard)}
            </TabsContent>

            <TabsContent value="in-progress" className="space-y-3 mt-4">
              {haulerInProgressTrips.length === 0
                ? renderEmptyState('in-progress')
                : haulerInProgressTrips.map(renderHaulerTripCard)}
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-3 mt-4">
              {haulerScheduledTrips.length === 0
                ? renderEmptyState('scheduled')
                : haulerScheduledTrips.map(renderHaulerTripCard)}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {haulerCompletedTrips.length === 0
                ? renderEmptyState('completed')
                : haulerCompletedTrips.map(renderHaulerTripCard)}
            </TabsContent>
          </>
        ) : (
          <>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="active">
                Active
                <Badge variant="secondary" className="ml-2">
                  {shipperActiveTrips.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                Upcoming
                <Badge variant="secondary" className="ml-2">
                  {shipperUpcomingTrips.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                <Badge variant="secondary" className="ml-2">
                  {shipperCompletedTrips.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-3 mt-4">
              {shipperActiveTrips.length === 0
                ? renderEmptyState('active')
                : shipperActiveTrips.map((trip) => renderShipperTripCard(trip, true))}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-3 mt-4">
              {shipperUpcomingTrips.length === 0
                ? renderEmptyState('upcoming')
                : shipperUpcomingTrips.map((trip) => renderShipperTripCard(trip, true))}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {shipperCompletedTrips.length === 0
                ? renderEmptyState('completed')
                : shipperCompletedTrips.map((trip) => renderShipperTripCard(trip, false))}
            </TabsContent>
          </>
        )}
      </Tabs>

      {role === 'hauler' && (
        <CreateTripModal
          open={createTripModalOpen}
          onOpenChange={setCreateTripModalOpen}
          onTripCreated={handleTripCreated}
        />
      )}

      <Dialog open={directDialog.open} onOpenChange={(open) => !open && resetDirectDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Direct Payment</DialogTitle>
            <DialogDescription>
              Enter receipt details before completing this direct-payment trip.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Received Amount</Label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={directAmount}
                onChange={(e) => setDirectAmount(e.target.value)}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Method</Label>
              <select
                value={directMethod}
                onChange={(e) =>
                  setDirectMethod(
                    e.target.value as "CASH" | "BANK_TRANSFER" | "OTHER" | ""
                  )
                }
                className="w-full rounded-md border px-2 py-1.5 text-sm"
              >
                <option value="">Select method</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reference (optional)</Label>
              <input
                type="text"
                value={directReference}
                onChange={(e) => setDirectReference(e.target.value)}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="Receipt/transfer reference"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Received At (optional)</Label>
              <input
                type="datetime-local"
                value={directReceivedAt}
                onChange={(e) => setDirectReceivedAt(e.target.value)}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
              />
            </div>
            {directError && <p className="text-xs text-rose-600">{directError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetDirectDialog}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitDirectPayment} disabled={directSubmitting}>
                {directSubmitting ? "Submitting…" : "Submit & Complete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
