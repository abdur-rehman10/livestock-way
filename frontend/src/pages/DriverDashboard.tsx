import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { RoleSwitcher } from './RoleSwitcher';
import { TripsTab } from './TripsTab';
import WalletTab from './WalletTab';
import { ExpensesTab } from './ExpensesTab';
import { DocumentsTab } from './DocumentsTab';
import { SupportTab } from './SupportTab';
import { TripDetail } from './TripDetail';
import { ProfileSettings } from './ProfileSettings';
import { NotificationsCenter } from '../components/NotificationsCenter';
import { LoadCardSkeleton } from './LoadingSkeleton';
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  Clock, 
  Menu, 
  Bell, 
  User,
  Navigation,
  CheckCircle2,
  XCircle,
  Home,
  FileText,
  Wallet,
  HelpCircle,
  Receipt,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '../assets/livestockway-logo.svg';
import { storage, STORAGE_KEYS } from '../lib/storage';
import { searchFilter } from '../lib/filter-utils';
import { createPollingInterval } from '../lib/network';
import { undoManager } from '../lib/undo-manager';
import { showUndoToast } from '../components/UndoToast';

interface DriverDashboardProps {
  onLogout?: () => void;
  onRoleSwitch?: (role: 'shipper' | 'driver') => void;
}

const nearbyLoads = [
  {
    id: 1,
    species: 'Cattle',
    quantity: '50 head',
    pickup: 'Austin, TX',
    dropoff: 'Dallas, TX',
    distance: '195 miles',
    payout: '$850',
    pickupTime: '8:00 AM - 10:00 AM',
    specialRequirements: 'Temperature controlled',
  },
  {
    id: 2,
    species: 'Sheep',
    quantity: '120 head',
    pickup: 'San Antonio, TX',
    dropoff: 'Houston, TX',
    distance: '197 miles',
    payout: '$920',
    pickupTime: '6:00 AM - 8:00 AM',
    specialRequirements: 'None',
  },
  {
    id: 3,
    species: 'Pigs',
    quantity: '80 head',
    pickup: 'Waco, TX',
    dropoff: 'Fort Worth, TX',
    distance: '95 miles',
    payout: '$520',
    pickupTime: '2:00 PM - 4:00 PM',
    specialRequirements: 'Hay required',
  },
];

