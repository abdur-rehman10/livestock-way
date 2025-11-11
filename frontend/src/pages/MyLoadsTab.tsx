import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PostLoadDialog } from './PostLoadDialog';
import { MapPin, Clock, Truck, DollarSign, Edit, Copy, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Load {
  id: string;
  species: string;
  quantity: string;
  pickup: string;
  dropoff: string;
  pickupDate: string;
  price: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  driver?: string;
  postedDate: string;
}

const mockLoads: Load[] = [
  {
    id: 'L001',
    species: 'Cattle',
    quantity: '50 head',
    pickup: 'Austin, TX',
    dropoff: 'Dallas, TX',
    pickupDate: 'Today, 8:00 AM',
    price: '$850',
    status: 'active',
    driver: 'John Smith',
    postedDate: 'Oct 27, 2025',
  },
  {
    id: 'L002',
    species: 'Sheep',
    quantity: '120 head',
    pickup: 'San Antonio, TX',
    dropoff: 'Houston, TX',
    pickupDate: 'Tomorrow, 6:00 AM',
    price: '$920',
    status: 'active',
    driver: 'Maria Garcia',
    postedDate: 'Oct 27, 2025',
  },
  {
    id: 'L003',
    species: 'Pigs',
    quantity: '80 head',
    pickup: 'Waco, TX',
    dropoff: 'Fort Worth, TX',
    pickupDate: 'Oct 30, 2025',
    price: '$520',
    status: 'pending',
    postedDate: 'Oct 28, 2025',
  },
];

const completedLoads: Load[] = [
  {
    id: 'L004',
    species: 'Cattle',
    quantity: '40 head',
    pickup: 'Houston, TX',
    dropoff: 'Austin, TX',
    pickupDate: 'Oct 25, 2025',
    price: '$720',
    status: 'completed',
    driver: 'Robert Johnson',
    postedDate: 'Oct 24, 2025',
  },
];

interface MyLoadsTabProps {
  onTrackLoad?: (load: Load) => void;
}

export function MyLoadsTab({ onTrackLoad }: MyLoadsTabProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed' | 'cancelled'>('active');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

  const handleEdit = (load: Load) => {
    if (load.status !== 'pending') {
      toast.error('Only pending loads can be edited');
      return;
    }
    setSelectedLoad(load);
    setIsEditOpen(true);
  };

  const handleDuplicate = (load: Load) => {
    setSelectedLoad(load);
    setIsEditOpen(true);
    toast.info('Load details copied. Make changes and post.');
  };

  const handleCancel = (load: Load) => {
    if (load.status === 'active') {
      if (!confirm('Cancelling an active trip may incur fees. Continue?')) {
        return;
      }
    }
    toast.success('Load cancelled');
  };

  const pendingLoads = mockLoads.filter(l => l.status === 'pending');
  const activeLoads = mockLoads.filter(l => l.status === 'active');

  const renderLoadCard = (load: Load) => {
    const isPending = load.status === 'pending';
    const isActive = load.status === 'active';
    const isCompleted = load.status === 'completed';

    return (
      <Card key={load.id}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Load #{load.id}</div>
              <h3 className="text-base text-gray-900">{load.species} - {load.quantity}</h3>
            </div>
            <Badge 
              variant={isActive ? 'default' : isPending ? 'secondary' : isCompleted ? 'outline' : 'destructive'}
              className={isActive ? 'bg-[#F97316]' : isPending ? 'bg-gray-500' : isCompleted ? 'bg-green-500 text-white' : ''}
            >
              {load.status.charAt(0).toUpperCase() + load.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-[#F97316] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-gray-900">{load.pickup}</div>
              <div className="text-gray-600">{load.dropoff}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {load.pickupDate}
            </div>
          </div>

          {load.driver && (
            <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
              <Truck className="w-4 h-4 text-gray-600" />
              <span className="text-gray-900">Driver: {load.driver}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-1 text-[#F97316]">
              <DollarSign className="w-4 h-4" />
              <span className="text-lg">{load.price}</span>
            </div>

            <div className="flex gap-2">
              {isPending && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(load)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(load)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(load)}
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </>
              )}
              {isActive && (
                <Button
                  onClick={() => onTrackLoad?.(load)}
                  className="bg-[#F97316] hover:bg-[#ea580c]"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Track
                </Button>
              )}
              {isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Viewing ePOD...')}
                >
                  View ePOD
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = (type: string) => (
    <div className="text-center py-12">
      <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <h3 className="text-lg text-gray-900 mb-2">No {type} loads</h3>
      <p className="text-sm text-gray-600">
        {type === 'pending' && 'Post a load to get started'}
        {type === 'active' && 'No loads currently in transit'}
        {type === 'completed' && 'No completed loads yet'}
        {type === 'cancelled' && 'No cancelled loads'}
      </p>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="pending">
            Pending
            {pendingLoads.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingLoads.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            {activeLoads.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeLoads.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingLoads.length === 0
            ? renderEmptyState('pending')
            : pendingLoads.map(renderLoadCard)}
        </TabsContent>

        <TabsContent value="active" className="space-y-3 mt-4">
          {activeLoads.length === 0
            ? renderEmptyState('active')
            : activeLoads.map(renderLoadCard)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completedLoads.length === 0
            ? renderEmptyState('completed')
            : completedLoads.map(renderLoadCard)}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3 mt-4">
          {renderEmptyState('cancelled')}
        </TabsContent>
      </Tabs>

      {/* Edit/Duplicate Load Dialog */}
      <PostLoadDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialData={selectedLoad}
      />
    </div>
  );
}
