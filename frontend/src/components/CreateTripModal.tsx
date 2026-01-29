import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  MapPin,
  CheckCircle,
  AlertCircle,
  Navigation,
  Truck,
  Users,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { fetchTruckAvailability, type TruckAvailability, fetchContracts, fetchContractsByTruckAvailability, createMultiLoadTrip, type ContractRecord } from "../api/marketplace";
import { fetchLoadById } from "../lib/api";
import { fetchTrucks } from "../api/fleet";
import { fetchHaulerDrivers, fetchHaulerVehicles } from "../api/marketplace";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { RouteMap } from "./RouteMap";
import { generateTripRoutePlan } from "../lib/api";
import { AddressSearch, type MappedAddress } from "./AddressSearch";
import { generateRouteCombinations, calculateRouteMetrics, calculateRouteMetricsOAASIS, type RouteCombination, type Waypoint } from "../lib/routeOptimization";

interface CreateTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTripCreated?: () => void;
}

interface TripFormData {
  tripTitle: string;
  selectedListingId: string;
  origin: string;
  destination: string;
  stops: string[];
  tripStartDate: string;
  tripStartTime: string;
  assignedDriver: string;
  assignedVehicle: string;
  selectedContractIds: string[];
  routeMode: "fastest" | "shortest" | "avoid-tolls";
  autoRestStops: boolean;
  selectedRouteId?: string; // Selected route combination ID
}

