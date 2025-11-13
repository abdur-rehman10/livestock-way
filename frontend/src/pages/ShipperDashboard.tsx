import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { RoleSwitcher } from './RoleSwitcher';
import { PostLoadDialog } from './PostLoadDialog';
import MyLoadsTab from './MyLoadsTab';
import WalletTab from './WalletTab';
import { SupportTab } from './SupportTab';
import { 
  Package, 
  Menu, 
  Bell, 
  User,
  Plus,
  Home,
  FileText,
  Wallet,
  HelpCircle,
  MapPin,
  Truck,
  Clock,
  Filter
} from 'lucide-react';
import logo from '../assets/livestockway-logo.svg';

interface ShipperDashboardProps {
  onLogout?: () => void;
  onRoleSwitch?: (role: 'shipper' | 'driver') => void;
}

const activeLoads = [
  {
    id: 1,
    species: 'Cattle',
    quantity: '50 head',
    pickup: 'Austin, TX',
    dropoff: 'Dallas, TX',
    status: 'In Transit',
    driver: 'John Smith',
    eta: '2 hours',
    progress: 65,
  },
  {
    id: 2,
    species: 'Sheep',
    quantity: '120 head',
    pickup: 'San Antonio, TX',
    dropoff: 'Houston, TX',
    status: 'Pending Pickup',
    driver: 'Maria Garcia',
    eta: 'Tomorrow 8:00 AM',
    progress: 10,
  },
];

const availableCarriers = [
  {
    id: 1,
    name: 'Swift Livestock Transport',
    rating: 4.8,
    reviews: 342,
    distance: '12 miles away',
    vehicles: 8,
    price: '$2.80/mile',
  },
  {
    id: 2,
    name: 'Reliable Haulers Inc.',
    rating: 4.9,
    reviews: 567,
    distance: '18 miles away',
    vehicles: 15,
    price: '$2.65/mile',
  },
  {
    id: 3,
    name: 'Premium Cattle Carriers',
    rating: 4.7,
    reviews: 221,
    distance: '25 miles away',
    vehicles: 5,
    price: '$3.10/mile',
  },
];

export function ShipperDashboard({ onLogout, onRoleSwitch }: ShipperDashboardProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [isPostLoadOpen, setIsPostLoadOpen] = useState(false);

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
            <RoleSwitcher currentRole="shipper" onRoleSwitch={onRoleSwitch} />
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
            {/* Post Load CTA */}
            <Card className="bg-gradient-to-r from-[#F97316] to-[#ea580c] text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg mb-1">Need to ship livestock?</h3>
                    <p className="text-sm text-white/80">
                      Post a load and get matched with trusted carriers
                    </p>
                  </div>
                  <Button 
                    size="lg"
                    onClick={() => setIsPostLoadOpen(true)}
                    className="bg-white text-[#F97316] hover:bg-gray-100 gap-2 rounded-xl"
                  >
                    <Plus className="w-5 h-5" />
                    Post Load
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl text-[#F97316] mb-1">2</div>
                  <div className="text-xs text-gray-600">Active Loads</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl text-[#29CA8D] mb-1">24</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl text-gray-600 mb-1">1</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg text-[#172039] mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#F97316]/10 flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-6 h-6 text-[#F97316]" />
                    </div>
                    <div className="text-sm text-gray-900">Get Quote</div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#29CA8D]/10 flex items-center justify-center mx-auto mb-2">
                      <Truck className="w-6 h-6 text-[#29CA8D]" />
                    </div>
                    <div className="text-sm text-gray-900">Find Carriers</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Active Loads */}
            <div>
              <h2 className="text-lg text-[#172039] mb-3">Active Shipments</h2>
              {activeLoads.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <h3 className="text-lg text-gray-900 mb-2">No active loads yet</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Post your first load to get started
                    </p>
                    <Button
                      onClick={() => setIsPostLoadOpen(true)}
                      className="bg-[#F97316] hover:bg-[#ea580c] gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Post Your First Load
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {activeLoads.map((load) => (
                    <Card key={load.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base mb-1">
                              {load.species} - {load.quantity}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Driver: {load.driver}
                            </CardDescription>
                          </div>
                          <Badge 
                            variant={load.status === 'In Transit' ? 'default' : 'secondary'}
                            className={load.status === 'In Transit' ? 'bg-[#29CA8D]' : ''}
                          >
                            {load.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-[#F97316] mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-gray-900">{load.pickup}</div>
                              <div className="text-gray-600">{load.dropoff}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            ETA: {load.eta}
                          </div>
                          <div className="pt-2">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{load.progress}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#29CA8D] transition-all"
                                style={{ width: `${load.progress}%` }}
                              />
                            </div>
                          </div>
                          <Button variant="outline" className="w-full">
                            Track Shipment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Available Carriers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg text-[#172039]">Available Carriers</h2>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </div>
              <div className="space-y-3">
                {availableCarriers.map((carrier) => (
                  <Card key={carrier.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-base text-gray-900 mb-1">{carrier.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>⭐ {carrier.rating}</span>
                            <span>•</span>
                            <span>{carrier.reviews} reviews</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base text-[#F97316]">{carrier.price}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {carrier.distance}
                          </div>
                          <div className="flex items-center gap-1">
                            <Truck className="w-4 h-4" />
                            {carrier.vehicles} vehicles
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'loads' && <MyLoadsTab />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'support' && <SupportTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-5 gap-1 p-2">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'loads', icon: Package, label: 'My Loads' },
            { id: 'wallet', icon: Wallet, label: 'Wallet' },
            { id: 'support', icon: HelpCircle, label: 'Support' },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#F97316] bg-[#F97316]/10'
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

      {/* Post Load Dialog */}
      <PostLoadDialog open={isPostLoadOpen} onOpenChange={setIsPostLoadOpen} />
    </div>
  );
}
