import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { deleteService, fetchMyServices, updateService } from '../api/services';
import type { ServiceListing } from '../api/services';
import { MapPin, Plus, Moon, Sun } from 'lucide-react';

export default function StakeholderServices() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [items, setItems] = useState<ServiceListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceListing | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    service_type: '',
    location_name: '',
    street_address: '',
    city: '',
    state: '',
    zip: '',
    price_type: 'fixed',
    base_price: '',
    availability: '',
    response_time: '',
    certifications: '',
    insured: false,
  });

  const load = async () => {
    try {
      setIsLoading(true);
      const list = await fetchMyServices();
      setItems(list);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (service: ServiceListing) => {
    setEditing(service);
    setEditForm({
      title: service.title ?? '',
      description: service.description ?? '',
      service_type: service.service_type ?? '',
      location_name: service.location_name ?? '',
      street_address: service.street_address ?? '',
      city: service.city ?? '',
      state: service.state ?? '',
      zip: service.zip ?? '',
      price_type: service.price_type ?? 'fixed',
      base_price: service.base_price?.toString() ?? '',
      availability: service.availability ?? '',
      response_time: service.response_time ?? '',
      certifications: service.certifications ?? '',
      insured: Boolean(service.insured),
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const updated = await updateService(editing.id, {
        title: editForm.title,
        description: editForm.description,
        service_type: editForm.service_type,
        location_name: editForm.location_name,
        street_address: editForm.street_address,
        city: editForm.city,
        state: editForm.state,
        zip: editForm.zip,
        price_type: editForm.price_type,
        base_price: editForm.base_price ? Number(editForm.base_price) : null,
        availability: editForm.availability,
        response_time: editForm.response_time,
        certifications: editForm.certifications,
        insured: editForm.insured,
      });
      setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success('Service updated');
      setEditOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to update service');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (serviceId: number) => {
    const ok = window.confirm('Delete this service?');
    if (!ok) return;
    try {
      await deleteService(serviceId);
      setItems((prev) => prev.filter((s) => s.id !== serviceId));
      toast.success('Service deleted');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to delete service');
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  My Services
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                  Manage your service listings
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDarkMode(!darkMode)}
                  className="shrink-0 size-9 sm:size-10 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? (
                    <Sun className="size-4 sm:size-5 text-slate-600 dark:text-slate-300" />
                  ) : (
                    <Moon className="size-4 sm:size-5 text-slate-600" />
                  )}
                </Button>
                <Button
                  className="h-9 sm:h-10 bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-sm sm:text-base px-3 sm:px-4"
                  onClick={() => navigate('/stakeholder/services/new')}
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Post a Service</span>
                  <span className="sm:hidden">Post</span>
                </Button>
              </div>
            </div>

            {/* Services Card */}
            <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 shadow-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg text-slate-900 dark:text-slate-100">
                  Listings
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm dark:text-slate-400">
                  {isLoading ? 'Loading…' : `${items.length} service${items.length === 1 ? '' : 's'}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                {isLoading ? (
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                    Loading services...
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                    No services yet. Click "Post a Service" to create one.
                  </div>
                ) : (
                  items.map((service) => (
                    <div
                      key={service.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:p-4 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        {service.images?.length ? (
                          <img
                            src={service.images[0]}
                            alt={service.title}
                            className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 text-xs sm:text-sm font-semibold">
                            {service.service_type?.slice(0, 2)?.toUpperCase() || 'SV'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 break-words">
                              {service.title}
                            </h3>
                            {service.price_type ? (
                              <Badge 
                                variant="secondary" 
                                className="capitalize text-xs dark:bg-slate-700 dark:text-slate-200"
                              >
                                {service.price_type}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            {service.city ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                                <span className="truncate">
                                  {service.city}
                                  {service.state ? `, ${service.state}` : ''}
                                </span>
                              </span>
                            ) : null}
                            {service.base_price ? (
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                ${service.base_price}
                              </span>
                            ) : null}
                            {service.insured ? (
                              <Badge 
                                variant="outline" 
                                className="text-xs dark:border-slate-600 dark:text-slate-300"
                              >
                                Insured
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openEdit(service)}
                          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                          onClick={() => onDelete(service.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="max-w-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">       
           <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-lg sm:text-xl dark:text-slate-100">
              Edit Service
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm dark:text-slate-400">
              Update your listing details
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 px-1 sm:px-6 py-4">
            <div className="space-y-4 sm:space-y-5">
              {/* Basic Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Basic Information</h3>
                
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">Service Name *</Label>
                  <Input 
                    value={editForm.title} 
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g., Premium Trailer Washout Service"
                    className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">Service Type *</Label>
                  <Select value={editForm.service_type} onValueChange={(v) => setEditForm((f) => ({ ...f, service_type: v }))}>
                    <SelectTrigger className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                      <SelectItem value="washout" className="dark:text-slate-100 dark:focus:bg-slate-700">Washout Services</SelectItem>
                      <SelectItem value="vet" className="dark:text-slate-100 dark:focus:bg-slate-700">Veterinary Services</SelectItem>
                      <SelectItem value="feed" className="dark:text-slate-100 dark:focus:bg-slate-700">Feed Services</SelectItem>
                      <SelectItem value="equipment_rental" className="dark:text-slate-100 dark:focus:bg-slate-700">Equipment Rental</SelectItem>
                      <SelectItem value="maintenance_repair" className="dark:text-slate-100 dark:focus:bg-slate-700">Maintenance & Repair</SelectItem>
                      <SelectItem value="other" className="dark:text-slate-100 dark:focus:bg-slate-700">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">Description *</Label>
                  <Textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe your service, what's included, and any special features..."
                    className="text-sm resize-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Service Location</h3>
                
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">Location Name *</Label>
                  <Input
                    value={editForm.location_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, location_name: e.target.value }))}
                    placeholder="e.g., Main Facility"
                    className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">Street Address *</Label>
                  <Input
                    value={editForm.street_address}
                    onChange={(e) => setEditForm((f) => ({ ...f, street_address: e.target.value }))}
                    placeholder="123 Service Road"
                    className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm dark:text-slate-200">City *</Label>
                    <Input
                      placeholder="City"
                      value={editForm.city}
                      onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                      className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm dark:text-slate-200">State *</Label>
                    <Input
                      placeholder="State"
                      value={editForm.state}
                      onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                      className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">ZIP Code *</Label>
                  <Input
                    value={editForm.zip}
                    onChange={(e) => setEditForm((f) => ({ ...f, zip: e.target.value }))}
                    placeholder="12345"
                    className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pricing</h3>
                
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">Price Type *</Label>
                  <Select value={editForm.price_type} onValueChange={(v) => setEditForm((f) => ({ ...f, price_type: v }))}>
                    <SelectTrigger className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100">
                      <SelectValue placeholder="Select price type" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                      <SelectItem value="fixed" className="dark:text-slate-100 dark:focus:bg-slate-700">Fixed Price</SelectItem>
                      <SelectItem value="hourly" className="dark:text-slate-100 dark:focus:bg-slate-700">Hourly Rate</SelectItem>
                      <SelectItem value="quote" className="dark:text-slate-100 dark:focus:bg-slate-700">Request Quote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editForm.price_type !== 'quote' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm dark:text-slate-200">
                      {editForm.price_type === 'hourly' ? 'Hourly Rate' : 'Base Price'} *
                    </Label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
                        <span className="text-sm">$</span>
                      </div>
                      <Input
                        type="number"
                        value={editForm.base_price}
                        onChange={(e) => setEditForm((f) => ({ ...f, base_price: e.target.value }))}
                        placeholder={editForm.price_type === 'hourly' ? '75.00' : '150.00'}
                        className="h-9 sm:h-10 pl-7 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Availability</h3>
                
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">Service Hours *</Label>
                  <Select value={editForm.availability} onValueChange={(v) => setEditForm((f) => ({ ...f, availability: v }))}>
                    <SelectTrigger className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100">
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                      <SelectItem value="24_7" className="dark:text-slate-100 dark:focus:bg-slate-700">24/7</SelectItem>
                      <SelectItem value="business_hours" className="dark:text-slate-100 dark:focus:bg-slate-700">Business Hours Only</SelectItem>
                      <SelectItem value="weekdays" className="dark:text-slate-100 dark:focus:bg-slate-700">Weekdays Only</SelectItem>
                      <SelectItem value="appointment" className="dark:text-slate-100 dark:focus:bg-slate-700">By Appointment</SelectItem>
                      <SelectItem value="emergency" className="dark:text-slate-100 dark:focus:bg-slate-700">Emergency Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">Response Time *</Label>
                  <Input
                    value={editForm.response_time}
                    onChange={(e) => setEditForm((f) => ({ ...f, response_time: e.target.value }))}
                    placeholder="e.g., Within 2 hours"
                    className="h-9 sm:h-10 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Credentials */}
              <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Credentials</h3>
                
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm dark:text-slate-200">Certifications & Licenses</Label>
                  <Textarea
                    rows={3}
                    value={editForm.certifications}
                    onChange={(e) => setEditForm((f) => ({ ...f, certifications: e.target.value }))}
                    placeholder="List any relevant certifications, licenses, or qualifications..."
                    className="text-sm resize-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editForm.insured}
                    onCheckedChange={(checked) => setEditForm((f) => ({ ...f, insured: !!checked }))}
                    className="dark:border-slate-500 dark:data-[state=checked]:bg-slate-700"
                  />
                  <Label className="text-xs sm:text-sm dark:text-slate-200 cursor-pointer">
                    Fully Insured & Bonded
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 flex-col sm:flex-row gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => setEditOpen(false)} 
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveEdit} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}