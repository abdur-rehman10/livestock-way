import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useNavigate } from 'react-router-dom';
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
import { confirmServiceBookingPayment, fetchProviderServiceBookings, respondToServiceBooking, fetchMyServices, updateService, deleteService, uploadServiceImage } from '../api/services';
import { toast } from 'sonner';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const handleAddService = () => navigate('/stakeholder/services/new');
  const [pendingServiceRequests, setPendingServiceRequests] = useState<any[]>([]);
  const [acceptedServiceRequests, setAcceptedServiceRequests] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    service_type: '',
    city: '',
    state: '',
    price_type: 'fixed',
    base_price: '',
    certifications: '',
    insured: false,
  });

  // Mock data
  const stats = [
    { label: 'Active Services', value: '4', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Bookings', value: '3', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Completed Jobs', value: '127', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'This Month Revenue', value: '$12,450', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
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

  const loadProviderBookings = async () => {
    try {
      setIsLoadingBookings(true);
      const [pending, accepted] = await Promise.all([
        fetchProviderServiceBookings({ status: ['pending'] }),
        fetchProviderServiceBookings({ status: ['accepted'] }),
      ]);
      setPendingServiceRequests(pending);
      setAcceptedServiceRequests(accepted);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to load service requests');
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadProviderBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadProviderBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // lightweight polling to keep incoming requests fresh
  useEffect(() => {
    if (activeTab !== 'overview') return;
    const interval = setInterval(() => {
      loadProviderBookings();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // keep booking tab fresh as well
  useEffect(() => {
    if (activeTab !== 'bookings') return;
    const interval = setInterval(() => {
      loadProviderBookings();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadMyServices = async () => {
    try {
      setIsLoadingServices(true);
      const items = await fetchMyServices();
      setServices(items);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to load services');
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadMyServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const openEdit = (service: any) => {
    setEditingService(service);
    setEditForm({
      title: service.title ?? '',
      description: service.description ?? '',
      service_type: service.service_type ?? '',
      city: service.city ?? '',
      state: service.state ?? '',
      price_type: service.price_type ?? 'fixed',
      base_price: service.base_price?.toString() ?? '',
      certifications: service.certifications ?? '',
      insured: Boolean(service.insured),
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingService) return;
    try {
      setEditSubmitting(true);
      const updated = await updateService(editingService.id, {
        title: editForm.title,
        description: editForm.description,
        service_type: editForm.service_type,
        city: editForm.city,
        state: editForm.state,
        price_type: editForm.price_type,
        base_price: editForm.base_price ? Number(editForm.base_price) : null,
        certifications: editForm.certifications,
        insured: editForm.insured,
      });
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success('Service updated');
      setEditOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to update service');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (serviceId: number) => {
    const confirmed = window.confirm('Delete this service?');
    if (!confirmed) return;
    try {
      await deleteService(serviceId);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      toast.success('Service deleted');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to delete service');
    }
  };

  const handleRespond = async (bookingId: number, action: 'accept' | 'reject' | 'complete') => {
    try {
      setRespondingId(bookingId);
      await respondToServiceBooking(bookingId, action);
      await loadProviderBookings();
      toast.success(`Booking ${action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'completed'}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? `Failed to ${action} booking`);
    } finally {
      setRespondingId(null);
    }
  };

  const handleConfirmPayment = async (bookingId: number) => {
    try {
      setRespondingId(bookingId);
      await confirmServiceBookingPayment(bookingId);
      await loadProviderBookings();
      toast.success('Payment confirmed');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to confirm payment');
    } finally {
      setRespondingId(null);
    }
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
          <Button className="bg-[#6B7280] hover:bg-[#4B5563]" onClick={handleAddService}>
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
              {pendingServiceRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingServiceRequests.length}
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
                  <Button variant="outline" size="sm" onClick={handleAddService}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoadingServices ? (
                    <div className="text-sm text-muted-foreground">Loading services...</div>
                  ) : services.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No services yet. Post one to get started.</div>
                  ) : (
                    services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          {service.images?.length ? (
                            <img
                              src={service.images[0]}
                              alt={service.title}
                              className="h-12 w-12 rounded-lg object-cover border"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-lg">
                              {getCategoryIcon(service.service_type)}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4>{service.title}</h4>
                              <Badge variant="secondary" className="capitalize">{service.price_type}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              {service.city ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {service.city}{service.state ? `, ${service.state}` : ''}
                                </span>
                              ) : null}
                              {service.base_price ? (
                                <span>${service.base_price}</span>
                              ) : null}
                              {service.insured ? <Badge variant="outline">Insured</Badge> : null}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(service)}>Edit</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(service.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Service Requests */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Service Requests</CardTitle>
                    <CardDescription>Incoming requests awaiting your response</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {isLoadingBookings ? 'Loading...' : `${pendingServiceRequests.length} pending`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingBookings ? (
                  <div className="text-sm text-muted-foreground">Loading requests...</div>
                ) : pendingServiceRequests.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No requests yet.</div>
                ) : (
                  pendingServiceRequests.map((booking) => {
                    const status = String(booking.status ?? '').toLowerCase();
                    const paymentStatus = String(booking.payment_status ?? '').toLowerCase();
                    const canAcceptReject = status === 'pending';
                    const canComplete = status === 'accepted' && paymentStatus === 'paid';

                    return (
                    <div
                      key={booking.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{booking.service?.title ?? 'Service'}</h4>
                          <Badge variant="secondary" className="capitalize">
                            {booking.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Location: {booking.service?.city ? `${booking.service.city}${booking.service.state ? `, ${booking.service.state}` : ''}` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Payment: {booking.payment_status}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRespond(booking.id, 'complete')}
                          disabled={
                            respondingId === booking.id || !canComplete
                          }
                        >
                          Mark Complete
                        </Button>
                        {status === 'accepted' && (paymentStatus === 'sent' || paymentStatus === 'pending') ? (
                          <Button
                            size="sm"
                            className="bg-[#303845] hover:bg-[#1f2735]"
                            onClick={() => handleConfirmPayment(booking.id)}
                            disabled={respondingId === booking.id}
                          >
                            Confirm Payment
                          </Button>
                        ) : null}
                        {canAcceptReject ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleRespond(booking.id, 'accept')}
                              disabled={respondingId === booking.id}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRespond(booking.id, 'reject')}
                              disabled={respondingId === booking.id}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    );
                  })
                )}
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
                  {pendingServiceRequests.map((booking: any) => {
                    const requestedBy =
                      booking.hauler_company || booking.hauler_name || 'Hauler';
                    const createdAt = booking.created_at ? new Date(booking.created_at) : null;
                    const dateLabel = createdAt ? createdAt.toLocaleDateString() : '—';
                    const timeLabel = createdAt
                      ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—';
                    const locationLabel = booking.service?.city
                      ? `${booking.service.city}${booking.service.state ? `, ${booking.service.state}` : ''}`
                      : '—';
                    const priceLabel = booking.price ?? booking.service?.base_price ?? null;
                    return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-orange-200 text-orange-700">
                            {requestedBy.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="mb-1">{booking.service?.title ?? 'Service request'}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Requested by {requestedBy}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {dateLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {timeLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {locationLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg mb-3">{priceLabel !== null ? `$${priceLabel}` : 'Request Quote'}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Payment: {booking.payment_status}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleRespond(booking.id, 'accept')}
                            disabled={respondingId === booking.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRespond(booking.id, 'reject')}
                            disabled={respondingId === booking.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                    );
                  })}

                  {pendingServiceRequests.length === 0 && (
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
                  {acceptedServiceRequests.map((booking: any) => {
                    const requestedBy =
                      booking.hauler_company || booking.hauler_name || 'Hauler';
                    const createdAt = booking.created_at ? new Date(booking.created_at) : null;
                    const dateLabel = createdAt ? createdAt.toLocaleDateString() : '—';
                    const timeLabel = createdAt
                      ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—';
                    return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>{requestedBy.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="mb-1">{booking.service?.title ?? 'Service booking'}</h4>
                          <p className="text-sm text-muted-foreground">{requestedBy}</p>
                          <p className="text-sm text-muted-foreground">
                            {dateLabel} at {timeLabel}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>Confirmed</Badge>
                        <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {booking.payment_status}
                        </Badge>
                      </div>
                    </div>
                    );
                  })}
                  {acceptedServiceRequests.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No confirmed bookings yet</p>
                      <p className="text-sm">Accept pending requests to see them here</p>
                    </div>
                  )}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update service details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Service Type</Label>
                <Input
                  value={editForm.service_type}
                  onChange={(e) => setEditForm((f) => ({ ...f, service_type: e.target.value }))}
                  placeholder="e.g., washout"
                />
              </div>
              <div className="space-y-1">
                <Label>Price Type</Label>
                <Select
                  value={editForm.price_type}
                  onValueChange={(val) => setEditForm((f) => ({ ...f, price_type: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="quote">Request Quote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Base Price</Label>
                <Input
                  type="number"
                  value={editForm.base_price}
                  onChange={(e) => setEditForm((f) => ({ ...f, base_price: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="City"
                    value={editForm.city}
                    onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                  />
                  <Input
                    placeholder="State"
                    value={editForm.state}
                    onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Certifications</Label>
              <Textarea
                rows={2}
                value={editForm.certifications}
                onChange={(e) => setEditForm((f) => ({ ...f, certifications: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={editForm.insured}
                onCheckedChange={(checked) => setEditForm((f) => ({ ...f, insured: !!checked }))}
              />
              <Label>Fully Insured & Bonded</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
