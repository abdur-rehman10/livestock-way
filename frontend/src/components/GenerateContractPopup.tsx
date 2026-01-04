import { X, FileText, Calendar, DollarSign, Shield, Heart, Truck, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useEffect, useRef, useState } from 'react';

type ContractFormData = {
  contractType: string;
  contractDuration: string;
  paymentMethod: string;
  paymentSchedule: string;
  depositRequired: string;
  depositPercentage: string;
  pickupDate: string;
  pickupTime: string;
  deliveryDate: string;
  deliveryTime: string;
  estimatedDistance: string;
  routeType: string;
  restStopsRequired: string;
  restStopInterval: string;
  temperatureMonitoring: string;
  temperatureRange: string;
  ventilationRequired: string;
  waterAccessRequired: string;
  feedingSchedule: string;
  insuranceCoverage: string;
  liabilityLimit: string;
  cargoInsurance: string;
  additionalInsurance: string;
  healthCertificates: string;
  movementPermits: string;
  dotCompliance: string;
  animalWelfareCompliance: string;
  specialHandling: string;
  equipmentRequirements: string;
  emergencyContact: string;
  emergencyPhone: string;
  veterinarianOnCall: string;
  cancellationPolicy: string;
  lateFeePolicy: string;
  disputeResolution: string;
  forcemajeure: string;
  additionalTerms: string;
  specialInstructions: string;
  priceAmount: string;
  priceType: 'per-mile' | 'total';
};

interface GenerateContractPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (contractData: ContractFormData) => void;
  onSaveDraft?: (contractData: ContractFormData) => void;
  initialData?: Partial<ContractFormData>;
  contractInfo?: {
    haulerName: string;
    route: { origin: string; destination: string };
    animalType: string;
    headCount: number;
    price: number;
    priceType: 'per-mile' | 'total';
  };
}

