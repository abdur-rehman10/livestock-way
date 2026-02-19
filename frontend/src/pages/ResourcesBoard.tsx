import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Building, Shield, Droplet, Scale, Wheat, Heart, Calendar, FileText, MessageSquare, Bookmark } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  fetchResourcesListings, 
  type ResourcesListing, 
  applyToResourcesListing, 
  type ApplyResourcesPayload, 
  fetchMyResourcesApplication, 
  type ResourcesApplication 
} from "../api/resources";
import { fetchResourcesThreadByListingAndApplication } from "../api/resourcesMessages";
import { toast } from '../lib/swal';
import { storage, STORAGE_KEYS } from "../lib/storage";

const resourceTypeLabels: Record<string, string> = {
  logistics: "Logistics Agents & Companies",
  insurance: "Insurance Companies",
  washout: "Washouts",
  scale: "Weight Stations & Scales",
  hay: "Hay Providers",
  stud: "Stud Farms",
  salesyard: "Sales Yards & Schedule",
  beefspotter: "Beef Spotters & Transport",
};

const resourceTypeIcons: Record<string, any> = {
  logistics: Building,
  insurance: Shield,
  washout: Droplet,
  scale: Scale,
  hay: Wheat,
  stud: Heart,
  salesyard: Calendar,
  beefspotter: FileText,
};

