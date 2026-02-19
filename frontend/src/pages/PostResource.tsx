import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { createResourcesListing, type CreateResourcesPayload } from "../api/resources";
import { toast } from '../lib/swal';
import { storage, STORAGE_KEYS } from "../lib/storage";
import { Building, Shield, Droplet, Scale, Wheat, Heart, Calendar, FileText, X, Upload, MapPin, Phone, Mail, User } from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import { AddressSearch, type MappedAddress } from "../components/AddressSearch";

const resourceTypes = [
  { id: 'logistics', label: 'Logistics Agents & Companies', icon: Building },
  { id: 'insurance', label: 'Insurance Companies', icon: Shield },
  { id: 'washout', label: 'Washouts', icon: Droplet },
  { id: 'scale', label: 'Weight Stations & Scales', icon: Scale },
  { id: 'hay', label: 'Hay Providers', icon: Wheat },
  { id: 'stud', label: 'Stud Farms', icon: Heart },
  { id: 'salesyard', label: 'Sales Yards & Schedule', icon: Calendar },
  { id: 'beefspotter', label: 'Beef Spotters & Transport', icon: FileText },
];

export default function PostResource() {
  const navigate = useNavigate();
  const userRole = storage.get<string>(STORAGE_KEYS.USER_ROLE, "");
  const [step, setStep] = useState<'selection' | 'form'>('selection');
  const [selectedType, setSelectedType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [addressSearchValue, setAddressSearchValue] = useState("");
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setStep('form');
    setFormData({});
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedType) {
      newErrors.resourceType = "Resource type is required";
    }
    if (!formData.title?.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.contact_phone?.trim()) {
      newErrors.contact_phone = "Phone number is required";
    }
    
    // Type-specific validations
    if (selectedType === 'logistics') {
      if (!formData.companyName?.trim()) newErrors.companyName = "Company name is required";
      if (!formData.email?.trim()) newErrors.email = "Email is required";
      if (!formData.description?.trim()) newErrors.description = "Description is required";
    } else if (selectedType === 'insurance') {
      if (!formData.companyName?.trim()) newErrors.companyName = "Company name is required";
      if (!formData.insuranceType?.trim()) newErrors.insuranceType = "Type of insurance is required";
      if (!formData.email?.trim()) newErrors.email = "Email is required";
    } else if (selectedType === 'washout') {
      if (!formData.facilityName?.trim()) newErrors.facilityName = "Facility name is required";
    } else if (selectedType === 'scale') {
      if (!formData.hours?.trim()) newErrors.hours = "Operating hours is required";
    } else if (selectedType === 'hay') {
      if (!formData.supplierName?.trim()) newErrors.supplierName = "Supplier/Farm name is required";
      if (!formData.hayTypes?.trim()) newErrors.hayTypes = "Hay types is required";
    } else if (selectedType === 'stud') {
      if (!formData.farmName?.trim()) newErrors.farmName = "Farm name is required";
      if (!formData.breeds?.trim()) newErrors.breeds = "Breeds offered is required";
    } else if (selectedType === 'salesyard') {
      if (!formData.yardName?.trim()) newErrors.yardName = "Yard name is required";
    } else if (selectedType === 'beefspotter') {
      if (!formData.publisherName?.trim()) newErrors.publisherName = "Publisher name is required";
      if (!formData.editionTitle?.trim()) newErrors.editionTitle = "Edition title/date is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    try {
      setLoading(true);
      
      // Build type-specific data
      const typeSpecificData: Record<string, any> = {};
      const commonFields = ['title', 'description', 'contact_name', 'contact_phone', 'contact_email', 'city', 'state', 'zip_code'];
      
      Object.keys(formData).forEach(key => {
        if (!commonFields.includes(key) && formData[key] !== undefined && formData[key] !== null && formData[key] !== '') {
          typeSpecificData[key] = formData[key];
        }
      });

      // Build title from type-specific field
      let title = formData.title || '';
      if (!title) {
        if (selectedType === 'logistics') title = formData.companyName || '';
        else if (selectedType === 'insurance') title = formData.companyName || '';
        else if (selectedType === 'washout') title = formData.facilityName || '';
        else if (selectedType === 'scale') title = formData.name || 'Weight Station';
        else if (selectedType === 'hay') title = formData.supplierName || '';
        else if (selectedType === 'stud') title = formData.farmName || '';
        else if (selectedType === 'salesyard') title = formData.yardName || '';
        else if (selectedType === 'beefspotter') title = formData.publisherName || '';
      }

      const payload: CreateResourcesPayload = {
        resource_type: selectedType,
        title: title,
        description: formData.description || null,
        contact_name: formData.contact_name || formData.contactPerson || null,
        contact_phone: formData.contact_phone || formData.phone || '',
        contact_email: formData.contact_email || formData.email || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        photos: photos,
        type_specific_data: typeSpecificData,
      };

      await createResourcesListing(payload);
      toast.success("Resource listing is now live.", {
        description: "Your resource is visible to all users on the Resources board.",
      });
      
      // Reset form
      setFormData({});
      setSelectedType('');
      setStep('selection');
      setAddressSearchValue("");
      setPhotos([]);
      setPhotoPreviews([]);
      
      // Navigate to my listings
      if (userRole === "hauler") {
        navigate("/hauler/truck-listings?tab=resources");
      } else if (userRole === "shipper") {
        navigate("/shipper/my-loads?tab=resources");
      } else {
        navigate(-1);
      }
    } catch (err: any) {
      console.error("Error posting resource:", err);
      toast.error(err?.message ?? "Failed to post resource");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    if (!token) {
      toast.error("Please log in to upload photos");
      return;
    }

    const newPhotos: string[] = [];
    const newPreviews: string[] = [];
    
    for (let i = 0; i < Math.min(files.length, 10 - photos.length); i++) {
      const file = files[i];
      
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/api/uploads/image`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();
        if (data.status === "OK" && data.url) {
          newPhotos.push(data.url);
          
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              setPhotoPreviews((prev) => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error("Error uploading photo:", err);
        toast.error(`Failed to upload photo: ${file.name}`);
      }
    }
    
    setPhotos([...photos, ...newPhotos].slice(0, 10));
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  // Selection Step
  if (step === 'selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-6 h-6" style={{ color: "#53ca97" }} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Post a Resource</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Select the type of resource you want to post
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {resourceTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id)}
                  className="h-24 flex flex-col gap-2"
                  variant="outline"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm text-center">{type.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Form Step - Render form based on selected type
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-6 h-6" style={{ color: "#53ca97" }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {resourceTypes.find(t => t.id === selectedType)?.label || 'Post a Resource'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Enter your resource details
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Render type-specific form fields */}
          {selectedType === 'logistics' && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={formData.companyName || ''}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value, title: e.target.value })}
                      className={errors.companyName ? "border-red-500" : ""}
                    />
                    {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Website URL</Label>
                    <Input
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Service Areas</Label>
                    <Input
                      value={formData.serviceAreas || ''}
                      onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                      placeholder="e.g., TX, OK, KS"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Services Offered</Label>
                    <Textarea
                      value={formData.services || ''}
                      onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {selectedType === 'insurance' && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle>Insurance Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={formData.companyName || ''}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value, title: e.target.value })}
                      className={errors.companyName ? "border-red-500" : ""}
                    />
                    {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Type of Insurance *</Label>
                    <Input
                      value={formData.insuranceType || ''}
                      onChange={(e) => setFormData({ ...formData, insuranceType: e.target.value })}
                      placeholder="e.g., Cargo, Liability"
                      className={errors.insuranceType ? "border-red-500" : ""}
                    />
                    {errors.insuranceType && <p className="text-sm text-red-500">{errors.insuranceType}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Insurance Types</Label>
                    <Textarea
                      value={formData.insuranceTypes || ''}
                      onChange={(e) => setFormData({ ...formData, insuranceTypes: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {selectedType === 'washout' && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle>Washout Facility Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Facility Name *</Label>
                    <Input
                      value={formData.facilityName || ''}
                      onChange={(e) => setFormData({ ...formData, facilityName: e.target.value, title: e.target.value })}
                      className={errors.facilityName ? "border-red-500" : ""}
                    />
                    {errors.facilityName && <p className="text-sm text-red-500">{errors.facilityName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Hours of Operation</Label>
                    <Input
                      value={formData.hours || ''}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      placeholder="e.g., 24/7 or Mon-Fri 8AM-6PM"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Services Offered</Label>
                    <Textarea
                      value={formData.services || ''}
                      onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fees (Optional)</Label>
                    <Input
                      value={formData.fees || ''}
                      onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                      placeholder="e.g., $75 per trailer"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {selectedType === 'scale' && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle>Weight Station Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value, title: e.target.value || 'Weight Station' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle Types</Label>
                    <Input
                      value={formData.vehicleTypes || ''}
                      onChange={(e) => setFormData({ ...formData, vehicleTypes: e.target.value })}
                      placeholder="e.g., All commercial vehicles"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Operating Hours *</Label>
                    <Input
                      value={formData.hours || ''}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      className={errors.hours ? "border-red-500" : ""}
                    />
                    {errors.hours && <p className="text-sm text-red-500">{errors.hours}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Fees (Optional)</Label>
                    <Input
                      value={formData.fees || ''}
                      onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                      placeholder="e.g., $25 per weigh"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {selectedType === 'hay' && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle>Hay Provider Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Supplier/Farm Name *</Label>
                    <Input
                      value={formData.supplierName || ''}
                      onChange={(e) => setFormData({ ...formData, supplierName: e.target.value, title: e.target.value })}
                      className={errors.supplierName ? "border-red-500" : ""}
                    />
                    {errors.supplierName && <p className="text-sm text-red-500">{errors.supplierName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Hay Types *</Label>
                    <Input
                      value={formData.hayTypes || ''}
                      onChange={(e) => setFormData({ ...formData, hayTypes: e.target.value })}
                      placeholder="e.g., Alfalfa, Timothy, Mixed"
                      className={errors.hayTypes ? "border-red-500" : ""}
                    />
                    {errors.hayTypes && <p className="text-sm text-red-500">{errors.hayTypes}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="e.g., $8-12 per bale"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {selectedType === 'stud' && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle>Stud Farm Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Farm Name *</Label>
                    <Input
                      value={formData.farmName || ''}
                      onChange={(e) => setFormData({ ...formData, farmName: e.target.value, title: e.target.value })}
                      className={errors.farmName ? "border-red-500" : ""}
                    />
                    {errors.farmName && <p className="text-sm text-red-500">{errors.farmName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Breeds Offered *</Label>
                    <Input
                      value={formData.breeds || ''}
                      onChange={(e) => setFormData({ ...formData, breeds: e.target.value })}
                      placeholder="e.g., Angus, Hereford"
                      className={errors.breeds ? "border-red-500" : ""}
                    />
                    {errors.breeds && <p className="text-sm text-red-500">{errors.breeds}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Stud Fees</Label>
                    <Input
                      value={formData.fees || ''}
                      onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                      placeholder="e.g., $500-2000 per breeding"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {selectedType === 'salesyard' && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle>Sales Yard Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Yard Name *</Label>
                    <Input
                      value={formData.yardName || ''}
                      onChange={(e) => setFormData({ ...formData, yardName: e.target.value, title: e.target.value })}
                      className={errors.yardName ? "border-red-500" : ""}
                    />
                    {errors.yardName && <p className="text-sm text-red-500">{errors.yardName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Livestock Types</Label>
                    <Input
                      value={formData.livestockTypes || ''}
                      onChange={(e) => setFormData({ ...formData, livestockTypes: e.target.value })}
                      placeholder="e.g., Cattle, Sheep, Goats"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weekly Volume</Label>
                    <Input
                      value={formData.volume || ''}
                      onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                      placeholder="e.g., 2000-3000 head weekly"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Operating Days/Times</Label>
                    <Input
                      value={formData.schedule || ''}
                      onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                      placeholder="e.g., Tuesday 10AM, Saturday 9AM"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {selectedType === 'beefspotter' && (
            <>
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle>Beef Spotter Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Publisher Name *</Label>
                    <Input
                      value={formData.publisherName || ''}
                      onChange={(e) => setFormData({ ...formData, publisherName: e.target.value, title: e.target.value })}
                      className={errors.publisherName ? "border-red-500" : ""}
                    />
                    {errors.publisherName && <p className="text-sm text-red-500">{errors.publisherName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Edition Title/Date *</Label>
                    <Input
                      value={formData.editionTitle || ''}
                      onChange={(e) => setFormData({ ...formData, editionTitle: e.target.value })}
                      placeholder="e.g., December 2024 Edition"
                      className={errors.editionTitle ? "border-red-500" : ""}
                    />
                    {errors.editionTitle && <p className="text-sm text-red-500">{errors.editionTitle}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Coverage Area</Label>
                    <Input
                      value={formData.coverageArea || ''}
                      onChange={(e) => setFormData({ ...formData, coverageArea: e.target.value })}
                      placeholder="e.g., TX, OK, NM"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input
                      value={formData.type || ''}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="e.g., Digital PDF, Magazine"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Common fields for all types */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle>Location</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Address</Label>
                <AddressSearch
                  value={addressSearchValue}
                  onChange={setAddressSearchValue}
                  onSelect={(mapped: MappedAddress) => {
                    setFormData({
                      ...formData,
                      city: mapped.city || '',
                      state: mapped.state || '',
                      zip_code: mapped.postalCode || '',
                    });
                    setAddressSearchValue(mapped.fullText);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  value={formData.zip_code || ''}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle>Contact Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={formData.contact_name || formData.contactPerson || ''}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value, contactPerson: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={formData.contact_phone || formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value, phone: e.target.value })}
                    className={errors.contact_phone ? "border-red-500" : ""}
                  />
                  {errors.contact_phone && <p className="text-sm text-red-500">{errors.contact_phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.contact_email || formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value, email: e.target.value })}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle>Photos</CardTitle>
              </div>
              <CardDescription>Upload photos (up to 10 photos)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={photos.length >= 10}
                  />
                </label>
              </div>

              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStep('selection');
                setSelectedType('');
                setFormData({});
              }}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              style={{ backgroundColor: "#53ca97", color: "white" }}
              disabled={loading}
            >
              {loading ? "Posting..." : "Post Resource"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
