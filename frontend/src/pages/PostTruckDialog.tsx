import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Badge } from '../components/ui/badge';
import { CalendarIcon, MapPin, Truck, DollarSign, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PostTruckDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PostTruckDialog({ open = false, onOpenChange }: PostTruckDialogProps) {
  const [step, setStep] = useState(1);
  const [availableDate, setAvailableDate] = useState<Date>();
  const [selectedRoute, setSelectedRoute] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    origin: '',
    destination: '',
    capacity: '',
    livestockType: [] as string[],
    ratePerMile: '',
    minimumRate: '',
    notes: '',
  });

  const livestockTypes = [
    'Cattle', 'Sheep', 'Pigs', 'Goats', 'Horses', 'Poultry'
  ];

  const vehicles = [
    { id: 'TRK-001', name: 'TRK-001 - Gooseneck Trailer', capacity: '50 head' },
    { id: 'TRK-002', name: 'TRK-002 - Semi Livestock', capacity: '100 head' },
    { id: 'TRK-003', name: 'TRK-003 - Straight Truck', capacity: '30 head' },
  ];

  const drivers = [
    { id: 'DRV-001', name: 'John Smith' },
    { id: 'DRV-002', name: 'Maria Garcia' },
    { id: 'DRV-003', name: 'Robert Johnson' },
  ];

  const handleLivestockToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      livestockType: prev.livestockType.includes(type)
        ? prev.livestockType.filter(t => t !== type)
        : [...prev.livestockType, type]
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.vehicleId || !formData.driverId) {
        toast.error('Please select both vehicle and driver');
        return;
      }
    } else if (step === 2) {
      if (!formData.origin || !formData.destination || !availableDate) {
        toast.error('Please fill in all route details');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = () => {
    if (!formData.ratePerMile || formData.livestockType.length === 0) {
      toast.error('Please complete all required fields');
      return;
    }

    // Mock submission
    toast.success('Truck availability posted successfully!', {
      description: `${formData.vehicleId} is now listed on the marketplace`,
    });
    
    // Reset and close
    setStep(1);
    setFormData({
      vehicleId: '',
      driverId: '',
      origin: '',
      destination: '',
      capacity: '',
      livestockType: [],
      ratePerMile: '',
      minimumRate: '',
      notes: '',
    });
    setAvailableDate(undefined);
    onOpenChange(false);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Vehicle *</Label>
              <Select value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        <span>{vehicle.name}</span>
                        <span className="text-xs text-gray-500">({vehicle.capacity})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign Driver *</Label>
              <Select value={formData.driverId} onValueChange={(value) => setFormData({ ...formData, driverId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Load Capacity</Label>
              <Input
                type="number"
                placeholder="e.g., 50"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
              <p className="text-xs text-gray-500">Number of head (optional - will use vehicle default)</p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Origin (Pickup) *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="e.g., Austin, TX"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Destination (Dropoff) *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="e.g., Dallas, TX"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Available Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {availableDate ? format(availableDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={availableDate}
                    onSelect={setAvailableDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 <span>Tip:</span> Setting specific routes helps shippers find you faster!
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Livestock Types Accepted *</Label>
              <div className="flex flex-wrap gap-2">
                {livestockTypes.map(type => (
                  <Badge
                    key={type}
                    variant={formData.livestockType.includes(type) ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      formData.livestockType.includes(type)
                        ? 'bg-[#29CA8D] hover:bg-[#24b67d]'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleLivestockToggle(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate per Mile *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-9"
                    placeholder="2.85"
                    value={formData.ratePerMile}
                    onChange={(e) => setFormData({ ...formData, ratePerMile: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Minimum Rate</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    step="1"
                    className="pl-9"
                    placeholder="500"
                    value={formData.minimumRate}
                    onChange={(e) => setFormData({ ...formData, minimumRate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Special requirements, equipment, certifications, etc."
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900">
                ✅ <span>Almost done!</span> Your truck will be visible to shippers immediately.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => onOpenChange?.(value)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#29CA8D]/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#29CA8D]" />
            </div>
            <div>
              <div>Post Available Truck</div>
              <div className="text-sm text-gray-500">
                Step {step} of 3
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Select your vehicle and driver'}
            {step === 2 && 'Set your route and availability'}
            {step === 3 && 'Set your rates and preferences'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? 'bg-[#29CA8D]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {renderStepContent()}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={handleNext}
              className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
            >
              Post Truck
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
