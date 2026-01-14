import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PhotoUpload } from './PhotoUpload';
import { FreeAccountUpgradePrompt } from './FreeAccountUpgradePrompt';
import { PostSuccessPopup } from './PostSuccessPopup';
import { useState } from 'react';

interface PostJobFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jobData: any) => void;
  isSubscribed?: boolean;
  currentListings?: number;
  maxListings?: number;
  onNavigateToListings?: () => void;
  onNavigateToBoard?: () => void;
}

export function PostJobForm({ isOpen, onClose, onSubmit, isSubscribed = false, currentListings = 0, maxListings = 2, onNavigateToListings, onNavigateToBoard }: PostJobFormProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    requiredSkills: '',
    jobType: '',
    locationType: '',
    location: '',
    salary: '',
    salaryFrequency: '',
    benefitsAccommodation: false,
    benefitsFood: false,
    benefitsFuel: false,
    benefitsVehicle: false,
    benefitsBonus: false,
    benefitsOthers: false,
    contactPerson: '',
    phone: '',
    preferredCallTime: '',
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check free account limit
    if (!isSubscribed && currentListings >= maxListings) {
      setShowUpgradePrompt(true);
      return;
    }
    
    onSubmit({ ...formData, photos });
    // Reset form
    setFormData({
      jobTitle: '',
      jobDescription: '',
      requiredSkills: '',
      jobType: '',
      locationType: '',
      location: '',
      salary: '',
      salaryFrequency: '',
      benefitsAccommodation: false,
      benefitsFood: false,
      benefitsFuel: false,
      benefitsVehicle: false,
      benefitsBonus: false,
      benefitsOthers: false,
      contactPerson: '',
      phone: '',
      preferredCallTime: '',
      email: '',
    });
    setPhotos([]);
    onClose();
    setShowSuccessPopup(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Job</DialogTitle>
            <DialogDescription>Fill in the job details to attract the right candidates</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Job Details */}
            <div>
              <Label>Job Title *</Label>
              <Input
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="e.g., Livestock Transport Driver"
                required
              />
            </div>

            <div>
              <Label>Job Description *</Label>
              <Textarea
                value={formData.jobDescription}
                onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                rows={4}
                required
              />
            </div>

            <div>
              <Label>Required Skills / Experience</Label>
              <Textarea
                value={formData.requiredSkills}
                onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                placeholder="List required qualifications, certifications, experience..."
                rows={3}
              />
            </div>

            {/* Job Type */}
            <div>
              <Label>Job Type *</Label>
              <Select
                value={formData.jobType}
                onValueChange={(value) => setFormData({ ...formData, jobType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label>Location Type *</Label>
              <Select
                value={formData.locationType}
                onValueChange={(value) => setFormData({ ...formData, locationType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="on-site">On-site</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.locationType === 'on-site' && (
              <div>
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, State"
                />
              </div>
            )}

            {/* Salary & Benefits */}
            <div className="border-t pt-4">
              <h3 className="text-sm mb-3">Salary & Benefits</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Salary Offered / Expected</Label>
                  <Input
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="e.g., $60,000 or $25/hr"
                  />
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={formData.salaryFrequency}
                    onValueChange={(value) => setFormData({ ...formData, salaryFrequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
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

              <div className="mt-3">
                <Label className="mb-2 block">Benefits</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.benefitsAccommodation}
                      onCheckedChange={(checked) => setFormData({ ...formData, benefitsAccommodation: checked as boolean })}
                    />
                    <Label className="text-sm cursor-pointer">Accommodation</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.benefitsFood}
                      onCheckedChange={(checked) => setFormData({ ...formData, benefitsFood: checked as boolean })}
                    />
                    <Label className="text-sm cursor-pointer">Food</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.benefitsFuel}
                      onCheckedChange={(checked) => setFormData({ ...formData, benefitsFuel: checked as boolean })}
                    />
                    <Label className="text-sm cursor-pointer">Fuel Allowance</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.benefitsVehicle}
                      onCheckedChange={(checked) => setFormData({ ...formData, benefitsVehicle: checked as boolean })}
                    />
                    <Label className="text-sm cursor-pointer">Vehicle</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.benefitsBonus}
                      onCheckedChange={(checked) => setFormData({ ...formData, benefitsBonus: checked as boolean })}
                    />
                    <Label className="text-sm cursor-pointer">Bonus</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.benefitsOthers}
                      onCheckedChange={(checked) => setFormData({ ...formData, benefitsOthers: checked as boolean })}
                    />
                    <Label className="text-sm cursor-pointer">Others</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="border-t pt-4">
              <h3 className="text-sm mb-3">Contact Details</h3>

              <div className="space-y-3">
                <div>
                  <Label>Contact Person *</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone / WhatsApp *</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>
                  <div>
                    <Label>Preferred Call Time</Label>
                    <Input
                      value={formData.preferredCallTime}
                      onChange={(e) => setFormData({ ...formData, preferredCallTime: e.target.value })}
                      placeholder="e.g., 9AM-5PM CST"
                    />
                  </div>
                </div>

                <div>
                  <Label>Email (Optional)</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <PhotoUpload
              maxPhotos={5}
              onPhotosChange={setPhotos}
              existingPhotos={photos}
              label="Add Photos"
              description="Upload photos related to the job (optional)"
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                style={{ backgroundColor: '#53ca97', color: 'white' }}
              >
                Post Job
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upgrade Prompt */}
      <FreeAccountUpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        reason="listing-limit"
        currentListings={currentListings}
        maxListings={maxListings}
      />

      {/* Success Popup */}
      <PostSuccessPopup
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        type="job"
        title={formData.jobTitle}
        onViewListing={() => {
          setShowSuccessPopup(false);
          if (onNavigateToListings) onNavigateToListings();
        }}
        onViewBoard={() => {
          setShowSuccessPopup(false);
          if (onNavigateToBoard) onNavigateToBoard();
        }}
        onCreateAnother={() => {
          setShowSuccessPopup(false);
        }}
      />
    </>
  );
}