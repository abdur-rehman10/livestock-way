import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { createBuyAndSellListing, type CreateBuyAndSellPayload } from "../api/buyAndSell";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { DollarSign, MapPin, Phone, Mail, FileText, X, Upload, Building2, User } from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import { AddressSearch, type MappedAddress } from "../components/AddressSearch";

export default function PostBuyAndSell() {
  const navigate = useNavigate();
  const userRole = storage.get<string>(STORAGE_KEYS.USER_ROLE, "");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    listingType: "",
    category: "",
    title: "",
    description: "",
    price: "",
    priceType: "",
    paymentTerms: "",
    city: "",
    state: "",
    zipCode: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [addressSearchValue, setAddressSearchValue] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.listingType) newErrors.listingType = "Listing type is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.contactName.trim()) newErrors.contactName = "Contact name is required";
    if (!formData.contactPhone.trim()) newErrors.contactPhone = "Phone number is required";
    
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
      const payload: CreateBuyAndSellPayload = {
        listing_type: formData.listingType,
        category: formData.category,
        title: formData.title,
        description: formData.description,
        price: formData.price ? Number(formData.price) : null,
        price_type: formData.priceType || null,
        payment_terms: formData.paymentTerms || null,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode || null,
        contact_name: formData.contactName,
        contact_phone: formData.contactPhone,
        contact_email: formData.contactEmail || null,
        photos: photos,
      };

      await createBuyAndSellListing(payload);
      toast.success("Listing posted successfully!");
      
      // Reset form
      setFormData({
        listingType: "",
        category: "",
        title: "",
        description: "",
        price: "",
        priceType: "",
        paymentTerms: "",
        city: "",
        state: "",
        zipCode: "",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
      });
      setAddressSearchValue("");
      setPhotos([]);
      setPhotoPreviews([]);
      
      // Navigate to my listings
      if (userRole === "hauler") {
        navigate("/hauler/truck-listings?tab=buy-sell");
      } else if (userRole === "shipper") {
        navigate("/shipper/my-loads?tab=buy-sell");
      } else {
        navigate(-1);
      }
    } catch (err: any) {
      console.error("Error posting listing:", err);
      toast.error(err?.message ?? "Failed to post listing");
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
      
      // Upload file
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
          
          // Create preview
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-6 h-6" style={{ color: "#53ca97" }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Post Buy & Sell</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Create a marketplace listing for equipment, livestock, supplies, and more
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Listing Details Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle className="text-xl">Listing Details</CardTitle>
              </div>
              <CardDescription>Basic information about your listing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="listingType" className="text-base font-semibold flex items-center gap-2">
                    Listing Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.listingType}
                    onValueChange={(value) => {
                      setFormData({ ...formData, listingType: value });
                      if (errors.listingType) setErrors({ ...errors, listingType: "" });
                    }}
                  >
                    <SelectTrigger className={`h-11 ${errors.listingType ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="for-sale">For Sale</SelectItem>
                      <SelectItem value="wanted">Wanted</SelectItem>
                      <SelectItem value="for-rent">For Rent</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.listingType && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {errors.listingType}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-base font-semibold flex items-center gap-2">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData({ ...formData, category: value });
                      if (errors.category) setErrors({ ...errors, category: "" });
                    }}
                  >
                    <SelectTrigger className={`h-11 ${errors.category ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="livestock">Livestock</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="trailers">Trailers</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {errors.category}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold flex items-center gap-2">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: "" });
                  }}
                  placeholder="e.g., 2019 Gooseneck Livestock Trailer - 24ft"
                  className={`h-11 ${errors.title ? "border-red-500" : ""}`}
                  required
                />
                {errors.title && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold flex items-center gap-2">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) setErrors({ ...errors, description: "" });
                  }}
                  placeholder="Provide detailed description, condition, features..."
                  rows={4}
                  className={errors.description ? "border-red-500" : ""}
                  required
                />
                {errors.description && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">$</span>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceType" className="text-base font-semibold">Price Type</Label>
                  <Select
                    value={formData.priceType}
                    onValueChange={(value) => setFormData({ ...formData, priceType: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="negotiable">Negotiable</SelectItem>
                      <SelectItem value="per-unit">Per Unit</SelectItem>
                      <SelectItem value="per-head">Per Head</SelectItem>
                      <SelectItem value="obo">Or Best Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms" className="text-base font-semibold">Payment Terms</Label>
                <Select
                  value={formData.paymentTerms}
                  onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Only</SelectItem>
                    <SelectItem value="check">Check Accepted</SelectItem>
                    <SelectItem value="financing">Financing Available</SelectItem>
                    <SelectItem value="trade">Trade Considered</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle className="text-xl">Location</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-base font-semibold flex items-center gap-2">
                  Address <span className="text-red-500">*</span>
                </Label>
                <AddressSearch
                  value={addressSearchValue}
                  onChange={setAddressSearchValue}
                  onSelect={(mapped: MappedAddress) => {
                    setFormData({
                      ...formData,
                      city: mapped.city || "",
                      state: mapped.state || "",
                      zipCode: mapped.postalCode || "",
                    });
                    setAddressSearchValue(mapped.fullText);
                    // Clear errors for location fields
                    const newErrors = { ...errors };
                    if (newErrors.city) delete newErrors.city;
                    if (newErrors.state) delete newErrors.state;
                    setErrors(newErrors);
                  }}
                />
                {(errors.city || errors.state) && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <X className="w-4 h-4" />
                    {errors.city || errors.state}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-base font-semibold flex items-center gap-2">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => {
                      setFormData({ ...formData, city: e.target.value });
                      if (errors.city) setErrors({ ...errors, city: "" });
                    }}
                    placeholder="City"
                    className={`h-11 ${errors.city ? "border-red-500" : ""}`}
                    required
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {errors.city}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-base font-semibold flex items-center gap-2">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => {
                      setFormData({ ...formData, state: e.target.value });
                      if (errors.state) setErrors({ ...errors, state: "" });
                    }}
                    placeholder="State"
                    className={`h-11 ${errors.state ? "border-red-500" : ""}`}
                    required
                  />
                  {errors.state && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {errors.state}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-base font-semibold">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="12345"
                  className="h-11"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Details Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle className="text-xl">Contact Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="contactName" className="text-base font-semibold flex items-center gap-2">
                  Contact Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => {
                    setFormData({ ...formData, contactName: e.target.value });
                    if (errors.contactName) setErrors({ ...errors, contactName: "" });
                  }}
                  placeholder="Your name or business name"
                  className={`h-11 ${errors.contactName ? "border-red-500" : ""}`}
                  required
                />
                {errors.contactName && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.contactName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="text-base font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => {
                      setFormData({ ...formData, contactPhone: e.target.value });
                      if (errors.contactPhone) setErrors({ ...errors, contactPhone: "" });
                    }}
                    placeholder="+1 (555) 123-4567"
                    className={`h-11 ${errors.contactPhone ? "border-red-500" : ""}`}
                    required
                  />
                  {errors.contactPhone && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {errors.contactPhone}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-base font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="contact@example.com"
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle className="text-xl">Photos</CardTitle>
              </div>
              <CardDescription>Upload photos of your item (up to 10 photos)</CardDescription>
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

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              style={{ backgroundColor: "#53ca97", color: "white" }}
              disabled={loading}
            >
              {loading ? "Posting..." : "Post Listing"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
