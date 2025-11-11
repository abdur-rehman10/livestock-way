import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Textarea } from '../components/ui/textarea';
import {
  ArrowLeft,
  MapPin,
  Truck,
  Phone,
  MessageCircle,
  Navigation,
  Clock,
  ThermometerSun,
  Droplets,
  AlertTriangle,
  Star,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from 'sonner';

interface TripTrackingProps {
  load?: {
    id: string;
    species: string;
    quantity: string;
    pickup: string;
    dropoff: string;
    driver?: string;
    status: string;
  };
  onBack?: () => void;
}

const fallbackLoad: NonNullable<TripTrackingProps['load']> = {
  id: 'L000',
  species: 'Cattle',
  quantity: '40 head',
  pickup: 'Austin, TX',
  dropoff: 'Dallas, TX',
  driver: 'John Smith',
  status: 'in-transit',
};

export function TripTracking({ load = fallbackLoad, onBack }: TripTrackingProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  // Mock data
  const progress = 65;
  const eta = '2h 15min';
  const currentLocation = 'I-35, TX';
  const restStops = [
    { id: 1, name: 'Waco Rest Area', type: 'Rest', time: '10:30 AM', status: 'completed' },
    { id: 2, name: 'Temple Washout', type: 'Washout', time: '12:00 PM', status: 'upcoming' },
    { id: 3, name: 'Belton Feed Station', type: 'Feed', time: '2:30 PM', status: 'upcoming' },
  ];

  const telemetry = {
    temperature: 22,
    humidity: 65,
    status: 'normal',
  };

  const handleMessage = () => {
    toast.info('Opening message to driver...');
  };

  const handleCall = () => {
    toast.info('Calling driver...');
  };

  const handleReportIssue = () => {
    toast.success('Issue reported to support team');
  };

  const handleSubmitRating = () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    toast.success('Thank you for your feedback!');
  };

  const isCompleted = load.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={() => onBack?.()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="text-sm text-gray-600">Load #{load.id}</div>
              <Badge className={`${
                load.status === 'active' ? 'bg-[#F97316]' : 'bg-green-500'
              } text-white`}>
                {load.status === 'active' ? 'In Transit' : 'Completed'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleCall}>
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleMessage}>
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className={`relative bg-gray-200 ${isFullScreen ? 'h-screen' : 'h-80'} transition-all`}>
        {/* Mock Map */}
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Navigation className="w-12 h-12 mx-auto mb-2 animate-pulse" />
            <p>Real-time Tracking Map</p>
            <p className="text-sm">Current Location: {currentLocation}</p>
          </div>
        </div>

        {/* Full Screen Toggle */}
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="absolute top-4 right-4 bg-white rounded-lg p-2 shadow-lg"
        >
          {isFullScreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>

        {/* Live Location Badge */}
        <div className="absolute top-4 left-4 bg-white rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm">Live Tracking</span>
        </div>
      </div>

      {/* Trip Details Panel */}
      <div className="p-4 space-y-4">
        {/* Progress Card */}
        {!isCompleted && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Trip Progress</span>
                <span className="text-gray-900">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 mb-3" />
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600">ETA</div>
                  <div className="text-base text-gray-900">{eta}</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600">Distance Left</div>
                  <div className="text-base text-gray-900">68 mi</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trip Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trip Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-[#F97316] mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Route</div>
                <div className="text-base text-gray-900">{load.pickup}</div>
                <div className="text-gray-600">→</div>
                <div className="text-base text-gray-900">{load.dropoff}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Truck className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-sm text-gray-600">Driver</div>
                <div className="text-base text-gray-900">{load.driver || 'Not assigned'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-gray-600">Livestock</div>
                <div className="text-gray-900">{load.species}</div>
              </div>
              <div>
                <div className="text-gray-600">Quantity</div>
                <div className="text-gray-900">{load.quantity}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Telemetry */}
        {!isCompleted && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <div className="flex items-center gap-2">
                  <ThermometerSun className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Temperature</span>
                </div>
                <span className="text-sm text-green-900">{telemetry.temperature}°C (Normal)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <span className="text-sm">Humidity</span>
                </div>
                <span className="text-sm text-blue-900">{telemetry.humidity}% (Normal)</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rest Stops Timeline */}
        {!isCompleted && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scheduled Stops</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {restStops.map((stop, idx) => (
                <div key={stop.id} className="flex items-start gap-3">
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      stop.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                      <Clock className={`w-4 h-4 ${
                        stop.status === 'completed' ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    {idx < restStops.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="text-base text-gray-900">{stop.name}</div>
                    <div className="text-sm text-gray-600">{stop.type} • {stop.time}</div>
                    <Badge 
                      variant={stop.status === 'completed' ? 'default' : 'secondary'}
                      className={`mt-1 text-xs ${stop.status === 'completed' ? 'bg-green-500' : ''}`}
                    >
                      {stop.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {!isCompleted && (
          <Button
            onClick={handleReportIssue}
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Report Issue
          </Button>
        )}

        {/* Rating (Only if completed) */}
        {isCompleted && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rate Your Experience</CardTitle>
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

              <Textarea
                placeholder="Share your experience (optional)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />

              <Button
                onClick={handleSubmitRating}
                className="w-full bg-[#F97316] hover:bg-[#ea580c]"
              >
                Submit Rating
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
