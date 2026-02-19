import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  AlertTriangle, 
  Camera, 
  X,
  Upload,
  MapPin,
  Clock,
  Phone,
  AlertCircle,
  Car,
  Heart,
  FileText,
  Send
} from 'lucide-react';
import { toast } from '../lib/swal';
import { AddressSearch, type MappedAddress } from '../components/AddressSearch';
import { FormStepper, FormStepperNav } from "../components/ui/form-stepper";

interface IncidentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId?: string;
  currentLocation?: string;
}

type IncidentType = 'accident' | 'breakdown' | 'injury' | 'welfare' | 'delay' | 'other';

const incidentTypes: Array<{ value: IncidentType; label: string; icon: any; severity: string }> = [
  { value: 'accident', label: 'Vehicle Accident', icon: Car, severity: 'critical' },
  { value: 'welfare', label: 'Animal Welfare Issue', icon: Heart, severity: 'critical' },
  { value: 'injury', label: 'Driver Injury', icon: AlertCircle, severity: 'high' },
  { value: 'breakdown', label: 'Vehicle Breakdown', icon: AlertTriangle, severity: 'high' },
  { value: 'delay', label: 'Significant Delay', icon: Clock, severity: 'medium' },
  { value: 'other', label: 'Other Issue', icon: FileText, severity: 'medium' },
];

const STEPS = [
  { label: "Type & Details" },
  { label: "Evidence & Emergency" },
];

export function IncidentReportDialog({ 
  open, 
  onOpenChange, 
  tripId,
  currentLocation 
}: IncidentReportDialogProps) {
  const [step, setStep] = useState(0);
  const [incidentType, setIncidentType] = useState<IncidentType | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(currentLocation || '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [requiresEmergency, setRequiresEmergency] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: string; lon: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!incidentType) {
        toast.error('Please select an incident type');
        return false;
      }
      if (!title.trim()) {
        toast.error('Please enter an incident title');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!incidentType) {
      toast.error('Please select an incident type');
      return;
    }

    if (!description || description.length < 20) {
      toast.error('Please provide a detailed description (minimum 20 characters)');
      return;
    }

    if (photos.length === 0) {
      toast.error('Please upload at least one photo for evidence');
      return;
    }

    if (requiresEmergency && !contactNumber) {
      toast.error('Please provide a contact number for emergency response');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const selectedType = incidentTypes.find(t => t.value === incidentType);
      
      toast.success('Incident report submitted successfully');
      
      if (selectedType?.severity === 'critical' || requiresEmergency) {
        toast.error('URGENT: Emergency team has been notified and will contact you shortly', {
          duration: 5000,
        });
      }

      setIncidentType('');
      setTitle('');
      setDescription('');
      setLocation(currentLocation || '');
      setPhotos([]);
      setRequiresEmergency(false);
      setContactNumber('');
      setIsSubmitting(false);
      onOpenChange(false);
    }, 1500);
  };

  const selectedIncidentType = incidentTypes.find(t => t.value === incidentType);
  const isCritical = selectedIncidentType?.severity === 'critical' || requiresEmergency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Report Incident
          </DialogTitle>
          <DialogDescription>
            Provide detailed information about the incident. Critical incidents will immediately alert the operations team and emergency services.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {tripId && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Trip ID: <span className="font-medium text-[#172039]">{tripId}</span>
              </p>
            </div>
          )}

          <FormStepper
            steps={STEPS}
            currentStep={step}
            onStepClick={(s) => setStep(s)}
          />

          {isCritical && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Critical Incident Alert</p>
                  <p className="text-sm text-red-700 mt-1">
                    This incident will immediately notify operations, dispatch emergency services if needed, and may pause trip payment processing until resolved.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="min-h-[320px]">
            {step === 0 && (
              <div className="space-y-4">
                {/* Incident Type Selection */}
                <div className="space-y-2">
                  <Label>Incident Type *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {incidentTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = incidentType === type.value;
                      const severityColor = 
                        type.severity === 'critical' ? 'border-red-500 bg-red-50' :
                        type.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                        'border-yellow-500 bg-yellow-50';

                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setIncidentType(type.value)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? severityColor
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-5 h-5" />
                            <span className="text-sm">{type.label}</span>
                          </div>
                          {isSelected && (
                            <Badge 
                              className={`text-xs ${
                                type.severity === 'critical' ? 'bg-red-500' :
                                type.severity === 'high' ? 'bg-orange-500' :
                                'bg-yellow-500'
                              }`}
                            >
                              {type.severity}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Incident Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of the incident"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Current Location *</Label>
                  <AddressSearch
                    value={locationSearch}
                    onChange={setLocationSearch}
                    onSelect={(mapped: MappedAddress) => {
                      setLocationSearch(mapped.fullText);
                      setLocation(mapped.fullText);
                      setLocationCoords({ lat: mapped.lat, lon: mapped.lon });
                    }}
                  />
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="location"
                      className="pl-10"
                      placeholder="Address or nearest landmark"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    className="min-h-[120px] resize-none"
                    placeholder="Describe what happened, when it occurred, current situation, any immediate dangers, and actions taken so far..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    {description.length}/500 characters (minimum 20)
                  </p>
                </div>

                {/* Photo Evidence */}
                <div className="space-y-2">
                  <Label>Photo Evidence * (Required)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    
                    {photos.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-8 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
                      >
                        <Camera className="w-8 h-8" />
                        <p className="text-sm">Tap to upload photos</p>
                        <p className="text-xs text-gray-500">At least 1 photo required (max 5)</p>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          {photos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Evidence ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(index)}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {photos.length < 5 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Add More Photos ({photos.length}/5)
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Response */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emergency"
                      checked={requiresEmergency}
                      onChange={(e) => setRequiresEmergency(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="emergency" className="cursor-pointer">
                      This requires immediate emergency response
                    </Label>
                  </div>

                  {requiresEmergency && (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor="contact">Emergency Contact Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="contact"
                          type="tel"
                          className="pl-10"
                          placeholder="+1 (555) 000-0000"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          required={requiresEmergency}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <FormStepperNav
            currentStep={step}
            totalSteps={STEPS.length}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            onNext={() => {
              if (validateStep(step)) setStep((s) => s + 1);
            }}
            onSubmit={handleSubmit}
            submitting={isSubmitting}
            submitLabel={isCritical ? 'Submit & Alert Emergency' : 'Submit Report'}
            submitDisabled={isSubmitting}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
