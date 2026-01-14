import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Eye, Edit, Trash2, Users, Clock, MapPin, DollarSign, Briefcase } from "lucide-react";
import { fetchMyJobs, deleteJob, updateJob, fetchJobApplications, updateApplicationStatus, type JobListing, type JobApplication } from "../api/jobs";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { API_BASE_URL } from "../lib/api";

export default function MyJobsTab() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [showApplicationsDialog, setShowApplicationsDialog] = useState(false);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [editingJob, setEditingJob] = useState<JobListing | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchMyJobs();
      setJobs(result.items);
    } catch (err: any) {
      console.error("Error loading jobs:", err);
      toast.error(err?.message ?? "Failed to load your jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (jobId: number) => {
    if (!window.confirm("Delete this job? This cannot be undone.")) {
      return;
    }
    try {
      await deleteJob(jobId);
      toast.success("Job deleted");
      loadJobs();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete job");
    }
  };

  const handleViewApplications = async (job: JobListing) => {
    setSelectedJob(job);
    setShowApplicationsDialog(true);
    setApplicationsLoading(true);
    try {
      const result = await fetchJobApplications(job.id);
      setApplications(result.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load applications");
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: number, status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn") => {
    try {
      await updateApplicationStatus(applicationId, status);
      toast.success("Application status updated");
      if (selectedJob) {
        const result = await fetchJobApplications(selectedJob.id);
        setApplications(result.items);
      }
      loadJobs();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update application");
    }
  };

  const handleEdit = (job: JobListing) => {
    setEditingJob(job);
    setEditForm({
      title: job.title,
      description: job.description,
      required_skills: job.required_skills || "",
      job_type: job.job_type,
      location_type: job.location_type,
      location: job.location || "",
      salary: job.salary || "",
      salary_frequency: job.salary_frequency || "",
      benefits_accommodation: job.benefits_accommodation,
      benefits_food: job.benefits_food,
      benefits_fuel: job.benefits_fuel,
      benefits_vehicle: job.benefits_vehicle,
      benefits_bonus: job.benefits_bonus,
      benefits_others: job.benefits_others,
      contact_person: job.contact_person,
      contact_phone: job.contact_phone,
      preferred_call_time: job.preferred_call_time || "",
      contact_email: job.contact_email || "",
      status: job.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingJob) return;
    try {
      await updateJob(editingJob.id, editForm);
      toast.success("Job updated");
      setEditingJob(null);
      setEditForm(null);
      loadJobs();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update job");
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Loading your jobs…
      </div>
    );
  }

  const activeJobs = jobs.filter((j) => j.status === "active");
  const closedJobs = jobs.filter((j) => j.status === "closed" || j.status === "filled");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">My Job Listings</h1>
        <p className="text-xs text-gray-500">Manage your posted jobs and view applications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-5 h-5" style={{ color: "#53ca97" }} />
            <h3 className="text-sm">Total Jobs</h3>
          </div>
          <p className="text-3xl" style={{ color: "#53ca97" }}>
            {jobs.length}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-green-500" />
            <h3 className="text-sm">Active</h3>
          </div>
          <p className="text-3xl text-green-600">{activeJobs.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm">Total Applications</h3>
          </div>
          <p className="text-3xl text-blue-600">
            {jobs.reduce((sum, job) => sum + job.application_count, 0)}
          </p>
        </Card>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">You haven't posted any jobs yet.</p>
          <Button
            className="mt-4"
            style={{ backgroundColor: "#53ca97", color: "white" }}
            onClick={() => {
              const userRole = storage.get<string>(STORAGE_KEYS.USER_ROLE, "");
              if (userRole === "hauler") {
                navigate("/hauler/post-job");
              } else if (userRole === "shipper") {
                navigate("/shipper/post-job");
              }
            }}
          >
            Post Your First Job
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
                    <Badge
                      className="px-2 py-0.5 text-xs"
                      style={
                        job.status === "active"
                          ? { backgroundColor: "#53ca97", color: "white" }
                          : { backgroundColor: "#9ca3af", color: "white" }
                      }
                    >
                      {job.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {job.job_type.replace("-", " ")}
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{job.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    {job.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {job.salary && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span>{job.salary}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{job.views} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{job.application_count} applications</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleViewApplications(job)}
                    >
                      View Applications ({job.application_count})
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => handleEdit(job)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(job.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Applications Dialog */}
      <Dialog open={showApplicationsDialog} onOpenChange={setShowApplicationsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Applications for {selectedJob?.title} ({applications.length})
            </DialogTitle>
            <DialogDescription>Review and manage job applications</DialogDescription>
          </DialogHeader>

          {applicationsLoading ? (
            <p className="text-sm text-gray-500">Loading applications...</p>
          ) : applications.length === 0 ? (
            <p className="text-sm text-gray-500">No applications yet.</p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold">{app.applicant_name}</h4>
                      <p className="text-sm text-gray-600">{app.applicant_email}</p>
                      <p className="text-sm text-gray-600">{app.applicant_phone}</p>
                      {app.cover_letter && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{app.cover_letter}</p>
                      )}
                      {app.resume_url && (
                        <a
                          href={`${API_BASE_URL}${app.resume_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                          View Resume
                        </a>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Applied {new Date(app.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge
                        className="text-xs"
                        style={
                          app.status === "accepted"
                            ? { backgroundColor: "#53ca97", color: "white" }
                            : app.status === "rejected"
                              ? { backgroundColor: "#ef4444", color: "white" }
                              : {}
                        }
                      >
                        {app.status}
                      </Badge>
                      {app.status === "pending" && (
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleUpdateApplicationStatus(app.id, "reviewing")}
                          >
                            Review
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs"
                            style={{ backgroundColor: "#53ca97", color: "white" }}
                            onClick={() => handleUpdateApplicationStatus(app.id, "accepted")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => handleUpdateApplicationStatus(app.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingJob && editForm && (
        <Dialog open={!!editingJob} onOpenChange={() => setEditingJob(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Job</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Job Title *</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Job Description *</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingJob(null)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="flex-1"
                  style={{ backgroundColor: "#53ca97", color: "white" }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
