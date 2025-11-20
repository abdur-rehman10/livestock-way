import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loadboard } from './Loadboard';
import { FleetManagement } from './FleetManagement';
import { PostTruckDialog } from './PostTruckDialog';
import HaulerBookingsTab from './HaulerBookingsTab';
import { 
  Building2,
  Menu,
  Bell,
  User,
  Truck,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  Settings,
  BarChart3,
  MapPin,
  Clock,
  AlertCircle,
  Plus,
  ClipboardList
} from 'lucide-react';
import logo from '../assets/livestockway-logo.svg';

interface HaulerDashboardProps {
  onLogout?: () => void;
}

const fleetData = [
  {
    id: 1,
    vehicleId: 'TRK-001',
    driver: 'John Smith',
    status: 'In Transit',
    currentLoad: 'Cattle - 50 head',
    location: 'Highway 35, TX',
    utilization: 85,
  },
  {
    id: 2,
    vehicleId: 'TRK-002',
    driver: 'Maria Garcia',
    status: 'Available',
    currentLoad: null,
    location: 'Austin, TX',
    utilization: 45,
  },
  {
    id: 3,
    vehicleId: 'TRK-003',
    driver: 'Robert Johnson',
    status: 'In Transit',
    currentLoad: 'Sheep - 120 head',
    location: 'Dallas, TX',
    utilization: 92,
  },
  {
    id: 4,
    vehicleId: 'TRK-004',
    driver: 'Sarah Williams',
    status: 'Maintenance',
    currentLoad: null,
    location: 'Houston Service Center',
    utilization: 0,
  },
];

const recentTrips = [
  {
    id: 1,
    route: 'Austin → Dallas',
    driver: 'John Smith',
    livestock: 'Cattle - 50 head',
    revenue: '$850',
    profit: '$320',
    date: 'Oct 27, 2025',
  },
  {
    id: 2,
    route: 'San Antonio → Houston',
    driver: 'Maria Garcia',
    livestock: 'Sheep - 120 head',
    revenue: '$920',
    profit: '$380',
    date: 'Oct 26, 2025',
  },
  {
    id: 3,
    route: 'Waco → Fort Worth',
    driver: 'Robert Johnson',
    livestock: 'Pigs - 80 head',
    revenue: '$520',
    profit: '$190',
    date: 'Oct 25, 2025',
  },
];

const drivers = [
  {
    id: 1,
    name: 'John Smith',
    status: 'Active',
    trips: 156,
    rating: 4.9,
    earnings: '$45,320',
    license: 'Valid until Dec 2026',
  },
  {
    id: 2,
    name: 'Maria Garcia',
    status: 'Active',
    trips: 203,
    rating: 4.8,
    earnings: '$52,100',
    license: 'Valid until Mar 2026',
  },
  {
    id: 3,
    name: 'Robert Johnson',
    status: 'Active',
    trips: 134,
    rating: 4.7,
    earnings: '$38,900',
    license: 'Valid until Aug 2026',
  },
  {
    id: 4,
    name: 'Sarah Williams',
    status: 'Off Duty',
    trips: 89,
    rating: 4.9,
    earnings: '$28,450',
    license: 'Expires in 30 days',
  },
];

