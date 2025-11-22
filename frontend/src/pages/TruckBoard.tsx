import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTruckAvailability,
  createTruckAvailabilityEntry,
  requestBookingForTruckListing,
  startTruckChat,
  type TruckAvailability,
} from "../api/marketplace";
import { fetchLoadsForShipper, type LoadSummary } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

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
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    available_from: new Date().toISOString().slice(0, 16),
    capacity_headcount: "",
    capacity_weight_kg: "",
    origin_lat: "",
    origin_lng: "",
    destination_lat: "",
    destination_lng: "",
    allow_shared: true,
    notes: "",
  });
  const [interestForm, setInterestForm] = useState<
    Record<string, { loadId: string; message: string }>
  >({});
  const [posting, setPosting] = useState(false);
  const userRole = storage.get<string | null>(STORAGE_KEYS.USER_ROLE, null);
  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const [shipperLoads, setShipperLoads] = useState<LoadSummary[]>([]);
  const [shipperLoadsLoading, setShipperLoadsLoading] = useState(false);

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

  const selectableLoads = useMemo(() => {
    if (userRole !== "shipper") return [];
    return shipperLoads.filter((load) => load.status === "open");
  }, [shipperLoads, userRole]);

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

  const parseOptionalPositiveNumber = (value: string, label: string): number | null => {
    if (!value || value.trim() === "") return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) {
      throw new Error(`${label} must be a positive number.`);
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

  const handlePostTruck = async () => {
    if (!form.origin.trim()) {
      toast.error("Origin is required");
      return;
    }
    let originLat: number | null = null;
    let originLng: number | null = null;
    let destinationLat: number | null = null;
    let destinationLng: number | null = null;
    let capacityHeadcount: number | null = null;
    let capacityWeight: number | null = null;
    try {
      originLat = parseOptionalCoordinate(form.origin_lat, "Origin latitude", -90, 90);
      originLng = parseOptionalCoordinate(form.origin_lng, "Origin longitude", -180, 180);
      destinationLat = parseOptionalCoordinate(form.destination_lat, "Destination latitude", -90, 90);
      destinationLng = parseOptionalCoordinate(form.destination_lng, "Destination longitude", -180, 180);
      capacityHeadcount = parseOptionalPositiveNumber(form.capacity_headcount, "Capacity headcount");
      capacityWeight = parseOptionalPositiveNumber(form.capacity_weight_kg, "Capacity weight");
    } catch (err: any) {
      toast.error(err?.message ?? "Invalid truck details");
      return;
    }
    if ((originLat !== null && originLng === null) || (originLat === null && originLng !== null)) {
      toast.error("Provide both origin latitude and longitude.");
      return;
    }
    if (
      (destinationLat !== null && destinationLng === null) ||
      (destinationLat === null && destinationLng !== null)
    ) {
      toast.error("Provide both destination latitude and longitude.");
      return;
    }
    try {
      setPosting(true);
      await createTruckAvailabilityEntry({
        origin_location_text: form.origin,
        destination_location_text: form.destination || null,
        available_from: new Date(form.available_from).toISOString(),
        capacity_headcount: capacityHeadcount,
        capacity_weight_kg: capacityWeight,
        notes: form.notes || null,
        allow_shared: form.allow_shared,
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
      });
      toast.success("Truck availability posted.");
      setForm({
        origin: "",
        destination: "",
        available_from: new Date().toISOString().slice(0, 16),
        capacity_headcount: "",
        capacity_weight_kg: "",
        origin_lat: "",
        origin_lng: "",
        destination_lat: "",
        destination_lng: "",
        allow_shared: true,
        notes: "",
      });
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to post truck");
    } finally {
      setPosting(false);
    }
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
    const interest = interestForm[availabilityId] ?? { loadId: "", message: "" };
    if (!interest.loadId.trim() && !interest.message.trim()) {
      toast.error("Enter a load ID or message to start the conversation.");
      return;
    }
    try {
      await startTruckChat(availabilityId, {
        load_id: interest.loadId || undefined,
        message: interest.message || undefined,
      });
      toast.success("Chat started with hauler.");
      updateInterest(availabilityId, "message", "");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to start chat");
    }
  };

  const handleRequestBooking = async (availabilityId: string) => {
    const interest = interestForm[availabilityId] ?? { loadId: "", message: "" };
    if (!interest.loadId.trim()) {
      toast.error("Select which load you want to book onto this truck.");
      return;
    }
    try {
      await requestBookingForTruckListing(availabilityId, {
        load_id: interest.loadId,
        requested_headcount: undefined,
      });
      toast.success("Booking requested.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to request booking");
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
                const listingInterest = interestForm[listing.id] ?? { loadId: "", message: "" };
                const selectedLoad = listingInterest.loadId
                  ? selectableLoads.find((load) => String(load.id) === listingInterest.loadId)
                  : undefined;
                const selectedLoadBudget =
                  selectedLoad?.offer_price != null
                    ? (() => {
                        const numericBudget = Number(selectedLoad.offer_price);
                        return Number.isNaN(numericBudget)
                          ? selectedLoad.offer_price
                          : numericBudget.toLocaleString();
                      })()
                    : null;
                const capacitySummary = [
                  typeof listing.capacity_headcount === "number" && listing.capacity_headcount > 0
                    ? `${listing.capacity_headcount} head`
                    : null,
                  typeof listing.capacity_weight_kg === "number" && listing.capacity_weight_kg > 0
                    ? `${listing.capacity_weight_kg} kg`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" • ") || "Not specified";
                const requestDisabled =
                  !listingInterest.loadId || shipperLoadsLoading || selectableLoads.length === 0;
                return (
                  <div
                    key={listing.id}
                    className="border rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {listing.origin_location_text}
                        {listing.destination_location_text
                          ? ` → ${listing.destination_location_text}`
                          : ""}
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
                    {userRole === "shipper" && (
                      <div className="flex flex-col gap-3 w-full md:max-w-sm md:pl-4 md:border-l md:border-dashed md:border-gray-200">
                        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-[11px] text-gray-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-900">Truck snapshot</span>
                            <Badge
                              variant={listing.allow_shared ? "outline" : "default"}
                              className="text-[10px] uppercase tracking-wide"
                            >
                              {listing.allow_shared ? "Shared" : "Exclusive"}
                            </Badge>
                          </div>
                          <div>
                            Route:{" "}
                            {listing.destination_location_text
                              ? `${listing.origin_location_text} → ${listing.destination_location_text}`
                              : listing.origin_location_text}
                          </div>
                          <div>Capacity: {capacitySummary}</div>
                          <div>
                            Available from {new Date(listing.available_from).toLocaleDateString()}
                          </div>
                          {listing.notes && <div>Notes: {listing.notes}</div>}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-gray-500">
                            Attach one of your loads
                          </Label>
                          {shipperLoadsLoading ? (
                            <p className="text-xs text-gray-500">Loading your loads…</p>
                          ) : selectableLoads.length === 0 ? (
                            <p className="text-xs text-gray-500">
                              You do not have any open loads yet. Post a load first from the Loadboard.
                            </p>
                          ) : (
                            <Select
                              value={listingInterest.loadId || undefined}
                              onValueChange={(value) => updateInterest(listing.id, "loadId", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select load" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectableLoads.map((load) => (
                                  <SelectItem key={load.id} value={String(load.id)}>
                                    {load.title || `Load #${load.id}`} · {load.pickup_location} →{" "}
                                    {load.dropoff_location}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {selectedLoad && (
                          <div className="rounded-md border px-3 py-2 text-[11px] text-gray-600 space-y-0.5">
                            <div className="text-xs font-semibold text-gray-900">Selected load</div>
                            <div>
                              {selectedLoad.pickup_location} → {selectedLoad.dropoff_location}
                            </div>
                            <div>
                              {selectedLoad.quantity} {selectedLoad.species}
                            </div>
                            {selectedLoadBudget && <div>Budget: ${selectedLoadBudget}</div>}
                          </div>
                        )}

                        <Textarea
                          placeholder="Message to hauler (optional)"
                          value={listingInterest.message ?? ""}
                          onChange={(e) => updateInterest(listing.id, "message", e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleStartChat(listing.id)}
                          >
                            Start Chat
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={requestDisabled}
                            onClick={() => handleRequestBooking(listing.id)}
                          >
                            Request Booking
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {userRole === "hauler" && (
        <Card>
          <CardHeader>
            <CardTitle>Post Available Truck</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Origin</Label>
              <Input
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
                placeholder="City, State"
              />
            </div>
            <div>
              <Label className="text-xs">Destination (optional)</Label>
              <Input
                value={form.destination}
                onChange={(e) =>
                  setForm({ ...form, destination: e.target.value })
                }
                placeholder="City, State"
              />
            </div>
            <div>
              <Label className="text-xs">Available From</Label>
              <Input
                type="datetime-local"
                value={form.available_from}
                onChange={(e) =>
                  setForm({ ...form, available_from: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Capacity (headcount)</Label>
              <Input
                type="number"
                value={form.capacity_headcount}
                onChange={(e) =>
                  setForm({ ...form, capacity_headcount: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Capacity (weight in kg)</Label>
              <Input
                type="number"
                value={form.capacity_weight_kg}
                onChange={(e) =>
                  setForm({ ...form, capacity_weight_kg: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label className="text-xs">Origin latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.origin_lat}
                  onChange={(e) => setForm({ ...form, origin_lat: e.target.value })}
                  placeholder="e.g. 34.0522"
                />
              </div>
              <div>
                <Label className="text-xs">Origin longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.origin_lng}
                  onChange={(e) => setForm({ ...form, origin_lng: e.target.value })}
                  placeholder="-118.2437"
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label className="text-xs">Destination latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.destination_lat}
                  onChange={(e) =>
                    setForm({ ...form, destination_lat: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label className="text-xs">Destination longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.destination_lng}
                  onChange={(e) =>
                    setForm({ ...form, destination_lng: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <Label className="text-xs">Allow shared loads</Label>
                <p className="text-[11px] text-gray-500">
                  Disable this if the truck is exclusive to one booking.
                </p>
              </div>
              <Switch
                checked={form.allow_shared}
                onCheckedChange={(checked) => setForm({ ...form, allow_shared: checked })}
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Equipment, special info, etc."
                rows={3}
              />
            </div>
            <Button onClick={handlePostTruck} disabled={posting}>
              {posting ? "Posting…" : "Post Availability"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
