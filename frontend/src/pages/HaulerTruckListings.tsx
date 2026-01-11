import { useCallback, useEffect, useState } from "react";
import {
  fetchTruckAvailability,
  updateTruckAvailabilityEntry,
  deleteTruckAvailabilityEntry,
  fetchHaulerVehicles,
  type TruckAvailability,
  type HaulerVehicleOption,
} from "../api/marketplace";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { PostTruckDialog } from "./PostTruckDialog";
import { toast } from "sonner";

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

export default function HaulerTruckListings() {
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

  const refreshMyListings = useCallback(async () => {
    try {
      setMyListingsLoading(true);
      const resp = await fetchTruckAvailability({ scope: "mine" });
      setMyListings(resp.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load your truck listings.");
    } finally {
      setMyListingsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMyListings();
  }, [refreshMyListings]);

  useEffect(() => {
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
  }, []);

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
      refreshMyListings();
    } catch (err: any) {
      setEditError(formatTruckBoardError(err, "Failed to update listing."));
    } finally {
      setEditDialog((prev) => ({ ...prev, saving: false }));
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>My Truck Listings</CardTitle>
            <p className="text-sm text-gray-500">Manage active and paused postings</p>
          </div>
          <Button onClick={() => setPostDialogOpen(true)} disabled={haulerTrucksLoading}>
            Post a Truck
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {haulerTruckError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {haulerTruckError}
            </div>
          )}
          {myListingsLoading ? (
            <p className="text-sm text-gray-500">Loading your listings…</p>
          ) : myListings.length === 0 ? (
            <div className="text-sm text-gray-500">
              No listings yet. Use "Post a Truck" to share availability.
            </div>
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
                      Window: {new Date(listing.available_from).toLocaleString()}{" "}
                      {listing.available_until ? `- ${new Date(listing.available_until).toLocaleString()}` : ""}
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

      <PostTruckDialog
        open={postDialogOpen}
        onOpenChange={(open) => {
          setPostDialogOpen(open);
          if (!open) {
            refreshMyListings();
          }
        }}
        onPosted={refreshMyListings}
      />
    </div>
  );
}
