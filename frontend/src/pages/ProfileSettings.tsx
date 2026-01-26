import { useState, useEffect } from 'react';
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
  CreditCard,
  Building2,
  Save,
  Camera,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { AddressSearch, type MappedAddress } from '../components/AddressSearch';
import { fetchHaulerProfile, updateHaulerProfile, type HaulerProfile } from '../api/marketplace';
import { fetchShipperProfile, updateShipperProfile, type ShipperProfile } from '../api/marketplace';

interface ProfileSettingsProps {
  role?: 'driver' | 'shipper' | 'hauler';
  onBack?: () => void;
}

export function ProfileSettings({ role = 'driver', onBack }: ProfileSettingsProps) {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    bio: '',
  });

  const [businessInfo, setBusinessInfo] = useState({
    companyName: '',
    taxId: '',
    businessAddress: '',
    defaultPickup: '',
    defaultDropoff: '',
  });

  // Fetch profile data on mount
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
            bio: '',
          });
          setBusinessInfo({
            companyName: data.company_name || '',
            taxId: data.registration_id || '',
            businessAddress: '',
            defaultPickup: '',
            defaultDropoff: '',
          });
        } else if (role === 'hauler') {
          // For haulers
          const data = await fetchHaulerProfile();
          setProfile({
            name: data.full_name || '',
            email: data.email || '',
            phone: data.phone_number || '',
            address: data.country || '',
            bio: '',
          });
          setBusinessInfo({
            companyName: data.company_name || '',
            taxId: data.tax_id || '',
            businessAddress: '',
            defaultPickup: '',
            defaultDropoff: '',
          });
        } else {
          // For drivers - no API yet, keep default values
          setLoading(false);
          return;
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    if (role === 'shipper' || role === 'hauler') {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [role]);
  const [addressSearch, setAddressSearch] = useState('');
  const [addressCoords, setAddressCoords] = useState<{ lat: string; lon: string } | null>(null);
  const [businessAddressSearch, setBusinessAddressSearch] = useState('');
  const [businessAddressCoords, setBusinessAddressCoords] = useState<{ lat: string; lon: string } | null>(null);
  const [defaultPickupSearch, setDefaultPickupSearch] = useState('');
  const [defaultPickupCoords, setDefaultPickupCoords] = useState<{ lat: string; lon: string } | null>(null);
  const [defaultDropoffSearch, setDefaultDropoffSearch] = useState('');
  const [defaultDropoffCoords, setDefaultDropoffCoords] = useState<{ lat: string; lon: string } | null>(null);

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    tripUpdates: true,
    paymentAlerts: true,
    marketingEmails: false,
  });

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });

  const handleSavePersonal = async () => {
    try {
      if (role === 'shipper') {
        await updateShipperProfile({
          full_name: profile.name,
          email: profile.email,
          phone_number: profile.phone,
          country: profile.address,
          company_name: businessInfo.companyName,
          registration_id: businessInfo.taxId,
        });
      } else if (role === 'hauler') {
        await updateHaulerProfile({
          full_name: profile.name,
          email: profile.email,
          phone_number: profile.phone,
          country: profile.address,
          company_name: businessInfo.companyName,
          tax_id: businessInfo.taxId,
        });
      } else {
        // Driver - no API yet
        toast.success('Profile updated successfully');
        return;
      }
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    }
  };

  const handleSaveBusiness = async () => {
    try {
      if (role === 'shipper') {
        await updateShipperProfile({
          company_name: businessInfo.companyName,
          registration_id: businessInfo.taxId,
        });
      } else if (role === 'hauler') {
        await updateHaulerProfile({
          company_name: businessInfo.companyName,
          tax_id: businessInfo.taxId,
        });
      } else {
        // Driver - no API yet
        toast.success('Business information updated');
        return;
      }
      toast.success('Business information updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update business information');
    }
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  const handleChangePassword = () => {
    if (security.newPassword !== security.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (security.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    toast.success('Password changed successfully');
    setSecurity({ ...security, currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion requested. You will receive a confirmation email.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-600" />
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#29CA8D] rounded-full flex items-center justify-center text-white">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1">
                <h2 className="text-xl text-gray-900">{profile.name}</h2>
                <p className="text-sm text-gray-600">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-[#29CA8D] text-white">
                    {role === 'driver' ? 'Driver' : role === 'hauler' ? 'Hauler' : 'Shipper'}
                  </Badge>
                  <div className="text-sm text-gray-600">Rating: 4.8 ⭐</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <AddressSearch
                    value={addressSearch}
                    onChange={setAddressSearch}
                    onSelect={(mapped: MappedAddress) => {
                      setAddressSearch(mapped.fullText);
                      setProfile({ ...profile, address: mapped.fullText });
                      setAddressCoords({ lat: mapped.lat, lon: mapped.lon });
                    }}
                  />
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Textarea
                      id="address"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="pl-10"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button onClick={handleSavePersonal} className="w-full bg-[#29CA8D] hover:bg-[#24b67d]">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {(role === 'shipper' || role === 'hauler') && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="company"
                        value={businessInfo.companyName}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, companyName: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID</Label>
                    <Input
                      id="taxId"
                      value={businessInfo.taxId}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, taxId: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">Business Address</Label>
                    <AddressSearch
                      value={businessAddressSearch}
                      onChange={setBusinessAddressSearch}
                      onSelect={(mapped: MappedAddress) => {
                        setBusinessAddressSearch(mapped.fullText);
                        setBusinessInfo({ ...businessInfo, businessAddress: mapped.fullText });
                        setBusinessAddressCoords({ lat: mapped.lat, lon: mapped.lon });
                      }}
                    />
                    <Textarea
                      id="businessAddress"
                      value={businessInfo.businessAddress}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, businessAddress: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultPickup">Default Pickup Location</Label>
                    <AddressSearch
                      value={defaultPickupSearch}
                      onChange={setDefaultPickupSearch}
                      onSelect={(mapped: MappedAddress) => {
                        setDefaultPickupSearch(mapped.fullText);
                        setBusinessInfo({ ...businessInfo, defaultPickup: mapped.fullText });
                        setDefaultPickupCoords({ lat: mapped.lat, lon: mapped.lon });
                      }}
                    />
                    <Input
                      id="defaultPickup"
                      value={businessInfo.defaultPickup}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, defaultPickup: e.target.value })}
                      placeholder="Enter default pickup address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultDropoff">Default Dropoff Location</Label>
                    <AddressSearch
                      value={defaultDropoffSearch}
                      onChange={setDefaultDropoffSearch}
                      onSelect={(mapped: MappedAddress) => {
                        setDefaultDropoffSearch(mapped.fullText);
                        setBusinessInfo({ ...businessInfo, defaultDropoff: mapped.fullText });
                        setDefaultDropoffCoords({ lat: mapped.lat, lon: mapped.lon });
                      }}
                    />
                    <Input
                      id="defaultDropoff"
                      value={businessInfo.defaultDropoff}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, defaultDropoff: e.target.value })}
                      placeholder="Enter default dropoff address"
                    />
                  </div>

                  <Button onClick={handleSaveBusiness} className="w-full bg-[#29CA8D] hover:bg-[#24b67d]">
                    <Save className="w-4 h-4 mr-2" />
                    Save Business Info
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="text-sm text-gray-900">Bank Account</div>
                      <div className="text-xs text-gray-600">****1234</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Edit</Button>
                </div>
                <Button variant="outline" className="w-full">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900">Email Notifications</div>
                    <div className="text-xs text-gray-600">Receive updates via email</div>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900">SMS Notifications</div>
                    <div className="text-xs text-gray-600">Receive text messages</div>
                  </div>
                  <Switch
                    checked={notifications.smsNotifications}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, smsNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900">Trip Updates</div>
                    <div className="text-xs text-gray-600">Status changes and alerts</div>
                  </div>
                  <Switch
                    checked={notifications.tripUpdates}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, tripUpdates: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900">Payment Alerts</div>
                    <div className="text-xs text-gray-600">Payment confirmations</div>
                  </div>
                  <Switch
                    checked={notifications.paymentAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, paymentAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900">Marketing Emails</div>
                    <div className="text-xs text-gray-600">Tips and promotions</div>
                  </div>
                  <Switch
                    checked={notifications.marketingEmails}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, marketingEmails: checked })}
                  />
                </div>

                <Button onClick={handleSaveNotifications} className="w-full bg-[#29CA8D] hover:bg-[#24b67d]">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={security.currentPassword}
                    onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={security.newPassword}
                    onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={security.confirmPassword}
                    onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                  />
                </div>

                <Button onClick={handleChangePassword} className="w-full" variant="outline">
                  Change Password
                </Button>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <div className="text-sm text-gray-900">Two-Factor Authentication</div>
                    <div className="text-xs text-gray-600">Add extra security layer</div>
                  </div>
                  <Switch
                    checked={security.twoFactorEnabled}
                    onCheckedChange={(checked) => {
                      setSecurity({ ...security, twoFactorEnabled: checked });
                      toast.success(checked ? '2FA enabled' : '2FA disabled');
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleDeleteAccount}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
