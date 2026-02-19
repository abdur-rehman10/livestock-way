import { useMemo, useRef, useState } from 'react';
import { toast } from '../../lib/swal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { AddressSearch, type MappedAddress } from '../AddressSearch';
import {
  BadgeDollarSign,
  CalendarClock,
  ImageIcon,
  MapPin,
  ShieldCheck,
  UploadCloud,
  Wrench,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { FormStepper, FormStepperNav } from '../ui/form-stepper';

type PriceType = 'fixed' | 'hourly' | 'quote';

export interface PostServiceFormValues {
  serviceName: string;
  serviceType: string;
  description: string;
  locationName: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  lat?: string;
  lon?: string;
  priceType: PriceType;
  basePrice: string;
  availability: string;
  responseTime: string;
  certifications: string;
  insured: boolean;
  images: string[];
}

interface PostServiceFormProps {
  onCancel?: () => void;
  onSubmit?: (values: PostServiceFormValues) => Promise<void> | void;
  onUploadImage?: (file: File) => Promise<string>;
  submitting?: boolean;
}

interface FormSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function FormSection({ icon: Icon, title, description, children }: FormSectionProps) {
  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
            <Icon className="size-4 sm:size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {description}
              </CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3 sm:space-y-4">{children}</CardContent>
    </Card>
  );
}

interface LabeledFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function LabeledField({ label, required, children }: LabeledFieldProps) {
  return (
    <label className="block space-y-1.5 sm:space-y-2">
      <span className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required ? <span className="text-rose-500 dark:text-rose-400">*</span> : null}
      </span>
      {children}
    </label>
  );
}

const STEPS = [
  { label: 'Basic Info' },
  { label: 'Location & Pricing' },
  { label: 'Availability & Credentials' },
];

