import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { toast } from '../lib/swal';
import { AddressSearch, type MappedAddress } from "../components/AddressSearch";
import { createTruckAvailabilityEntry, fetchHaulerVehicles, type HaulerVehicleOption } from "../api/marketplace";
import { FormStepper, FormStepperNav } from "../components/ui/form-stepper";

export type PostTruckInitialValues = {
  capacity_headcount?: string;
  capacity_weight_kg?: string;
  notes?: string;
  allow_shared?: boolean;
};

type PostTruckDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted?: () => void;
  initialValues?: PostTruckInitialValues;
};

const formatDateRangeDisplay = (range: { from: Date | undefined; to: Date | undefined }): string => {
  if (!range.from && !range.to) return "Select date range";
  if (range.from && !range.to) return `${range.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - Select end`;
  if (range.from && range.to) return `${range.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${range.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return "Select date range";
};

const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const combineDateAndTime = (date: Date | undefined): string | null => {
  if (!date) return null;
  const combined = new Date(date);
  combined.setHours(0, 0, 0, 0);
  return formatDateTimeLocal(combined);
};

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

const STEPS = [
  { label: "Vehicle & Route" },
  { label: "Capacity & Schedule" },
  { label: "Options" },
];

export function PostTruckDialog({ open, onOpenChange, onPosted, initialValues }: PostTruckDialogProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trucks, setTrucks] = useState<HaulerVehicleOption[]>([]);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const [form, setForm] = useState({
    truck_id: "", origin: "", destination: "",
    capacity_headcount: "", capacity_weight_kg: "",
    origin_lat: "", origin_lng: "", destination_lat: "", destination_lng: "",
    allow_shared: true, notes: "",
  });
  const [originSearch, setOriginSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");

  const primaryTruckLabel = useMemo(() => {
    if (!form.truck_id) return "";
    const t = trucks.find((truck) => String(truck.id) === String(form.truck_id));
    if (!t) return "";
    return t.truck_name || t.plate_number || `Truck #${t.id}`;
  }, [form.truck_id, trucks]);

  useEffect(() => {
    if (!open || !initialValues) return;
    setForm((prev) => ({
      ...prev,
      capacity_headcount: initialValues.capacity_headcount ?? prev.capacity_headcount,
      capacity_weight_kg: initialValues.capacity_weight_kg ?? prev.capacity_weight_kg,
      notes: initialValues.notes ?? prev.notes,
      allow_shared: initialValues.allow_shared ?? prev.allow_shared,
    }));
  }, [open, initialValues]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setTrucksLoading(true);
    fetchHaulerVehicles()
      .then((resp) => {
        if (!active) return;
        const items = resp.items ?? [];
        setTrucks(items);
        if (!form.truck_id && items[0]?.id) setForm((prev) => ({ ...prev, truck_id: String(items[0].id) }));
      })
      .catch((err: any) => { if (active) setError(err?.message ?? "Failed to load your trucks"); })
      .finally(() => { if (active) setTrucksLoading(false); });
    return () => { active = false; };
  }, [open, form.truck_id]);

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!form.truck_id) { toast.error("Select one of your trucks."); return false; }
      if (!form.origin.trim()) { toast.error("Origin is required."); return false; }
      return true;
    }
    if (s === 1) {
      if (!dateRange.from) { toast.error("Available from date is required."); return false; }
      return true;
    }
    return true;
  };

  const handleNext = () => { if (validateStep(step)) setStep(step + 1); };
  const handleBack = () => setStep(Math.max(0, step - 1));

  const handleSubmit = async () => {
    if (!validateStep(0) || !validateStep(1)) return;
    setError(null);

    const availableFromDateTime = combineDateAndTime(dateRange.from);
    if (!availableFromDateTime) { setError("Available from must be a valid date."); return; }
    const availableFromDateObj = new Date(availableFromDateTime);
    if (Number.isNaN(availableFromDateObj.getTime())) { setError("Available from must be a valid date."); return; }

    let availableUntilIso: string | null = null;
    if (dateRange.to) {
      const dt = combineDateAndTime(dateRange.to);
      if (dt) {
        const until = new Date(dt);
        if (Number.isNaN(until.getTime())) { setError("Available until must be a valid date."); return; }
        if (until.getTime() < availableFromDateObj.getTime()) { setError("End date must be after the start date."); return; }
        availableUntilIso = until.toISOString();
      }
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
    } catch (err: any) { setError(err?.message ?? "Invalid values."); return; }

    if ((originLat !== null && originLng === null) || (originLat === null && originLng !== null)) { setError("Provide both origin latitude and longitude."); return; }
    if ((destinationLat !== null && destinationLng === null) || (destinationLat === null && destinationLng !== null)) { setError("Provide both destination latitude and longitude."); return; }

    try {
      setSaving(true);
      await createTruckAvailabilityEntry({
        truck_id: form.truck_id,
        origin_location_text: form.origin,
        destination_location_text: form.destination || null,
        available_from: availableFromDateObj.toISOString(),
        available_until: availableUntilIso,
        capacity_headcount: capacityHeadcount,
        capacity_weight_kg: capacityWeight,
        allow_shared: form.allow_shared,
        notes: form.notes || null,
        origin_lat: originLat, origin_lng: originLng,
        destination_lat: destinationLat, destination_lng: destinationLng,
      });
      toast.success("Truck listed on the Truckboard.", {
        description: primaryTruckLabel
          ? `${primaryTruckLabel} is now visible to shippers looking for transport.`
          : "Shippers can now send you booking requests.",
      });
      onPosted?.();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      const message = err?.message ?? "Failed to post truck.";
      setError(message);
      toast.error(message);
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setStep(0);
    setError(null);
    setDateRange({ from: undefined, to: undefined });
    setForm({
      truck_id: trucks[0]?.id ? String(trucks[0].id) : "",
      origin: "", destination: "",
      capacity_headcount: "", capacity_weight_kg: "",
      origin_lat: "", origin_lng: "", destination_lat: "", destination_lng: "",
      allow_shared: true, notes: "",
    });
    setOriginSearch(""); setDestinationSearch("");
  };

  const disabled = saving || (trucksLoading && !form.truck_id);

  const handleOriginSelect = (mapped: MappedAddress) => {
    setOriginSearch(mapped.fullText);
    setForm((prev) => ({ ...prev, origin: mapped.fullText, origin_lat: mapped.lat, origin_lng: mapped.lon }));
  };

  const handleDestinationSelect = (mapped: MappedAddress) => {
    setDestinationSearch(mapped.fullText);
    setForm((prev) => ({ ...prev, destination: mapped.fullText, destination_lat: mapped.lat, destination_lng: mapped.lon }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post a Truck</DialogTitle>
          <DialogDescription>Share an available truck so shippers can request bookings.</DialogDescription>
        </DialogHeader>

        <FormStepper steps={STEPS} currentStep={step} onStepClick={setStep} />

        <div className="space-y-4 min-h-[260px]">
          {error && <div className="text-sm text-rose-600">{error}</div>}

          {/* Step 1: Vehicle & Route */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Truck *</Label>
                {trucksLoading ? (
                  <p className="text-xs text-gray-500">Loading your trucks…</p>
                ) : trucks.length === 0 ? (
                  <p className="text-xs text-gray-500">Add a truck to your fleet before posting.</p>
                ) : (
                  <Select value={form.truck_id || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, truck_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select truck" /></SelectTrigger>
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

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Origin *</Label>
                  <AddressSearch value={originSearch} onChange={setOriginSearch} onSelect={handleOriginSelect} disabled={disabled} />
                  <Input placeholder="City, State" value={form.origin} onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <AddressSearch value={destinationSearch} onChange={setDestinationSearch} onSelect={handleDestinationSelect} disabled={disabled} />
                  <Input placeholder="City, State" value={form.destination} onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Origin lat" value={form.origin_lat} onChange={(e) => setForm((prev) => ({ ...prev, origin_lat: e.target.value }))} />
                  <Input type="number" placeholder="Origin lng" value={form.origin_lng} onChange={(e) => setForm((prev) => ({ ...prev, origin_lng: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Dest lat" value={form.destination_lat} onChange={(e) => setForm((prev) => ({ ...prev, destination_lat: e.target.value }))} />
                  <Input type="number" placeholder="Dest lng" value={form.destination_lng} onChange={(e) => setForm((prev) => ({ ...prev, destination_lng: e.target.value }))} />
                </div>
              </div>
            </>
          )}

          {/* Step 2: Capacity & Schedule */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Availability window</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left h-10">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDateRangeDisplay(dateRange)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={dateRange} onSelect={(range) => { if (range) setDateRange({ from: range.from, to: range.to }); }} initialFocus numberOfMonths={2} />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500">Times will be set to 00:00 (midnight) for both dates</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Capacity (headcount)</Label>
                  <Input type="number" placeholder="e.g. 80" value={form.capacity_headcount} onChange={(e) => setForm((prev) => ({ ...prev, capacity_headcount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Capacity (weight kg)</Label>
                  <Input type="number" placeholder="e.g. 12000" value={form.capacity_weight_kg} onChange={(e) => setForm((prev) => ({ ...prev, capacity_weight_kg: e.target.value }))} />
                </div>
              </div>
            </>
          )}

          {/* Step 3: Options */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between rounded-lg border px-3 py-3">
                <div>
                  <Label className="text-sm">Allow shared loads</Label>
                  <p className="text-xs text-gray-500">Turn off for exclusive loads.</p>
                </div>
                <Switch checked={form.allow_shared} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, allow_shared: checked }))} />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={4} placeholder="Equipment, special info, or constraints" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
            </>
          )}
        </div>

        <FormStepperNav
          currentStep={step}
          totalSteps={STEPS.length}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
          submitDisabled={disabled || trucks.length === 0}
          submitting={saving}
          submitLabel="Post Truck"
        />
      </DialogContent>
    </Dialog>
  );
}