export function GenerateContractPopup({ isOpen, onClose, onGenerate, onSaveDraft, initialData, contractInfo }: GenerateContractPopupProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ContractFormData>({
    // Basic Contract Info
    contractType: 'standard',
    contractDuration: 'single-trip',
    
    // Payment Terms
    paymentMethod: 'direct-deposit',
    paymentSchedule: 'on-delivery',
    depositRequired: 'yes',
    depositPercentage: '25',
    
    // Trip Details
    pickupDate: '',
    pickupTime: '',
    deliveryDate: '',
    deliveryTime: '',
    estimatedDistance: '',
    routeType: 'direct',
    
    // Animal Welfare
    restStopsRequired: 'yes',
    restStopInterval: '4',
    temperatureMonitoring: 'yes',
    temperatureRange: '40-80',
    ventilationRequired: 'yes',
    waterAccessRequired: 'yes',
    feedingSchedule: '',
    
    // Insurance & Liability
    insuranceCoverage: 'standard',
    liabilityLimit: '100000',
    cargoInsurance: 'yes',
    additionalInsurance: '',
    
    // Compliance & Documentation
    healthCertificates: 'required',
    movementPermits: 'required',
    dotCompliance: 'required',
    animalWelfareCompliance: 'required',
    
    // Special Requirements
    specialHandling: '',
    equipmentRequirements: '',
    emergencyContact: '',
    emergencyPhone: '',
    veterinarianOnCall: '',
    
    // Terms & Conditions
    cancellationPolicy: '48-hours',
    lateFeePolicy: 'yes',
    disputeResolution: 'mediation',
    forcemajeure: 'yes',
    
    // Additional Notes
    additionalTerms: '',
    specialInstructions: '',
    priceAmount: contractInfo?.price ? String(contractInfo.price) : '',
    priceType: contractInfo?.priceType ?? 'total',
  });
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!isOpen || wasOpen) return;
    if (contractInfo) {
      setFormData((prev) => ({
        ...prev,
        priceAmount: contractInfo.price ? String(contractInfo.price) : prev.priceAmount,
        priceType: contractInfo.priceType ?? prev.priceType,
      }));
    }
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
    setStep(1);
  }, [contractInfo, initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const buildContractData = (): ContractFormData & { contractInfo?: typeof contractInfo; generatedAt: string } => ({
    ...formData,
    ...(contractInfo && { contractInfo }),
    generatedAt: new Date().toISOString(),
  });

  const handleGenerate = () => {
    onGenerate(buildContractData());
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-6 px-6 pt-6">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
              step >= s ? 'text-white' : 'bg-gray-200 text-gray-500'
            }`}
            style={step >= s ? { backgroundColor: '#53ca97' } : {}}
          >
            {step > s ? <CheckCircle className="w-5 h-5" /> : s}
          </div>
          {s < 4 && (
            <div
              className={`flex-1 h-1 mx-2 transition-colors ${
                step > s ? '' : 'bg-gray-200'
              }`}
              style={step > s ? { backgroundColor: '#53ca97' } : {}}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#53ca97' }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl">Generate Contract</h2>
              <p className="text-xs text-gray-500">
                Step {step} of 4: {step === 1 && 'Basic Info & Payment'}
                {step === 2 && 'Trip Details & Welfare'}
                {step === 3 && 'Insurance & Compliance'}
                {step === 4 && 'Review & Finalize'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Contract Info Summary */}
        {contractInfo && (
          <div className="mx-6 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm mb-2">
                  <strong>Hauler:</strong> {contractInfo.haulerName}
                </p>
                <p className="text-sm mb-2">
                  <strong>Route:</strong> {contractInfo.route.origin} → {contractInfo.route.destination}
                </p>
                <p className="text-sm">
                  <strong>Load:</strong> {contractInfo.animalType} • {contractInfo.headCount} head
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm" style={{ color: '#53ca97' }}>
                  <strong>
                    ${contractInfo.price.toFixed(2)}
                    {contractInfo.priceType === 'per-mile' ? '/mile' : ' total'}
                  </strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* STEP 1: Basic Info & Payment Terms */}
          {step === 1 && (
            <div className="space-y-6 pb-6">
              {/* Contract Type */}
              <div>
                <label className="block text-sm mb-2">
                  Contract Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.contractType}
                  onChange={(e) => handleChange('contractType', e.target.value)}
                  className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                >
                  <option value="standard">Standard Transport Contract</option>
                  <option value="recurring">Recurring Contract</option>
                  <option value="emergency">Emergency Transport</option>
                  <option value="premium">Premium Service</option>
                </select>
              </div>

              {/* Contract Duration */}
              <div>
                <label className="block text-sm mb-2">
                  Contract Duration <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['single-trip', 'monthly', 'annual'].map((option) => (
                    <button
                      key={option}
                      onClick={() => handleChange('contractDuration', option)}
                      className={`px-4 py-2 text-sm border rounded-lg transition-all ${
                        formData.contractDuration === option
                          ? 'text-white border-transparent'
                          : 'hover:border-gray-400'
                      }`}
                      style={
                        formData.contractDuration === option
                          ? { backgroundColor: '#53ca97' }
                          : {}
                      }
                    >
                      {option === 'single-trip' && 'Single Trip'}
                      {option === 'monthly' && 'Monthly'}
                      {option === 'annual' && 'Annual'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">
                  Contract Price <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={formData.priceAmount}
                    onChange={(e) => handleChange('priceAmount', e.target.value)}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    placeholder="0.00"
                  />
                  <select
                    value={formData.priceType}
                    onChange={(e) => handleChange('priceType', e.target.value as 'per-mile' | 'total')}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  >
                    <option value="total">Total Price</option>
                    <option value="per-mile">Per Mile</option>
                  </select>
                </div>
              </div>

              {/* Payment Terms Section */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5" style={{ color: '#53ca97' }} />
                  <h3 className="text-base">Payment Terms</h3>
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => handleChange('paymentMethod', e.target.value)}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  >
                    <option value="direct-deposit">Direct Deposit (ACH)</option>
                    <option value="wire-transfer">Wire Transfer</option>
                    <option value="check">Check</option>
                    <option value="escrow">Escrow Service</option>
                  </select>
                </div>

                {/* Payment Schedule */}
                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Payment Schedule <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentSchedule}
                    onChange={(e) => handleChange('paymentSchedule', e.target.value)}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  >
                    <option value="on-delivery">Upon Delivery (Full Payment)</option>
                    <option value="split">50% Upfront, 50% on Delivery</option>
                    <option value="net-15">Net 15 Days</option>
                    <option value="net-30">Net 30 Days</option>
                  </select>
                </div>

                {/* Deposit Required */}
                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Deposit Required? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['yes', 'no'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleChange('depositRequired', option)}
                        className={`px-4 py-2 text-sm border rounded-lg transition-all ${
                          formData.depositRequired === option
                            ? 'text-white border-transparent'
                            : 'hover:border-gray-400'
                        }`}
                        style={
                          formData.depositRequired === option
                            ? { backgroundColor: '#53ca97' }
                            : {}
                        }
                      >
                        {option === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deposit Percentage */}
                {formData.depositRequired === 'yes' && (
                  <div>
                    <label className="block text-sm mb-2">
                      Deposit Percentage <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      {['10', '25', '50'].map((percentage) => (
                        <button
                          key={percentage}
                          onClick={() => handleChange('depositPercentage', percentage)}
                          className={`flex-1 px-4 py-2 text-sm border rounded-lg transition-all ${
                            formData.depositPercentage === percentage
                              ? 'text-white border-transparent'
                              : 'hover:border-gray-400'
                          }`}
                          style={
                            formData.depositPercentage === percentage
                              ? { backgroundColor: '#53ca97' }
                              : {}
                          }
                        >
                          {percentage}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Trip Details & Animal Welfare */}
          {step === 2 && (
            <div className="space-y-6 pb-6">
              {/* Trip Details */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5" style={{ color: '#53ca97' }} />
                  <h3 className="text-base">Trip Details</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm mb-2">
                      Pickup Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.pickupDate}
                      onChange={(e) => handleChange('pickupDate', e.target.value)}
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      Pickup Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.pickupTime}
                      onChange={(e) => handleChange('pickupTime', e.target.value)}
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm mb-2">
                      Expected Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleChange('deliveryDate', e.target.value)}
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      Expected Delivery Time
                    </label>
                    <input
                      type="time"
                      value={formData.deliveryTime}
                      onChange={(e) => handleChange('deliveryTime', e.target.value)}
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">
                      Estimated Distance (miles)
                    </label>
                    <input
                      type="number"
                      value={formData.estimatedDistance}
                      onChange={(e) => handleChange('estimatedDistance', e.target.value)}
                      placeholder="e.g. 350"
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      Route Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.routeType}
                      onChange={(e) => handleChange('routeType', e.target.value)}
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    >
                      <option value="direct">Direct Route</option>
                      <option value="multi-stop">Multi-Stop</option>
                      <option value="scenic">Scenic (Avoid Highways)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Animal Welfare Requirements */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5" style={{ color: '#53ca97' }} />
                  <h3 className="text-base">Animal Welfare Requirements</h3>
                </div>

                {/* Rest Stops */}
                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Rest Stops Required? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3 mb-3">
                    {['yes', 'no'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleChange('restStopsRequired', option)}
                        className={`px-4 py-2 text-sm border rounded-lg transition-all ${
                          formData.restStopsRequired === option
                            ? 'text-white border-transparent'
                            : 'hover:border-gray-400'
                        }`}
                        style={
                          formData.restStopsRequired === option
                            ? { backgroundColor: '#53ca97' }
                            : {}
                        }
                      >
                        {option === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>

                  {formData.restStopsRequired === 'yes' && (
                    <div>
                      <label className="block text-sm mb-2">
                        Rest Stop Interval (hours) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.restStopInterval}
                        onChange={(e) => handleChange('restStopInterval', e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                      />
                    </div>
                  )}
                </div>

                {/* Temperature Monitoring */}
                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Temperature Monitoring Required? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3 mb-3">
                    {['yes', 'no'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleChange('temperatureMonitoring', option)}
                        className={`px-4 py-2 text-sm border rounded-lg transition-all ${
                          formData.temperatureMonitoring === option
                            ? 'text-white border-transparent'
                            : 'hover:border-gray-400'
                        }`}
                        style={
                          formData.temperatureMonitoring === option
                            ? { backgroundColor: '#53ca97' }
                            : {}
                        }
                      >
                        {option === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>

                  {formData.temperatureMonitoring === 'yes' && (
                    <div>
                      <label className="block text-sm mb-2">
                        Acceptable Temperature Range (°F)
                      </label>
                      <input
                        type="text"
                        value={formData.temperatureRange}
                        onChange={(e) => handleChange('temperatureRange', e.target.value)}
                        placeholder="e.g. 40-80"
                        className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                      />
                    </div>
                  )}
                </div>

                {/* Ventilation & Water */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm mb-2">
                      Adequate Ventilation? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {['yes', 'no'].map((option) => (
                        <button
                          key={option}
                          onClick={() => handleChange('ventilationRequired', option)}
                          className={`flex-1 px-4 py-2 text-sm border rounded-lg transition-all ${
                            formData.ventilationRequired === option
                              ? 'text-white border-transparent'
                              : 'hover:border-gray-400'
                          }`}
                          style={
                            formData.ventilationRequired === option
                              ? { backgroundColor: '#53ca97' }
                              : {}
                          }
                        >
                          {option === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">
                      Water Access Required? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {['yes', 'no'].map((option) => (
                        <button
                          key={option}
                          onClick={() => handleChange('waterAccessRequired', option)}
                          className={`flex-1 px-4 py-2 text-sm border rounded-lg transition-all ${
                            formData.waterAccessRequired === option
                              ? 'text-white border-transparent'
                              : 'hover:border-gray-400'
                          }`}
                          style={
                            formData.waterAccessRequired === option
                              ? { backgroundColor: '#53ca97' }
                              : {}
                          }
                        >
                          {option === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Feeding Schedule */}
                <div>
                  <label className="block text-sm mb-2">
                    Feeding Schedule (if applicable)
                  </label>
                  <textarea
                    value={formData.feedingSchedule}
                    onChange={(e) => handleChange('feedingSchedule', e.target.value)}
                    placeholder="Describe feeding requirements during transport..."
                    rows={3}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Insurance & Compliance */}
          {step === 3 && (
            <div className="space-y-6 pb-6">
              {/* Insurance Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5" style={{ color: '#53ca97' }} />
                  <h3 className="text-base">Insurance & Liability</h3>
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Insurance Coverage <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.insuranceCoverage}
                    onChange={(e) => handleChange('insuranceCoverage', e.target.value)}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  >
                    <option value="standard">Standard Coverage</option>
                    <option value="enhanced">Enhanced Coverage</option>
                    <option value="premium">Premium Coverage</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Liability Limit (USD) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.liabilityLimit}
                    onChange={(e) => handleChange('liabilityLimit', e.target.value)}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  >
                    <option value="100000">$100,000</option>
                    <option value="250000">$250,000</option>
                    <option value="500000">$500,000</option>
                    <option value="1000000">$1,000,000</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Cargo Insurance Required? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['yes', 'no'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleChange('cargoInsurance', option)}
                        className={`px-4 py-2 text-sm border rounded-lg transition-all ${
                          formData.cargoInsurance === option
                            ? 'text-white border-transparent'
                            : 'hover:border-gray-400'
                        }`}
                        style={
                          formData.cargoInsurance === option
                            ? { backgroundColor: '#53ca97' }
                            : {}
                        }
                      >
                        {option === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2">
                    Additional Insurance Notes
                  </label>
                  <textarea
                    value={formData.additionalInsurance}
                    onChange={(e) => handleChange('additionalInsurance', e.target.value)}
                    placeholder="Any specific insurance requirements..."
                    rows={3}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>
              </div>

              {/* Compliance & Documentation */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5" style={{ color: '#53ca97' }} />
                  <h3 className="text-base">Compliance & Documentation</h3>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">Health Certificates</span>
                    <select
                      value={formData.healthCertificates}
                      onChange={(e) => handleChange('healthCertificates', e.target.value)}
                      className="px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    >
                      <option value="required">Required</option>
                      <option value="optional">Optional</option>
                      <option value="not-required">Not Required</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">Movement Permits</span>
                    <select
                      value={formData.movementPermits}
                      onChange={(e) => handleChange('movementPermits', e.target.value)}
                      className="px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    >
                      <option value="required">Required</option>
                      <option value="optional">Optional</option>
                      <option value="not-required">Not Required</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">DOT Compliance</span>
                    <select
                      value={formData.dotCompliance}
                      onChange={(e) => handleChange('dotCompliance', e.target.value)}
                      className="px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    >
                      <option value="required">Required</option>
                      <option value="optional">Optional</option>
                      <option value="not-required">Not Required</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">Animal Welfare Compliance</span>
                    <select
                      value={formData.animalWelfareCompliance}
                      onChange={(e) => handleChange('animalWelfareCompliance', e.target.value)}
                      className="px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    >
                      <option value="required">Required</option>
                      <option value="optional">Optional</option>
                      <option value="not-required">Not Required</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Special Requirements */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-5 h-5" style={{ color: '#53ca97' }} />
                  <h3 className="text-base">Special Requirements</h3>
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Special Handling Instructions
                  </label>
                  <textarea
                    value={formData.specialHandling}
                    onChange={(e) => handleChange('specialHandling', e.target.value)}
                    placeholder="Any special handling requirements..."
                    rows={3}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Equipment Requirements
                  </label>
                  <textarea
                    value={formData.equipmentRequirements}
                    onChange={(e) => handleChange('equipmentRequirements', e.target.value)}
                    placeholder="Required equipment, trailer specifications, etc..."
                    rows={3}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm mb-2">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => handleChange('emergencyContact', e.target.value)}
                      placeholder="Name"
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      Emergency Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2">
                    Veterinarian On-Call (if applicable)
                  </label>
                  <input
                    type="text"
                    value={formData.veterinarianOnCall}
                    onChange={(e) => handleChange('veterinarianOnCall', e.target.value)}
                    placeholder="Veterinarian name and contact"
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Terms */}
          {step === 4 && (
            <div className="space-y-6 pb-6">
              {/* Terms & Conditions */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5" style={{ color: '#53ca97' }} />
                  <h3 className="text-base">Terms & Conditions</h3>
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Cancellation Policy <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.cancellationPolicy}
                    onChange={(e) => handleChange('cancellationPolicy', e.target.value)}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  >
                    <option value="24-hours">24 Hours Notice (50% refund)</option>
                    <option value="48-hours">48 Hours Notice (75% refund)</option>
                    <option value="72-hours">72 Hours Notice (100% refund)</option>
                    <option value="no-cancellation">No Cancellation Allowed</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Late Delivery Fee Policy <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['yes', 'no'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleChange('lateFeePolicy', option)}
                        className={`px-4 py-2 text-sm border rounded-lg transition-all ${
                          formData.lateFeePolicy === option
                            ? 'text-white border-transparent'
                            : 'hover:border-gray-400'
                        }`}
                        style={
                          formData.lateFeePolicy === option
                            ? { backgroundColor: '#53ca97' }
                            : {}
                        }
                      >
                        {option === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Dispute Resolution <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.disputeResolution}
                    onChange={(e) => handleChange('disputeResolution', e.target.value)}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  >
                    <option value="mediation">Mediation</option>
                    <option value="arbitration">Arbitration</option>
                    <option value="litigation">Litigation</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Force Majeure Clause <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['yes', 'no'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleChange('forcemajeure', option)}
                        className={`px-4 py-2 text-sm border rounded-lg transition-all ${
                          formData.forcemajeure === option
                            ? 'text-white border-transparent'
                            : 'hover:border-gray-400'
                        }`}
                        style={
                          formData.forcemajeure === option
                            ? { backgroundColor: '#53ca97' }
                            : {}
                        }
                      >
                        {option === 'yes' ? 'Include' : 'Exclude'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Force Majeure protects both parties from liability in case of unforeseen circumstances (natural disasters, government actions, etc.)
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm mb-2">
                    Additional Terms & Conditions
                  </label>
                  <textarea
                    value={formData.additionalTerms}
                    onChange={(e) => handleChange('additionalTerms', e.target.value)}
                    placeholder="Any additional terms and conditions..."
                    rows={4}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    value={formData.specialInstructions}
                    onChange={(e) => handleChange('specialInstructions', e.target.value)}
                    placeholder="Any special instructions for the hauler..."
                    rows={4}
                    className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>
              </div>

              {/* Summary Alert */}
              <div className="border-t pt-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700 mb-2">
                        <strong>Review Before Generating</strong>
                      </p>
                      <p className="text-xs text-blue-600">
                        Please review all contract details carefully. Once generated, this contract will be sent to the hauler for review and signature. You can make changes before final confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 flex items-center justify-between">
          <Button
            onClick={step === 1 ? onClose : handlePrevious}
            variant="outline"
            className="px-6 py-2 text-sm"
          >
            {step === 1 ? 'Cancel' : 'Previous'}
          </Button>

          {step < 4 ? (
            <Button
              onClick={handleNext}
              className="px-6 py-2 text-sm"
              style={{ backgroundColor: '#53ca97', color: 'white' }}
            >
              Next Step
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {onSaveDraft && (
                <Button
                  onClick={() => onSaveDraft(buildContractData())}
                  variant="outline"
                  className="px-6 py-2 text-sm"
                >
                  Save Draft
                </Button>
              )}
              <Button
                onClick={handleGenerate}
                className="px-6 py-2 text-sm flex items-center gap-2"
                style={{ backgroundColor: '#53ca97', color: 'white' }}
              >
                <FileText className="w-4 h-4" />
                Generate Contract
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
