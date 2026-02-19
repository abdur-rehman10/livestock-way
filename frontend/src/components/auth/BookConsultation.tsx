import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface BookConsultationProps {
  onBack: () => void;
  onConsultationBooked: () => void;
}

export function BookConsultation({ onBack, onConsultationBooked }: BookConsultationProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    fleetSize: '',
    message: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid =
    formData.companyName.trim() &&
    formData.contactName.trim() &&
    formData.email.trim() &&
    formData.phone.trim();

  const handleSubmit = () => {
    if (isFormValid) {
      onConsultationBooked();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#42b883] hover:text-[#379e6f] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold mb-1">Book a Consultation</h2>
          <p className="text-gray-600 text-sm">
            Tell us about your operation and we'll create a custom plan for you
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42b883] focus:border-[#42b883]"
              placeholder="Your company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42b883] focus:border-[#42b883]"
              placeholder="Your full name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42b883] focus:border-[#42b883]"
                placeholder="email@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42b883] focus:border-[#42b883]"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fleet Size</label>
            <select
              value={formData.fleetSize}
              onChange={(e) => handleChange('fleetSize', e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42b883] focus:border-[#42b883] bg-white"
            >
              <option value="">Select fleet size</option>
              <option value="1-10">1–10 trucks</option>
              <option value="11-50">11–50 trucks</option>
              <option value="51-100">51–100 trucks</option>
              <option value="100+">100+ trucks</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
            <textarea
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#42b883] focus:border-[#42b883] resize-none"
              rows={3}
              placeholder="Tell us about your specific needs..."
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full mt-6 h-11 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#42b883' }}
        >
          Request Consultation
        </Button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Our team will reach out within 1–2 business days to schedule your consultation.
        </p>
      </Card>
    </div>
  );
}
