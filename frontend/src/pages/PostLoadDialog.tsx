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
import { CalendarIcon, MapPin, Lock, Globe, Users, X } from "lucide-react";
import { toast } from "sonner";
import { createLoad } from "../lib/api";
import type { CreateLoadPayload } from "../lib/api";

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

export function PostLoadDialog({ open = false, onOpenChange, initialData }: PostLoadDialogProps) {
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    species: initialData?.species || '',
    quantity: initialData?.quantity || '',
    weight: initialData?.weight || '',
    pickup: initialData?.pickup || '',
    dropoff: initialData?.dropoff || '',
    specialRequirements: initialData?.specialRequirements || '',
    visibility: initialData?.visibility || 'public',
  });
  const [invitedCarriers, setInvitedCarriers] = useState<string[]>([]);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const estimatedPrice = formData.species && formData.quantity ? '$850 - $950' : '--';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    
    if (formData.visibility === 'private' && invitedCarriers.length === 0) {
      toast.error('Please invite at least one carrier for private loads');
      return;
    }
    if (!date) {
      toast.error('Please select a pickup date');
      return;
    }

    const quantityNumber = Number(formData.quantity);
    if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const payload: CreateLoadPayload = {
      title: `${formData.species || 'Livestock'} load`,
      species: formData.species,
      quantity: quantityNumber,
      pickup_location: formData.pickup,
      dropoff_location: formData.dropoff,
      pickup_date: date.toISOString(),
      offer_price: null,
      created_by: 'demo_shipper_ui',
    };

    try {
      setIsSubmitting(true);

      await createLoad(payload);

      const message =
        formData.visibility === 'private'
          ? `Private load posted! Invitations sent to ${invitedCarriers.length} carrier(s).`
          : 'Load posted successfully! Matching with nearby carriers...';

      toast.success(message);
      setSuccessMessage(message);
      onOpenChange?.(false);

      setFormData({
        species: '',
        quantity: '',
        weight: '',
        pickup: '',
        dropoff: '',
        specialRequirements: '',
        visibility: 'public',
      });
      setDate(undefined);
      setInvitedCarriers([]);
      setCarrierSearch('');
    } catch (err: any) {
      console.error('Failed to create load:', err);
      const friendlyMessage = err?.message || 'Failed to post load';
      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
    
  };

  const handleInviteCarrier = (carrierId: string) => {
    if (invitedCarriers.includes(carrierId)) {
      setInvitedCarriers(invitedCarriers.filter(id => id !== carrierId));
    } else {
      setInvitedCarriers([...invitedCarriers, carrierId]);
    }
  };

  const filteredCarriers = mockCarriers.filter(c => 
    c.name.toLowerCase().includes(carrierSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(value) => onOpenChange?.(value)}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post a Load</DialogTitle>
          <DialogDescription>
            Fill in the details below to post your livestock load and get matched with carriers
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Species */}
          <div className="space-y-2">
            <Label htmlFor="species">Livestock Type</Label>
            <Select
              value={formData.species}
              onValueChange={(value) => setFormData({ ...formData, species: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select livestock type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cattle">Cattle</SelectItem>
                <SelectItem value="sheep">Sheep</SelectItem>
                <SelectItem value="pigs">Pigs</SelectItem>
                <SelectItem value="goats">Goats</SelectItem>
                <SelectItem value="horses">Horses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity and Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (Head)</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="50"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Avg Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="1200"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
          </div>

          {/* Pickup Location */}
          <div className="space-y-2">
            <Label htmlFor="pickup">Pickup Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="pickup"
                className="pl-10"
                placeholder="Enter address or city"
                value={formData.pickup}
                onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Dropoff Location */}
          <div className="space-y-2">
            <Label htmlFor="dropoff">Dropoff Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="dropoff"
                className="pl-10"
                placeholder="Enter address or city"
                value={formData.dropoff}
                onChange={(e) => setFormData({ ...formData, dropoff: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Pickup Date */}
          <div className="space-y-2">
            <Label>Pickup Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left"
                >
                  <CalendarIcon className="mr-2 w-4 h-4" />
                  {date ? date.toLocaleDateString() : 'Select pickup date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Visibility Control */}
          <div className="space-y-3">
            <Label>Load Visibility</Label>
            <Tabs 
              value={formData.visibility} 
              onValueChange={(value) => setFormData({ ...formData, visibility: value })}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="public" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Public
                </TabsTrigger>
                <TabsTrigger value="private" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Invite-Only
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="public" className="mt-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Public:</strong> All verified carriers can see and bid on this load
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="private" className="mt-3 space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800">
                    <strong>Private:</strong> Only invited carriers can see and bid on this load
                  </p>
                </div>

                {/* Invited Carriers */}
                {invitedCarriers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Invited Carriers ({invitedCarriers.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {invitedCarriers.map(carrierId => {
                        const carrier = mockCarriers.find(c => c.id === carrierId);
                        return carrier ? (
                          <Badge key={carrierId} variant="outline" className="pr-1">
                            {carrier.name}
                            <button
                              type="button"
                              onClick={() => handleInviteCarrier(carrierId)}
                              className="ml-2 hover:bg-gray-200 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Carrier Search */}
                <div className="space-y-2">
                  <Label>Search and Invite Carriers</Label>
                  <Input
                    placeholder="Search carriers..."
                    value={carrierSearch}
                    onChange={(e) => setCarrierSearch(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {filteredCarriers.map(carrier => (
                      <div
                        key={carrier.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => handleInviteCarrier(carrier.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={invitedCarriers.includes(carrier.id)} />
                          <div>
                            <p className="text-sm">{carrier.name}</p>
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

          {/* Special Requirements */}
          <div className="space-y-2">
            <Label htmlFor="requirements">Special Requirements (Optional)</Label>
            <Textarea
              id="requirements"
              placeholder="e.g., Temperature controlled, hay required, rest stops needed"
              rows={3}
              value={formData.specialRequirements}
              onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
            />
          </div>

          {/* Price Estimate */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Estimated Price</div>
                <div className="text-2xl text-[#F97316]">{estimatedPrice}</div>
              </div>
              <div className="text-xs text-gray-600 text-right">
                Based on distance<br />and livestock type
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="text-sm text-red-500">{errorMessage}</div>
          )}
          {successMessage && (
            <div className="text-sm text-green-600">{successMessage}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#F97316] hover:bg-[#ea580c]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post Load'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