export function HaulerDashboard({ onLogout }: HaulerDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPostTruckOpen, setIsPostTruckOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="LivestockWay" 
              className="h-8"
            />
            <span className="text-lg text-gray-600">Hauler Portal</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onLogout?.()}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-t">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 border-b-0">
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="fleet" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none"
              >
                Fleet
              </TabsTrigger>
              <TabsTrigger 
                value="drivers" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none"
              >
                Drivers
              </TabsTrigger>
              <TabsTrigger 
                value="finance" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none"
              >
                Finance
              </TabsTrigger>
              <TabsTrigger 
                value="compliance" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none"
              >
                Compliance
              </TabsTrigger>
              <TabsTrigger
                value="bookings"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none"
              >
                Bookings
              </TabsTrigger>
              <TabsTrigger
                value="my-loads"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#29CA8D] rounded-none"
                onClick={() => navigate('/hauler/my-loads')}
              >
                My Loads
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        <Tabs value={activeTab} className="w-full">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-0">
            <div>
              <h1 className="text-2xl text-[#172039] mb-1">Dashboard</h1>
              <p className="text-gray-600">Overview of your hauling operations</p>
            </div>

            {/* Post Truck CTA */}
            <Card className="bg-gradient-to-r from-[#29CA8D] to-[#24b67d] text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg mb-1">Have available capacity?</h3>
                    <p className="text-sm text-white/90">
                      Post your truck availability to find loads on your route
                    </p>
                  </div>
                  <Button 
                    size="lg"
                    onClick={() => setIsPostTruckOpen(true)}
                    className="bg-white text-[#29CA8D] hover:bg-gray-100 gap-2 rounded-xl"
                  >
                    <Plus className="w-5 h-5" />
                    Post Truck
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-600">Active Trips</CardTitle>
                    <Truck className="w-5 h-5 text-[#29CA8D]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl text-[#172039] mb-1">8</div>
                  <div className="text-sm text-gray-600">2 pending pickup</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-600">Fleet Utilization</CardTitle>
                    <BarChart3 className="w-5 h-5 text-[#F97316]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl text-[#172039] mb-1">78%</div>
                  <div className="text-sm text-[#29CA8D]">↑ 12% from last week</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-600">Monthly Revenue</CardTitle>
                    <DollarSign className="w-5 h-5 text-[#29CA8D]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl text-[#172039] mb-1">$42,850</div>
                  <div className="text-sm text-[#29CA8D]">↑ $5,200 vs last month</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-600">Avg $/Mile</CardTitle>
                    <TrendingUp className="w-5 h-5 text-[#29CA8D]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl text-[#172039] mb-1">$2.85</div>
                  <div className="text-sm text-gray-600">Industry avg: $2.65</div>
                </CardContent>
              </Card>
            </div>

            {/* Fleet Status */}
            <Card>
              <CardHeader>
                <CardTitle>Fleet Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fleetData.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                          <Truck className="w-6 h-6 text-[#29CA8D]" />
                        </div>
                        <div>
                          <div className="text-base text-gray-900">{vehicle.vehicleId}</div>
                          <div className="text-sm text-gray-600">{vehicle.driver}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-gray-900">
                            {vehicle.currentLoad || 'No active load'}
                          </div>
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {vehicle.location}
                          </div>
                        </div>
                        <Badge 
                          variant={
                            vehicle.status === 'In Transit' ? 'default' :
                            vehicle.status === 'Available' ? 'secondary' :
                            'outline'
                          }
                          className={
                            vehicle.status === 'In Transit' ? 'bg-[#29CA8D]' :
                            vehicle.status === 'Maintenance' ? 'bg-[#F97316] text-white' :
                            ''
                          }
                        >
                          {vehicle.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Trips */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Trips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTrips.map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-base text-gray-900 mb-1">{trip.route}</div>
                        <div className="text-sm text-gray-600">{trip.livestock} • {trip.driver}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base text-[#29CA8D] mb-1">{trip.revenue}</div>
                        <div className="text-sm text-gray-600">Profit: {trip.profit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl text-[#172039] mb-1">Driver Management</h1>
                <p className="text-gray-600">Manage your driver roster and performance</p>
              </div>
              <Button className="bg-[#29CA8D] hover:bg-[#24b67d]">
                <Users className="w-4 h-4 mr-2" />
                Add Driver
              </Button>
            </div>

            <div className="grid gap-4">
              {drivers.map((driver) => (
                <Card key={driver.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-[#29CA8D]/10 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-[#29CA8D]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg text-gray-900">{driver.name}</h3>
                            <Badge variant={driver.status === 'Active' ? 'default' : 'secondary'}>
                              {driver.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                            <div className="text-gray-600">
                              Trips: <span className="text-gray-900">{driver.trips}</span>
                            </div>
                            <div className="text-gray-600">
                              Rating: <span className="text-gray-900">⭐ {driver.rating}</span>
                            </div>
                            <div className="text-gray-600">
                              Earnings: <span className="text-gray-900">{driver.earnings}</span>
                            </div>
                            <div className="text-gray-600 flex items-center gap-1">
                              {driver.license.includes('Expires') && (
                                <AlertCircle className="w-3 h-3 text-[#F97316]" />
                              )}
                              {driver.license}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-6 mt-0">
            <div>
              <h1 className="text-2xl text-[#172039] mb-1">Financial Overview</h1>
              <p className="text-gray-600">Track revenue, expenses, and profitability</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-[#172039]">$128,450</div>
                  <div className="text-sm text-[#29CA8D] mt-1">↑ 18% this quarter</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Operating Costs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-[#172039]">$76,230</div>
                  <div className="text-sm text-gray-600 mt-1">59% of revenue</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Net Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-[#29CA8D]">$52,220</div>
                  <div className="text-sm text-gray-600 mt-1">41% margin</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Vehicle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { vehicle: 'TRK-001', revenue: '$38,200', trips: 45, margin: '43%' },
                    { vehicle: 'TRK-002', revenue: '$32,100', trips: 38, margin: '39%' },
                    { vehicle: 'TRK-003', revenue: '$35,850', trips: 42, margin: '41%' },
                    { vehicle: 'TRK-004', revenue: '$22,300', trips: 28, margin: '38%' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="text-base text-gray-900">{item.vehicle}</div>
                        <div className="text-sm text-gray-600">{item.trips} trips</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base text-[#29CA8D]">{item.revenue}</div>
                        <div className="text-sm text-gray-600">{item.margin} margin</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fleet Tab */}
          <TabsContent value="fleet" className="mt-0 -m-6">
            <FleetManagement />
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="mt-0">
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg mb-2">Compliance Dashboard</h3>
                <p className="text-sm text-gray-600">Documents, certifications, and regulatory compliance</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="bookings" className="mt-0">
            <HaulerBookingsTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Post Truck Dialog */}
      <PostTruckDialog 
        open={isPostTruckOpen}
        onOpenChange={setIsPostTruckOpen}
      />
    </div>
  );
}