export default function ResourcesBoard() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ResourcesListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<ResourcesListing | null>(null);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [savedListings, setSavedListings] = useState<string[]>([]);
  const [filterResourceType, setFilterResourceType] = useState<string | undefined>(undefined);
  const [applicationForm, setApplicationForm] = useState({
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    message: "",
  });
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [myApplications, setMyApplications] = useState<Map<number, ResourcesApplication>>(new Map());

  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const userRole = storage.get<string>(STORAGE_KEYS.USER_ROLE, "");

  useEffect(() => {
    loadListings();
  }, [filterResourceType]);

  useEffect(() => {
    if (userId && listings.length > 0) {
      loadMyApplications();
    }
  }, [userId, listings]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const result = await fetchResourcesListings({
        status: "active",
        resource_type: filterResourceType,
        limit: 50,
      });
      setListings(result.items);
    } catch (err: any) {
      console.error("Error loading listings:", err);
      toast.error(err?.message ?? "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const loadMyApplications = async () => {
    if (!userId) return;
    
    try {
      const applicationsMap = new Map<number, ResourcesApplication>();
      await Promise.all(
        listings.map(async (listing) => {
          try {
            const application = await fetchMyResourcesApplication(listing.id);
            if (application) {
              applicationsMap.set(listing.id, application);
            }
          } catch (err) {
            // Silently ignore 404s (user hasn't applied)
            if ((err as any)?.message?.includes("404") || (err as any)?.message?.includes("not found")) {
              return;
            }
            console.error(`Error loading application for listing ${listing.id}:`, err);
          }
        })
      );
      setMyApplications(applicationsMap);
    } catch (err: any) {
      console.error("Error loading my applications:", err);
    }
  };

  const toggleSaveListing = (listingId: number) => {
    const idStr = String(listingId);
    if (savedListings.includes(idStr)) {
      setSavedListings(savedListings.filter((id) => id !== idStr));
      toast.success("Listing removed from saved");
    } else {
      setSavedListings([...savedListings, idStr]);
      toast.success("Listing saved");
    }
  };

  const handleViewDetails = (listing: ResourcesListing) => {
    setSelectedListing(listing);
  };

  const handleApply = () => {
    if (!selectedListing) return;
    if (!userId) {
      toast.error("Please log in to apply");
      navigate("/login");
      return;
    }
    setShowApplicationDialog(true);
    const userEmail = storage.get<string | null>(STORAGE_KEYS.USER_EMAIL, null);
    setApplicationForm({
      applicant_name: "",
      applicant_email: userEmail || "",
      applicant_phone: "",
      message: "",
    });
  };

  const handleSubmitApplication = async () => {
    if (!selectedListing) return;
    if (!applicationForm.applicant_name || !applicationForm.applicant_email || !applicationForm.applicant_phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmittingApplication(true);
      const payload: ApplyResourcesPayload = {
        applicant_name: applicationForm.applicant_name,
        applicant_email: applicationForm.applicant_email,
        applicant_phone: applicationForm.applicant_phone,
        message: applicationForm.message || null,
      };

      await applyToResourcesListing(selectedListing.id, payload);
      toast.success("Enquiry submitted.", {
        description: "The resource provider will review and respond shortly.",
      });
      setShowApplicationDialog(false);
      
      // Reload applications to update the UI
      if (selectedListing) {
        try {
          const application = await fetchMyResourcesApplication(selectedListing.id);
          if (application) {
            setMyApplications((prev) => {
              const newMap = new Map(prev);
              newMap.set(selectedListing.id, application);
              return newMap;
            });
          }
        } catch (err) {
          console.error("Error reloading application:", err);
        }
      }
      
      setSelectedListing(null);
      setApplicationForm({
        applicant_name: "",
        applicant_email: "",
        applicant_phone: "",
        message: "",
      });
    } catch (err: any) {
      console.error("Error submitting application:", err);
      toast.error(err?.message ?? "Failed to submit application");
    } finally {
      setSubmittingApplication(false);
    }
  };

  const getResourceIcon = (resourceType: string) => {
    const Icon = resourceTypeIcons[resourceType] || Building;
    return <Icon className="w-12 h-12 opacity-50" />;
  };

  const getResourceTitle = (listing: ResourcesListing): string => {
    const data = listing.type_specific_data || {};
    switch (listing.resource_type) {
      case 'logistics':
        return data.companyName || listing.title;
      case 'insurance':
        return data.companyName || listing.title;
      case 'washout':
        return data.facilityName || listing.title;
      case 'scale':
        return data.name || listing.title;
      case 'hay':
        return data.supplierName || listing.title;
      case 'stud':
        return data.farmName || listing.title;
      case 'salesyard':
        return data.yardName || listing.title;
      case 'beefspotter':
        return data.publisherName || listing.title;
      default:
        return listing.title;
    }
  };

  const getResourceLocation = (listing: ResourcesListing): string => {
    const data = listing.type_specific_data || {};
    if (listing.city && listing.state) {
      return `${listing.city}, ${listing.state}`;
    }
    return data.location || data.serviceArea || data.coverageArea || "Multiple Locations";
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-sm text-gray-500">Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Resources Board</h1>
        <p className="text-sm text-gray-500 mt-1">Find logistics, insurance, washouts, and more</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <Select value={filterResourceType || "all"} onValueChange={(value) => setFilterResourceType(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Resource Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resource Types</SelectItem>
            <SelectItem value="logistics">Logistics Agents & Companies</SelectItem>
            <SelectItem value="insurance">Insurance Companies</SelectItem>
            <SelectItem value="washout">Washouts</SelectItem>
            <SelectItem value="scale">Weight Stations & Scales</SelectItem>
            <SelectItem value="hay">Hay Providers</SelectItem>
            <SelectItem value="stud">Stud Farms</SelectItem>
            <SelectItem value="salesyard">Sales Yards & Schedule</SelectItem>
            <SelectItem value="beefspotter">Beef Spotters & Transport</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid Layout - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {listings.length === 0 ? (
          <Card className="p-8 text-center col-span-full">
            <p className="text-gray-500">No active resources found</p>
          </Card>
        ) : (
          listings.map((listing) => {
            const Icon = resourceTypeIcons[listing.resource_type] || Building;
            return (
              <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-all relative">
                {/* Saved Indicator */}
                {savedListings.includes(String(listing.id)) && (
                  <div className="absolute top-2 right-2 z-10">
                    <Bookmark className="w-5 h-5 fill-red-500 text-red-500" />
                  </div>
                )}

                {/* Image Placeholder */}
                <div 
                  className="h-40 flex items-center justify-center text-white"
                  style={{ backgroundColor: "#53ca97" }}
                >
                  {getResourceIcon(listing.resource_type)}
                </div>

                {/* Content */}
                <div className="p-3">
                  <h3 className="text-sm line-clamp-2 mb-2 font-semibold">{getResourceTitle(listing)}</h3>

                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span>{getResourceLocation(listing)}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {resourceTypeLabels[listing.resource_type] || listing.resource_type}
                    </Badge>
                  </div>

                  <Button 
                    className="w-full mt-3 text-xs"
                    size="sm"
                    style={{ backgroundColor: "#53ca97", color: "white" }}
                    onClick={() => handleViewDetails(listing)}
                  >
                    View Details
                  </Button>
                  {myApplications.has(listing.id) && (
                    <Badge
                      className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-center"
                      style={
                        myApplications.get(listing.id)?.status === "accepted"
                          ? { backgroundColor: "#10b981", color: "white" }
                          : myApplications.get(listing.id)?.status === "rejected"
                            ? { backgroundColor: "#ef4444", color: "white" }
                            : myApplications.get(listing.id)?.status === "reviewing"
                              ? { backgroundColor: "#3b82f6", color: "white" }
                              : { backgroundColor: "#6b7280", color: "white" }
                      }
                    >
                      {myApplications.get(listing.id)?.status === "accepted"
                        ? "✓ Accepted"
                        : myApplications.get(listing.id)?.status === "rejected"
                          ? "✗ Rejected"
                          : myApplications.get(listing.id)?.status === "reviewing"
                            ? "⏳ Under Review"
                            : "📋 Applied"}
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Resource Details Dialog */}
      {selectedListing && (
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{getResourceTitle(selectedListing)}</DialogTitle>
              <DialogDescription>
                {resourceTypeLabels[selectedListing.resource_type] || selectedListing.resource_type}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Image Placeholder */}
              <div 
                className="h-64 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: "#53ca97" }}
              >
                {getResourceIcon(selectedListing.resource_type)}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Resource Type</div>
                  <Badge className="capitalize">{resourceTypeLabels[selectedListing.resource_type] || selectedListing.resource_type}</Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Location</div>
                  <div className="text-sm">{getResourceLocation(selectedListing)}</div>
                </div>
              </div>

              {selectedListing.description && (
                <div>
                  <h4 className="mb-2 font-semibold">Description</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedListing.description}</p>
                </div>
              )}

              {/* Type-specific details */}
              {selectedListing.type_specific_data && Object.keys(selectedListing.type_specific_data).length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold">Details</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedListing.type_specific_data).map(([key, value]) => {
                      if (!value || key === 'title') return null;
                      return (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                          <span className="text-gray-900">{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="mb-2 font-semibold">Contact Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {selectedListing.contact_name && (
                    <p>
                      <strong>Contact Person:</strong> {selectedListing.contact_name}
                    </p>
                  )}
                  <p>
                    <strong>Phone:</strong> {selectedListing.contact_phone}
                  </p>
                  {selectedListing.contact_email && (
                    <p>
                      <strong>Email:</strong> {selectedListing.contact_email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {selectedListing && myApplications.has(selectedListing.id) ? (
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        className="px-4 py-2 text-sm font-medium"
                        style={
                          myApplications.get(selectedListing.id)?.status === "accepted"
                            ? { backgroundColor: "#10b981", color: "white" }
                            : myApplications.get(selectedListing.id)?.status === "rejected"
                              ? { backgroundColor: "#ef4444", color: "white" }
                              : myApplications.get(selectedListing.id)?.status === "reviewing"
                                ? { backgroundColor: "#3b82f6", color: "white" }
                                : { backgroundColor: "#6b7280", color: "white" }
                        }
                      >
                        {myApplications.get(selectedListing.id)?.status === "accepted"
                          ? "✓ Accepted"
                          : myApplications.get(selectedListing.id)?.status === "rejected"
                            ? "✗ Rejected"
                            : myApplications.get(selectedListing.id)?.status === "reviewing"
                              ? "⏳ Under Review"
                              : "📋 Applied"}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Applied {new Date(myApplications.get(selectedListing.id)!.created_at).toLocaleDateString()}
                      </span>
                    </div>
                      {myApplications.has(selectedListing.id) && (
                        <Button
                          variant="outline"
                          className="px-6 py-3 flex items-center justify-center gap-2"
                          onClick={async () => {
                            const application = myApplications.get(selectedListing.id);
                            if (!application) return;
                            try {
                              const thread = await fetchResourcesThreadByListingAndApplication(selectedListing.id, application.id);
                              navigate(`/${userRole}/messages`);
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('open-resources-thread', { detail: { threadId: thread.id } }));
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
                      )}
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
                  variant={savedListings.includes(String(selectedListing.id)) ? "default" : "outline"}
                  className="px-6 py-3"
                  style={savedListings.includes(String(selectedListing.id)) ? { backgroundColor: "#53ca97", color: "white" } : {}}
                  onClick={() => toggleSaveListing(selectedListing.id)}
                >
                  <Bookmark className={`w-4 h-4 mr-2 ${savedListings.includes(String(selectedListing.id)) ? "fill-current" : ""}`} />
                  {savedListings.includes(String(selectedListing.id)) ? "Saved" : "Save for Later"}
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
            <DialogTitle>Apply for {selectedListing && getResourceTitle(selectedListing)}</DialogTitle>
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
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={applicationForm.message}
                onChange={(e) => setApplicationForm({ ...applicationForm, message: e.target.value })}
                placeholder="Tell the provider about your interest..."
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
