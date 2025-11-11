import { useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ArrowLeft,
  MapPin,
  Truck,
  Phone,
  MessageCircle,
  Camera,
  Upload,
  CheckCircle2,
  Clock,
  Navigation,
  AlertTriangle,
  Fuel,
  DollarSign,
  FileText,
  ThermometerSun,
  Droplets,
  Play,
  Pause,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { IncidentReportDialog } from './IncidentReportDialog';
import { TripChat } from './TripChat';

interface TripDetailProps {
  trip?: {
    id: string;
    species: string;
    quantity: string;
    pickup: string;
    dropoff: string;
    distance: string;
    payout: string;
    pickupTime: string;
    status: 'scheduled' | 'in-transit' | 'completed';
  };
  onBack?: () => void;
  onComplete?: () => void;
}

const fallbackTrip: NonNullable<TripDetailProps['trip']> = {
  id: 'T000',
  species: 'Cattle',
  quantity: '40 head',
  pickup: 'Austin, TX',
  dropoff: 'Dallas, TX',
  distance: '195 miles',
  payout: '$850',
  pickupTime: 'Today, 8:00 AM',
  status: 'scheduled',
};

export function TripDetail({ trip = fallbackTrip, onBack, onComplete }: TripDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'map' | 'chat' | 'epod'>('overview');
  const [tripStatus, setTripStatus] = useState<'scheduled' | 'in-transit' | 'completed'>(trip.status);
  const [progress, setProgress] = useState(0);
  
  // Dialogs state
  const [isIncidentReportOpen, setIsIncidentReportOpen] = useState(false);
  
  // Checklist state
  const [checklist, setChecklist] = useState({
    vehicleInspection: false,
    licenseValid: false,
    animalCheck: false,
    loadSecure: false,
    documentsUploaded: false,
  });
  const [checklistPhotos, setChecklistPhotos] = useState<Record<string, string>>({});
  const [checklistNotes, setChecklistNotes] = useState('');

  // In-transit state
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  
  // ePOD state
  const [epodPhotos, setEpodPhotos] = useState<string[]>([]);
  const [deliveredQuantity, setDeliveredQuantity] = useState(trip.quantity);
  const [livestockHealthy, setLivestockHealthy] = useState(true);
  const [signature, setSignature] = useState('');
  const [rating, setRating] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const epodInputRef = useRef<HTMLInputElement>(null);

  const checklistComplete = Object.values(checklist).every(v => v);

  const handleChecklistPhoto = (item: string) => {
    fileInputRef.current?.click();
    fileInputRef.current?.setAttribute('data-item', item);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const item = e.target.getAttribute('data-item');
    if (file && item) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChecklistPhotos(prev => ({ ...prev, [item]: reader.result as string }));
        toast.success('Photo uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartTrip = () => {
    if (!checklistComplete) {
      toast.error('Please complete all checklist items before starting');
      return;
    }
    setTripStatus('in-transit');
    setActiveTab('map');
    toast.success('Trip started!');
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 5;
      });
    }, 2000);
  };

  const handlePauseTrip = () => {
    if (!pauseReason) {
      toast.error('Please select a reason for pausing');
      return;
    }
    setIsPaused(true);
    toast.info(`Trip paused: ${pauseReason}`);
  };

  const handleResumeTrip = () => {
    setIsPaused(false);
    setPauseReason('');
    toast.success('Trip resumed');
  };

  const handleEpodPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEpodPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmitEpod = () => {
    if (epodPhotos.length === 0) {
      toast.error('Please upload at least one photo');
      return;
    }
    if (!signature) {
      toast.error('Please capture shipper signature');
      return;
    }
    setTripStatus('completed');
    setActiveTab('overview');
    toast.success('Trip completed successfully!');
  };

  const renderStatusBadge = () => {
    const colors = {
      scheduled: 'bg-gray-500',
      'in-transit': 'bg-[#29CA8D]',
      completed: 'bg-blue-500',
    };
    return (
      <Badge className={`${colors[tripStatus]} text-white`}>
        {tripStatus === 'in-transit' ? 'In Transit' : tripStatus.charAt(0).toUpperCase() + tripStatus.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => onBack?.()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="text-sm text-gray-600">Trip #{trip.id}</div>
              <div className="flex items-center gap-2">
                {renderStatusBadge()}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Phone className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="bg-white border-b px-4">
          <TabsList className="w-full justify-start bg-transparent h-auto p-0 overflow-x-auto">
            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none">
              Overview
            </TabsTrigger>
            <TabsTrigger value="checklist" className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none">
              Checklist
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              disabled={tripStatus === 'scheduled'}
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none"
            >
              Map
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none">
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="epod" 
              disabled={tripStatus !== 'in-transit' || progress < 95}
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none"
            >
              ePOD
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0 p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trip Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#29CA8D] mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Pickup</div>
                  <div className="text-base text-gray-900">{trip.pickup}</div>
                  <div className="text-xs text-gray-500 mt-1">{trip.pickupTime}</div>
                </div>
              </div>
              <div className="border-l-2 border-dashed border-gray-300 ml-2 h-6" />
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#F97316] mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Dropoff</div>
                  <div className="text-base text-gray-900">{trip.dropoff}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Livestock</div>
                  <div className="text-base text-gray-900">{trip.species}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Quantity</div>
                  <div className="text-base text-gray-900">{trip.quantity}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Distance</div>
                  <div className="text-base text-gray-900">{trip.distance}</div>
                </div>
              </div>

              <div className="bg-[#29CA8D]/10 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Trip Payout</div>
                <div className="text-2xl text-[#29CA8D]">{trip.payout}</div>
              </div>
            </CardContent>
          </Card>

          {tripStatus === 'in-transit' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Distance Completed</span>
                    <span className="text-gray-900">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-gray-500">
                    ETA: 2 hours 15 minutes
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {tripStatus === 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rate This Shipper</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating ? 'fill-[#F97316] text-[#F97316]' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea placeholder="Add a comment (optional)" />
                <Button className="w-full bg-[#29CA8D] hover:bg-[#24b67d]">
                  Submit Rating
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="mt-0 p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pre-Trip Checklist</CardTitle>
              <p className="text-sm text-gray-600">Complete all items before starting the trip</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'vehicleInspection', label: 'Vehicle Inspection', requiresPhoto: false },
                { key: 'licenseValid', label: 'License & Insurance Valid', requiresPhoto: false },
                { key: 'animalCheck', label: 'Animal Fit-to-Travel Check', requiresPhoto: false },
                { key: 'loadSecure', label: 'Load Secure', requiresPhoto: true },
                { key: 'documentsUploaded', label: 'Documents Uploaded', requiresPhoto: false },
              ].map((item) => (
                <div key={item.key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    checked={checklist[item.key as keyof typeof checklist]}
                    onCheckedChange={(checked) =>
                      setChecklist((prev) => ({ ...prev, [item.key]: checked as boolean }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-base text-gray-900">{item.label}</div>
                    {item.requiresPhoto && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChecklistPhoto(item.key)}
                        className="mt-2"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {checklistPhotos[item.key] ? 'Photo Uploaded ✓' : 'Take Photo'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={checklistNotes}
                  onChange={(e) => setChecklistNotes(e.target.value)}
                  placeholder="Add any additional notes or observations"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleStartTrip}
                disabled={!checklistComplete || tripStatus !== 'scheduled'}
                className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Trip
              </Button>
            </CardContent>
          </Card>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            capture="environment"
          />
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map" className="mt-0">
          <div className="relative h-[400px] bg-gray-200">
            {/* Mock Map */}
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Navigation className="w-12 h-12 mx-auto mb-2" />
                <p>Map View</p>
                <p className="text-sm">(Google Maps integration)</p>
              </div>
            </div>

            {/* Trip Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-4 space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xs text-gray-600">Distance Left</div>
                  <div className="text-base text-gray-900">
                    {Math.round((100 - progress) * 1.95)} mi
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">ETA</div>
                  <div className="text-base text-gray-900">2h 15m</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Rest Time</div>
                  <div className="text-base text-gray-900">45m</div>
                </div>
              </div>

              {/* Telemetry Alerts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm">
                  <ThermometerSun className="w-4 h-4 text-green-600" />
                  <span className="text-green-900">Temperature: 22°C (Normal)</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-900">Humidity: 65% (Normal)</span>
                </div>
              </div>

              {/* Controls */}
              {!isPaused ? (
                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" size="sm">
                    <Fuel className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <DollarSign className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsIncidentReportOpen(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </Button>
                </div>
              ) : null}

              {!isPaused ? (
                <Select value={pauseReason} onValueChange={setPauseReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pause trip - select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="break">Rest Break</SelectItem>
                    <SelectItem value="fuel">Fuel Stop</SelectItem>
                    <SelectItem value="issue">Technical Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}

              <Button
                onClick={isPaused ? handleResumeTrip : handlePauseTrip}
                variant={isPaused ? 'default' : 'outline'}
                className={`w-full ${isPaused ? 'bg-[#29CA8D] hover:bg-[#24b67d]' : ''}`}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume Trip
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Trip
                  </>
                )}
              </Button>

              {progress >= 95 && (
                <Button
                  onClick={() => setActiveTab('epod')}
                  className="w-full bg-[#F97316] hover:bg-[#ea580c]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Delivery
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-0 h-[calc(100vh-200px)]">
          <TripChat 
            tripId={trip.id}
            currentUserId="driver1"
            currentUserRole="driver"
          />
        </TabsContent>

        {/* ePOD Tab */}
        <TabsContent value="epod" className="mt-0 p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Electronic Proof of Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>Livestock Photos</Label>
                <div className="grid grid-cols-3 gap-2">
                  {epodPhotos.map((photo, idx) => (
                    <img key={idx} src={photo} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                  ))}
                  <button
                    onClick={() => epodInputRef.current?.click()}
                    className="h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                  >
                    <Camera className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
                <input
                  ref={epodInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEpodPhotoUpload}
                  className="hidden"
                  capture="environment"
                />
              </div>

              {/* Delivered Quantity */}
              <div className="space-y-2">
                <Label>Delivered Quantity</Label>
                <Input
                  type="text"
                  value={deliveredQuantity}
                  onChange={(e) => setDeliveredQuantity(e.target.value)}
                />
              </div>

              {/* Condition */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={livestockHealthy}
                  onCheckedChange={(checked) => setLivestockHealthy(checked as boolean)}
                />
                <label className="text-sm text-gray-900">All livestock delivered healthy</label>
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <Label>Shipper Signature</Label>
                <div 
                  className="border-2 border-gray-300 rounded h-32 flex items-center justify-center cursor-pointer hover:bg-gray-50"
                  onClick={() => setSignature('Signed by Shipper')}
                >
                  {signature ? (
                    <p className="text-sm text-gray-600">{signature} ✓</p>
                  ) : (
                    <p className="text-sm text-gray-400">Tap to capture signature</p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSubmitEpod}
                className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit ePOD & Complete Trip
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Incident Report Dialog */}
      <IncidentReportDialog
        open={isIncidentReportOpen}
        onOpenChange={setIsIncidentReportOpen}
        tripId={trip.id}
        currentLocation={`En route: ${trip.pickup} → ${trip.dropoff}`}
      />
    </div>
  );
}
