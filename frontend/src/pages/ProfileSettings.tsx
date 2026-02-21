import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Bell,
  Lock,
  Building2,
  Save,
  Camera,
  ArrowLeft,
  Upload,
  Loader2,
  Truck,
  CheckCircle,
} from 'lucide-react';
import { toast, swalConfirm } from '../lib/swal';
import { fetchHaulerProfile, updateHaulerProfile } from '../api/marketplace';
import { fetchShipperProfile, updateShipperProfile } from '../api/marketplace';
import { fetchStakeholderProfile, updateStakeholderProfile } from '../api/marketplace';
import { API_BASE_URL } from '../lib/api';
import { storage, STORAGE_KEYS } from '../lib/storage';

interface ProfileSettingsProps {
  role?: 'driver' | 'shipper' | 'hauler' | 'stakeholder';
  onBack?: () => void;
}

export function ProfileSettings({ role = 'driver', onBack }: ProfileSettingsProps) {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    profilePhotoUrl: null as string | null,
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Hauler-specific state
  const [haulerInfo, setHaulerInfo] = useState({
    companyName: '',
    driverType: '',
    yearsInBusiness: '',
    truckCount: '',
    livestockTypes: [] as string[],
    routePreferences: '',
    availabilityStatus: '',
    acceptEscrow: false,
    digitalCompliance: false,
    legalName: '',
    dotNumber: '',
    taxId: '',
    websiteUrl: '',
  });

  // Shipper-specific state
  const [shipperInfo, setShipperInfo] = useState({
    farmName: '',
    shipperRole: '',
    livestockTypes: [] as string[],
    shippingFrequency: '',
    averageHeadCount: '',
    loadingFacilities: [] as string[],
    commonRoutes: '',
    requireTracking: false,
    useEscrow: false,
    monitorCameras: false,
    registrationId: '',
    companyName: '',
  });

  // Stakeholder-specific state
  const [stakeholderInfo, setStakeholderInfo] = useState({
    roleInBusiness: '',
    companyName: '',
    providerType: '',
    businessAddress: '',
    yearsInBusiness: '',
    serviceType: '',
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    sms_notifications: true,
    new_load_posted: true,
    new_truck_posted: true,
    offer_received: true,
    new_message: true,
    contract_updates: true,
    trip_updates: true,
    payment_alerts: true,
    marketing_emails: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        if (role === 'shipper') {
          const data = await fetchShipperProfile();
          setProfile({
            name: data.full_name || '',
            email: data.email || '',
            phone: data.phone_number || '',
            address: data.country || '',
            profilePhotoUrl: data.profile_photo_url || null,
          });
          setShipperInfo({
            farmName: data.farm_name || '',
            registrationId: data.registration_id || '',
            companyName: data.company_name || '',
            shipperRole: data.shipper_role || '',
            livestockTypes: data.livestock_types || [],
            shippingFrequency: data.shipping_frequency || '',
            averageHeadCount: data.average_head_count || '',
            loadingFacilities: data.loading_facilities || [],
            commonRoutes: data.common_routes || '',
            requireTracking: Boolean(data.require_tracking),
            useEscrow: Boolean(data.use_escrow),
            monitorCameras: Boolean(data.monitor_cameras),
          });
          if (data.profile_photo_url) storage.set(STORAGE_KEYS.USER_PHOTO, data.profile_photo_url);
          if (data.full_name) storage.set(STORAGE_KEYS.USER_NAME, data.full_name);
        } else if (role === 'hauler') {
          const data = await fetchHaulerProfile();
          setProfile({
            name: data.full_name || '',
            email: data.email || '',
            phone: data.phone_number || '',
            address: data.country || '',
            profilePhotoUrl: data.profile_photo_url || null,
          });
          setHaulerInfo({
            companyName: data.company_name || '',
            legalName: data.legal_name || '',
            dotNumber: data.dot_number || '',
            taxId: data.tax_id || '',
            websiteUrl: data.website_url || '',
            driverType: data.hauler_type || '',
            yearsInBusiness: data.years_in_business || '',
            truckCount: data.truck_count || '',
            livestockTypes: data.livestock_types || [],
            routePreferences: data.route_preferences || '',
            availabilityStatus: data.availability_status || '',
            acceptEscrow: Boolean(data.accept_escrow),
            digitalCompliance: Boolean(data.digital_compliance),
          });
          if (data.profile_photo_url) storage.set(STORAGE_KEYS.USER_PHOTO, data.profile_photo_url);
          if (data.full_name) storage.set(STORAGE_KEYS.USER_NAME, data.full_name);
        } else if (role === 'stakeholder') {
          const data = await fetchStakeholderProfile();
          setProfile({
            name: data.full_name || '',
            email: data.email || '',
            phone: data.phone_number || '',
            address: data.country || '',
            profilePhotoUrl: data.profile_photo_url || null,
          });
          setStakeholderInfo({
            companyName: data.company_name || '',
            roleInBusiness: data.role_in_business || '',
            providerType: data.provider_type || '',
            businessAddress: data.business_address || '',
            yearsInBusiness: data.years_in_business || '',
            serviceType: data.service_type || '',
          });
          if (data.profile_photo_url) storage.set(STORAGE_KEYS.USER_PHOTO, data.profile_photo_url);
          if (data.full_name) storage.set(STORAGE_KEYS.USER_NAME, data.full_name);
        } else {
          setLoading(false);
          return;
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    if (role === 'shipper' || role === 'hauler' || role === 'stakeholder') {
      loadProfile();
    } else {
      setLoading(false);
    }
    // Load notification preferences for all roles
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/auth/notification-preferences`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(prev => ({ ...prev, ...data }));
        }
      } catch { /* use defaults */ }
    })();
  }, [role]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      setUploadingPhoto(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/uploads/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const photoUrl = data.url;
      setProfile(prev => ({ ...prev, profilePhotoUrl: photoUrl }));

      if (role === 'hauler') await updateHaulerProfile({ profile_photo_url: photoUrl } as any);
      else if (role === 'shipper') await updateShipperProfile({ profile_photo_url: photoUrl } as any);
      else if (role === 'stakeholder') await updateStakeholderProfile({ profile_photo_url: photoUrl } as any);

      storage.set(STORAGE_KEYS.USER_PHOTO, photoUrl);
      toast.success('Photo updated!');
    } catch (err: any) {
      toast.error('Failed to upload photo');
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resolvePhotoSrc = () => {
    if (photoPreview) return photoPreview;
    if (profile.profilePhotoUrl) {
      return profile.profilePhotoUrl.startsWith('http')
        ? profile.profilePhotoUrl
        : `${API_BASE_URL}${profile.profilePhotoUrl}`;
    }
    return null;
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      if (role === 'hauler') {
        await updateHaulerProfile({
          full_name: profile.name,
          phone_number: profile.phone,
          country: profile.address,
          company_name: haulerInfo.companyName,
          legal_name: haulerInfo.legalName,
          dot_number: haulerInfo.dotNumber,
          tax_id: haulerInfo.taxId,
          website_url: haulerInfo.websiteUrl,
          hauler_type: haulerInfo.driverType,
          years_in_business: haulerInfo.yearsInBusiness,
          truck_count: haulerInfo.truckCount,
          livestock_types: haulerInfo.livestockTypes,
          route_preferences: haulerInfo.routePreferences,
          availability_status: haulerInfo.availabilityStatus,
          accept_escrow: haulerInfo.acceptEscrow,
          digital_compliance: haulerInfo.digitalCompliance,
        });
      } else if (role === 'shipper') {
        await updateShipperProfile({
          full_name: profile.name,
          phone_number: profile.phone,
          country: profile.address,
          farm_name: shipperInfo.farmName,
          company_name: shipperInfo.companyName || shipperInfo.farmName,
          registration_id: shipperInfo.registrationId,
          shipper_role: shipperInfo.shipperRole,
          livestock_types: shipperInfo.livestockTypes,
          shipping_frequency: shipperInfo.shippingFrequency,
          average_head_count: shipperInfo.averageHeadCount,
          loading_facilities: shipperInfo.loadingFacilities,
          common_routes: shipperInfo.commonRoutes,
          require_tracking: shipperInfo.requireTracking,
          use_escrow: shipperInfo.useEscrow,
          monitor_cameras: shipperInfo.monitorCameras,
        });
      } else if (role === 'stakeholder') {
        await updateStakeholderProfile({
          full_name: profile.name,
          phone_number: profile.phone,
          country: profile.address,
          company_name: stakeholderInfo.companyName,
          role_in_business: stakeholderInfo.roleInBusiness,
          provider_type: stakeholderInfo.providerType,
          business_address: stakeholderInfo.businessAddress,
          years_in_business: stakeholderInfo.yearsInBusiness,
          service_type: stakeholderInfo.serviceType,
        });
      }
      if (profile.name) storage.set(STORAGE_KEYS.USER_NAME, profile.name);
      if (profile.email) storage.set(STORAGE_KEYS.USER_EMAIL, profile.email);
      toast.success('Profile saved successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSavingNotifications(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/auth/notification-preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(notifications),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Failed to save preferences');
      }
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save preferences');
    } finally {
      setSavingNotifications(false);
    }
  };

  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!security.currentPassword) { toast.error('Please enter your current password'); return; }
    if (security.newPassword !== security.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (security.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }

    try {
      setChangingPassword(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          current_password: security.currentPassword,
          new_password: security.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to change password');

      toast.success('Password changed successfully');
      setSecurity({ ...security, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await swalConfirm({
      title: 'Delete Account',
      text: 'Are you sure you want to delete your account? This action cannot be undone.',
      confirmText: 'Yes, delete my account',
    });
    if (confirmed) toast.error('Account deletion requested. You will receive a confirmation email.');
  };

  const handleLivestockToggle = (type: string, forRole: 'hauler' | 'shipper') => {
    if (forRole === 'hauler') {
      setHaulerInfo(prev => ({
        ...prev,
        livestockTypes: prev.livestockTypes.includes(type) ? prev.livestockTypes.filter(t => t !== type) : [...prev.livestockTypes, type],
      }));
    } else {
      setShipperInfo(prev => ({
        ...prev,
        livestockTypes: prev.livestockTypes.includes(type) ? prev.livestockTypes.filter(t => t !== type) : [...prev.livestockTypes, type],
      }));
    }
  };

  const handleLoadingFacilityToggle = (facility: string) => {
    setShipperInfo(prev => ({
      ...prev,
      loadingFacilities: prev.loadingFacilities.includes(facility) ? prev.loadingFacilities.filter(f => f !== facility) : [...prev.loadingFacilities, facility],
    }));
  };

  const livestockOptions = ['Cattle', 'Horses', 'Sheep', 'Goats', 'Pigs', 'Poultry'];
  const loadingFacilityOptions = ['Loading Chute', 'Ramp', 'Hydraulic Lift', 'Ground Level', 'None'];
  const selectClasses = "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#53ca97]";

  const renderCheckboxGrid = (items: string[], selected: string[], toggle: (item: string) => void) => (
    <div className="grid grid-cols-2 gap-2">
      {items.map(item => (
        <label key={item} className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} className="w-4 h-4 rounded" style={{ accentColor: '#53ca97' }} />
          <span className="text-sm">{item}</span>
        </label>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const photoSrc = resolvePhotoSrc();
  const roleLabel = role === 'hauler' ? 'Hauler' : role === 'shipper' ? 'Shipper' : role === 'stakeholder' ? 'Service Provider' : 'Driver';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => onBack?.()} disabled={!onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl text-[#172039]">Profile & Settings</h1>
            <p className="text-sm text-gray-600">Manage your account preferences</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Profile Photo Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
                  {uploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  ) : photoSrc ? (
                    <img src={photoSrc} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#29CA8D] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#24b67d] transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handlePhotoUpload} className="hidden" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl text-gray-900">{profile.name || 'Your Name'}</h2>
                <p className="text-sm text-gray-600">{profile.email || 'your@email.com'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-[#29CA8D] text-white">{roleLabel}</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2 self-start" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
                {uploadingPhoto ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> {photoSrc ? 'Change' : 'Upload'}</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="personal">Profile</TabsTrigger>
            <TabsTrigger value="business">
              {role === 'hauler' ? 'Hauler Details' : role === 'shipper' ? 'Shipping Details' : role === 'stakeholder' ? 'Provider Details' : 'Business'}
            </TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* ─── PERSONAL TAB ─── */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="pl-10" placeholder="Enter your full name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="email" type="email" value={profile.email} disabled className="pl-10 bg-gray-50 text-gray-600 cursor-not-allowed" />
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#29CA8D]" />
                  </div>
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="pl-10" placeholder="+1 (555) 000-0000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Primary Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="pl-10" placeholder="e.g., Dallas, TX" />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-[#29CA8D] hover:bg-[#24b67d]">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── BUSINESS / ROLE TAB ─── */}
          <TabsContent value="business" className="space-y-4 mt-4">

            {/* ── HAULER ── */}
            {role === 'hauler' && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="w-5 h-5" /> Hauler Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Business Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input value={haulerInfo.companyName} onChange={(e) => setHaulerInfo({ ...haulerInfo, companyName: e.target.value })} className="pl-10" placeholder="Your business name" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Driver Type</Label>
                      <select value={haulerInfo.driverType} onChange={(e) => setHaulerInfo({ ...haulerInfo, driverType: e.target.value })} className={selectClasses}>
                        <option value="">Select driver type</option>
                        <option value="Owner-operator">Owner-operator</option>
                        <option value="Independent Contractor">Independent Contractor</option>
                        <option value="Part-time">Part-time</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Years in Business</Label>
                        <Input value={haulerInfo.yearsInBusiness} onChange={(e) => setHaulerInfo({ ...haulerInfo, yearsInBusiness: e.target.value })} placeholder="e.g., 5" />
                      </div>
                      <div className="space-y-2">
                        <Label>Truck Count</Label>
                        <Input type="number" value={haulerInfo.truckCount} onChange={(e) => setHaulerInfo({ ...haulerInfo, truckCount: e.target.value })} placeholder="e.g., 3" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Legal Name</Label>
                      <Input value={haulerInfo.legalName} onChange={(e) => setHaulerInfo({ ...haulerInfo, legalName: e.target.value })} placeholder="Legal entity name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>DOT Number</Label>
                        <Input value={haulerInfo.dotNumber} onChange={(e) => setHaulerInfo({ ...haulerInfo, dotNumber: e.target.value })} placeholder="DOT number" />
                      </div>
                      <div className="space-y-2">
                        <Label>Tax ID</Label>
                        <Input value={haulerInfo.taxId} onChange={(e) => setHaulerInfo({ ...haulerInfo, taxId: e.target.value })} placeholder="Tax ID / EIN" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Website URL</Label>
                      <Input value={haulerInfo.websiteUrl} onChange={(e) => setHaulerInfo({ ...haulerInfo, websiteUrl: e.target.value })} placeholder="https://yourwebsite.com" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Livestock & Routes</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Livestock Types Hauled</Label>
                      {renderCheckboxGrid(livestockOptions, haulerInfo.livestockTypes, (t) => handleLivestockToggle(t, 'hauler'))}
                    </div>
                    <div className="space-y-2">
                      <Label>Route Preferences</Label>
                      <Textarea value={haulerInfo.routePreferences} onChange={(e) => setHaulerInfo({ ...haulerInfo, routePreferences: e.target.value })} placeholder="e.g., Texas to Oklahoma, Midwest routes..." rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>Availability</Label>
                      <Input value={haulerInfo.availabilityStatus} onChange={(e) => setHaulerInfo({ ...haulerInfo, availabilityStatus: e.target.value })} placeholder="e.g., Weekdays, 24/7" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Hauler Preferences</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div><div className="text-sm font-medium">Accept Escrow Payments</div><div className="text-xs text-gray-500">Secure payment through platform escrow</div></div>
                      <Switch checked={haulerInfo.acceptEscrow} onCheckedChange={(v) => setHaulerInfo({ ...haulerInfo, acceptEscrow: v })} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div><div className="text-sm font-medium">Digital Compliance Ready</div><div className="text-xs text-gray-500">ELD, digital logs, and tracking tools</div></div>
                      <Switch checked={haulerInfo.digitalCompliance} onCheckedChange={(v) => setHaulerInfo({ ...haulerInfo, digitalCompliance: v })} />
                    </div>
                  </CardContent>
                </Card>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-[#29CA8D] hover:bg-[#24b67d]">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Hauler Details
                </Button>
              </>
            )}

            {/* ── SHIPPER ── */}
            {role === 'shipper' && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base">Shipper Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select value={shipperInfo.shipperRole} onChange={(e) => setShipperInfo({ ...shipperInfo, shipperRole: e.target.value })} className={selectClasses}>
                        <option value="">Select your role</option>
                        <option value="Rancher">Rancher</option>
                        <option value="Farm Manager">Farm Manager</option>
                        <option value="Livestock Owner">Livestock Owner</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Farm / Business Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input value={shipperInfo.farmName} onChange={(e) => setShipperInfo({ ...shipperInfo, farmName: e.target.value })} className="pl-10" placeholder="Your farm or business name" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Registration ID</Label>
                      <Input value={shipperInfo.registrationId} onChange={(e) => setShipperInfo({ ...shipperInfo, registrationId: e.target.value })} placeholder="Business registration ID" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Shipping Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Livestock Types (Most frequently shipped)</Label>
                      {renderCheckboxGrid(livestockOptions, shipperInfo.livestockTypes, (t) => handleLivestockToggle(t, 'shipper'))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Shipping Frequency</Label>
                        <select value={shipperInfo.shippingFrequency} onChange={(e) => setShipperInfo({ ...shipperInfo, shippingFrequency: e.target.value })} className={selectClasses}>
                          <option value="">Select frequency</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Seasonal">Seasonal</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Avg. Head Count</Label>
                        <Input value={shipperInfo.averageHeadCount} onChange={(e) => setShipperInfo({ ...shipperInfo, averageHeadCount: e.target.value })} placeholder="e.g., 50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Loading Facilities</Label>
                      {renderCheckboxGrid(loadingFacilityOptions, shipperInfo.loadingFacilities, handleLoadingFacilityToggle)}
                    </div>
                    <div className="space-y-2">
                      <Label>Most Common Routes</Label>
                      <Textarea value={shipperInfo.commonRoutes} onChange={(e) => setShipperInfo({ ...shipperInfo, commonRoutes: e.target.value })} placeholder="e.g., Farm to Kansas City Stockyards" rows={2} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Shipper Preferences</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div><div className="text-sm font-medium">Require Live Tracking</div><div className="text-xs text-gray-500">GPS tracking during transport</div></div>
                      <Switch checked={shipperInfo.requireTracking} onCheckedChange={(v) => setShipperInfo({ ...shipperInfo, requireTracking: v })} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div><div className="text-sm font-medium">Use Secure Escrow</div><div className="text-xs text-gray-500">Payment held until delivery confirmed</div></div>
                      <Switch checked={shipperInfo.useEscrow} onCheckedChange={(v) => setShipperInfo({ ...shipperInfo, useEscrow: v })} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div><div className="text-sm font-medium">Monitor via Live Cameras</div><div className="text-xs text-gray-500">In-trailer camera access</div></div>
                      <Switch checked={shipperInfo.monitorCameras} onCheckedChange={(v) => setShipperInfo({ ...shipperInfo, monitorCameras: v })} />
                    </div>
                  </CardContent>
                </Card>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-[#29CA8D] hover:bg-[#24b67d]">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Shipping Details
                </Button>
              </>
            )}

            {/* ── STAKEHOLDER / RESOURCE PROVIDER ── */}
            {role === 'stakeholder' && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base">Provider Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Role in Business</Label>
                      <select value={stakeholderInfo.roleInBusiness} onChange={(e) => setStakeholderInfo({ ...stakeholderInfo, roleInBusiness: e.target.value })} className={selectClasses}>
                        <option value="">Select your role</option>
                        <option value="Owner">Owner</option>
                        <option value="Manager">Manager</option>
                        <option value="Operator">Operator</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Business Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input value={stakeholderInfo.companyName} onChange={(e) => setStakeholderInfo({ ...stakeholderInfo, companyName: e.target.value })} className="pl-10" placeholder="Your business name" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Provider Type</Label>
                      <select value={stakeholderInfo.providerType} onChange={(e) => setStakeholderInfo({ ...stakeholderInfo, providerType: e.target.value })} className={selectClasses}>
                        <option value="">Select provider type</option>
                        <option value="Hay Provider">Hay Provider</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Weight Station">Weight Station</option>
                        <option value="Washout Facility">Washout Facility</option>
                        <option value="Vet Services">Vet Services</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Business Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input value={stakeholderInfo.businessAddress} onChange={(e) => setStakeholderInfo({ ...stakeholderInfo, businessAddress: e.target.value })} className="pl-10" placeholder="Full business address" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Years in Business</Label>
                      <Input value={stakeholderInfo.yearsInBusiness} onChange={(e) => setStakeholderInfo({ ...stakeholderInfo, yearsInBusiness: e.target.value })} placeholder="e.g., 15" />
                    </div>
                  </CardContent>
                </Card>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-[#29CA8D] hover:bg-[#24b67d]">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Provider Details
                </Button>
              </>
            )}

            {role === 'driver' && (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Business details will be available soon.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── PREFERENCES TAB ─── */}
          <TabsContent value="preferences" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-5 h-5" /> Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {/* Master toggle */}
                <div className="p-3 rounded-lg border-2 border-[#29CA8D]/30 bg-[#29CA8D]/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Email Notifications</div>
                      <div className="text-xs text-gray-600">Master toggle — turn off to disable all email notifications</div>
                    </div>
                    <Switch checked={notifications.email_notifications} onCheckedChange={(v) => setNotifications({ ...notifications, email_notifications: v })} />
                  </div>
                </div>

                <div className={notifications.email_notifications ? '' : 'opacity-40 pointer-events-none'}>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Notification Categories</p>
                  {[
                    { key: 'new_load_posted', label: 'New Load Alerts', desc: 'When a new load is posted on the board' },
                    { key: 'new_truck_posted', label: 'New Truck Alerts', desc: 'When a new truck is listed on the board' },
                    { key: 'offer_received', label: 'Offers & Bookings', desc: 'When you receive an offer or booking request' },
                    { key: 'new_message', label: 'New Messages', desc: 'When someone sends you a message' },
                    { key: 'contract_updates', label: 'Contract Updates', desc: 'When a contract is created or accepted' },
                    { key: 'trip_updates', label: 'Trip Updates', desc: 'Trip started, pickup, delivery, and status changes' },
                    { key: 'payment_alerts', label: 'Payment Alerts', desc: 'Payment confirmations and reminders' },
                    { key: 'marketing_emails', label: 'Marketing & Tips', desc: 'Platform tips, news, and promotions' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-2.5 border-b last:border-b-0">
                      <div>
                        <div className="text-sm text-gray-900">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                      </div>
                      <Switch
                        checked={notifications[item.key as keyof typeof notifications]}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="text-sm text-gray-900">SMS Notifications</div>
                    <div className="text-xs text-gray-500">Receive text messages (coming soon)</div>
                  </div>
                  <Switch checked={notifications.sms_notifications} onCheckedChange={(v) => setNotifications({ ...notifications, sms_notifications: v })} />
                </div>

                <Button onClick={handleSaveNotifications} disabled={savingNotifications} className="w-full bg-[#29CA8D] hover:bg-[#24b67d]">
                  {savingNotifications ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="w-5 h-5" /> Security</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Current Password</Label><Input type="password" placeholder="Enter current password" value={security.currentPassword} onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })} /></div>
                <div className="space-y-2"><Label>New Password</Label><Input type="password" placeholder="At least 8 characters" value={security.newPassword} onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })} /></div>
                <div className="space-y-2"><Label>Confirm New Password</Label><Input type="password" placeholder="Re-enter new password" value={security.confirmPassword} onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })} /></div>
                <Button onClick={handleChangePassword} disabled={changingPassword} className="w-full" variant="outline">
                  {changingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing...</> : 'Change Password'}
                </Button>
              </CardContent>
            </Card>
            {/* <Card className="border-red-200">
              <CardHeader><CardTitle className="text-base text-red-600">Danger Zone</CardTitle></CardHeader>
              <CardContent>
                <Button onClick={handleDeleteAccount} variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">Delete Account</Button>
              </CardContent>
            </Card> */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
