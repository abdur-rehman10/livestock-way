import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { 
  Truck, 
  Home, 
  Wrench, 
  User, 
  MapPin, 
  Upload,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Clock
} from 'lucide-react';
import {
  fetchMyKycRequest,
  submitKycRequest,
  uploadKycDocument,
  type KycRequestRecord,
} from '../api/kyc';

interface OnboardingWizardProps {
  role: 'hauler' | 'shipper' | 'stakeholder';
  onComplete: () => void;
  onSkip?: () => void;
}

export default function OnboardingWizard({ role, onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Hauler state
  const [truckPlate, setTruckPlate] = useState('');
  const [truckType, setTruckType] = useState('');
  const [truckCapacity, setTruckCapacity] = useState('');
  const [truckLocation, setTruckLocation] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  // Shipper state
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [welfareRequirements, setWelfareRequirements] = useState('');

  // Stakeholder state
  const [serviceType, setServiceType] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [serviceHours, setServiceHours] = useState('');
  const [servicePrice, setServicePrice] = useState('');

  // Common state
  const [licenseUploaded, setLicenseUploaded] = useState(false);
  const [kycUploaded, setKycUploaded] = useState(false);
  const [kycSkipped, setKycSkipped] = useState(false);
  const [kycUploading, setKycUploading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycRequest, setKycRequest] = useState<KycRequestRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyKycRequest()
      .then((request) => {
        if (!active) return;
        setKycRequest(request);
        if (request?.documents?.length) {
          setKycUploaded(true);
        }
      })
      .catch(() => {
        // ignore initial load errors
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (kycRequest?.documents?.length) {
      setKycUploaded(true);
    }
  }, [kycRequest]);

  const handleKycUploadClick = () => {
    setKycError(null);
    fileInputRef.current?.click();
  };

  const handleKycFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setKycError(null);
    setKycUploading(true);
    try {
      const { url } = await uploadKycDocument(file);
      const request = await submitKycRequest([
        { doc_type: "business_document", file_url: url },
      ]);
      setKycRequest(request);
      setKycUploaded(true);
      setKycSkipped(false);
    } catch (err: any) {
      setKycError(err?.message || "Failed to upload documents");
    } finally {
      setKycUploading(false);
      event.target.value = "";
    }
  };

  const getRoleConfig = () => {
    switch (role) {
      case 'hauler':
        return {
          color: '#29CA8D',
          icon: Truck,
          label: 'Hauler',
          steps: [
            { title: 'Profile Setup', description: 'Upload your documents' },
            { title: 'Fleet Setup', description: 'Add your first truck' },
            { title: 'Driver Setup', description: 'Assign a driver (optional)' },
          ],
        };
      case 'shipper':
        return {
          color: '#F97316',
          icon: Home,
          label: 'Shipper',
          steps: [
            { title: 'Profile Setup', description: 'Upload your documents' },
            { title: 'Farm Setup', description: 'Tell us about your operation' },
            { title: 'Preferences', description: 'Set your requirements' },
          ],
        };
      case 'stakeholder':
        return {
          color: '#6B7280',
          icon: Wrench,
          label: 'Service Provider',
          steps: [
            { title: 'Profile Setup', description: 'Upload your documents' },
            { title: 'Service Setup', description: 'Define your service' },
            { title: 'Details', description: 'Location and pricing' },
          ],
        };
      default:
        return {
          color: '#29CA8D',
          icon: User,
          label: 'User',
          steps: [],
        };
    }
  };

  const config = getRoleConfig();
  const totalSteps = config.steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const canProceed = () => {
    if (role === 'hauler') {
      if (currentStep === 0) return kycUploaded || kycSkipped;
      if (currentStep === 1) return truckPlate && truckType && truckCapacity;
      return true; // Driver step is optional
    }
    if (role === 'shipper') {
      if (currentStep === 0) return kycUploaded || kycSkipped;
      if (currentStep === 1) return farmName && farmLocation;
      return true;
    }
    if (role === 'stakeholder') {
      if (currentStep === 0) return kycUploaded || kycSkipped;
      if (currentStep === 1) return serviceType && serviceName;
      return true;
    }
    return true;
  };

  const renderStepContent = () => {
    const Icon = config.icon;

    // Step 0: Profile Setup (All Roles)
    if (currentStep === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Profile Setup</CardTitle>
            <CardDescription>Upload your documents to verify your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* KYC Documents */}
            <div className="space-y-3">
              <Label>Business Documents (KYC) *</Label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleKycFileChange}
              />
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3 hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm">
                    <button 
                      type="button"
                      className="text-primary hover:underline"
                      onClick={handleKycUploadClick}
                    >
                      {kycUploading ? "Uploading..." : "Click to upload"}
                    </button> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Business license, Tax ID, Insurance (PDF, max 10MB)
                  </p>
                </div>
                {kycUploaded && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm">Documents uploaded successfully</span>
                  </div>
                )}
                {kycSkipped && !kycUploaded && (
                  <div className="flex items-center justify-center gap-2 text-amber-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm">Skipped for now — please upload later</span>
                  </div>
                )}
                {kycRequest && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Badge
                      variant={kycRequest.status === 'approved' ? 'default' : kycRequest.status === 'rejected' ? 'destructive' : 'secondary'}
                    >
                      {kycRequest.status.toUpperCase()}
                    </Badge>
                    {kycRequest.review_notes && (
                      <span className="text-[11px]">
                        Notes: {kycRequest.review_notes}
                      </span>
                    )}
                  </div>
                )}
                {kycError && (
                  <p className="text-sm text-red-600">{kycError}</p>
                )}
                {!kycUploaded && !kycUploading && (
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:underline"
                    onClick={() => {
                      setKycSkipped(true);
                      setKycError(null);
                      setKycUploaded(false);
                    }}
                  >
                    Skip for now
                  </button>
                )}
              </div>
            </div>

            {/* Driver's License (Hauler only) */}
            {role === 'hauler' && (
              <div className="space-y-3">
                <Label>Driver's License (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-2 hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Upload if you'll be driving
                  </p>
                  {licenseUploaded && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs">Uploaded</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Your account will be reviewed by our team within 24-48 hours. 
                You'll receive an email once approved.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Hauler Steps
    if (role === 'hauler') {
      if (currentStep === 1) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>Add Your First Truck</CardTitle>
              <CardDescription>Set up your fleet to start accepting loads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="truck-plate">Plate Number *</Label>
                  <Input
                    id="truck-plate"
                    placeholder="ABC-1234"
                    value={truckPlate}
                    onChange={(e) => setTruckPlate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="truck-type">Truck Type *</Label>
                  <Select value={truckType} onValueChange={setTruckType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="livestock">Livestock Trailer</SelectItem>
                      <SelectItem value="refrigerated">Refrigerated</SelectItem>
                      <SelectItem value="flatbed">Flatbed</SelectItem>
                      <SelectItem value="enclosed">Enclosed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="truck-capacity">Capacity (head) *</Label>
                  <Input
                    id="truck-capacity"
                    type="number"
                    placeholder="e.g., 24"
                    value={truckCapacity}
                    onChange={(e) => setTruckCapacity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="truck-location">Current Location *</Label>
                  <Input
                    id="truck-location"
                    placeholder="City, State"
                    value={truckLocation}
                    onChange={(e) => setTruckLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Truck Photos (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-2 hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Upload photos of your truck
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      if (currentStep === 2) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>Assign a Driver (Optional)</CardTitle>
              <CardDescription>You can add drivers later from your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driver-name">Driver Name</Label>
                <Input
                  id="driver-name"
                  placeholder="John Doe"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver-phone">Driver Phone</Label>
                <Input
                  id="driver-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  <Clock className="w-4 h-4 inline mr-2" />
                  You can skip this step and add drivers from your dashboard later.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      }
    }

    // Shipper Steps
    if (role === 'shipper') {
      if (currentStep === 1) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>Farm Information</CardTitle>
              <CardDescription>Tell us about your livestock operation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="farm-name">Farm/Ranch Name *</Label>
                <Input
                  id="farm-name"
                  placeholder="Sunny Acres Ranch"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="farm-location">Location *</Label>
                <Input
                  id="farm-location"
                  placeholder="City, State, ZIP"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Animal Types You Handle *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['Cattle', 'Sheep', 'Pigs', 'Horses', 'Goats', 'Poultry'].map((animal) => (
                    <div key={animal} className="flex items-center space-x-2">
                      <Checkbox
                        id={animal}
                        checked={animalTypes.includes(animal)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAnimalTypes([...animalTypes, animal]);
                          } else {
                            setAnimalTypes(animalTypes.filter((a) => a !== animal));
                          }
                        }}
                      />
                      <Label htmlFor={animal} className="cursor-pointer">
                        {animal}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      if (currentStep === 2) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>Welfare Requirements</CardTitle>
              <CardDescription>Set your animal welfare standards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Standard Requirements</Label>
                <div className="space-y-2">
                  {[
                    'Temperature controlled transport',
                    'Regular rest stops',
                    'Water access during transport',
                    'Bedding required',
                    'Ventilation systems',
                  ].map((req) => (
                    <div key={req} className="flex items-center space-x-2">
                      <Checkbox id={req} />
                      <Label htmlFor={req} className="cursor-pointer text-sm">
                        {req}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welfare-requirements">Additional Requirements</Label>
                <Textarea
                  id="welfare-requirements"
                  placeholder="e.g., Pregnant animals require special handling, no mixing of herds, etc."
                  rows={4}
                  value={welfareRequirements}
                  onChange={(e) => setWelfareRequirements(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        );
      }
    }

    // Stakeholder Steps
    if (role === 'stakeholder') {
      if (currentStep === 1) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>Service Setup</CardTitle>
              <CardDescription>Define the services you offer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service-type">Service Type *</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="washout">🚿 Trailer Washout</SelectItem>
                    <SelectItem value="feed">🌾 Feed & Hay Supply</SelectItem>
                    <SelectItem value="vet">🏥 Veterinary Services</SelectItem>
                    <SelectItem value="fuel">⛽ Fuel Station</SelectItem>
                    <SelectItem value="repair">🔧 Repair & Maintenance</SelectItem>
                    <SelectItem value="other">📦 Other Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-name">Service Name *</Label>
                <Input
                  id="service-name"
                  placeholder="e.g., Premium Livestock Washout"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-location">Service Location *</Label>
                <Input
                  id="service-location"
                  placeholder="Address or Highway exit"
                  value={serviceLocation}
                  onChange={(e) => setServiceLocation(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        );
      }

      if (currentStep === 2) {
        return (
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>Set your hours and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service-hours">Operating Hours *</Label>
                <Select value={serviceHours} onValueChange={setServiceHours}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24/7">24/7</SelectItem>
                    <SelectItem value="business">Business Hours (9-5)</SelectItem>
                    <SelectItem value="extended">Extended Hours (6am-10pm)</SelectItem>
                    <SelectItem value="appointment">By Appointment Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-price">Base Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                  <Input
                    id="service-price"
                    type="number"
                    placeholder="0.00"
                    className="pl-8"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {serviceType === 'fuel' ? 'Price per gallon' : 'Price per service'}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  You can add more services and update pricing from your dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      }
    }

    return null;
  };

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D1D5DB] to-white p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="w-8 h-8" style={{ color: config.color }} />
          </div>
          <h1 className="text-2xl mb-1">Complete Your Profile</h1>
          <p className="text-sm text-muted-foreground">{config.label} Setup</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}: {config.steps[currentStep].title}
            </span>
            <span style={{ color: config.color }}>
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} style={{ backgroundColor: `${config.color}30` }} />
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {renderStepContent()}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1"
            style={{ 
              backgroundColor: canProceed() ? config.color : undefined,
              opacity: canProceed() ? 1 : 0.5
            }}
          >
            {currentStep < totalSteps - 1 ? 'Continue' : 'Complete Setup'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Skip Option */}
        {currentStep > 0 && (
          <div className="text-center mt-4">
            <Button variant="ghost" onClick={handleSkipStep} className="text-sm">
              Skip this step
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>You can complete or update this information later from your dashboard</p>
        </div>
      </div>
    </div>
  );
}
