import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import {
  createTruckAvailabilityEntry,
  fetchHaulerVehicles,
  type HaulerVehicleOption,
} from "../api/marketplace";

type PostTruckDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted?: () => void;
};

const nowLocal = () => new Date().toISOString().slice(0, 16);

function parseNumber(value: string, allowNull = true): number | null {
  if (!value || value.trim() === "") return allowNull ? null : 0;
  const num = Number(value);
  if (Number.isNaN(num)) throw new Error("Enter a valid number.");
  return num;
}

function parseCoordinate(value: string, label: string): number | null {
  if (!value || value.trim() === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) throw new Error(`${label} must be a number.`);
  return num;
}

export function PostTruckDialog({ open, onOpenChange, onPosted }: PostTruckDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trucks, setTrucks] = useState<HaulerVehicleOption[]>([]);
  const [trucksLoading, setTrucksLoading] = useState(false);

  const [form, setForm] = useState({
    truck_id: "",
    origin: "",
    destination: "",
    available_from: nowLocal(),
    available_until: "",
    capacity_headcount: "",
    capacity_weight_kg: "",
    origin_lat: "",
    origin_lng: "",
    destination_lat: "",
    destination_lng: "",
    allow_shared: true,
    notes: "",
  });

  const primaryTruckLabel = useMemo(() => {
    if (!form.truck_id) return "";
    const t = trucks.find((truck) => String(truck.id) === String(form.truck_id));
    if (!t) return "";
    return t.truck_name || t.plate_number || `Truck #${t.id}`;
  }, [form.truck_id, trucks]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setTrucksLoading(true);
    fetchHaulerVehicles()
      .then((resp) => {
        if (!active) return;
        const items = resp.items ?? [];
        setTrucks(items);
        if (!form.truck_id && items[0]?.id) {
          setForm((prev) => ({ ...prev, truck_id: String(items[0].id) }));
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? "Failed to load your trucks");
      })
      .finally(() => {
        if (active) setTrucksLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, form.truck_id]);

  const handleSubmit = async () => {
    setError(null);
    if (!form.truck_id) {
      setError("Select one of your trucks.");
      return;
    }
    if (!form.origin.trim()) {
      setError("Origin is required.");
      return;
    }
    const availableFromDate = new Date(form.available_from);
    if (Number.isNaN(availableFromDate.getTime())) {
      setError("Available from must be a valid date/time.");
      return;
    }
    let availableUntilIso: string | null = null;
    if (form.available_until) {
      const until = new Date(form.available_until);
      if (Number.isNaN(until.getTime())) {
        setError("Available until must be a valid date/time.");
        return;
      }
      if (until.getTime() < availableFromDate.getTime()) {
        setError("End date must be after the start date.");
        return;
      }
      availableUntilIso = until.toISOString();
    }

    let capacityHeadcount: number | null = null;
    let capacityWeight: number | null = null;
    let originLat: number | null = null;
    let originLng: number | null = null;
    let destinationLat: number | null = null;
    let destinationLng: number | null = null;
    try {
      capacityHeadcount = parseNumber(form.capacity_headcount);
      capacityWeight = parseNumber(form.capacity_weight_kg);
      originLat = parseCoordinate(form.origin_lat, "Origin latitude");
      originLng = parseCoordinate(form.origin_lng, "Origin longitude");
      destinationLat = parseCoordinate(form.destination_lat, "Destination latitude");
      destinationLng = parseCoordinate(form.destination_lng, "Destination longitude");
    } catch (err: any) {
      setError(err?.message ?? "Invalid values.");
      return;
    }
    if ((originLat !== null && originLng === null) || (originLat === null && originLng !== null)) {
      setError("Provide both origin latitude and longitude.");
      return;
    }
    if (
      (destinationLat !== null && destinationLng === null) ||
      (destinationLat === null && destinationLng !== null)
    ) {
      setError("Provide both destination latitude and longitude.");
      return;
    }

    try {
      setSaving(true);
      await createTruckAvailabilityEntry({
        truck_id: form.truck_id,
        origin_location_text: form.origin,
        destination_location_text: form.destination || null,
        available_from: availableFromDate.toISOString(),
        available_until: availableUntilIso,
        capacity_headcount: capacityHeadcount,
        capacity_weight_kg: capacityWeight,
        allow_shared: form.allow_shared,
        notes: form.notes || null,
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
      });
      toast.success("Truck availability posted.", {
        description: primaryTruckLabel ? `${primaryTruckLabel} is now on the board.` : undefined,
      });
      onPosted?.();
      onOpenChange(false);
      setForm({
        truck_id: trucks[0]?.id ? String(trucks[0].id) : "",
        origin: "",
        destination: "",
        available_from: nowLocal(),
        available_until: "",
        capacity_headcount: "",
        capacity_weight_kg: "",
        origin_lat: "",
        origin_lng: "",
        destination_lat: "",
        destination_lng: "",
        allow_shared: true,
        notes: "",
      });
    } catch (err: any) {
      const message = err?.message ?? "Failed to post truck.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || (trucksLoading && !form.truck_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Post a Truck</DialogTitle>
          <DialogDescription>
            Share an available truck with route and capacity so shippers can request bookings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <div className="text-sm text-rose-600">{error}</div>}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Truck *</Label>
              {trucksLoading ? (
                <p className="text-xs text-gray-500">Loading your trucks…</p>
              ) : trucks.length === 0 ? (
                <p className="text-xs text-gray-500">Add a truck to your fleet before posting.</p>
              ) : (
                <Select
                  value={form.truck_id || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, truck_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select truck" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((truck) => (
                      <SelectItem key={truck.id} value={String(truck.id)}>
                        {(truck.truck_name || truck.plate_number || `Truck #${truck.id}`) ?? `Truck #${truck.id}`} · {truck.truck_type || "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Availability window</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="datetime-local"
                  value={form.available_from}
                  onChange={(e) => setForm((prev) => ({ ...prev, available_from: e.target.value }))}
                />
                <Input
                  type="datetime-local"
                  value={form.available_until}
                  onChange={(e) => setForm((prev) => ({ ...prev, available_until: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Origin *</Label>
              <Input
                placeholder="City, State"
                value={form.origin}
                onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Input
                placeholder="City, State"
                value={form.destination}
                onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Origin lat"
                value={form.origin_lat}
                onChange={(e) => setForm((prev) => ({ ...prev, origin_lat: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Origin lng"
                value={form.origin_lng}
                onChange={(e) => setForm((prev) => ({ ...prev, origin_lng: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Destination lat"
                value={form.destination_lat}
                onChange={(e) => setForm((prev) => ({ ...prev, destination_lat: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Destination lng"
                value={form.destination_lng}
                onChange={(e) => setForm((prev) => ({ ...prev, destination_lng: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Capacity (headcount)</Label>
              <Input
                type="number"
                placeholder="e.g. 80"
                value={form.capacity_headcount}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity_headcount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity (weight kg)</Label>
              <Input
                type="number"
                placeholder="e.g. 12000"
                value={form.capacity_weight_kg}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity_weight_kg: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <Label className="text-xs">Allow shared loads</Label>
              <p className="text-[11px] text-gray-500">Turn off for exclusive loads.</p>
            </div>
            <Switch
              checked={form.allow_shared}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, allow_shared: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              placeholder="Equipment, special info, or constraints"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={disabled || trucks.length === 0}>
              {saving ? "Posting…" : "Post Truck"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

