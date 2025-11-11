import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { MapPin, Clock, DollarSign, Calendar, Star, FileText } from 'lucide-react';

interface Trip {
  id: string;
  species: string;
  quantity: string;
  pickup: string;
  dropoff: string;
  distance: string;
  payout: string;
  pickupTime: string;
  status: 'scheduled' | 'in-transit' | 'completed';
  progress?: number;
  date?: string;
  rating?: number;
}

interface TripsTabProps {
  onViewTrip?: (trip: Trip) => void;
}

const mockTrips: Trip[] = [
  {
    id: 'T001',
    species: 'Cattle',
    quantity: '50 head',
    pickup: 'Austin, TX',
    dropoff: 'Dallas, TX',
    distance: '195 miles',
    payout: '$850',
    pickupTime: 'Today, 8:00 AM',
    status: 'in-transit',
    progress: 65,
  },
  {
    id: 'T002',
    species: 'Sheep',
    quantity: '120 head',
    pickup: 'San Antonio, TX',
    dropoff: 'Houston, TX',
    distance: '197 miles',
    payout: '$920',
    pickupTime: 'Tomorrow, 6:00 AM',
    status: 'scheduled',
  },
  {
    id: 'T003',
    species: 'Pigs',
    quantity: '80 head',
    pickup: 'Waco, TX',
    dropoff: 'Fort Worth, TX',
    distance: '95 miles',
    payout: '$520',
    pickupTime: 'Tomorrow, 2:00 PM',
    status: 'scheduled',
  },
];

const completedTrips: Trip[] = [
  {
    id: 'T004',
    species: 'Cattle',
    quantity: '40 head',
    pickup: 'Houston, TX',
    dropoff: 'Austin, TX',
    distance: '165 miles',
    payout: '$720',
    pickupTime: 'Oct 27, 2025',
    status: 'completed',
    date: 'Oct 27, 2025',
    rating: 5,
  },
  {
    id: 'T005',
    species: 'Goats',
    quantity: '30 head',
    pickup: 'Dallas, TX',
    dropoff: 'Waco, TX',
    distance: '95 miles',
    payout: '$450',
    pickupTime: 'Oct 26, 2025',
    status: 'completed',
    date: 'Oct 26, 2025',
    rating: 4,
  },
  {
    id: 'T006',
    species: 'Sheep',
    quantity: '100 head',
    pickup: 'Fort Worth, TX',
    dropoff: 'San Antonio, TX',
    distance: '275 miles',
    payout: '$1,100',
    pickupTime: 'Oct 25, 2025',
    status: 'completed',
    date: 'Oct 25, 2025',
    rating: 5,
  },
];

export function TripsTab({ onViewTrip }: TripsTabProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');

  const activeTrips = mockTrips.filter(t => t.status === 'in-transit');
  const upcomingTrips = mockTrips.filter(t => t.status === 'scheduled');

  const renderTripCard = (trip: Trip) => {
    const isCompleted = trip.status === 'completed';
    const isActive = trip.status === 'in-transit';

    return (
      <Card key={trip.id} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm text-gray-600 mb-1">Trip #{trip.id}</div>
              <h3 className="text-base text-gray-900">{trip.species} - {trip.quantity}</h3>
            </div>
            <Badge 
              variant={isActive ? 'default' : isCompleted ? 'secondary' : 'outline'}
              className={isActive ? 'bg-[#29CA8D]' : ''}
            >
              {trip.status === 'in-transit' ? 'In Transit' :
               trip.status === 'completed' ? 'Completed' :
               'Scheduled'}
            </Badge>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-[#29CA8D] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-gray-900">{trip.pickup}</div>
                <div className="text-gray-600">{trip.dropoff}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {trip.status === 'completed' ? trip.date : trip.pickupTime}
              </div>
              <div>{trip.distance}</div>
            </div>

            {isActive && trip.progress !== undefined && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{trip.progress}%</span>
                </div>
                <Progress value={trip.progress} className="h-2" />
              </div>
            )}

            {isCompleted && trip.rating && (
              <div className="flex items-center gap-1 pt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < trip.rating! ? 'fill-[#F97316] text-[#F97316]' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-1 text-[#29CA8D]">
              <DollarSign className="w-4 h-4" />
              <span className="text-lg">{trip.payout}</span>
            </div>
            <Button
                  onClick={() => onViewTrip?.(trip)}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={isActive ? 'bg-[#29CA8D] hover:bg-[#24b67d]' : ''}
            >
              {isActive ? 'View Details' :
               isCompleted ? 'View Summary' :
               'Start Checklist'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = (type: string) => (
    <div className="text-center py-12">
      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <h3 className="text-lg text-gray-900 mb-2">No {type} trips</h3>
      <p className="text-sm text-gray-600">
        {type === 'active' && 'You have no trips in progress'}
        {type === 'upcoming' && 'No upcoming trips scheduled'}
        {type === 'completed' && 'No completed trips yet'}
      </p>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="active">
            Active
            {activeTrips.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeTrips.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingTrips.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcomingTrips.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-4">
          {activeTrips.length === 0
            ? renderEmptyState('active')
            : activeTrips.map(renderTripCard)}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcomingTrips.length === 0
            ? renderEmptyState('upcoming')
            : upcomingTrips.map(renderTripCard)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completedTrips.length === 0
            ? renderEmptyState('completed')
            : completedTrips.map(renderTripCard)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