export function DriverDashboard({ onLogout, onRoleSwitch }: DriverDashboardProps) {
  // State with persistence
  const [isOnline, setIsOnline] = useState(() => 
    storage.get<boolean>(STORAGE_KEYS.DRIVER_ONLINE_STATUS, false)
  );
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loads, setLoads] = useState(nearbyLoads);

  // Persist online status
  useEffect(() => {
    storage.set(STORAGE_KEYS.DRIVER_ONLINE_STATUS, isOnline);
  }, [isOnline]);

  // Simulated real-time updates
  useEffect(() => {
    const cleanup = createPollingInterval(() => {
      // Simulate load updates (in production, this would fetch from API)
      if (isOnline && Math.random() > 0.7) {
        setLoads(prev => [...prev]); // Trigger re-render
        toast.info('New loads available nearby');
      }
    }, 30000, isOnline); // Poll every 30 seconds when online

    return cleanup;
  }, [isOnline]);

  // Filter loads by search
  const filteredLoads = searchQuery
    ? searchFilter(loads, searchQuery, ['species', 'pickup', 'dropoff', 'quantity'])
    : loads;

  const handleToggleOnline = () => {
    const previousStatus = isOnline;
    setIsOnline(!isOnline);
    
    // Add undo action
    undoManager.add({
      id: `toggle-online-${Date.now()}`,
      description: previousStatus ? 'Went offline' : 'Went online',
      undo: () => setIsOnline(previousStatus),
      redo: () => setIsOnline(!previousStatus),
    });
    
    showUndoToast(
      isOnline ? 'You are now offline' : 'You are now online and can receive loads',
      () => setIsOnline(previousStatus)
    );
  };

  const handleAcceptLoad = (loadId: number) => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoads(prev => prev.filter(l => l.id !== loadId));
      setIsLoading(false);
      
      // Add undo action
      const acceptedLoad = loads.find(l => l.id === loadId);
      if (acceptedLoad) {
        undoManager.add({
          id: `accept-load-${loadId}`,
          description: `Accepted load #${loadId}`,
          undo: () => setLoads(prev => [acceptedLoad, ...prev]),
          redo: () => setLoads(prev => prev.filter(l => l.id !== loadId)),
        });
        
        showUndoToast(
          'Load accepted! Check your Trips tab for details.',
          () => setLoads(prev => [acceptedLoad, ...prev])
        );
      }
    }, 500);
  };

  const handleIgnoreLoad = (loadId: number) => {
    const ignoredLoad = loads.find(l => l.id === loadId);
    setLoads(prev => prev.filter(l => l.id !== loadId));
    
    // Add undo action
    if (ignoredLoad) {
      undoManager.add({
        id: `ignore-load-${loadId}`,
        description: `Ignored load #${loadId}`,
        undo: () => setLoads(prev => [ignoredLoad, ...prev]),
        redo: () => setLoads(prev => prev.filter(l => l.id !== loadId)),
      });
      
      showUndoToast(
        'Load ignored',
        () => setLoads(prev => [ignoredLoad, ...prev])
      );
    }
  };

  const handleViewTrip = (trip: any) => {
    setSelectedTrip(trip);
  };

  if (selectedTrip) {
    return (
      <TripDetail
        trip={selectedTrip}
        onBack={() => setSelectedTrip(null)}
        onComplete={() => {
          setSelectedTrip(null);
          toast.success('Trip completed! Great job!');
        }}
      />
    );
  }

  if (showProfile) {
    return <ProfileSettings role="driver" onBack={() => setShowProfile(false)} />;
  }

  if (showNotifications) {
    return (
      <NotificationsCenter onClose={() => setShowNotifications(false)} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
            <img 
              src={logo} 
              alt="LivestockWay" 
              className="h-7"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <RoleSwitcher currentRole="driver" onRoleSwitch={onRoleSwitch} />
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onLogout?.()}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {activeTab === 'home' && (
          <div className="p-4 space-y-4">
            {/* Online Status Toggle */}
            <Card className="bg-gradient-to-r from-[#29CA8D] to-[#24b67d] text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg mb-1">Driver Status</h3>
                    <p className="text-sm text-white/80">
                      {isOnline ? 'You are online and receiving loads' : 'Go online to receive loads'}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Switch
                      checked={isOnline}
                      onCheckedChange={handleToggleOnline}
                      className="data-[state=checked]:bg-white"
                    />
                    <span className="text-xs">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl text-[#29CA8D] mb-1">3</div>
                  <div className="text-sm text-gray-600">Active Trips</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl text-[#29CA8D] mb-1">$2,450</div>
                  <div className="text-sm text-gray-600">This Week</div>
                </CardContent>
              </Card>
            </div>

            {/* Nearby Loads */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg text-[#172039]">Nearby Loads</h2>
                <Badge variant="secondary">{filteredLoads.length} available</Badge>
              </div>

              {/* Search Bar */}
              {isOnline && loads.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search by species, location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {!isOnline ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <h3 className="text-lg text-gray-900 mb-2">Go online to see loads</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Toggle your status to online to start receiving nearby load matches
                    </p>
                    <Button
                      onClick={handleToggleOnline}
                      className="bg-[#29CA8D] hover:bg-[#24b67d]"
                    >
                      Go Online
                    </Button>
                  </CardContent>
                </Card>
              ) : isLoading ? (
                <div className="space-y-3">
                  <LoadCardSkeleton />
                  <LoadCardSkeleton />
                  <LoadCardSkeleton />
                </div>
              ) : filteredLoads.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <h3 className="text-lg text-gray-900 mb-2">
                      {searchQuery ? 'No loads match your search' : 'No nearby loads'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {searchQuery ? 'Try a different search term' : 'Stay online to get matched with new loads'}
                    </p>
                    {searchQuery && (
                      <Button
                        onClick={() => setSearchQuery('')}
                        variant="outline"
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredLoads.map((load) => (
                    <Card key={load.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base mb-1">
                              {load.species} - {load.quantity}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {load.distance} • {load.pickupTime}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-xl text-[#29CA8D]">{load.payout}</div>
                            <div className="text-xs text-gray-600">Estimated</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="space-y-2 mb-4">
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-[#29CA8D] mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-gray-900">Pickup: {load.pickup}</div>
                              <div className="text-gray-600">Dropoff: {load.dropoff}</div>
                            </div>
                          </div>
                          {load.specialRequirements !== 'None' && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              {load.specialRequirements}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAcceptLoad(load.id)}
                            className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d] gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleIgnoreLoad(load.id)}
                            variant="outline"
                            className="flex-1 gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Ignore
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'trips' && <TripsTab onViewTrip={handleViewTrip} />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'docs' && <DocumentsTab />}
        {activeTab === 'support' && <SupportTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-5 gap-1 p-2">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'trips', icon: Navigation, label: 'Trips' },
            { id: 'expenses', icon: Receipt, label: 'Expenses' },
            { id: 'wallet', icon: Wallet, label: 'Wallet' },
            { id: 'support', icon: HelpCircle, label: 'Support' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#29CA8D] bg-[#29CA8D]/10'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
