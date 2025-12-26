import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTruckAvailability,
  createTruckAvailabilityEntry,
  updateTruckAvailabilityEntry,
  deleteTruckAvailabilityEntry,
  requestBookingForTruckListing,
  startTruckChat,
  fetchHaulerVehicles,
  type TruckAvailability,
  type HaulerVehicleOption,
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { PostTruckDialog } from "./PostTruckDialog";

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
  const [form, setForm] = useState(() => ({
    truck_id: "",
    origin: "",
    destination: "",
    available_from: new Date().toISOString().slice(0, 16),
    available_until: "",
    capacity_headcount: "",
    capacity_weight_kg: "",
    origin_lat: "",
    origin_lng: "",
    destination_lat: "",
    destination_lng: "",
    allow_shared: true,
    notes: "",
  }));
  const [interestForm, setInterestForm] = useState<
    Record<string, { loadId: string; message: string }>
  >({});
  const [posting, setPosting] = useState(false);
  const [myListings, setMyListings] = useState<TruckAvailability[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    listing: TruckAvailability | null;
    saving: boolean;
  }>({ open: false, listing: null, saving: false });
  const [editForm, setEditForm] = useState({
    truck_id: "",
    origin: "",
    destination: "",
    available_from: "",
    available_until: "",
    capacity_headcount: "",
    capacity_weight_kg: "",
    origin_lat: "",
    origin_lng: "",
    destination_lat: "",
    destination_lng: "",
    allow_shared: true,
    notes: "",
    is_active: true,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [haulerTrucks, setHaulerTrucks] = useState<HaulerVehicleOption[]>([]);
  const [haulerTrucksLoading, setHaulerTrucksLoading] = useState(false);
  const [haulerTruckError, setHaulerTruckError] = useState<string | null>(null);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
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
  }>({ open: false, listing: null, load: null, submitting: false, error: null });
  const [requestedPairs, setRequestedPairs] = useState<Set<string>>(new Set());

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

  const refreshMyListings = useCallback(async () => {
    if (userRole !== "hauler") return;
    try {
      setMyListingsLoading(true);
      const resp = await fetchTruckAvailability({ scope: "mine" });
      setMyListings(resp.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load your truck listings.");
    } finally {
      setMyListingsLoading(false);
    }
  }, [userRole]);

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
    if (userRole === "hauler") {
      refreshMyListings();
    } else {
      setMyListings([]);
    }
  }, [userRole, refreshMyListings]);

  useEffect(() => {
    if (userRole !== "hauler") {
      setHaulerTrucks([]);
      setHaulerTruckError(null);
      setHaulerTrucksLoading(false);
      return;
    }
    let active = true;
    setHaulerTrucksLoading(true);
    setHaulerTruckError(null);
    fetchHaulerVehicles()
      .then((resp) => {
        if (!active) return;
        const items = resp.items ?? [];
        setHaulerTrucks(items);
        if (items.length === 0) {
          setHaulerTruckError("Add at least one truck in Fleet before posting availability.");
        }
        setForm((prev) => {
          if (prev.truck_id || items.length === 0) {
            return prev;
          }
          const nextId = items[0]?.id ? String(items[0].id) : "";
          return { ...prev, truck_id: nextId };
        });
      })
      .catch((err: any) => {
        if (!active) return;
        setHaulerTruckError(extractErrorMessage(err) || "Failed to load trucks.");
      })
      .finally(() => {
        if (active) {
          setHaulerTrucksLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [userRole]);

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

  const toLocalInputValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

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
    if (!form.truck_id) {
      toast.error("Select one of your trucks before posting.");
      return;
    }
    if (!form.origin.trim()) {
      toast.error("Origin is required");
      return;
    }
    const availableFromDate = new Date(form.available_from);
    if (Number.isNaN(availableFromDate.getTime())) {
      toast.error("Available from must be a valid date.");
      return;
    }
    let availableUntilIso: string | null = null;
    if (form.available_until) {
      const availableUntilDate = new Date(form.available_until);
      if (Number.isNaN(availableUntilDate.getTime())) {
        toast.error("Available until must be a valid date.");
        return;
      }
      if (availableUntilDate.getTime() < availableFromDate.getTime()) {
        toast.error("Available until must be after the start date.");
        return;
      }
      availableUntilIso = availableUntilDate.toISOString();
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
        truck_id: form.truck_id,
        origin_location_text: form.origin,
        destination_location_text: form.destination || null,
        available_from: availableFromDate.toISOString(),
        available_until: availableUntilIso,
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
      setForm((prev) => ({
        ...prev,
        origin: "",
        destination: "",
        available_from: new Date().toISOString().slice(0, 16),
        available_until: "",
        capacity_headcount: "",
        capacity_weight_kg: "",
        origin_lat: "",
        origin_lng: "",
        destination_lat: "",
        destination_lng: "",
        allow_shared: true,
        notes: "",
      }));
      refresh();
      refreshMyListings();
    } catch (err: any) {
      toast.error(formatTruckBoardError(err, "Failed to post availability."));
    } finally {
      setPosting(false);
    }
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, listing: null, saving: false });
    setEditError(null);
  };

  const openEditDialog = (listing: TruckAvailability) => {
    setEditDialog({ open: true, listing, saving: false });
    setEditError(null);
    setEditForm({
      truck_id: listing.truck_id ?? "",
      origin: listing.origin_location_text ?? "",
      destination: listing.destination_location_text ?? "",
      available_from: toLocalInputValue(listing.available_from),
      available_until: toLocalInputValue(listing.available_until ?? null),
      capacity_headcount:
        typeof listing.capacity_headcount === "number" ? String(listing.capacity_headcount) : "",
      capacity_weight_kg:
        typeof listing.capacity_weight_kg === "number" ? String(listing.capacity_weight_kg) : "",
      origin_lat: listing.origin_lat != null ? String(listing.origin_lat) : "",
      origin_lng: listing.origin_lng != null ? String(listing.origin_lng) : "",
      destination_lat: listing.destination_lat != null ? String(listing.destination_lat) : "",
      destination_lng: listing.destination_lng != null ? String(listing.destination_lng) : "",
      allow_shared: listing.allow_shared,
      notes: listing.notes ?? "",
      is_active: listing.is_active !== false,
    });
  };

  const handleSaveListing = async () => {
    if (!editDialog.listing) return;
    if (!editForm.truck_id) {
      setEditError("Select which truck this listing belongs to.");
      return;
    }
    if (!editForm.origin.trim()) {
      setEditError("Origin is required.");
      return;
    }
    if (!editForm.available_from) {
      setEditError("Start date/time is required.");
      return;
    }
    const availableFromDate = new Date(editForm.available_from);
    if (Number.isNaN(availableFromDate.getTime())) {
      setEditError("Start date/time is invalid.");
      return;
    }
    let availableUntilIso: string | null = null;
    if (editForm.available_until) {
      const until = new Date(editForm.available_until);
      if (Number.isNaN(until.getTime())) {
        setEditError("End date/time is invalid.");
        return;
      }
      if (until.getTime() < availableFromDate.getTime()) {
        setEditError("End date/time must be after the start date.");
        return;
      }
      availableUntilIso = until.toISOString();
    }
    let originLat: number | null = null;
    let originLng: number | null = null;
    let destinationLat: number | null = null;
    let destinationLng: number | null = null;
    let capacityHeadcount: number | null = null;
    let capacityWeight: number | null = null;
    try {
      originLat = parseOptionalCoordinate(editForm.origin_lat, "Origin latitude", -90, 90);
      originLng = parseOptionalCoordinate(editForm.origin_lng, "Origin longitude", -180, 180);
      destinationLat = parseOptionalCoordinate(editForm.destination_lat, "Destination latitude", -90, 90);
      destinationLng = parseOptionalCoordinate(editForm.destination_lng, "Destination longitude", -180, 180);
      capacityHeadcount = parseOptionalPositiveNumber(editForm.capacity_headcount, "Capacity headcount");
      capacityWeight = parseOptionalPositiveNumber(editForm.capacity_weight_kg, "Capacity weight");
    } catch (err: any) {
      setEditError(err?.message ?? "Invalid form values.");
      return;
    }
    if ((originLat !== null && originLng === null) || (originLat === null && originLng !== null)) {
      setEditError("Provide both origin latitude and longitude.");
      return;
    }
    if (
      (destinationLat !== null && destinationLng === null) ||
      (destinationLat === null && destinationLng !== null)
    ) {
      setEditError("Provide both destination latitude and longitude.");
      return;
    }
    try {
      setEditDialog((prev) => ({ ...prev, saving: true }));
      setEditError(null);
      await updateTruckAvailabilityEntry(editDialog.listing.id, {
        truck_id: editForm.truck_id,
        origin_location_text: editForm.origin,
        destination_location_text: editForm.destination || null,
        available_from: availableFromDate.toISOString(),
        available_until: availableUntilIso,
        capacity_headcount: capacityHeadcount,
        capacity_weight_kg: capacityWeight,
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        allow_shared: editForm.allow_shared,
        notes: editForm.notes || null,
        is_active: editForm.is_active,
      });
      toast.success("Listing updated.");
      closeEditDialog();
      refresh();
      refreshMyListings();
    } catch (err: any) {
      setEditError(formatTruckBoardError(err, "Failed to update listing."));
    } finally {
      setEditDialog((prev) => ({ ...prev, saving: false }));
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
    const listing = listings.find((item) => item.id === availabilityId) || null;
    if (listing?.is_external) {
      toast.info("Chat is disabled for external listings.");
      return;
    }
    const interest = interestForm[availabilityId] ?? { loadId: "", message: "" };
    if (!interest.loadId.trim() && !interest.message.trim()) {
      toast.error("Select a load or enter a message to start the conversation.");
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
      toast.error(formatTruckBoardError(err, "Failed to start chat."));
    }
  };

  const handleRequestBooking = async (availabilityId: string) => {
    const interest = interestForm[availabilityId] ?? { loadId: "", message: "" };
    if (!interest.loadId.trim()) {
      toast.error("Select which load you want to book onto this truck.");
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
      });
      const nextSet = new Set(requestedPairs);
      nextSet.add(key);
      setRequestedPairs(nextSet);
      toast.success("Booking requested.");
      setRequestDialog({ open: false, listing: null, load: null, submitting: false, error: null });
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
                const key = listingInterest.loadId ? `${listing.id}-${listingInterest.loadId}` : "";
                const requestDisabled =
                  listing.is_external ||
                  !listingInterest.loadId ||
                  shipperLoadsLoading ||
                  selectableLoads.length === 0 ||
                  (!!key && requestedPairs.has(key));
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
                            disabled={listing.is_external}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Truck Listings</CardTitle>
              <p className="text-sm text-gray-500">Manage active and paused postings</p>
            </div>
            <Button onClick={() => setPostDialogOpen(true)}>Post a Truck</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {myListingsLoading ? (
              <p className="text-sm text-gray-500">Loading your listings…</p>
            ) : myListings.length === 0 ? (
              <div className="text-sm text-gray-500">No listings yet. Use "Post a Truck" to share availability.</div>
            ) : (
              <div className="space-y-3">
                {myListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="border rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {listing.origin_location_text}
                        {listing.destination_location_text ? ` → ${listing.destination_location_text}` : ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        Window: {new Date(listing.available_from).toLocaleString()} {listing.available_until ? `- ${new Date(listing.available_until).toLocaleString()}` : ""}
                      </div>
                      <div className="text-xs text-gray-600">
                        Capacity:{" "}
                        {[
                          typeof listing.capacity_headcount === "number" && listing.capacity_headcount > 0
                            ? `${listing.capacity_headcount} head`
                            : null,
                          typeof listing.capacity_weight_kg === "number" && listing.capacity_weight_kg > 0
                            ? `${listing.capacity_weight_kg} kg`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "Not specified"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={listing.is_active === false ? "outline" : "default"}>
                        {listing.is_active === false ? "Paused" : "Active"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(listing)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await deleteTruckAvailabilityEntry(listing.id);
                            toast.success("Listing removed");
                            refreshMyListings();
                            refresh();
                          } catch (err: any) {
                            toast.error(err?.message ?? "Unable to delete listing. It may have an accepted booking.");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Truck Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editError && <p className="text-sm text-rose-600">{editError}</p>}
            <div>
              <Label className="text-xs">Truck</Label>
              {haulerTrucks.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Add trucks to your fleet to edit this listing.
                </p>
              ) : (
                <Select
                  value={editForm.truck_id || undefined}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, truck_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select truck" />
                  </SelectTrigger>
                  <SelectContent>
                    {haulerTrucks.map((truck) => (
                      <SelectItem key={truck.id} value={String(truck.id)}>
                        {(truck.truck_name || truck.plate_number || `Truck #${truck.id}`) ?? `Truck #${truck.id}`} ·{" "}
                        {truck.truck_type || "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Origin</Label>
                <Input
                  value={editForm.origin}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, origin: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Destination</Label>
                <Input
                  value={editForm.destination}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, destination: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Available From</Label>
                <Input
                  type="datetime-local"
                  value={editForm.available_from}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, available_from: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Available Until (optional)</Label>
                <Input
                  type="datetime-local"
                  value={editForm.available_until}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, available_until: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Capacity (headcount)</Label>
                <Input
                  type="number"
                  value={editForm.capacity_headcount}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, capacity_headcount: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Capacity (weight kg)</Label>
                <Input
                  type="number"
                  value={editForm.capacity_weight_kg}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, capacity_weight_kg: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Origin latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={editForm.origin_lat}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, origin_lat: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Origin longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={editForm.origin_lng}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, origin_lng: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Destination latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={editForm.destination_lat}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, destination_lat: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Destination longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={editForm.destination_lng}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, destination_lng: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <Label className="text-xs">Allow shared loads</Label>
                <p className="text-[11px] text-gray-500">Turn off for exclusive loads.</p>
              </div>
              <Switch
                checked={editForm.allow_shared}
                onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, allow_shared: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <Label className="text-xs">Listing active</Label>
                <p className="text-[11px] text-gray-500">Pause the listing without deleting it.</p>
              </div>
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeEditDialog} disabled={editDialog.saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveListing} disabled={editDialog.saving || haulerTrucks.length === 0}>
              {editDialog.saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={requestDialog.open}
        onOpenChange={(open) => {
          if (!open) setRequestDialog({ open: false, listing: null, load: null, submitting: false, error: null });
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Booking</DialogTitle>
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
              {requestDialog.submitting ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {userRole === "hauler" && (
        <PostTruckDialog
          open={postDialogOpen}
          onOpenChange={(open) => {
            setPostDialogOpen(open);
            if (!open) {
              refreshMyListings();
              refresh();
            }
          }}
          onPosted={() => {
            refreshMyListings();
            refresh();
          }}
        />
      )}
    </div>
  );
}