export function PostServiceForm({ onCancel, onSubmit, onUploadImage }: PostServiceFormProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<PostServiceFormValues>({
    serviceName: '',
    serviceType: '',
    description: '',
    locationName: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    lat: '',
    lon: '',
    priceType: 'fixed',
    basePrice: '',
    availability: '',
    responseTime: '',
    certifications: '',
    insured: false,
    images: [],
  });
  const [addressSearch, setAddressSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const priceOptions = useMemo(
    () => [
      { key: 'fixed', label: 'Fixed Price' },
      { key: 'hourly', label: 'Hourly Rate' },
      { key: 'quote', label: 'Request Quote' },
    ] satisfies { key: PriceType; label: string }[],
    [],
  );

  const handleInputChange = (field: keyof PostServiceFormValues) => (
    value: string | boolean,
  ) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!values.serviceName.trim()) {
        toast.error('Service Name is required');
        return false;
      }
      if (!values.serviceType) {
        toast.error('Service Type is required');
        return false;
      }
    }
    if (s === 1) {
      if (!values.locationName.trim()) {
        toast.error('Location Name is required');
        return false;
      }
      if (!values.city.trim()) {
        toast.error('City is required');
        return false;
      }
      if (!values.state.trim()) {
        toast.error('State is required');
        return false;
      }
      if (!values.zip.trim()) {
        toast.error('ZIP Code is required');
        return false;
      }
      if (values.priceType !== 'quote' && !values.basePrice.trim()) {
        toast.error('Price is required');
        return false;
      }
    }
    if (s === 2) {
      if (!values.availability) {
        toast.error('Service Hours is required');
        return false;
      }
      if (!values.responseTime.trim()) {
        toast.error('Response Time is required');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleStepClick = (target: number) => {
    if (target < step) {
      setStep(target);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    if (onSubmit) {
      try {
        setIsSubmitting(true);
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !onUploadImage) return;
    setIsUploading(true);
    try {
      const uploads: string[] = [];
      for (const file of Array.from(files)) {
        const url = await onUploadImage(file);
        uploads.push(url);
      }
      if (uploads.length) {
        setValues((prev) => ({
          ...prev,
          images: [...prev.images, ...uploads],
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setValues((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleAddressSelect = (mapped: MappedAddress) => {
    setAddressSearch(mapped.fullText);
    setValues((prev) => ({
      ...prev,
      streetAddress: mapped.addressLine1,
      city: mapped.city,
      state: mapped.state,
      zip: mapped.postalCode,
      lat: mapped.lat,
      lon: mapped.lon,
    }));
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex items-start justify-between gap-4">
            <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                Post a Service
              </p>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 break-words">
                Create a new service listing
              </h1>
            </div>
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
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="p-4 sm:p-5 lg:p-6 pb-6">
              <FormStepper
                steps={STEPS}
                currentStep={step}
                onStepClick={handleStepClick}
              />

              <div className="min-h-[420px] space-y-4 sm:space-y-5">
                {/* Step 0: Basic Info */}
                {step === 0 && (
                  <FormSection
                    icon={Wrench}
                    title="Basic Information"
                    description="Share what your service offers"
                  >
                    <div className="space-y-3 sm:space-y-4">
                      <LabeledField label="Service Name" required>
                        <Input
                          placeholder="e.g., Premium Trailer Washout Service"
                          value={values.serviceName}
                          onChange={(event) => handleInputChange('serviceName')(event.target.value)}
                          className="h-10 sm:h-11 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </LabeledField>

                      <LabeledField label="Service Type" required>
                        <Select
                          value={values.serviceType || undefined}
                          onValueChange={handleInputChange('serviceType') as (value: string) => void}
                        >
                          <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100">
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
                      </LabeledField>

                      <LabeledField label="Description" required>
                        <Textarea
                          rows={4}
                          placeholder="Describe your service, what's included, and any special features..."
                          value={values.description}
                          onChange={(event) => handleInputChange('description')(event.target.value)}
                          className="text-sm sm:text-[15px] resize-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
                        />
                      </LabeledField>
                    </div>
                  </FormSection>
                )}

                {/* Step 1: Location & Pricing */}
                {step === 1 && (
                  <>
                    <FormSection
                      icon={MapPin}
                      title="Service Location"
                      description="Tell customers where this service is available"
                    >
                      <div className="space-y-3 sm:space-y-4">
                        <LabeledField label="Location Name" required>
                          <Input
                            placeholder="e.g., Main Facility"
                            value={values.locationName}
                            onChange={(event) => handleInputChange('locationName')(event.target.value)}
                            className="h-10 sm:h-11 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
                          />
                        </LabeledField>

                        <LabeledField label="Search Address">
                          <AddressSearch
                            value={addressSearch}
                            onChange={(text) => {
                              setAddressSearch(text);
                              setValues((prev) => ({
                                ...prev,
                                streetAddress: text,
                              }));
                            }}
                            onSelect={handleAddressSelect}
                            disabled={isSubmitting}
                          />
                        </LabeledField>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <LabeledField label="City" required>
                            <Input
                              placeholder="City"
                              value={values.city}
                              onChange={(event) => handleInputChange('city')(event.target.value)}
                              className="h-10 sm:h-11 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
                            />
                          </LabeledField>
                          <LabeledField label="State" required>
                            <Input
                              placeholder="State"
                              value={values.state}
                              onChange={(event) => handleInputChange('state')(event.target.value)}
                              className="h-10 sm:h-11 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
                            />
                          </LabeledField>
                        </div>

                        <LabeledField label="ZIP Code" required>
                          <Input
                            placeholder="12345"
                            value={values.zip}
                            onChange={(event) => handleInputChange('zip')(event.target.value)}
                            className="h-10 sm:h-11 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
                          />
                        </LabeledField>
                      </div>
                    </FormSection>

                    <FormSection icon={BadgeDollarSign} title="Pricing" description="Choose how you charge for this service">
                      <div className="space-y-3 sm:space-y-4">
                        <LabeledField label="Price Type" required>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {priceOptions.map((option) => (
                             <Button
                             key={option.key}
                             type="button"
                             variant="outline"
                             onClick={() => {
                               setValues((prev) => ({
                                 ...prev,
                                 priceType: option.key,
                                 basePrice: option.key === 'quote' ? '' : prev.basePrice,
                               }));
                             }}
                             className={cn(
                               'h-9 sm:h-10 text-xs sm:text-sm font-medium justify-center transition-colors',
                               values.priceType === option.key
                                 ? 'bg-primary text-primary-foreground border-primary dark:bg-slate-50 dark:text-slate-900  dark:border-slate-50'
                                 : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700',
                             )}
                           >
                             {option.label}
                           </Button>
                            ))}
                          </div>
                        </LabeledField>

                        {values.priceType === 'quote' ? (
                          <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                            Customers will request a quote from you. You can discuss price after they send a request.
                          </div>
                        ) : (
                          <LabeledField label={values.priceType === 'hourly' ? 'Hourly Rate' : 'Base Price'} required>
                            <div className="relative">
                              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
                                <span className="text-sm">$</span>
                              </div>
                              <Input
                                type="number"
                                placeholder={values.priceType === 'hourly' ? '75.00' : '150.00'}
                                value={values.basePrice}
                                onChange={(event) => handleInputChange('basePrice')(event.target.value)}
                                className="h-10 sm:h-11 pl-7 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </LabeledField>
                        )}
                      </div>
                    </FormSection>
                  </>
                )}

                {/* Step 2: Availability & Credentials */}
                {step === 2 && (
                  <>
                    <FormSection
                      icon={CalendarClock}
                      title="Availability"
                      description="Share when you can take on work"
                    >
                      <div className="space-y-3 sm:space-y-4">
                        <LabeledField label="Service Hours" required>
                          <Select
                            value={values.availability || undefined}
                            onValueChange={handleInputChange('availability') as (value: string) => void}
                          >
                            <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100">
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
                        </LabeledField>

                        <LabeledField label="Response Time" required>
                          <Input
                            placeholder="e.g., Within 2 hours"
                            value={values.responseTime}
                            onChange={(event) => handleInputChange('responseTime')(event.target.value)}
                            className="h-10 sm:h-11 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
                          />
                        </LabeledField>
                      </div>
                    </FormSection>

                    <FormSection
                      icon={ShieldCheck}
                      title="Credentials"
                      description="Highlight qualifications to build trust"
                    >
                      <div className="space-y-3 sm:space-y-4">
                        <LabeledField label="Certifications & Licenses">
                          <Textarea
                            rows={3}
                            placeholder="List any relevant certifications, licenses, or qualifications..."
                            value={values.certifications}
                            onChange={(event) => handleInputChange('certifications')(event.target.value)}
                            className="text-sm sm:text-[15px] resize-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
                          />
                        </LabeledField>

                        <label className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                          <Checkbox
                            checked={values.insured}
                            onCheckedChange={(checked) => handleInputChange('insured')(!!checked)}
                            className="dark:border-slate-500 dark:data-[state=checked]:bg-slate-700 dark:data-[state=checked]:border-slate-600"
                          />
                          Fully Insured & Bonded
                        </label>
                      </div>
                    </FormSection>

                    <FormSection
                      icon={ImageIcon}
                      title="Service Images"
                      description="Show off your service with clear photos"
                    >
                      <div
                        className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-800/30 px-4 py-5 sm:py-6 text-center text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg"
                          multiple
                          className="hidden"
                          onChange={(event) => handleFiles(event.target.files)}
                        />
                        <div className="mx-auto mb-3 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm">
                          <UploadCloud className="size-5 sm:size-6" />
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">
                          Click to upload images or drag and drop
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          PNG, JPG up to 10MB {isUploading ? '• Uploading...' : ''}
                        </p>
                      </div>
                      {values.images.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                          {values.images.map((url, idx) => (
                            <div key={url + idx} className="relative group overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                              <img src={url} alt={`Service ${idx + 1}`} className="h-28 sm:h-32 w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1.5 right-1.5 size-6 sm:size-7 flex items-center justify-center rounded-full bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-900"
                                aria-label="Remove image"
                              >
                                <X className="size-3.5 sm:size-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </FormSection>
                  </>
                )}
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 sm:px-5 lg:px-6 py-4 rounded-b-xl">
              <FormStepperNav
                currentStep={step}
                totalSteps={STEPS.length}
                onBack={handleBack}
                onNext={handleNext}
                onSubmit={handleSubmit}
                submitting={isSubmitting}
                submitLabel="Post Service"
                submitDisabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
