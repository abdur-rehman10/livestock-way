import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Building, Bookmark, Briefcase, MessageSquare } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { fetchJobs, type JobListing, applyForJob, type ApplyJobPayload, fetchMyApplication, type JobApplication } from "../api/jobs";
import { fetchThreadByJobAndApplication } from "../api/jobMessages";
import { toast } from '../lib/swal';
import { storage, STORAGE_KEYS } from "../lib/storage";
import { API_BASE_URL } from "../lib/api";

export default function JobBoard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<"hauler" | "shipper" | undefined>(undefined);
  const [applicationForm, setApplicationForm] = useState({
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    resume_url: "",
    cover_letter: "",
  });
  const [uploadingResume, setUploadingResume] = useState(false);
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [myApplications, setMyApplications] = useState<Map<number, JobApplication>>(new Map());

  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const userRole = storage.get<string>(STORAGE_KEYS.USER_ROLE, "");

  useEffect(() => {
    loadJobs();
  }, [filterRole]);

  useEffect(() => {
    if (userId && jobs.length > 0) {
      loadMyApplications();
    }
  }, [userId, jobs]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const result = await fetchJobs({
        status: "active",
        role: filterRole,
        limit: 50,
      });
      setJobs(result.items);
    } catch (err: any) {
      console.error("Error loading jobs:", err);
      toast.error(err?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const loadMyApplications = async () => {
    if (!userId) return;
    
    try {
      const applicationsMap = new Map<number, JobApplication>();
      await Promise.all(
        jobs.map(async (job) => {
          try {
            const application = await fetchMyApplication(job.id);
            if (application) {
              applicationsMap.set(job.id, application);
            }
          } catch (err) {
            // Silently ignore 404s (user hasn't applied)
            if ((err as any)?.message?.includes("404")) {
              return;
            }
            console.error(`Error loading application for job ${job.id}:`, err);
          }
        })
      );
      setMyApplications(applicationsMap);
    } catch (err: any) {
      console.error("Error loading my applications:", err);
    }
  };

  const toggleSaveJob = (jobId: number) => {
    const idStr = String(jobId);
    if (savedJobs.includes(idStr)) {
      setSavedJobs(savedJobs.filter((id) => id !== idStr));
      toast.success("Job removed from saved");
    } else {
      setSavedJobs([...savedJobs, idStr]);
      toast.success("Job saved");
    }
  };

  const handleViewDetails = (job: JobListing) => {
    setSelectedJob(job);
  };

  const handleApply = () => {
    if (!selectedJob) return;
    if (!userId) {
      toast.error("Please log in to apply");
      navigate("/login");
      return;
    }
    setShowApplicationDialog(true);
    // Pre-fill with user info if available
    const userEmail = storage.get<string | null>(STORAGE_KEYS.USER_EMAIL, null);
    setApplicationForm({
      applicant_name: "",
      applicant_email: userEmail || "",
      applicant_phone: "",
      resume_url: "",
      cover_letter: "",
    });
  };

  const handleSubmitApplication = async () => {
    if (!selectedJob) return;
    if (!applicationForm.applicant_name || !applicationForm.applicant_email || !applicationForm.applicant_phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmittingApplication(true);
      const payload: ApplyJobPayload = {
        applicant_name: applicationForm.applicant_name,
        applicant_email: applicationForm.applicant_email,
        applicant_phone: applicationForm.applicant_phone,
        resume_url: applicationForm.resume_url && applicationForm.resume_url.trim() ? applicationForm.resume_url.trim() : null,
        cover_letter: applicationForm.cover_letter || null,
      };

      // Log for debugging
      console.log("Submitting application with payload:", {
        ...payload,
        resume_url: payload.resume_url ? `${payload.resume_url.substring(0, 50)}...` : null,
      });

      await applyForJob(selectedJob.id, payload);
      toast.success("Application submitted.", {
        description: "The employer will review your application and get back to you.",
      });
      setShowApplicationDialog(false);
      
      // Reload applications to update the UI
      if (selectedJob) {
        try {
          const application = await fetchMyApplication(selectedJob.id);
          if (application) {
            setMyApplications((prev) => {
              const newMap = new Map(prev);
              newMap.set(selectedJob.id, application);
              return newMap;
            });
          }
        } catch (err) {
          console.error("Error reloading application:", err);
        }
      }
      
      setSelectedJob(null);
      setApplicationForm({
        applicant_name: "",
        applicant_email: "",
        applicant_phone: "",
        resume_url: "",
        cover_letter: "",
      });
    } catch (err: any) {
      console.error("Error submitting application:", err);
      toast.error(err?.message ?? "Failed to submit application");
    } finally {
      setSubmittingApplication(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if user is authenticated
    if (!userId) {
      toast.error("Please log in to upload resume");
      navigate("/login");
      return;
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB");
      return;
    }

    try {
      setUploadingResume(true);
      const formData = new FormData();
      formData.append("file", file);

      // Get token from localStorage (stored as plain string, not JSON)
      const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
      if (!token) {
        toast.error("Authentication token not found. Please log in again.");
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/uploads/resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(data.message || "Failed to upload resume");
      }

      const data = await response.json();
      if (data.status === "OK" && data.url) {
        setApplicationForm({ ...applicationForm, resume_url: data.url });
        toast.success("Resume uploaded successfully");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Error uploading resume:", err);
      toast.error(err?.message ?? "Failed to upload resume");
    } finally {
      setUploadingResume(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-sm text-gray-500">Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Job Board</h1>
        <p className="text-sm text-gray-500 mt-1">Find livestock transportation and logistics jobs</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <Select value={filterRole || "all"} onValueChange={(value) => setFilterRole(value === "all" ? undefined : value as "hauler" | "shipper")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Job Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="hauler">Hauler Jobs</SelectItem>
            <SelectItem value="shipper">Shipper Jobs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Job Cards */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No active jobs found</p>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className="p-4 hover:shadow-md transition-all relative">
              {/* Saved Indicator */}
              {savedJobs.includes(String(job.id)) && (
                <div className="absolute top-3 right-3 z-10">
                  <Bookmark className="w-5 h-5 fill-red-500 text-red-500" />
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 flex-1">
                  {/* Company Logo Placeholder */}
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                    style={{ backgroundColor: "#53ca97" }}
                  >
                    <Building className="w-8 h-8" />
                  </div>

                  <div className="flex-1">
                    {/* Title and Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold">{job.title}</h3>
                      <Badge
                        variant={job.job_type === "full-time" ? "default" : "outline"}
                        className="px-2 py-0.5 text-xs capitalize"
                        style={job.job_type === "full-time" ? { backgroundColor: "#53ca97", color: "white" } : {}}
                      >
                        {job.job_type.replace("-", " ")}
                      </Badge>
                      <Badge variant="outline" className="px-2 py-0.5 text-xs capitalize">
                        {job.posted_by_role}
                      </Badge>
                    </div>

                    {/* Details Row */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      {job.location && (
                        <>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </div>
                          <span>•</span>
                        </>
                      )}
                      {job.salary && (
                        <>
                          <span>{job.salary}</span>
                          {job.salary_frequency && <span className="text-xs">/{job.salary_frequency}</span>}
                          <span>•</span>
                        </>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                      <span>•</span>
                      <span>{job.application_count} applications</span>
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
                    style={{ backgroundColor: "#53ca97", color: "white" }}
                    onClick={() => handleViewDetails(job)}
                  >
                    View Details
                  </Button>
                  {myApplications.has(job.id) && (
                    <div className="flex flex-col gap-2">
                      <Badge
                        className="px-3 py-1.5 text-xs font-medium whitespace-nowrap text-center"
                        style={
                          myApplications.get(job.id)?.status === "accepted"
                            ? { backgroundColor: "#10b981", color: "white" }
                            : myApplications.get(job.id)?.status === "rejected"
                              ? { backgroundColor: "#ef4444", color: "white" }
                              : myApplications.get(job.id)?.status === "reviewing"
                                ? { backgroundColor: "#3b82f6", color: "white" }
                                : { backgroundColor: "#6b7280", color: "white" }
                        }
                      >
                        {myApplications.get(job.id)?.status === "accepted"
                          ? "✓ Accepted"
                          : myApplications.get(job.id)?.status === "rejected"
                            ? "✗ Rejected"
                            : myApplications.get(job.id)?.status === "reviewing"
                              ? "⏳ Under Review"
                              : "📋 Applied"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-4 py-2 text-sm whitespace-nowrap flex items-center justify-center gap-1"
                        onClick={async () => {
                          const application = myApplications.get(job.id);
                          if (!application) return;
                          try {
                            const thread = await fetchThreadByJobAndApplication(job.id, application.id);
                            navigate(`/${userRole}/messages`);
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('open-job-thread', { detail: { threadId: thread.id } }));
                            }, 100);
                          } catch (err: any) {
                            console.error("Error loading thread:", err);
                            toast.error("Failed to open message thread");
                          }
                        }}
                      >
                        <MessageSquare className="w-3 h-3" />
                        Send Message
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Job Details Dialog */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedJob.title}</DialogTitle>
              <DialogDescription>{selectedJob.posted_by_role.charAt(0).toUpperCase() + selectedJob.posted_by_role.slice(1)} Job</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="capitalize">{selectedJob.posted_by_role}</span>
                </div>
                {selectedJob.location && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{selectedJob.location}</span>
                    </div>
                  </>
                )}
                <Badge
                  className="px-2 py-1 text-xs capitalize"
                  style={{ backgroundColor: "#53ca97", color: "white" }}
                >
                  {selectedJob.job_type.replace("-", " ")}
                </Badge>
              </div>

              {selectedJob.salary && (
                <div className="py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Salary Range</div>
                  <div className="text-lg" style={{ color: "#53ca97" }}>
                    {selectedJob.salary}
                    {selectedJob.salary_frequency && ` / ${selectedJob.salary_frequency}`}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 font-semibold">Job Description</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedJob.description}</p>
              </div>

              {selectedJob.required_skills && (
                <div>
                  <h4 className="mb-2 font-semibold">Required Skills / Experience</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedJob.required_skills}</p>
                </div>
              )}

              {(selectedJob.benefits_accommodation ||
                selectedJob.benefits_food ||
                selectedJob.benefits_fuel ||
                selectedJob.benefits_vehicle ||
                selectedJob.benefits_bonus ||
                selectedJob.benefits_others) && (
                <div>
                  <h4 className="mb-2 font-semibold">Benefits</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.benefits_accommodation && <Badge variant="outline">Accommodation</Badge>}
                    {selectedJob.benefits_food && <Badge variant="outline">Food</Badge>}
                    {selectedJob.benefits_fuel && <Badge variant="outline">Fuel Allowance</Badge>}
                    {selectedJob.benefits_vehicle && <Badge variant="outline">Vehicle</Badge>}
                    {selectedJob.benefits_bonus && <Badge variant="outline">Bonus</Badge>}
                    {selectedJob.benefits_others && <Badge variant="outline">Others</Badge>}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="mb-2 font-semibold">Contact Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>Contact Person:</strong> {selectedJob.contact_person}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedJob.contact_phone}
                  </p>
                  {selectedJob.preferred_call_time && (
                    <p>
                      <strong>Preferred Call Time:</strong> {selectedJob.preferred_call_time}
                    </p>
                  )}
                  {selectedJob.contact_email && (
                    <p>
                      <strong>Email:</strong> {selectedJob.contact_email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {selectedJob && myApplications.has(selectedJob.id) ? (
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        className="px-4 py-2 text-sm font-medium"
                        style={
                          myApplications.get(selectedJob.id)?.status === "accepted"
                            ? { backgroundColor: "#10b981", color: "white" }
                            : myApplications.get(selectedJob.id)?.status === "rejected"
                              ? { backgroundColor: "#ef4444", color: "white" }
                              : myApplications.get(selectedJob.id)?.status === "reviewing"
                                ? { backgroundColor: "#3b82f6", color: "white" }
                                : { backgroundColor: "#6b7280", color: "white" }
                        }
                      >
                        {myApplications.get(selectedJob.id)?.status === "accepted"
                          ? "✓ Accepted"
                          : myApplications.get(selectedJob.id)?.status === "rejected"
                            ? "✗ Rejected"
                            : myApplications.get(selectedJob.id)?.status === "reviewing"
                              ? "⏳ Under Review"
                              : "📋 Applied"}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Applied {new Date(myApplications.get(selectedJob.id)!.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      className="px-6 py-3 flex items-center justify-center gap-2"
                      onClick={async () => {
                        const application = myApplications.get(selectedJob.id);
                        if (!application) return;
                        try {
                          const thread = await fetchThreadByJobAndApplication(selectedJob.id, application.id);
                          navigate(`/${userRole}/messages`);
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('open-job-thread', { detail: { threadId: thread.id } }));
                          }, 100);
                        } catch (err: any) {
                          console.error("Error loading thread:", err);
                          toast.error("Failed to open message thread");
                        }
                      }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Send Message
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="flex-1 px-6 py-3"
                    style={{ backgroundColor: "#53ca97", color: "white" }}
                    onClick={handleApply}
                    disabled={!userId}
                  >
                    {userId ? "Apply Now" : "Log in to Apply"}
                  </Button>
                )}
                <Button
                  variant={savedJobs.includes(String(selectedJob.id)) ? "default" : "outline"}
                  className="px-6 py-3"
                  style={savedJobs.includes(String(selectedJob.id)) ? { backgroundColor: "#53ca97", color: "white" } : {}}
                  onClick={() => toggleSaveJob(selectedJob.id)}
                >
                  <Bookmark className={`w-4 h-4 mr-2 ${savedJobs.includes(String(selectedJob.id)) ? "fill-current" : ""}`} />
                  {savedJobs.includes(String(selectedJob.id)) ? "Saved" : "Save for Later"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Application Dialog */}
      <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>Fill out the form below to submit your application</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={applicationForm.applicant_name}
                onChange={(e) => setApplicationForm({ ...applicationForm, applicant_name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={applicationForm.applicant_email}
                onChange={(e) => setApplicationForm({ ...applicationForm, applicant_email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>

            <div>
              <Label>Phone *</Label>
              <Input
                type="tel"
                value={applicationForm.applicant_phone}
                onChange={(e) => setApplicationForm({ ...applicationForm, applicant_phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            <div>
              <Label>Upload Resume (PDF)</Label>
              <Input 
                type="file" 
                accept=".pdf" 
                onChange={handleResumeUpload}
                disabled={uploadingResume}
              />
              {uploadingResume && (
                <p className="text-xs text-blue-500 mt-1">Uploading resume...</p>
              )}
              {applicationForm.resume_url && !uploadingResume && (
                <p className="text-xs text-green-500 mt-1">✓ Resume uploaded successfully</p>
              )}
            </div>

            <div>
              <Label>Cover Letter</Label>
              <Textarea
                rows={4}
                value={applicationForm.cover_letter}
                onChange={(e) => setApplicationForm({ ...applicationForm, cover_letter: e.target.value })}
                placeholder="Tell us why you're a great fit..."
              />
            </div>

            <Button
              className="w-full px-6 py-3"
              style={{ backgroundColor: "#53ca97", color: "white" }}
              onClick={handleSubmitApplication}
              disabled={submittingApplication}
            >
              {submittingApplication ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