export function CreateTripModal({ open, onOpenChange, onTripCreated }: CreateTripModalProps) {
  const [createTripStep, setCreateTripStep] = useState(1);
  const [tripFormData, setTripFormData] = useState<TripFormData>({
    tripTitle: "",
    selectedListingId: "",
    origin: "",
    destination: "",
    stops: [],
    tripStartDate: "",
    tripStartTime: "",
    assignedDriver: "",
    assignedVehicle: "",
    selectedContractIds: [],
    routeMode: "fastest",
    autoRestStops: true,
  });

  const [truckListings, setTruckListings] = useState<TruckAvailability[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [contracts, setContracts] = useState<Array<ContractRecord & { booking_truck_availability_id: string | null }>>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [loadsData, setLoadsData] = useState<Map<string, any>>(new Map());
  const [trucks, setTrucks] = useState<any[]>([]);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [routeCalculating, setRouteCalculating] = useState(false);
  const [routeData, setRouteData] = useState<{ distance: number; duration: number; coordinates: Array<[number, number]> } | null>(null);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);
  const [routeCombinations, setRouteCombinations] = useState<RouteCombination[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [combinationsCalculating, setCombinationsCalculating] = useState(false);
  // Use OAASIS optimization by default
  const useOAASIS = true;

  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const userRole = storage.get<string | null>(STORAGE_KEYS.USER_ROLE, null);

  // Fetch truck listings (truck/route availability)
  useEffect(() => {
    if (!open) return;
    let active = true;
    setListingsLoading(true);
    fetchTruckAvailability({ scope: "mine" })
      .then((resp) => {
        if (!active) return;
        const activeListings = resp.items.filter((entry) => entry.is_active === true);
        setTruckListings(activeListings);
      })
      .catch((err: any) => {
        if (!active) return;
        toast.error(err?.message ?? "Failed to load truck listings");
      })
      .finally(() => {
        if (active) setListingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  // Fetch contracts when listing is selected
  useEffect(() => {
    if (!open || !tripFormData.selectedListingId) {
      setContracts([]);
      setLoadsData(new Map());
      return;
    }
    let active = true;
    setContractsLoading(true);
    fetchContractsByTruckAvailability(tripFormData.selectedListingId)
      .then(async (resp) => {
        if (!active) return;
        // Filter contracts that match the selected listing
        const filtered = resp.items.filter((contract) => {
          return contract.booking_truck_availability_id === tripFormData.selectedListingId;
        });
        setContracts(filtered);
        // Fetch load details for capacity calculation
        const loadsMap = new Map();
        for (const contract of filtered) {
          try {
            const load = await fetchLoadById(Number(contract.load_id));
            loadsMap.set(contract.load_id, load);
          } catch (err) {
            console.warn(`Failed to load details for load ${contract.load_id}:`, err);
          }
        }
        setLoadsData(loadsMap);
      })
      .catch((err: any) => {
        if (!active) return;
        toast.error(err?.message ?? "Failed to load contracts");
      })
      .finally(() => {
        if (active) setContractsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, tripFormData.selectedListingId]);

  // Group contracts by truck_availability_id
  const contractsByListing = useMemo(() => {
    return contracts.filter((c) => c.booking_truck_availability_id === tripFormData.selectedListingId);
  }, [contracts, tripFormData.selectedListingId]);

  // Fetch trucks and drivers
  useEffect(() => {
    if (!open) return;
    let active = true;
    setTrucksLoading(true);
    setDriversLoading(true);
    Promise.all([fetchTrucks(), userRole === "hauler" ? fetchHaulerDrivers() : Promise.resolve({ items: [] })])
      .then(([trucksResp, driversResp]) => {
        if (!active) return;
        setTrucks(trucksResp.items || []);
        setDrivers((driversResp as any).items || []);
      })
      .catch((err: any) => {
        if (!active) return;
        toast.error(err?.message ?? "Failed to load resources");
      })
      .finally(() => {
        if (active) {
          setTrucksLoading(false);
          setDriversLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [open, userRole]);

  // Compute selected listing early so it can be used in other hooks
  const selectedListing = useMemo(() => {
    return truckListings.find((l) => l.id === tripFormData.selectedListingId);
  }, [truckListings, tripFormData.selectedListingId]);

  // Don't auto-populate origin/destination - let user enter them manually

  // Calculate capacity warning
  useEffect(() => {
    if (tripFormData.selectedContractIds.length === 0 || !selectedListing) {
      setCapacityWarning(null);
      return;
    }
    // Calculate total from selected contracts
    let totalHeadcount = 0;
    let totalWeight = 0;
    const warnings: string[] = [];
    for (const contractId of tripFormData.selectedContractIds) {
      const contract = contracts.find((c) => c.id === contractId);
      if (contract) {
        const load = loadsData.get(contract.load_id);
        if (load) {
          const headcount = load.quantity ? Number(load.quantity) : 0;
          const weight = load.estimated_weight_lbs ? Number(load.estimated_weight_lbs) * 0.453592 : 0;
          totalHeadcount += headcount;
          totalWeight += weight;
        }
      }
    }
    if (selectedListing.capacity_headcount && totalHeadcount > selectedListing.capacity_headcount) {
      warnings.push(`Total headcount (${totalHeadcount}) exceeds truck capacity (${selectedListing.capacity_headcount})`);
    }
    if (selectedListing.capacity_weight_kg && totalWeight > Number(selectedListing.capacity_weight_kg)) {
      warnings.push(`Total weight (${Math.round(totalWeight)} kg) exceeds truck capacity (${selectedListing.capacity_weight_kg} kg)`);
    }
    setCapacityWarning(warnings.length > 0 ? warnings.join(". ") : null);
  }, [tripFormData.selectedContractIds, selectedListing, contracts, loadsData]);

  // Calculate route combinations when entering Step 4
  // Preserve state until modal closes - only calculate once per input combination
  const routeCacheKeyRef = React.useRef<string | null>(null);
  
  useEffect(() => {
    // Only calculate when on step 4 and we have required data
    if (createTripStep === 4 && tripFormData.origin && tripFormData.destination && tripFormData.selectedContractIds.length > 0) {
      // Create a cache key based on inputs to avoid recalculating if inputs haven't changed
      const cacheKey = `${tripFormData.origin}|${tripFormData.destination}|${tripFormData.selectedContractIds.sort().join(',')}|${tripFormData.routeMode}`;
      
      // Only recalculate if we don't have combinations yet or if inputs changed
      if (routeCombinations.length === 0 || routeCacheKeyRef.current !== cacheKey) {
        const wasRecalculating = routeCacheKeyRef.current !== null && routeCacheKeyRef.current !== cacheKey;
        routeCacheKeyRef.current = cacheKey;
        setCombinationsCalculating(true);
        // Only reset selectedRouteId if we're recalculating due to input changes (not first time)
        if (wasRecalculating && routeCombinations.length > 0) {
          setSelectedRouteId(null);
        }

        // Geocode origin and destination
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=`;
      
      Promise.all([
        fetch(`${geocodeUrl}${encodeURIComponent(tripFormData.origin)}`).then((r) => r.json()),
        fetch(`${geocodeUrl}${encodeURIComponent(tripFormData.destination)}`).then((r) => r.json()),
      ])
        .then(async ([originResults, destResults]) => {
          const origin = originResults[0];
          const dest = destResults[0];
          if (!origin || !dest) {
            throw new Error("Could not geocode addresses");
          }

          const truckOrigin = {
            text: tripFormData.origin,
            lat: parseFloat(origin.lat),
            lng: parseFloat(origin.lon),
          };
          const truckDestination = {
            text: tripFormData.destination,
            lat: parseFloat(dest.lat),
            lng: parseFloat(dest.lon),
          };

          // Get load data for selected contracts
          const loads: Array<{
            loadId: string;
            contractId: string;
            pickup: { text: string; lat: number | null; lng: number | null };
            dropoff: { text: string; lat: number | null; lng: number | null };
          }> = [];

          for (const contractId of tripFormData.selectedContractIds) {
            const contract = contracts.find((c) => c.id === contractId);
            if (contract) {
              const load = loadsData.get(contract.load_id);
              if (load) {
                // Geocode pickup and dropoff if needed
                let pickupLat = (load as any).pickup_lat ? parseFloat(String((load as any).pickup_lat)) : null;
                let pickupLng = (load as any).pickup_lng ? parseFloat(String((load as any).pickup_lng)) : null;
                let dropoffLat = (load as any).dropoff_lat ? parseFloat(String((load as any).dropoff_lat)) : null;
                let dropoffLng = (load as any).dropoff_lng ? parseFloat(String((load as any).dropoff_lng)) : null;

                const pickupLocationText = (load as any).pickup_location || (load as any).pickup_location_text || '';
                const dropoffLocationText = (load as any).dropoff_location || (load as any).dropoff_location_text || '';

                if (!pickupLat || !pickupLng) {
                  try {
                    const pickupGeocode = await fetch(`${geocodeUrl}${encodeURIComponent(pickupLocationText)}`).then((r) => r.json());
                    if (pickupGeocode[0]) {
                      pickupLat = parseFloat(pickupGeocode[0].lat);
                      pickupLng = parseFloat(pickupGeocode[0].lon);
                    }
                  } catch (e) {
                    console.warn('Failed to geocode pickup:', e);
                  }
                }

                if (!dropoffLat || !dropoffLng) {
                  try {
                    const dropoffGeocode = await fetch(`${geocodeUrl}${encodeURIComponent(dropoffLocationText)}`).then((r) => r.json());
                    if (dropoffGeocode[0]) {
                      dropoffLat = parseFloat(dropoffGeocode[0].lat);
                      dropoffLng = parseFloat(dropoffGeocode[0].lon);
                    }
                  } catch (e) {
                    console.warn('Failed to geocode dropoff:', e);
                  }
                }

                loads.push({
                  loadId: contract.load_id,
                  contractId: contract.id,
                  pickup: {
                    text: pickupLocationText,
                    lat: pickupLat,
                    lng: pickupLng,
                  },
                  dropoff: {
                    text: dropoffLocationText,
                    lat: dropoffLat,
                    lng: dropoffLng,
                  },
                });
              }
            }
          }

          // Generate route combinations
          const combinations = generateRouteCombinations(truckOrigin, truckDestination, loads);
          setRouteCombinations(combinations);

          // Calculate metrics for each combination using OAASIS (always enabled)
          const oaasisApiKey = import.meta.env.VITE_OAASIS_ROUTING_API_KEY;
          const promises = combinations.map(async (combo) => {
            try {
              // Always use OAASIS if API key is available, fallback to OSRM
              const metrics = oaasisApiKey
                ? await calculateRouteMetricsOAASIS(combo.waypoints, combo.sequence, tripFormData.routeMode, oaasisApiKey)
                : await calculateRouteMetrics(combo.waypoints, combo.sequence, tripFormData.routeMode);

              if (metrics) {
                return {
                  ...combo,
                  distance_km: metrics.distance_km,
                  duration_min: metrics.duration_min,
                  estimated_cost: Math.round(metrics.distance_km * 0.5), // Rough estimate
                };
              }
              return combo;
            } catch (error) {
              console.error(`Error calculating metrics for ${combo.id}:`, error);
              return { ...combo, error: 'Failed to calculate route' };
            }
          });

          const calculatedCombinations = await Promise.all(promises);
          
          // Sort by distance (shortest first)
          calculatedCombinations.sort((a, b) => {
            if (!a.distance_km) return 1;
            if (!b.distance_km) return -1;
            return a.distance_km - b.distance_km;
          });

          setRouteCombinations(calculatedCombinations);
          
          // Auto-select the shortest route
          if (calculatedCombinations.length > 0 && calculatedCombinations[0].distance_km) {
            setSelectedRouteId(calculatedCombinations[0].id);
            setTripFormData(prev => ({ ...prev, selectedRouteId: calculatedCombinations[0].id }));
          }
        })
        .catch((err: any) => {
          console.error("Route combination calculation error:", err);
          toast.error("Failed to calculate route combinations");
        })
        .finally(() => {
          setCombinationsCalculating(false);
        });
      }
    }
    // Don't clear routeCombinations when leaving step 4 - preserve state until modal closes
    // State will only be cleared when handleClose is called
  }, [createTripStep, tripFormData.origin, tripFormData.destination, tripFormData.selectedContractIds, tripFormData.routeMode, contracts, loadsData]);

  const handleClose = () => {
    setCreateTripStep(1);
    setTripFormData({
      tripTitle: "",
      selectedListingId: "",
      origin: "",
      destination: "",
      stops: [],
      tripStartDate: "",
      tripStartTime: "",
      assignedDriver: "",
      assignedVehicle: "",
      selectedContractIds: [],
      routeMode: "fastest",
      autoRestStops: true,
    });
    // Clear route state when modal closes - preserve until modal closes
    setRouteCombinations([]);
    setSelectedRouteId(null);
    setCombinationsCalculating(false);
    routeCacheKeyRef.current = null;
    setRouteData(null);
    setCapacityWarning(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!tripFormData.selectedListingId) {
      toast.error("Please select a truck/route listing");
      return;
    }
    if (tripFormData.selectedContractIds.length === 0) {
      toast.error("Please select at least one contract");
      return;
    }
    if (!tripFormData.origin || !tripFormData.destination) {
      toast.error("Please enter trip origin and destination");
      return;
    }
    if (!tripFormData.tripStartDate || !tripFormData.tripStartTime) {
      toast.error("Please enter trip start date and time");
      return;
    }

    setSubmitting(true);
    try {
      // Use trip start date/time for pickup_date_time
      const tripStartDateTime = new Date(`${tripFormData.tripStartDate}T${tripFormData.tripStartTime}`).toISOString();
      // For delivery_date_time, we'll use a default (e.g., same day + 8 hours) or let backend calculate
      // Since backend might need this, let's add 8 hours as a default
      const deliveryDateTime = new Date(new Date(tripStartDateTime).getTime() + 8 * 60 * 60 * 1000).toISOString();

      // Get the full route combination details for the selected route
      const selectedRoute = routeCombinations.find(r => r.id === (selectedRouteId || tripFormData.selectedRouteId));
      
      await createMultiLoadTrip({
        truck_availability_id: tripFormData.selectedListingId,
        contract_ids: tripFormData.selectedContractIds,
        driver_id: tripFormData.assignedDriver || null,
        pickup_date_time: tripStartDateTime,
        delivery_date_time: deliveryDateTime,
        trip_title: tripFormData.tripTitle || null,
        route_mode: tripFormData.routeMode,
        auto_rest_stops: tripFormData.autoRestStops,
        selected_route_id: selectedRouteId || tripFormData.selectedRouteId || null,
        selected_route_data: selectedRoute ? {
          id: selectedRoute.id,
          waypoints: selectedRoute.waypoints,
          sequence: selectedRoute.sequence,
          distance_km: selectedRoute.distance_km,
          duration_min: selectedRoute.duration_min,
          estimated_cost: selectedRoute.estimated_cost,
        } : null,
      });

      toast.success("Trip created successfully!");
      handleClose();
      onTripCreated?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create trip");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTruck = trucks.find((t) => String(t.id) === tripFormData.assignedVehicle);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
          <DialogDescription>Step {createTripStep} of 5</DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(createTripStep / 5) * 100}%`,
              backgroundColor: "#53ca97",
            }}
          />
        </div>

        {/* Step 1: Select Truck/Route Listing & Trip Details */}
        {createTripStep === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium mb-4">Select Truck/Route Listing</h3>
            
            <div>
              <Label className="text-sm text-gray-600 mb-1 block">Trip Title/Reference (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g., Austin to Dallas Multi-Load Trip"
                value={tripFormData.tripTitle}
                onChange={(e) => setTripFormData({ ...tripFormData, tripTitle: e.target.value })}
              />
            </div>

            {listingsLoading ? (
              <p className="text-sm text-gray-500">Loading listings...</p>
            ) : truckListings.length === 0 ? (
              <div className="p-6 border-2 border-dashed rounded-lg text-center">
                <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">No active truck/route listings</p>
                <Button onClick={() => { handleClose(); window.location.href = "/hauler/truck-listings"; }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Listing
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {truckListings.map((listing) => {
                  const routeText = listing.destination_location_text
                    ? `${listing.origin_location_text} → ${listing.destination_location_text}`
                    : listing.origin_location_text;
                  return (
                    <div
                      key={listing.id}
                      onClick={() => setTripFormData({ ...tripFormData, selectedListingId: listing.id })}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        tripFormData.selectedListingId === listing.id
                          ? "border-[#53ca97] bg-green-50"
                          : "border-gray-200 hover:border-[#53ca97]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{routeText}</p>
                          {listing.truck_id && (
                            <p className="text-xs text-gray-500">Truck ID: {listing.truck_id}</p>
                          )}
                          {listing.capacity_headcount && (
                            <p className="text-xs text-gray-500">
                              Capacity: {listing.capacity_headcount} head
                              {listing.capacity_weight_kg && `, ${listing.capacity_weight_kg} kg`}
                            </p>
                          )}
                        </div>
                        <Badge className={listing.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {listing.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tripFormData.selectedListingId && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label className="text-sm text-gray-600 mb-1 block">
                    Trip Origin (Where truck will start) *
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">Truck will start from here</p>
                  <AddressSearch
                    value={tripFormData.origin}
                    onChange={(text) => setTripFormData({ ...tripFormData, origin: text })}
                    onSelect={(address) => setTripFormData({ ...tripFormData, origin: address.fullText })}
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600 mb-1 block">
                    Trip Destination (Where trip will end) *
                  </Label>
                  <AddressSearch
                    value={tripFormData.destination}
                    onChange={(text) => setTripFormData({ ...tripFormData, destination: text })}
                    onSelect={(address) => setTripFormData({ ...tripFormData, destination: address.fullText })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">Trip Start Date *</Label>
                    <Input
                      type="date"
                      value={tripFormData.tripStartDate}
                      onChange={(e) => setTripFormData({ ...tripFormData, tripStartDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">Trip Start Time *</Label>
                    <Input
                      type="time"
                      value={tripFormData.tripStartTime}
                      onChange={(e) => setTripFormData({ ...tripFormData, tripStartTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!tripFormData.selectedListingId) {
                    toast.error("Please select a truck/route listing");
                    return;
                  }
                  if (!tripFormData.origin || !tripFormData.destination) {
                    toast.error("Please enter trip origin and destination");
                    return;
                  }
                  if (!tripFormData.tripStartDate || !tripFormData.tripStartTime) {
                    toast.error("Please enter trip start date and time");
                    return;
                  }
                  setCreateTripStep(2);
                }}
                style={{ backgroundColor: "#53ca97", color: "white" }}
                disabled={!tripFormData.selectedListingId}
              >
                Next: Assignment
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Assignment (Driver & Vehicle) */}
        {createTripStep === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium mb-4">
              {userRole === "hauler" ? "Assign Driver & Vehicle" : "Select Your Vehicle"}
            </h3>

            {/* Driver Selection - Enterprise Only */}
            {userRole === "hauler" && (
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Assign Driver (Optional)</Label>
                {driversLoading ? (
                  <p className="text-xs text-gray-500">Loading drivers...</p>
                ) : drivers.length > 0 ? (
                  <div className="space-y-2">
                    {drivers.map((driver) => (
                      <div
                        key={driver.id}
                        onClick={() => setTripFormData({ ...tripFormData, assignedDriver: String(driver.id) })}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          tripFormData.assignedDriver === String(driver.id)
                            ? "border-[#53ca97] bg-green-50"
                            : "border-gray-200 hover:border-[#53ca97]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{driver.full_name || `Driver #${driver.id}`}</p>
                            {driver.phone_number && <p className="text-xs text-gray-500">{driver.phone_number}</p>}
                          </div>
                          <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
                            {driver.status || "Active"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No drivers available</p>
                )}
              </div>
            )}

            {/* Vehicle Selection - Show selected vehicle from listing */}
            <div>
              <Label className="text-sm text-gray-600 mb-2 block">Selected Vehicle</Label>
              {selectedListing?.truck_id ? (
                <div className="p-3 border-2 border-[#53ca97] rounded-lg bg-green-50">
                  <div className="flex items-center gap-3">
                    <Truck className="w-8 h-8 text-[#53ca97]" />
                    <div>
                      <p className="text-sm font-medium">
                        {selectedTruck?.truck_name || selectedTruck?.plate_number || `Truck #${selectedListing.truck_id}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedTruck?.truck_type || "Truck"} • {selectedListing.capacity_headcount ? `${selectedListing.capacity_headcount} head` : ""}
                        {selectedListing.capacity_weight_kg ? ` • ${selectedListing.capacity_weight_kg} kg` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No truck assigned to this listing</p>
              )}
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setCreateTripStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => {
                  if (!selectedListing?.truck_id) {
                    toast.error("Selected listing must have a truck assigned");
                    return;
                  }
                  setCreateTripStep(3);
                }}
                style={{ backgroundColor: "#53ca97", color: "white" }}
              >
                Next: Contract Selection
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Contract Selection */}
        {createTripStep === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium mb-4">Select Contracts</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select contracts linked to this listing. You can select multiple contracts for this trip.
            </p>

            {contractsLoading ? (
              <p className="text-sm text-gray-500">Loading contracts...</p>
            ) : contractsByListing.length === 0 ? (
              <div className="p-6 border-2 border-dashed rounded-lg text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">No confirmed contracts available for this listing</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {contractsByListing.map((contract) => {
                  const isSelected = tripFormData.selectedContractIds.includes(contract.id);
                  return (
                    <div
                      key={contract.id}
                      onClick={() => {
                        setTripFormData((prev) => ({
                          ...prev,
                          selectedContractIds: isSelected
                            ? prev.selectedContractIds.filter((id) => id !== contract.id)
                            : [...prev.selectedContractIds, contract.id],
                        }));
                      }}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected ? "border-[#53ca97] bg-green-50" : "border-gray-200 hover:border-[#53ca97]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Contract #{contract.id}</p>
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs px-2 py-0.5" style={{ backgroundColor: "#53ca97", color: "white" }}>
                            {contract.status}
                          </Badge>
                          {isSelected && <CheckCircle className="w-4 h-4 text-green-600" />}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">Load ID: {contract.load_id}</p>
                      {(() => {
                        const load = loadsData.get(contract.load_id);
                        return load ? (
                          <div className="mt-2 space-y-1">
                            {load.species && <p className="text-xs text-gray-600">Species: {load.species}</p>}
                            {load.quantity && <p className="text-xs text-gray-600">Quantity: {load.quantity}</p>}
                            {load.estimated_weight_lbs && (
                              <p className="text-xs text-gray-600">Weight: {load.estimated_weight_lbs} lbs</p>
                            )}
                          </div>
                        ) : null;
                      })()}
                      {contract.price_amount && (
                        <p className="text-sm font-semibold mt-1" style={{ color: "#53ca97" }}>
                          ${Number(contract.price_amount).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {capacityWarning && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-900">{capacityWarning}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setCreateTripStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => {
                  if (tripFormData.selectedContractIds.length === 0) {
                    toast.error("Please select at least one contract");
                    return;
                  }
                  setCreateTripStep(4);
                }}
                style={{ backgroundColor: "#53ca97", color: "white" }}
              >
                Next: Route Preferences
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Route Preferences */}
        {createTripStep === 4 && (
          <div className="space-y-4">
            <h3 className="font-medium mb-4">Route Preferences</h3>

            {/* Trip Origin & Destination Info */}
            {tripFormData.origin && tripFormData.destination && (
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <Navigation className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Trip Route Overview</p>
                    <div className="space-y-1.5">
                      <p className="text-xs text-blue-800">
                        <span className="font-medium">🚛 Start:</span> <strong>{tripFormData.origin}</strong>
                        <span className="text-blue-600 ml-2">(Truck begins journey here)</span>
                      </p>
                      <p className="text-xs text-blue-800">
                        <span className="font-medium">🏁 End:</span> <strong>{tripFormData.destination}</strong>
                        <span className="text-blue-600 ml-2">(Truck completes journey here)</span>
                      </p>
                    </div>
                    <p className="text-xs text-blue-700 mt-2 pt-2 border-t border-blue-200">
                      All route combinations below will start from your origin and end at your destination, with load pickups and dropoffs arranged in between.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm text-gray-600 mb-2 block">Route Mode</Label>
              <div className="grid grid-cols-3 gap-3">
                {(["fastest", "shortest", "avoid-tolls"] as const).map((mode) => (
                  <div
                    key={mode}
                    onClick={() => setTripFormData({ ...tripFormData, routeMode: mode })}
                    className={`p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${
                      tripFormData.routeMode === mode ? "border-[#53ca97] bg-green-50" : "border-gray-200 hover:border-[#53ca97]"
                    }`}
                  >
                    <p className="text-sm font-medium capitalize">{mode.replace("-", " ")}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-add Rest Stops</p>
                  <p className="text-xs text-gray-500">Mandatory welfare stops based on duration</p>
                </div>
                <input
                  type="checkbox"
                  checked={tripFormData.autoRestStops}
                  onChange={(e) => setTripFormData({ ...tripFormData, autoRestStops: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium text-green-600">✓ OAASIS Optimization Active</p>
                <p className="text-xs text-gray-500">Advanced route optimization using OAASIS API (enabled by default)</p>
              </div>
            </div>

            {/* Route Combinations */}
            {combinationsCalculating ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">Calculating route combinations...</p>
              </div>
            ) : routeCombinations.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-sm text-gray-600 mb-2 block">Select Route Combination</Label>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {routeCombinations.map((combo) => {
                    const isSelected = selectedRouteId === combo.id;
                    
                    // Build waypoint display with proper formatting
                    const waypointDisplay: Array<{ label: string; type: 'origin' | 'destination' | 'pickup' | 'dropoff' | 'unknown'; icon: string }> = combo.sequence.map((id, index) => {
                      const wp = combo.waypoints.find(w => w.id === id);
                      if (!wp) {
                        return { label: id, type: 'unknown' as const, icon: '📍' };
                      }
                      
                      if (wp.type === 'origin') {
                        return {
                          label: tripFormData.origin || wp.location.text,
                          type: 'origin' as const,
                          icon: '🚛',
                        };
                      }
                      if (wp.type === 'destination') {
                        return {
                          label: tripFormData.destination || wp.location.text,
                          type: 'destination' as const,
                          icon: '🏁',
                        };
                      }
                      if (wp.type === 'pickup') {
                        const load = loadsData.get(wp.loadId || '');
                        const location = load?.pickup_location || load?.pickup_location_text || wp.location.text;
                        return {
                          label: location,
                          type: 'pickup' as const,
                          icon: '📦',
                        };
                      }
                      if (wp.type === 'dropoff') {
                        const load = loadsData.get(wp.loadId || '');
                        const location = load?.dropoff_location || load?.dropoff_location_text || wp.location.text;
                        return {
                          label: location,
                          type: 'dropoff' as const,
                          icon: '✅',
                        };
                      }
                      return { label: id, type: 'unknown' as const, icon: '📍' };
                    });

                    return (
                      <div
                        key={combo.id}
                        onClick={() => {
                          setSelectedRouteId(combo.id);
                          setTripFormData(prev => ({ ...prev, selectedRouteId: combo.id }));
                        }}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected ? "border-[#53ca97] bg-green-50" : "border-gray-200 hover:border-[#53ca97]"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-2">Route {combo.id.replace('route_', '')}</p>
                            
                            {/* Enhanced waypoint display */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              {waypointDisplay.map((wp, idx) => (
                                <React.Fragment key={idx}>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                                    wp.type === 'origin' ? 'bg-blue-100 text-blue-800 font-semibold' :
                                    wp.type === 'destination' ? 'bg-green-100 text-green-800 font-semibold' :
                                    wp.type === 'pickup' ? 'bg-yellow-50 text-gray-700' :
                                    wp.type === 'dropoff' ? 'bg-purple-50 text-gray-700' :
                                    'bg-gray-50 text-gray-600'
                                  }`}>
                                    <span>{wp.icon}</span>
                                    <span className="max-w-[200px] truncate">
                                      {wp.type === 'origin' ? 'Start' :
                                       wp.type === 'destination' ? 'End' :
                                       wp.type === 'pickup' ? 'Pickup' :
                                       wp.type === 'dropoff' ? 'Dropoff' : ''}
                                      {wp.type !== 'origin' && wp.type !== 'destination' && ': '}
                                      {wp.label.length > 30 ? wp.label.substring(0, 30) + '...' : wp.label}
                                    </span>
                                  </span>
                                  {idx < waypointDisplay.length - 1 && (
                                    <span className="text-gray-400">→</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />}
                        </div>
                        {combo.error ? (
                          <p className="text-xs text-red-600">{combo.error}</p>
                        ) : combo.distance_km ? (
                          <div className="grid grid-cols-3 gap-3 mt-2">
                            <div className="p-2 bg-white rounded">
                              <p className="text-xs text-gray-600">Distance</p>
                              <p className="text-sm font-medium">{Math.round(combo.distance_km)} km</p>
                            </div>
                            <div className="p-2 bg-white rounded">
                              <p className="text-xs text-gray-600">Duration</p>
                              <p className="text-sm font-medium">
                                {combo.duration_min ? `${Math.round(combo.duration_min / 60)}h ${Math.round(combo.duration_min % 60)}m` : 'N/A'}
                              </p>
                            </div>
                            <div className="p-2 bg-white rounded">
                              <p className="text-xs text-gray-600">Est. Cost</p>
                              <p className="text-sm font-medium">${combo.estimated_cost || 'N/A'}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">Calculating metrics...</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : tripFormData.selectedContractIds.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900">Please select at least one contract to see route combinations.</p>
              </div>
            ) : null}

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setCreateTripStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => {
                  if (!selectedRouteId && routeCombinations.length > 0) {
                    toast.error("Please select a route combination");
                    return;
                  }
                  setCreateTripStep(5);
                }} 
                style={{ backgroundColor: "#53ca97", color: "white" }}
                disabled={routeCombinations.length === 0 && !combinationsCalculating}
              >
                Next: Review & Create
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Create */}
        {createTripStep === 5 && (
          <div className="space-y-4">
            <h3 className="font-medium mb-4">Review & Create Trip</h3>

            <Card className="p-4 bg-gray-50">
              <h4 className="text-sm font-medium mb-3">Trip Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-600">Trip Title</p>
                  <p className="font-medium">{tripFormData.tripTitle || "Untitled Trip"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Route</p>
                  <p className="font-medium">
                    {tripFormData.origin} → {tripFormData.destination}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Trip Start</p>
                  <p className="font-medium">
                    {tripFormData.tripStartDate} {tripFormData.tripStartTime}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Origin</p>
                  <p className="font-medium">{tripFormData.origin}</p>
                </div>
                <div>
                  <p className="text-gray-600">Destination</p>
                  <p className="font-medium">{tripFormData.destination}</p>
                </div>
                {tripFormData.assignedDriver && (
                  <div>
                    <p className="text-gray-600">Driver</p>
                    <p className="font-medium">
                      {drivers.find((d) => String(d.id) === tripFormData.assignedDriver)?.full_name || "N/A"}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Contracts Selected</p>
                  <p className="font-medium">{tripFormData.selectedContractIds.length}</p>
                </div>
              </div>
            </Card>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setCreateTripStep(4)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                style={{ backgroundColor: "#53ca97", color: "white" }}
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Trip"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
