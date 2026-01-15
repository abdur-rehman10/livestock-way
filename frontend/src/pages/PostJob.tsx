import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { createJob, type CreateJobPayload } from "../api/jobs";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "../lib/storage";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Phone,
  Mail,
  Clock,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Upload,
  Building2,
  User,
  Award,
  Calendar,
} from "lucide-react";
import { AddressSearch, type MappedAddress } from "../components/AddressSearch";

export default function PostJob() {
  const navigate = useNavigate();
  const userRole = storage.get<string>(STORAGE_KEYS.USER_ROLE, "");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    requiredSkills: "",
    jobType: "",
    locationType: "",
    location: "",
    salary: "",
    salaryFrequency: "",
    benefitsAccommodation: false,
    benefitsFood: false,
    benefitsFuel: false,
    benefitsVehicle: false,
    benefitsBonus: false,
    benefitsOthers: false,
    contactPerson: "",
    phone: "",
    preferredCallTime: "",
    email: "",
  });
  const [addressSearchValue, setAddressSearchValue] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = "Job title is required";
    }
    if (!formData.jobDescription.trim()) {
      newErrors.jobDescription = "Job description is required";
    }
    if (!formData.jobType) {
      newErrors.jobType = "Job type is required";
    }
    if (!formData.locationType) {
      newErrors.locationType = "Location type is required";
    }
    if (formData.locationType === "on-site" && !formData.location.trim()) {
      newErrors.location = "Location is required for on-site jobs";
    }
    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = "Contact person is required";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
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
      const payload: CreateJobPayload = {
        title: formData.jobTitle,
        description: formData.jobDescription,
        required_skills: formData.requiredSkills || null,
        job_type: formData.jobType,
        location_type: formData.locationType,
        location: formData.location || null,
        salary: formData.salary || null,
        salary_frequency: formData.salaryFrequency || null,
        benefits_accommodation: formData.benefitsAccommodation,
        benefits_food: formData.benefitsFood,
        benefits_fuel: formData.benefitsFuel,
        benefits_vehicle: formData.benefitsVehicle,
        benefits_bonus: formData.benefitsBonus,
        benefits_others: formData.benefitsOthers,
        contact_person: formData.contactPerson,
        contact_phone: formData.phone,
        preferred_call_time: formData.preferredCallTime || null,
        contact_email: formData.email || null,
        photos: photos,
      };

      await createJob(payload);
      toast.success("Job posted successfully!");
      
      // Reset form
      setFormData({
        jobTitle: "",
        jobDescription: "",
        requiredSkills: "",
        jobType: "",
        locationType: "",
        location: "",
        salary: "",
        salaryFrequency: "",
        benefitsAccommodation: false,
        benefitsFood: false,
        benefitsFuel: false,
        benefitsVehicle: false,
        benefitsBonus: false,
        benefitsOthers: false,
        contactPerson: "",
        phone: "",
        preferredCallTime: "",
        email: "",
      });
      setAddressSearchValue("");
      setPhotos([]);
      setPhotoPreviews([]);
      setErrors({});
      
      // Navigate to my listings
      if (userRole === "hauler") {
        navigate("/hauler/truck-listings?tab=jobs");
      } else if (userRole === "shipper") {
        navigate("/shipper/my-loads?tab=jobs");
      } else {
        navigate(-1);
      }
    } catch (err: any) {
      console.error("Error posting job:", err);
      toast.error(err?.message ?? "Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: string[] = [];
    const newPreviews: string[] = [];
    
    for (let i = 0; i < Math.min(files.length, 5 - photos.length); i++) {
      const file = files[i];
      newPhotos.push(file.name);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setPhotoPreviews((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    
    setPhotos([...photos, ...newPhotos].slice(0, 5));
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case "full-time":
        return "bg-green-100 text-green-800 border-green-200";
      case "part-time":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "temporary":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "freelance":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="w-6 h-6" style={{ color: "#53ca97" }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Post a Job</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Fill in the job details to attract the right candidates
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Details Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle className="text-xl">Job Details</CardTitle>
              </div>
              <CardDescription>Basic information about the position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-base font-semibold flex items-center gap-2">
                  Job Title <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => {
                      setFormData({ ...formData, jobTitle: e.target.value });
                      if (errors.jobTitle) setErrors({ ...errors, jobTitle: "" });
                    }}
                    placeholder="e.g., Livestock Transport Driver"
                    className={`pl-10 h-11 ${errors.jobTitle ? "border-red-500" : ""}`}
                    required
                  />
                </div>
                {errors.jobTitle && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.jobTitle}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription" className="text-base font-semibold flex items-center gap-2">
                  Job Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="jobDescription"
                  value={formData.jobDescription}
                  onChange={(e) => {
                    setFormData({ ...formData, jobDescription: e.target.value });
                    if (errors.jobDescription) setErrors({ ...errors, jobDescription: "" });
                  }}
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  rows={5}
                  className={`${errors.jobDescription ? "border-red-500" : ""}`}
                  required
                />
                {errors.jobDescription && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.jobDescription}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredSkills" className="text-base font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Required Skills / Experience
                </Label>
                <Textarea
                  id="requiredSkills"
                  value={formData.requiredSkills}
                  onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                  placeholder="List required qualifications, certifications, experience..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">Separate each skill or requirement on a new line</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobType" className="text-base font-semibold flex items-center gap-2">
                    Job Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.jobType}
                    onValueChange={(value) => {
                      setFormData({ ...formData, jobType: value });
                      if (errors.jobType) setErrors({ ...errors, jobType: "" });
                    }}
                  >
                    <SelectTrigger className={`h-11 ${errors.jobType ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Full-time
                        </div>
                      </SelectItem>
                      <SelectItem value="part-time">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          Part-time
                        </div>
                      </SelectItem>
                      <SelectItem value="temporary">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-orange-600" />
                          Temporary
                        </div>
                      </SelectItem>
                      <SelectItem value="freelance">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                          Freelance
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.jobType && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {errors.jobType}
                    </p>
                  )}
                  {formData.jobType && (
                    <Badge className={getJobTypeColor(formData.jobType)}>
                      {formData.jobType.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locationType" className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.locationType}
                    onValueChange={(value) => {
                      setFormData({ ...formData, locationType: value });
                      if (errors.locationType) setErrors({ ...errors, locationType: "" });
                    }}
                  >
                    <SelectTrigger className={`h-11 ${errors.locationType ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select location type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="on-site">On-site</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.locationType && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {errors.locationType}
                    </p>
                  )}
                </div>
              </div>

              {formData.locationType === "on-site" && (
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <AddressSearch
                    value={addressSearchValue}
                    onChange={setAddressSearchValue}
                    onSelect={(mapped: MappedAddress) => {
                      // Format location as "City, State" or use full text
                      const locationText = mapped.city && mapped.state 
                        ? `${mapped.city}, ${mapped.state}${mapped.postalCode ? ` ${mapped.postalCode}` : ""}`
                        : mapped.fullText;
                      setFormData({ ...formData, location: locationText });
                      setAddressSearchValue(locationText);
                      // Clear location error
                      if (errors.location) {
                        const newErrors = { ...errors };
                        delete newErrors.location;
                        setErrors(newErrors);
                      }
                    }}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <X className="w-4 h-4" />
                      {errors.location}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Salary & Benefits Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle className="text-xl">Compensation & Benefits</CardTitle>
              </div>
              <CardDescription>Attract candidates with competitive compensation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Salary / Compensation
                  </Label>
                  <Input
                    id="salary"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="e.g., $60,000 or $25/hr"
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500">Enter amount or range</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryFrequency" className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Frequency
                  </Label>
                  <Select
                    value={formData.salaryFrequency}
                    onValueChange={(value) => setFormData({ ...formData, salaryFrequency: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="project">Project-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base font-semibold">Benefits Offered</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "benefitsAccommodation", label: "Accommodation", icon: Building2 },
                    { key: "benefitsFood", label: "Food", icon: "🍽️" },
                    { key: "benefitsFuel", label: "Fuel Allowance", icon: "⛽" },
                    { key: "benefitsVehicle", label: "Vehicle", icon: "🚗" },
                    { key: "benefitsBonus", label: "Bonus", icon: DollarSign },
                    { key: "benefitsOthers", label: "Others", icon: "➕" },
                  ].map((benefit) => {
                    const isChecked = formData[benefit.key as keyof typeof formData] as boolean;
                    const handleToggle = (checked: boolean) => {
                      setFormData({
                        ...formData,
                        [benefit.key]: checked,
                      });
                    };
                    
                    return (
                      <label
                        key={benefit.key}
                        htmlFor={`benefit-${benefit.key}`}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${isChecked
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"}
                        `}
                      >
                        <Checkbox
                          id={`benefit-${benefit.key}`}
                          checked={isChecked}
                          onCheckedChange={handleToggle}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {typeof benefit.icon === "string" ? (
                          <span className="text-xl">{benefit.icon}</span>
                        ) : (
                          <benefit.icon className="w-5 h-5 text-gray-600" />
                        )}
                        <span className="text-sm font-medium flex-1">
                          {benefit.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle className="text-xl">Contact Information</CardTitle>
              </div>
              <CardDescription>How candidates can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="contactPerson" className="text-base font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact Person <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => {
                      setFormData({ ...formData, contactPerson: e.target.value });
                      if (errors.contactPerson) setErrors({ ...errors, contactPerson: "" });
                    }}
                    placeholder="Full name"
                    className={`pl-10 h-11 ${errors.contactPerson ? "border-red-500" : ""}`}
                    required
                  />
                </div>
                {errors.contactPerson && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.contactPerson}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone / WhatsApp <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (errors.phone) setErrors({ ...errors, phone: "" });
                      }}
                      placeholder="+1 (555) 123-4567"
                      className={`pl-10 h-11 ${errors.phone ? "border-red-500" : ""}`}
                      required
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {errors.phone}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredCallTime" className="text-base font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Preferred Call Time
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="preferredCallTime"
                      value={formData.preferredCallTime}
                      onChange={(e) => setFormData({ ...formData, preferredCallTime: e.target.value })}
                      placeholder="e.g., 9AM-5PM CST"
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email (Optional)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@example.com"
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" style={{ color: "#53ca97" }} />
                <CardTitle className="text-xl">Photos</CardTitle>
              </div>
              <CardDescription>Add photos to make your job posting stand out (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={photos.length >= 5}
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="p-3 rounded-full bg-primary/10">
                    <Upload className="w-6 h-6" style={{ color: "#53ca97" }} />
                  </div>
                  <div>
                    <span className="text-primary font-semibold">Click to upload</span> or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG up to 5MB each (max {5 - photos.length} more)
                  </p>
                </label>
              </div>

              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">{photos[index]}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-900 pb-4 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1 h-12 text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 text-base font-semibold"
              disabled={loading}
              style={{ backgroundColor: "#53ca97", color: "white" }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Posting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Post Job
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
