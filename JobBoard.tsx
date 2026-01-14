import { MapPin, Briefcase, Clock, Building, Bookmark, User } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { CongratsModal } from './CongratsModal';
import { UserProfilePreview } from './UserProfilePreview';
import { useState } from 'react';

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  state: string;
  type: 'full-time' | 'part-time' | 'contract';
  salary?: string;
  description: string;
  requirements: string[];
  postedDate: string;
}

const mockJobs: Job[] = [
  {
    id: '1',
    title: 'CDL Livestock Driver',
    company: 'Swift Livestock Transport LLC',
    location: 'Austin, TX',
    state: 'Texas',
    type: 'full-time',
    salary: '$55,000 - $75,000/year',
    description: 'Experienced CDL driver needed for livestock transport across Texas and neighboring states. Must have clean driving record and experience with cattle transport.',
    requirements: ['Valid CDL Class A', '2+ years experience', 'Clean MVR', 'Livestock handling experience'],
    postedDate: '2024-01-10',
  },
  {
    id: '2',
    title: 'Horse Transport Specialist',
    company: 'Elite Equine Services',
    location: 'Lexington, KY',
    state: 'Kentucky',
    type: 'full-time',
    salary: '$60,000 - $80,000/year',
    description: 'Premium horse transport company seeking experienced driver for high-value equine transport. Travel nationwide with focus on Kentucky, Florida, and California routes.',
    requirements: ['CDL Class A or B', 'Horse handling experience', 'Excellent communication', 'Flexibility for travel'],
    postedDate: '2024-01-12',
  },
  {
    id: '3',
    title: 'Livestock Logistics Coordinator',
    company: 'Ranch Management Systems',
    location: 'Denver, CO',
    state: 'Colorado',
    type: 'full-time',
    salary: '$50,000 - $65,000/year',
    description: 'Coordinate livestock transport operations, schedule pickups and deliveries, manage driver assignments, and ensure compliance with all regulations.',
    requirements: ['Logistics experience', 'Knowledge of livestock industry', 'Strong organizational skills', 'Computer proficiency'],
    postedDate: '2024-01-08',
  },
  {
    id: '4',
    title: 'Part-Time Cattle Hauler',
    company: 'Local Ranch Co-op',
    location: 'Great Falls, MT',
    state: 'Montana',
    type: 'part-time',
    salary: '$25 - $35/hour',
    description: 'Seasonal and part-time cattle hauling for local ranchers. Flexible schedule, mostly short hauls within 200 miles.',
    requirements: ['CDL preferred', 'Livestock experience', 'Available weekends', 'Local to Montana'],
    postedDate: '2024-01-14',
  },
];

