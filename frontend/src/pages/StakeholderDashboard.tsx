import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Wrench, 
  Plus, 
  MapPin, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  Calendar,
  Users,
  TrendingUp,
  Briefcase,
  ShoppingBag
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../components/ui/avatar';

interface Service {
  id: string;
  category: 'washout' | 'feed' | 'vet' | 'fuel' | 'job-listing';
  title: string;
  location: string;
  price: number;
  capacity: string;
  status: 'open' | 'unavailable';
  bookings: number;
}

interface Booking {
  id: string;
  serviceType: string;
  requestedBy: string;
  date: string;
  time: string;
  location: string;
  status: 'pending' | 'accepted' | 'completed';
  price: number;
}

interface MarketplaceListing {
  id: string;
  type: 'job' | 'item';
  title: string;
  price: number;
  location: string;
  category: string;
  status: 'active' | 'sold' | 'closed';
  views: number;
}

export default function StakeholderDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data
  const stats = [
    { label: 'Active Services', value: '4', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Bookings', value: '3', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Completed Jobs', value: '127', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'This Month Revenue', value: '$12,450', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const services: Service[] = [
    {
      id: '1',
      category: 'washout',
      title: 'Premium Livestock Trailer Washout',
      location: 'Denver, CO',
      price: 85,
      capacity: '4 trucks/day',
      status: 'open',
      bookings: 12,
    },
    {
      id: '2',
      category: 'feed',
      title: 'Quality Hay & Feed Supply',
      location: 'Cheyenne, WY',
      price: 45,
      capacity: 'Unlimited',
      status: 'open',
      bookings: 28,
    },
    {
      id: '3',
      category: 'vet',
      title: 'Mobile Veterinary Services',
      location: 'Fort Collins, CO',
      price: 150,
      capacity: '3 calls/day',
      status: 'unavailable',
      bookings: 45,
    },
    {
      id: '4',
      category: 'fuel',
      title: 'Diesel Fuel Station - Highway 25',
      location: 'Colorado Springs, CO',
      price: 3.89,
      capacity: '24/7',
      status: 'open',
      bookings: 156,
    },
  ];

  const bookingRequests: Booking[] = [
    {
      id: '1',
      serviceType: 'Trailer Washout',
      requestedBy: 'Rocky Mountain Transport',
      date: '2025-11-03',
      time: '09:00 AM',
      location: 'Denver, CO',
      status: 'pending',
      price: 85,
    },
    {
      id: '2',
      serviceType: 'Veterinary Check',
      requestedBy: 'Cattle Express LLC',
      date: '2025-11-03',
      time: '02:30 PM',
      location: 'Fort Collins, CO',
      status: 'pending',
      price: 150,
    },
    {
      id: '3',
      serviceType: 'Fuel Stop',
      requestedBy: 'John Smith - Driver',
      date: '2025-11-02',
      time: '11:45 AM',
      location: 'Colorado Springs, CO',
      status: 'pending',
      price: 235,
    },
  ];

  const marketplaceListings: MarketplaceListing[] = [
    {
      id: '1',
      type: 'job',
      title: 'Livestock Handler Needed - Full Time',
      price: 18,
      location: 'Denver, CO',
      category: 'Employment',
      status: 'active',
      views: 45,
    },
    {
      id: '2',
      type: 'item',
      title: 'Used Cattle Panels - Set of 20',
      price: 450,
      location: 'Cheyenne, WY',
      category: 'Equipment',
      status: 'active',
      views: 23,
    },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'washout': return '🚿';
      case 'feed': return '🌾';
      case 'vet': return '🏥';
      case 'fuel': return '⛽';
      case 'job-listing': return '💼';
      default: return '🔧';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
  };

  return (
    <div className="min-h-screen bg-[#D1D5DB]/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-1">Service Provider Dashboard</h1>
            <p className="text-muted-foreground">Manage your services and bookings</p>
          </div>
          <Button className="bg-[#6B7280] hover:bg-[#4B5563]">
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">
              Booking Requests
              {bookingRequests.filter(b => b.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {bookingRequests.filter(b => b.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Service Listings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>My Services</CardTitle>
                    <CardDescription>Manage your service offerings</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-3xl">{getCategoryIcon(service.category)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4>{service.title}</h4>
                            <Badge variant={service.status === 'open' ? 'default' : 'secondary'}>
                              {service.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {service.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {service.bookings} bookings
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              {service.capacity}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="mb-2">
                          ${service.price}
                          <span className="text-sm text-muted-foreground">
                            {service.category === 'fuel' ? '/gal' : '/service'}
                          </span>
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Booking confirmed for Washout Service</span>
                      <span className="text-xs text-muted-foreground ml-auto">2h ago</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">New booking request received</span>
                      <span className="text-xs text-muted-foreground ml-auto">4h ago</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-muted-foreground">Service updated: Fuel Station</span>
                      <span className="text-xs text-muted-foreground ml-auto">1d ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fuel Station</span>
                      <Badge>156 bookings</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Veterinary Services</span>
                      <Badge variant="secondary">45 bookings</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Hay & Feed Supply</span>
                      <Badge variant="secondary">28 bookings</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Booking Requests Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Booking Requests</CardTitle>
                <CardDescription>Review and respond to service booking requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookingRequests.filter(b => b.status === 'pending').map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-orange-200 text-orange-700">
                            {booking.requestedBy.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="mb-1">{booking.serviceType}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Requested by {booking.requestedBy}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {booking.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {booking.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {booking.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg mb-3">${booking.price}</p>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <XCircle className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {bookingRequests.filter(b => b.status === 'pending').length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No pending booking requests</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Confirmed Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Confirmed Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookingRequests.filter(b => b.status === 'accepted').map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>{booking.requestedBy.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="mb-1">{booking.serviceType}</h4>
                          <p className="text-sm text-muted-foreground">{booking.requestedBy}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.date} at {booking.time}
                          </p>
                        </div>
                      </div>
                      <Badge>Confirmed</Badge>
                    </div>
                  ))}
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No confirmed bookings yet</p>
                    <p className="text-sm">Accept pending requests to see them here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>My Marketplace Listings</CardTitle>
                    <CardDescription>Job postings and items for sale</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Post Job
                    </Button>
                    <Button variant="outline" size="sm">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Sell Item
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketplaceListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl">
                          {listing.type === 'job' ? '💼' : '🛒'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4>{listing.title}</h4>
                            <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                              {listing.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{listing.category}</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {listing.location}
                            </span>
                            <span>{listing.views} views</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="mb-2">
                          ${listing.price}
                          <span className="text-sm text-muted-foreground">
                            {listing.type === 'job' ? '/hr' : ''}
                          </span>
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-600">Remove</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
