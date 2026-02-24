import { useState, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { X, Camera, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { Switch } from '../ui/switch';
import { toast } from '../../lib/swal';
import { updateHaulerProfile, updateShipperProfile, updateStakeholderProfile } from '../../api/marketplace';
import { API_BASE_URL } from '../../lib/api';
import { storage, STORAGE_KEYS } from '../../lib/storage';
import type { AuthUserRole } from './AuthWrapper';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: AuthUserRole;
  verifiedEmail: string;
  verifiedPhone: string;
  onComplete: (profileData: any) => void;
}

export function ProfileSetupModal({
  isOpen,
  onClose,
  userRole,
  verifiedEmail,
  verifiedPhone,
  onComplete
}: ProfileSetupModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(verifiedEmail);
  const [phone, setPhone] = useState(verifiedPhone);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

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

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      setProfilePhoto(data.url);
      storage.set(STORAGE_KEYS.USER_PHOTO, data.url);
      toast.success('Photo uploaded!');
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast.error('Failed to upload photo. You can add it later in Settings.');
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Hauler fields
  const [businessName, setBusinessName] = useState('');
  const [driverType, setDriverType] = useState('');
  const [primaryLocation, setPrimaryLocation] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [truckCount, setTruckCount] = useState('');
  const [livestockTypes, setLivestockTypes] = useState<string[]>([]);
  const [routePreferences, setRoutePreferences] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('Available');
  const [acceptEscrow, setAcceptEscrow] = useState(false);
  const [digitalCompliance, setDigitalCompliance] = useState(false);

  // Enterprise fields
  const [companyName, setCompanyName] = useState('');
  const [hqLocation, setHqLocation] = useState('');
  const [fleetSize, setFleetSize] = useState('');
  const [driverCount, setDriverCount] = useState('');
  const [livestockSpecializations, setLivestockSpecializations] = useState<string[]>([]);

  // Shipper fields
  const [shipperRole, setShipperRole] = useState('');
  const [farmName, setFarmName] = useState('');
  const [shippingFrequency, setShippingFrequency] = useState('');
  const [averageHeadCount, setAverageHeadCount] = useState('');
  const [loadingFacilities, setLoadingFacilities] = useState<string[]>([]);
  const [commonRoutes, setCommonRoutes] = useState('');
  const [requireTracking, setRequireTracking] = useState(false);
  const [useEscrow, setUseEscrow] = useState(false);
  const [monitorCameras, setMonitorCameras] = useState(false);

  // Resource Provider fields
  const [roleInBusiness, setRoleInBusiness] = useState('');
  const [providerType, setProviderType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  if (!isOpen) return null;

  const getTotalSteps = () => {
    switch (userRole) {
      case 'hauler': return 4;
      case 'enterprise': return 3;
      case 'shipper': return 4;
      case 'resource-provider': return 3;
      default: return 1;
    }
  };

  const totalSteps = getTotalSteps();
  const completionPercentage = Math.round((currentStep / totalSteps) * 100);

  const handleLivestockToggle = (type: string) => {
    setLivestockTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleLoadingFacilityToggle = (facility: string) => {
    setLoadingFacilities(prev =>
      prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
    );
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    const baseData = {
      fullName,
      email,
      phone,
      profilePhoto,
    };

    let profileData: any = baseData;

    if (userRole === 'hauler') {
      profileData = { ...baseData, businessName, driverType, primaryLocation, yearsInBusiness, truckCount, livestockTypes, routePreferences, availabilityStatus, acceptEscrow, digitalCompliance };
    } else if (userRole === 'enterprise') {
      profileData = { ...baseData, companyName, hqLocation, yearsInBusiness, fleetSize, driverCount, livestockSpecializations };
    } else if (userRole === 'shipper') {
      profileData = { ...baseData, shipperRole, farmName, primaryLocation, livestockTypes, shippingFrequency, averageHeadCount, loadingFacilities, commonRoutes, requireTracking, useEscrow, monitorCameras };
    } else if (userRole === 'resource-provider') {
      profileData = { ...baseData, roleInBusiness, businessName, providerType, businessAddress, yearsInBusiness };
    }

    try {
      setSaving(true);

      if (userRole === 'hauler' || userRole === 'enterprise') {
        await updateHaulerProfile({
          full_name: fullName || undefined,
          email: email || undefined,
          phone_number: phone || undefined,
          company_name: businessName || companyName || undefined,
          country: primaryLocation || hqLocation || undefined,
          profile_photo_url: profilePhoto || undefined,
          years_in_business: yearsInBusiness || undefined,
          truck_count: truckCount || undefined,
          livestock_types: livestockTypes.length > 0 ? livestockTypes : undefined,
          route_preferences: routePreferences || undefined,
          availability_status: availabilityStatus || undefined,
          accept_escrow: acceptEscrow,
          digital_compliance: digitalCompliance,
        });
      } else if (userRole === 'shipper') {
        await updateShipperProfile({
          full_name: fullName || undefined,
          email: email || undefined,
          phone_number: phone || undefined,
          farm_name: farmName || undefined,
          company_name: farmName || undefined,
          country: primaryLocation || undefined,
          profile_photo_url: profilePhoto || undefined,
          shipper_role: shipperRole || undefined,
          livestock_types: livestockTypes.length > 0 ? livestockTypes : undefined,
          shipping_frequency: shippingFrequency || undefined,
          average_head_count: averageHeadCount || undefined,
          loading_facilities: loadingFacilities.length > 0 ? loadingFacilities : undefined,
          common_routes: commonRoutes || undefined,
          require_tracking: requireTracking,
          use_escrow: useEscrow,
          monitor_cameras: monitorCameras,
        });
      } else if (userRole === 'resource-provider') {
        await updateStakeholderProfile({
          full_name: fullName || undefined,
          email: email || undefined,
          phone_number: phone || undefined,
          company_name: businessName || undefined,
          country: undefined,
          profile_photo_url: profilePhoto || undefined,
          role_in_business: roleInBusiness || undefined,
          provider_type: providerType || undefined,
          business_address: businessAddress || undefined,
          years_in_business: yearsInBusiness || undefined,
        });
      }

      if (fullName) storage.set(STORAGE_KEYS.USER_NAME, fullName);
      if (email) storage.set(STORAGE_KEYS.USER_EMAIL, email);
      if (phone) storage.set(STORAGE_KEYS.USER_PHONE, phone);

      toast.success('Profile saved successfully!');
    } catch (err: any) {
      console.error('Profile save error:', err);
      toast.error(err?.message || 'Could not save profile — you can update it later in Settings.');
    } finally {
      setSaving(false);
    }

    onComplete(profileData);
  };

  const inputClasses = "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#53ca97]";
  const labelClasses = "block text-sm font-medium mb-2";
  const checkboxGridClasses = "grid grid-cols-2 gap-3";

  const renderCheckboxList = (items: string[], selected: string[], toggle: (item: string) => void) => (
    <div className={checkboxGridClasses}>
      {items.map(item => (
        <label key={item} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={selected.includes(item)}
            onChange={() => toggle(item)}
            className="w-4 h-4 text-[#53ca97] rounded focus:ring-[#53ca97]"
          />
          <span className="text-sm">{item}</span>
        </label>
      ))}
    </div>
  );

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Profile Photo</h3>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden relative">
                {uploadingPhoto ? (
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                ) : (photoPreview || profilePhoto) ? (
                  <img
                    src={photoPreview || `${API_BASE_URL}${profilePhoto}`}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingPhoto ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> {profilePhoto ? 'Change Photo' : 'Upload Photo'}</>
                  )}
                </Button>
                <p className="text-xs text-gray-500">PNG or JPG, max 5MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClasses}>Full Name <span className="text-red-500">*</span></label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClasses} placeholder="Enter your full name" />
          </div>

          <div>
            <label className={labelClasses}>Email Address <span className="text-red-500">*</span></label>
            <div className="relative">
              {verifiedEmail ? (
                <>
                  <input type="email" value={verifiedEmail} disabled className="w-full px-4 py-2 pr-10 border rounded-lg bg-gray-50 text-gray-600" />
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#53ca97]" />
                </>
              ) : (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClasses}
                  placeholder="Enter your email address"
                />
              )}
            </div>
          </div>

          <div>
            <label className={labelClasses}>Phone Number <span className="text-red-500">*</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClasses}
              placeholder="Enter your phone number"
            />
          </div>
        </div>
      );
    }

    if (userRole === 'hauler') {
      if (currentStep === 2) {
        return (
          <div className="space-y-6">
            <div>
              <label className={labelClasses}>Business Name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClasses} placeholder="Your business name (optional)" />
            </div>
            <div>
              <label className={labelClasses}>Driver Type <span className="text-red-500">*</span></label>
              <select value={driverType} onChange={(e) => setDriverType(e.target.value)} className={inputClasses}>
                <option value="">Select driver type</option>
                <option value="Owner-operator">Owner-operator</option>
                <option value="Independent Contractor">Independent Contractor</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Primary Location <span className="text-red-500">*</span></label>
              <input type="text" value={primaryLocation} onChange={(e) => setPrimaryLocation(e.target.value)} className={inputClasses} placeholder="e.g., Dallas, TX" />
            </div>
            <div>
              <label className={labelClasses}>Years in Business</label>
              <input type="text" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} className={inputClasses} placeholder="e.g., 5" />
            </div>
            <div>
              <label className={labelClasses}>Truck Count</label>
              <input type="number" value={truckCount} onChange={(e) => setTruckCount(e.target.value)} className={inputClasses} placeholder="Number of trucks you operate" />
            </div>
          </div>
        );
      } else if (currentStep === 3) {
        return (
          <div className="space-y-6">
            <div>
              <label className={`${labelClasses} mb-3`}>Livestock Types Hauled <span className="text-red-500">*</span></label>
              {renderCheckboxList(['Cattle', 'Horses', 'Sheep', 'Goats', 'Pigs', 'Poultry'], livestockTypes, handleLivestockToggle)}
            </div>
            <div>
              <label className={labelClasses}>Route Preferences</label>
              <textarea value={routePreferences} onChange={(e) => setRoutePreferences(e.target.value)} className={inputClasses} placeholder="e.g., Texas to Oklahoma, Midwest routes..." rows={3} />
            </div>
            <div>
              <label className={labelClasses}>Availability</label>
              <input type="text" value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)} className={inputClasses} placeholder="e.g., Weekdays, Weekends, 24/7" />
            </div>
          </div>
        );
      } else if (currentStep === 4) {
        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">Accept Escrow Payments?</h4>
                  <p className="text-sm text-gray-600">Secure payment through platform escrow</p>
                </div>
                <Switch checked={acceptEscrow} onCheckedChange={setAcceptEscrow} />
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">Digital Compliance Ready?</h4>
                  <p className="text-sm text-gray-600">ELD, digital logs, and tracking tools</p>
                </div>
                <Switch checked={digitalCompliance} onCheckedChange={setDigitalCompliance} />
              </div>
            </div>
          </div>
        );
      }
    } else if (userRole === 'enterprise') {
      if (currentStep === 2) {
        return (
          <div className="space-y-6">
            <div>
              <label className={labelClasses}>Company Name <span className="text-red-500">*</span></label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClasses} placeholder="Your company name" />
            </div>
            <div>
              <label className={labelClasses}>Company Logo</label>
              <Button variant="outline" size="sm" className="gap-2"><Upload className="w-4 h-4" /> Upload Logo</Button>
            </div>
            <div>
              <label className={labelClasses}>HQ Location <span className="text-red-500">*</span></label>
              <input type="text" value={hqLocation} onChange={(e) => setHqLocation(e.target.value)} className={inputClasses} placeholder="e.g., Austin, TX" />
            </div>
            <div>
              <label className={labelClasses}>Years in Business</label>
              <input type="text" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} className={inputClasses} placeholder="e.g., 10" />
            </div>
          </div>
        );
      } else if (currentStep === 3) {
        return (
          <div className="space-y-6">
            <div>
              <label className={labelClasses}>Fleet Size <span className="text-red-500">*</span></label>
              <input type="number" value={fleetSize} onChange={(e) => setFleetSize(e.target.value)} className={inputClasses} placeholder="Total number of trucks" />
            </div>
            <div>
              <label className={labelClasses}>Driver Count <span className="text-red-500">*</span></label>
              <input type="number" value={driverCount} onChange={(e) => setDriverCount(e.target.value)} className={inputClasses} placeholder="Total number of drivers" />
            </div>
            <div>
              <label className={`${labelClasses} mb-3`}>Livestock Specializations</label>
              {renderCheckboxList(['Cattle', 'Horses', 'Sheep', 'Goats', 'Pigs', 'Poultry'], livestockSpecializations, (type) => {
                setLivestockSpecializations(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
              })}
            </div>
          </div>
        );
      }
    } else if (userRole === 'shipper') {
      if (currentStep === 2) {
        return (
          <div className="space-y-6">
            <div>
              <label className={labelClasses}>Role <span className="text-red-500">*</span></label>
              <select value={shipperRole} onChange={(e) => setShipperRole(e.target.value)} className={inputClasses}>
                <option value="">Select your role</option>
                <option value="Rancher">Rancher</option>
                <option value="Farm Manager">Farm Manager</option>
                <option value="Livestock Owner">Livestock Owner</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Farm/Business Name</label>
              <input type="text" value={farmName} onChange={(e) => setFarmName(e.target.value)} className={inputClasses} placeholder="Your farm or business name" />
            </div>
            <div>
              <label className={labelClasses}>Primary Location <span className="text-red-500">*</span></label>
              <input type="text" value={primaryLocation} onChange={(e) => setPrimaryLocation(e.target.value)} className={inputClasses} placeholder="e.g., Kansas City, KS" />
            </div>
          </div>
        );
      } else if (currentStep === 3) {
        return (
          <div className="space-y-6">
            <div>
              <label className={`${labelClasses} mb-3`}>Livestock Types (Most frequently shipped)</label>
              {renderCheckboxList(['Cattle', 'Horses', 'Sheep', 'Goats', 'Pigs', 'Poultry'], livestockTypes, handleLivestockToggle)}
            </div>
            <div>
              <label className={labelClasses}>Shipping Frequency</label>
              <select value={shippingFrequency} onChange={(e) => setShippingFrequency(e.target.value)} className={inputClasses}>
                <option value="">Select frequency</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Seasonal">Seasonal</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Average Head Count per shipment</label>
              <input type="text" value={averageHeadCount} onChange={(e) => setAverageHeadCount(e.target.value)} className={inputClasses} placeholder="e.g., 50" />
            </div>
            <div>
              <label className={`${labelClasses} mb-3`}>Loading Facilities</label>
              {renderCheckboxList(['Loading Chute', 'Ramp', 'Hydraulic Lift', 'Ground Level', 'None'], loadingFacilities, handleLoadingFacilityToggle)}
            </div>
            <div>
              <label className={labelClasses}>Most Common Routes</label>
              <textarea value={commonRoutes} onChange={(e) => setCommonRoutes(e.target.value)} className={inputClasses} placeholder="e.g., Farm to Kansas City Stockyards" rows={2} />
            </div>
          </div>
        );
      } else if (currentStep === 4) {
        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">Require Live Tracking?</h4>
                  <p className="text-sm text-gray-600">GPS tracking during transport</p>
                </div>
                <Switch checked={requireTracking} onCheckedChange={setRequireTracking} />
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">Use Secure Escrow?</h4>
                  <p className="text-sm text-gray-600">Payment held until delivery confirmed</p>
                </div>
                <Switch checked={useEscrow} onCheckedChange={setUseEscrow} />
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">Monitor via Live Cameras?</h4>
                  <p className="text-sm text-gray-600">In-trailer camera access</p>
                </div>
                <Switch checked={monitorCameras} onCheckedChange={setMonitorCameras} />
              </div>
            </div>
          </div>
        );
      }
    } else if (userRole === 'resource-provider') {
      if (currentStep === 2) {
        return (
          <div className="space-y-6">
            <div>
              <label className={labelClasses}>Role in Business <span className="text-red-500">*</span></label>
              <select value={roleInBusiness} onChange={(e) => setRoleInBusiness(e.target.value)} className={inputClasses}>
                <option value="">Select your role</option>
                <option value="Owner">Owner</option>
                <option value="Manager">Manager</option>
                <option value="Operator">Operator</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Business Name <span className="text-red-500">*</span></label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClasses} placeholder="Your business name" />
            </div>
            <div>
              <label className={labelClasses}>Business Logo</label>
              <Button variant="outline" size="sm" className="gap-2"><Upload className="w-4 h-4" /> Upload Logo</Button>
            </div>
            <div>
              <label className={labelClasses}>Provider Type <span className="text-red-500">*</span></label>
              <select value={providerType} onChange={(e) => setProviderType(e.target.value)} className={inputClasses}>
                <option value="">Select provider type</option>
                <option value="Hay Provider">Hay Provider</option>
                <option value="Insurance">Insurance</option>
                <option value="Weight Station">Weight Station</option>
                <option value="Washout Facility">Washout Facility</option>
                <option value="Vet Services">Vet Services</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        );
      } else if (currentStep === 3) {
        return (
          <div className="space-y-6">
            <div>
              <label className={labelClasses}>Business Address <span className="text-red-500">*</span></label>
              <input type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} className={inputClasses} placeholder="Full business address" />
            </div>
            <div>
              <label className={labelClasses}>Years in Business</label>
              <input type="text" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} className={inputClasses} placeholder="e.g., 15" />
            </div>
          </div>
        );
      }
    }

    return null;
  };

  const roleLabel = userRole === 'hauler' ? 'Independent Hauler' :
    userRole === 'enterprise' ? 'Logistics Enterprise' :
    userRole === 'shipper' ? 'Shipper' : 'Resource Provider';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white rounded-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#53ca9720' }}>
                <span className="text-lg font-semibold" style={{ color: '#53ca97' }}>L</span>
              </div>
              <span className="font-semibold">livestockway</span>
            </div>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-600">{roleLabel}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Profile Completion</h3>
            <span className="text-sm font-medium" style={{ color: '#53ca97' }}>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%`, backgroundColor: '#53ca97' }}
            />
          </div>
          <p className="text-xs text-gray-600">
            Step {currentStep} of {totalSteps} - Completing your profile helps you get better visibility (recommended)
          </p>
        </div>

        {userRole === 'hauler' && currentStep === 1 && (
          <div className="mx-6 mt-6 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Your First 3 Trips are FREE!</h4>
                <p className="text-sm text-blue-800">Get full access to all features with no payment required. Start hauling today!</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {renderStepContent()}
        </div>

        <div className="p-6 border-t flex items-center justify-between sticky bottom-0 bg-white">
          <Button variant="ghost" onClick={currentStep === 1 ? onClose : handleBack}>
            {currentStep === 1 ? 'Skip for now' : 'Back'}
          </Button>
          <Button onClick={handleNext} disabled={saving} style={{ backgroundColor: '#53ca97', color: 'white' }}>
            {saving ? 'Saving...' : currentStep === totalSteps ? 'Save Changes' : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