export function JobBoard() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  const toggleSaveJob = (jobId: string) => {
    if (savedJobs.includes(jobId)) {
      setSavedJobs(savedJobs.filter(id => id !== jobId));
    } else {
      setSavedJobs([...savedJobs, jobId]);
    }
  };

  const handleViewCompanyProfile = (job: Job) => {
    setSelectedCompany({
      id: job.id,
      name: job.company,
      type: 'hauler',
      location: job.location,
      rating: 4.7,
      reviewCount: 89,
      verified: true,
      memberSince: '2019-05-12',
      completedTrips: 450,
      activeListings: 12,
      responseTime: '< 30min',
      bio: `${job.company} is a leading livestock transportation company specializing in ${job.type} positions. We pride ourselves on safety, reliability, and employee satisfaction.`,
      specialties: [job.type, 'Livestock Transport', 'Professional'],
      phone: '+1 (555) 987-6543',
      email: 'hr@company.com',
    });
    setShowUserProfile(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1>Job Board</h1>
        <p className="text-sm text-gray-500 mt-1">Find livestock transportation and logistics jobs</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <Button variant="outline" size="sm" className="px-4 py-2 text-sm">
          All Job Types
        </Button>
        <Button variant="outline" size="sm" className="px-4 py-2 text-sm">
          Location
        </Button>
        <Button variant="outline" size="sm" className="px-4 py-2 text-sm">
          Salary Range
        </Button>
        <Button variant="outline" size="sm" className="px-4 py-2 text-sm">
          Experience Level
        </Button>
      </div>

      {/* Job Cards */}
      <div className="space-y-3">
        {mockJobs.map((job) => (
          <Card key={job.id} className="p-4 hover:shadow-md transition-all relative">
            {/* Saved Indicator */}
            {savedJobs.includes(job.id) && (
              <div className="absolute top-3 right-3 z-10">
                <Bookmark className="w-5 h-5 fill-red-500 text-red-500" />
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4 flex-1">
                {/* Company Logo Placeholder */}
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                  style={{ backgroundColor: '#53ca97' }}
                >
                  <Building className="w-8 h-8" />
                </div>

                <div className="flex-1">
                  {/* Title and Badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base">{job.title}</h3>
                    <Badge 
                      variant={job.type === 'full-time' ? 'default' : 'outline'}
                      className="px-2 py-0.5 text-xs capitalize"
                      style={job.type === 'full-time' ? { backgroundColor: '#53ca97', color: 'white' } : {}}
                    >
                      {job.type}
                    </Badge>
                  </div>

                  {/* Company */}
                  <button
                    onClick={() => handleViewCompanyProfile(job)}
                    className="text-sm text-gray-600 mb-2 hover:underline text-left"
                    style={{ color: '#42b883' }}
                  >
                    {job.company}
                  </button>

                  {/* Details Row */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                    {job.salary && (
                      <>
                        <span>•</span>
                        <span>{job.salary}</span>
                      </>
                    )}
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Posted {new Date(job.postedDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col gap-2">
                <Button 
                  size="sm" 
                  className="px-4 py-2 text-sm whitespace-nowrap" 
                  style={{ backgroundColor: '#53ca97', color: 'white' }}
                  onClick={() => setSelectedJob(job)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Job Details Dialog */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedJob.title}</DialogTitle>
              <DialogDescription>{selectedJob.description}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span>{selectedJob.company}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{selectedJob.location}</span>
                </div>
                <Badge 
                  className="px-2 py-1 text-xs capitalize"
                  style={{ backgroundColor: '#53ca97', color: 'white' }}
                >
                  {selectedJob.type}
                </Badge>
              </div>

              {selectedJob.salary && (
                <div className="py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Salary Range</div>
                  <div className="text-lg" style={{ color: '#53ca97' }}>{selectedJob.salary}</div>
                </div>
              )}

              <div>
                <h4 className="mb-2">Requirements</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {selectedJob.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  className="flex-1 px-6 py-3" 
                  style={{ backgroundColor: '#53ca97', color: 'white' }}
                  onClick={() => setShowApplicationDialog(true)}
                >
                  Apply Now
                </Button>
                <Button 
                  variant={savedJobs.includes(selectedJob.id) ? 'default' : 'outline'}
                  className="px-6 py-3"
                  style={savedJobs.includes(selectedJob.id) ? { backgroundColor: '#53ca97', color: 'white' } : {}}
                  onClick={() => toggleSaveJob(selectedJob.id)}
                >
                  <Bookmark className={`w-4 h-4 mr-2 ${savedJobs.includes(selectedJob.id) ? 'fill-current' : ''}`} />
                  {savedJobs.includes(selectedJob.id) ? 'Saved' : 'Save for Later'}
                </Button>
                <Button 
                  size="sm" 
                  className="px-4 py-2 text-sm whitespace-nowrap" 
                  style={{ backgroundColor: '#53ca97', color: 'white' }}
                  onClick={() => handleViewCompanyProfile(selectedJob)}
                >
                  View Company Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Application Dialog */}
      <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>Fill out the form below to submit your application</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm mb-2 block">Full Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#53ca97' } as any}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="text-sm mb-2 block">Email</label>
              <input 
                type="email" 
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#53ca97' } as any}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="text-sm mb-2 block">Phone</label>
              <input 
                type="tel" 
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#53ca97' } as any}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="text-sm mb-2 block">Upload Resume (PDF)</label>
              <input 
                type="file" 
                accept=".pdf"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="text-sm mb-2 block">Cover Letter</label>
              <textarea 
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#53ca97' } as any}
                placeholder="Tell us why you're a great fit..."
              />
            </div>

            <Button 
              className="w-full px-6 py-3" 
              style={{ backgroundColor: '#53ca97', color: 'white' }}
              onClick={() => {
                setShowApplicationDialog(false);
                setSelectedJob(null);
                setShowCongratsModal(true);
              }}
            >
              Submit Application
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Congrats Modal */}
      <CongratsModal
        isOpen={showCongratsModal}
        onClose={() => setShowCongratsModal(false)}
        title="Application Submitted!"
        message="Your application has been successfully submitted. The employer will review it and contact you shortly."
        actionLabel="Back to Job Board"
      />

      {/* User Profile Preview */}
      <UserProfilePreview
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        user={selectedCompany}
      />
    </div>
  );
}