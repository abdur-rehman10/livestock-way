import React, { useState, useEffect } from "react";
import { fetchLoads, assignLoad } from "../lib/api";
import type { Load as ApiLoad } from "../lib/api";
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { LoadCardSkeleton, TableSkeleton } from './LoadingSkeleton';
import { 
  Search, 
  Filter, 
  MapPin, 
  DollarSign, 
  Truck,
  Calendar,
  TrendingUp,
  Star,
  Map as MapIcon,
  List,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { filterLoads, searchFilter } from '../lib/filter-utils';
import { storage, STORAGE_KEYS, saveFilterPreset, getFilterPresets, deleteFilterPreset } from '../lib/storage';
import { showUndoToast } from '../components/UndoToast';
import { undoManager } from '../lib/undo-manager';

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
  price: string;
  status: 'open' | 'assigned' | 'in-transit';
  bids?: number;
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
  const [bidAmount, setBidAmount] = useState('');
  const [loads, setLoads] = useState<ApiLoad[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveFilterName, setSaveFilterName] = useState('');
  const [isAssigning, setIsAssigning] = useState<number | null>(null);
  const CURRENT_HAULER_ID = "demo_hauler_1";
  
  // Filters with persistence
  const [filters, setFilters] = useState(() => {
    const saved = storage.get(STORAGE_KEYS.FILTERS, null);
    return saved || {
      species: '',
      origin: '',
      destination: '',
      dateFrom: '',
      dateTo: '',
      priceMin: 0,
      priceMax: 2000,
      distance: 0,
      status: 'open',
    };
  });

  // Persist filters
  useEffect(() => {
    storage.set(STORAGE_KEYS.FILTERS, filters);
  }, [filters]);

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

  const handleAcceptLoad = async (loadId: number) => {
    try {
      setIsAssigning(loadId);
      await assignLoad(loadId, CURRENT_HAULER_ID);
      toast.success(`Load #${loadId} accepted`);
      setLoads((prev) => prev.filter((load) => load.id !== loadId));
    } catch (err: any) {
      console.error("Failed to assign load:", err);
      toast.error("Failed to accept load. Please try again.");
    } finally {
      setIsAssigning(null);
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

    return () => {
      isMounted = false;
    };
  }, []);

  const transformedLoads: Load[] = loads.map((load) => {
    const normalizedStatus: Load['status'] =
      load.status === 'assigned'
        ? 'assigned'
        : load.status === 'in-transit'
          ? 'in-transit'
          : 'open';

    return {
      id: `L${load.id}`,
      rawId: load.id,
      species: load.species,
      quantity: `${load.quantity} head`,
      origin: load.pickup_location,
      destination: load.dropoff_location,
      distance: "0 miles",
      postedBy: load.created_by ?? "Unknown shipper",
      postedDate: new Date(load.created_at).toLocaleDateString(),
      pickupDate: new Date(load.pickup_date).toLocaleString(),
      price: load.offer_price
        ? `$${Number(load.offer_price).toFixed(0)}`
        : "$0",
      status: normalizedStatus,
      bids: undefined,
    };
  });

  // Apply real filtering
  const filteredLoads = filterLoads(transformedLoads, {
    species: filters.species || undefined,
    origin: filters.origin || undefined,
    destination: filters.destination || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    distance: filters.distance,
    status: filters.status || undefined,
    searchQuery: searchQuery || undefined,
  });

  const handleClearFilters = () => {
    const previousFilters = { ...filters };
    const newFilters = {
      species: '',
      origin: '',
      destination: '',
      dateFrom: '',
      dateTo: '',
      priceMin: 0,
      priceMax: 2000,
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
    <div className="p-6 space-y-6">
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
            <div className="text-2xl text-[#172039] mb-1">{filteredLoads.length}</div>
            <div className="text-sm text-gray-600">Available Loads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-[#29CA8D] mb-1">
              ${filteredLoads.reduce((sum, l) => sum + parseInt(l.price.replace('$', '')), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-[#F97316] mb-1">
              {filteredLoads.reduce((sum, l) => sum + (l.bids || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Active Bids</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl text-blue-600 mb-1">
              {Math.round(filteredLoads.reduce((sum, l) => sum + parseInt(l.distance.replace(' miles', '')), 0) / filteredLoads.length)}
            </div>
            <div className="text-sm text-gray-600">Avg Distance (mi)</div>
          </CardContent>
        </Card>
      </div>

      {/* View Modes */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          {isLoading && (
            <div className="p-4 text-gray-500">Loading loads...</div>
          )}
          {error && (
            <div className="p-4 text-red-500 text-sm">{error}</div>
          )}
          {!isLoading && !error && filteredLoads.length === 0 && (
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
              </CardContent>
            </Card>
          )}
          {!isLoading && !error && filteredLoads.length > 0 && (
            <>
              {filteredLoads.map((load) => (
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
                      </div>
                      <div className="text-right">
                        {load.price && (
                          <div className="text-xl text-[#29CA8D] mb-2">
                            {load.price}
                          </div>
                        )}
                        <Button
                          className="bg-[#29CA8D] hover:bg-[#24b67d]"
                          size="sm"
                          disabled={isAssigning === load.rawId}
                          onClick={() => handleAcceptLoad(load.rawId)}
                        >
                          {isAssigning === load.rawId ? "Accepting..." : "Accept Load"}
                        </Button>
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

      {/* Filters Dialog */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filter Loads</DialogTitle>
            <DialogDescription>Refine your search criteria</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Species</Label>
                <Select value={filters.species} onValueChange={(v) => setFilters({...filters, species: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All species" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Species</SelectItem>
                    <SelectItem value="Cattle">Cattle</SelectItem>
                    <SelectItem value="Sheep">Sheep</SelectItem>
                    <SelectItem value="Pigs">Pigs</SelectItem>
                    <SelectItem value="Goats">Goats</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in-transit">In Transit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Input placeholder="City, State" value={filters.origin} onChange={(e) => setFilters({...filters, origin: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Destination</Label>
                <Input placeholder="City, State" value={filters.destination} onChange={(e) => setFilters({...filters, destination: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Price: ${filters.priceMin}</Label>
                <Slider value={[filters.priceMin]} onValueChange={(v) => setFilters({...filters, priceMin: v[0]})} max={2000} step={50} />
              </div>
              <div className="space-y-2">
                <Label>Max Price: ${filters.priceMax}</Label>
                <Slider value={[filters.priceMax]} onValueChange={(v) => setFilters({...filters, priceMax: v[0]})} max={2000} step={50} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Distance: {filters.distance} miles {filters.distance === 0 ? '(Any)' : ''}</Label>
              <Slider value={[filters.distance]} onValueChange={(v) => setFilters({...filters, distance: v[0]})} max={500} step={10} />
            </div>

            {/* Save Filter Preset */}
            <div className="border-t pt-4 space-y-3">
              <Label>Save Filter Preset</Label>
              <div className="flex gap-2">
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
                  <Label className="text-xs text-gray-600">Load Preset</Label>
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
                          className="w-3 h-3 ml-1"
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

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClearFilters} className="flex-1">
                Clear All
              </Button>
              <Button onClick={() => setIsFilterOpen(false)} className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]">
                Apply Filters
              </Button>
            </div>
          </div>
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
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Suggested Price</div>
              <div className="text-2xl text-gray-900">{selectedLoad?.price}</div>
            </div>

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
              AI-powered recommendations based on distance, rating, and price
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
                      <div className="text-lg text-[#29CA8D] mb-2">{carrier.pricePerMile}/mi</div>
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
    </div>
  );
}
