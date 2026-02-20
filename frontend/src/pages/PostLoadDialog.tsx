import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { CalendarIcon, MapPin, Lock, Globe, X } from "lucide-react";
import { toast } from '../lib/swal';
import { createLoad } from "../lib/api";
import type { CreateLoadPayload } from "../lib/api";
import { AddressSearch, type MappedAddress } from "../components/AddressSearch";
import { FormStepper, FormStepperNav } from "../components/ui/form-stepper";

interface PostLoadDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: any;
}

interface Carrier {
  id: string;
  name: string;
  rating: number;
}

const mockCarriers: Carrier[] = [
  { id: 'C001', name: 'Texas Livestock Transport', rating: 4.8 },
  { id: 'C002', name: 'Lone Star Hauling', rating: 4.9 },
  { id: 'C003', name: 'Hill Country Express', rating: 4.7 },
  { id: 'C004', name: 'Swift Livestock Carriers', rating: 4.6 },
];

const STEPS = [
  { label: "Load Details" },
  { label: "Route & Schedule" },
  { label: "Pricing & Options" },
];

export function PostLoadDialog({ open = false, onOpenChange, initialData }: PostLoadDialogProps) {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    species: initialData?.species || '',
    quantity: initialData?.quantity || '',
    weight: initialData?.weight || '',
    pickup: initialData?.pickup || '',
    dropoff: initialData?.dropoff || '',
    specialRequirements: initialData?.specialRequirements || '',
    visibility: initialData?.visibility || 'public',
    offerPrice: initialData?.offerPrice || '',
    currency: initialData?.currency || 'USD',
  });
  const [invitedCarriers, setInvitedCarriers] = useState<string[]>([]);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pickupSearch, setPickupSearch] = useState('');
  const [dropoffSearch, setDropoffSearch] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: string; lon: string } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: string; lon: string } | null>(null);

  const estimatedPrice =
    formData.offerPrice && !Number.isNaN(Number(formData.offerPrice))
      ? `$${Number(formData.offerPrice).toLocaleString()} ${formData.currency}`
      : formData.species && formData.quantity
      ? '$850 - $950'
      : '--';

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!formData.species) { toast.error('Please select a livestock type'); return false; }
      if (!formData.quantity || Number(formData.quantity) <= 0) { toast.error('Please enter a valid quantity'); return false; }
      return true;
    }
    if (s === 1) {
      if (!formData.pickup) { toast.error('Please enter a pickup location'); return false; }
      if (!formData.dropoff) { toast.error('Please enter a dropoff location'); return false; }
      if (!date) { toast.error('Please select a pickup date'); return false; }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleBack = () => setStep(Math.max(0, step - 1));

  const handleSubmit = async () => {
    if (!validateStep(0) || !validateStep(1)) return;

    if (formData.visibility === 'private' && invitedCarriers.length === 0) {
      toast.error('Please invite at least one carrier for private loads');
      return;
    }
    const payload: CreateLoadPayload = {
      title: `${formData.species || 'Livestock'} load`,
      species: formData.species,
      quantity: Number(formData.quantity),
      pickup_location: formData.pickup,
      dropoff_location: formData.dropoff,
      pickup_date: date!.toISOString(),
    };

    if (formData.offerPrice !== '') {
      const numericOffer = Number(formData.offerPrice);
      if (Number.isNaN(numericOffer) || numericOffer <= 0) {
        toast.error('Offer price must be a positive number');
        return;
      }
      payload.price_offer_amount = numericOffer;
    } else {
      payload.price_offer_amount = null;
    }
    payload.price_currency = formData.currency || 'USD';

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await createLoad(payload);

      const message =
        formData.visibility === 'private'
          ? `Private load posted! Invitations sent to ${invitedCarriers.length} carrier(s).`
          : 'Load posted successfully! Matching with nearby carriers...';

      toast.success(message);
      onOpenChange?.(false);
      resetForm();
    } catch (err: any) {
      const friendlyMessage = err?.message || 'Failed to post load';
      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      species: '', quantity: '', weight: '', pickup: '', dropoff: '',
      specialRequirements: '', visibility: 'public', offerPrice: '', currency: 'USD',
    });
    setDate(undefined);
    setInvitedCarriers([]);
    setCarrierSearch('');
    setStep(0);
    setErrorMessage(null);
  };

  const handleInviteCarrier = (carrierId: string) => {
    setInvitedCarriers(prev =>
      prev.includes(carrierId) ? prev.filter(id => id !== carrierId) : [...prev, carrierId]
    );
  };

  const filteredCarriers = mockCarriers.filter(c =>
    c.name.toLowerCase().includes(carrierSearch.toLowerCase())
  );

  const handlePickupSelect = (mapped: MappedAddress) => {
    setPickupSearch(mapped.fullText);
    setPickupCoords({ lat: mapped.lat, lon: mapped.lon });
    setFormData(prev => ({ ...prev, pickup: mapped.fullText }));
  };

  const handleDropoffSelect = (mapped: MappedAddress) => {
    setDropoffSearch(mapped.fullText);
    setDropoffCoords({ lat: mapped.lat, lon: mapped.lon });
    setFormData(prev => ({ ...prev, dropoff: mapped.fullText }));
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { onOpenChange?.(value); if (!value) resetForm(); }}>
      <DialogContent className="!max-w-[50vw] max-h-[90vh] overflow-y-auto" style={{ maxWidth: '60vw' }}>
        <DialogHeader className="pb-2">
          <DialogTitle className="text-2xl">Post a Load</DialogTitle>
          <DialogDescription className="text-base">
            Fill in the details below to post your livestock load
          </DialogDescription>
        </DialogHeader>

        <FormStepper steps={STEPS} currentStep={step} onStepClick={setStep} />

        <div className="space-y-6 min-h-[320px]">
          {/* Step 1: Load Details */}
          {step === 0 && (
            <>
              <div className="space-y-3">
                <Label htmlFor="species" className="text-base font-semibold">Livestock Type</Label>
                <Select value={formData.species} onValueChange={(value) => setFormData({ ...formData, species: value })}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select livestock type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cattle">Cattle</SelectItem>
                    <SelectItem value="sheep">Sheep</SelectItem>
                    <SelectItem value="pigs">Pigs</SelectItem>
                    <SelectItem value="goats">Goats</SelectItem>
                    <SelectItem value="horses">Horses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="quantity" className="text-base font-semibold">Quantity (Head)</Label>
                  <Input id="quantity" type="number" placeholder="50" className="h-11" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="weight" className="text-base font-semibold">Avg Weight (lbs)</Label>
                  <Input id="weight" type="number" placeholder="1200" className="h-11" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {/* Step 2: Route & Schedule */}
          {step === 1 && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Pickup Location</Label>
                <AddressSearch value={pickupSearch} onChange={setPickupSearch} onSelect={handlePickupSelect} disabled={isSubmitting} />
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input className="pl-10 h-11" placeholder="Enter address or city" value={formData.pickup} onChange={(e) => setFormData({ ...formData, pickup: e.target.value })} />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Dropoff Location</Label>
                <AddressSearch value={dropoffSearch} onChange={setDropoffSearch} onSelect={handleDropoffSelect} disabled={isSubmitting} />
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input className="pl-10 h-11" placeholder="Enter address or city" value={formData.dropoff} onChange={(e) => setFormData({ ...formData, dropoff: e.target.value })} />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Pickup Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left h-11">
                      <CalendarIcon className="mr-2 w-5 h-5" />
                      {date ? date.toLocaleDateString() : 'Select pickup date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* Step 3: Pricing & Options */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-3">
                  <Label htmlFor="offerPrice" className="text-base font-semibold">Offer Price</Label>
                  <Input id="offerPrice" type="number" min="0" step="0.01" placeholder="Enter amount" className="h-11" value={formData.offerPrice} onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Currency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border-2 border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-700 mb-2 font-medium">Estimated Price</div>
                    <div className="text-3xl font-bold text-[#F97316]">{estimatedPrice}</div>
                  </div>
                  <div className="text-xs text-gray-700 text-right bg-white/50 rounded-lg px-3 py-2">Based on distance<br />and livestock type</div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Load Visibility</Label>
                <Tabs value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-gray-100">
                    <TabsTrigger value="public" className="flex items-center gap-2 text-base data-[state=active]:bg-white data-[state=active]:shadow-sm"><Globe className="w-5 h-5" />Public</TabsTrigger>
                    <TabsTrigger value="private" className="flex items-center gap-2 text-base data-[state=active]:bg-white data-[state=active]:shadow-sm"><Lock className="w-5 h-5" />Invite-Only</TabsTrigger>
                  </TabsList>
                  <TabsContent value="public" className="mt-4">
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <p className="text-sm text-blue-900 leading-relaxed"><strong>Public:</strong> All verified carriers can see and bid on this load</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="private" className="mt-4 space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <p className="text-sm text-purple-900 leading-relaxed"><strong>Private:</strong> Only invited carriers can see and bid on this load</p>
                    </div>
                    {invitedCarriers.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">Invited Carriers ({invitedCarriers.length})</Label>
                        <div className="flex flex-wrap gap-2">
                          {invitedCarriers.map(carrierId => {
                            const carrier = mockCarriers.find(c => c.id === carrierId);
                            return carrier ? (
                              <Badge key={carrierId} variant="outline" className="pr-1 py-1.5 text-sm">
                                {carrier.name}
                                <button type="button" onClick={() => handleInviteCarrier(carrierId)} className="ml-2 hover:bg-gray-200 rounded-full p-1"><X className="w-3 h-3" /></button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Search and Invite Carriers</Label>
                      <Input placeholder="Search carriers..." className="h-11" value={carrierSearch} onChange={(e) => setCarrierSearch(e.target.value)} />
                      <div className="max-h-56 overflow-y-auto space-y-2 border-2 rounded-lg p-3">
                        {filteredCarriers.map(carrier => (
                          <div key={carrier.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" onClick={() => handleInviteCarrier(carrier.id)}>
                            <div className="flex items-center gap-3">
                              <Checkbox checked={invitedCarriers.includes(carrier.id)} />
                              <div>
                                <p className="text-sm font-medium">{carrier.name}</p>
                                <p className="text-xs text-gray-600">Rating: {carrier.rating} ⭐</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-3">
                <Label htmlFor="requirements" className="text-base font-semibold">Special Requirements (Optional)</Label>
                <Textarea id="requirements" placeholder="e.g., Temperature controlled, hay required, rest stops needed" rows={3} className="resize-none" value={formData.specialRequirements} onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })} />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg text-sm text-red-700">{errorMessage}</div>
              )}
            </>
          )}
        </div>

        <FormStepperNav
          currentStep={step}
          totalSteps={STEPS.length}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
          submitting={isSubmitting}
          submitLabel="Post Load"
        />
      </DialogContent>

    </Dialog>
  );
}
