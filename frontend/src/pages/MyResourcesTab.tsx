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
import { Eye, Edit, Trash2, Users, Clock, MapPin, Building, Shield, Droplet, Scale, Wheat, Heart, Calendar, FileText, MessageSquare, ImageOff, ChevronLeft, ChevronRight, X as XIcon } from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import { 
  fetchMyResourcesListings, 
  deleteResourcesListing, 
  updateResourcesListing, 
  fetchResourcesApplications, 
  updateResourcesApplicationStatus, 
  type ResourcesListing, 
  type ResourcesApplication 
} from "../api/resources";
import { fetchResourcesThreadByListingAndApplication } from "../api/resourcesMessages";
import { toast, swalConfirm } from '../lib/swal';
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

export default function MyResourcesTab() {
  const navigate = useNavigate();
  const userRole = storage.get<string>(STORAGE_KEYS.USER_ROLE, "");
  const [listings, setListings] = useState<ResourcesListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<ResourcesListing | null>(null);
  const [showApplicationsDialog, setShowApplicationsDialog] = useState(false);
  const [applications, setApplications] = useState<ResourcesApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [editingListing, setEditingListing] = useState<ResourcesListing | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchMyResourcesListings();
      setListings(result.items);
    } catch (err: any) {
      console.error("Error loading listings:", err);
      toast.error(err?.message ?? "Failed to load your listings");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (listingId: number) => {
    const confirmed = await swalConfirm({
      title: 'Delete Listing',
      text: 'Delete this listing? This cannot be undone.',
      confirmText: 'Yes, delete',
    });
    if (!confirmed) return;
    try {
      await deleteResourcesListing(listingId);
      toast.success("Listing deleted");
      loadListings();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete listing");
    }
  };

  const handleViewApplications = async (listing: ResourcesListing) => {
    setSelectedListing(listing);
    setShowApplicationsDialog(true);
    setApplicationsLoading(true);
    try {
      const result = await fetchResourcesApplications(listing.id);
      setApplications(result.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load applications");
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: number, status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn") => {
    try {
      await updateResourcesApplicationStatus(applicationId, status);
      toast.success("Application status updated");
      if (selectedListing) {
        const result = await fetchResourcesApplications(selectedListing.id);
        setApplications(result.items);
      }
      loadListings();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update application");
    }
  };

  const handleEdit = (listing: ResourcesListing) => {
    setEditingListing(listing);
    const data = listing.type_specific_data || {};
    setEditForm({
      title: listing.title,
      description: listing.description || "",
      contact_name: listing.contact_name || "",
      contact_phone: listing.contact_phone,
      contact_email: listing.contact_email || "",
      city: listing.city || "",
      state: listing.state || "",
      zip_code: listing.zip_code || "",
      status: listing.status,
      type_specific_data: data,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingListing) return;
    try {
      await updateResourcesListing(editingListing.id, {
        ...editForm,
        type_specific_data: editForm.type_specific_data,
      });
      toast.success("Listing updated");
      setEditingListing(null);
      setEditForm(null);
      loadListings();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update listing");
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
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading your listings...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">My Resources</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your resource listings</p>
      </div>

      {listings.length === 0 ? (
        <Card className="p-8 text-center">
          <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">You haven't posted any resources yet</p>
          <Button
            onClick={() => navigate(`/${userRole}/post-resource`)}
            style={{ backgroundColor: "#53ca97", color: "white" }}
          >
            Post Your First Resource
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => {
            const Icon = resourceTypeIcons[listing.resource_type] || Building;
            const hasPhotos = listing.photos && listing.photos.length > 0;
            const firstPhoto = hasPhotos ? listing.photos[0] : null;
            const photoUrl = firstPhoto
              ? (firstPhoto.startsWith('http') ? firstPhoto : `${API_BASE_URL}${firstPhoto}`)
              : null;

            return (
              <Card key={listing.id} className="overflow-hidden">
                <div
                  className={`h-40 relative overflow-hidden bg-gray-100 ${hasPhotos ? 'cursor-pointer group' : ''}`}
                  onClick={() => {
                    if (hasPhotos) {
                      setLightboxPhotos(listing.photos);
                      setLightboxIndex(0);
                    }
                  }}
                >
                  {photoUrl ? (
                    <>
                      <img
                        src={photoUrl}
                        alt={getResourceTitle(listing)}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white"
                      style={{ backgroundColor: "#53ca97" }}
                    >
                      <Icon className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  {hasPhotos && listing.photos.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                      {listing.photos.length} photos
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm line-clamp-2 flex-1">{getResourceTitle(listing)}</h3>
                    <Badge
                      variant={listing.status === "active" ? "default" : "outline"}
                      className="ml-2 text-xs"
                      style={listing.status === "active" ? { backgroundColor: "#53ca97", color: "white" } : {}}
                    >
                      {listing.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <MapPin className="w-3 h-3" />
                    <span>{getResourceLocation(listing)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs capitalize">
                      {resourceTypeLabels[listing.resource_type] || listing.resource_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <Users className="w-3 h-3" />
                    <span>{listing.application_count} applications</span>
                    <Clock className="w-3 h-3 ml-2" />
                    <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleViewApplications(listing)}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Applications ({listing.application_count})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleEdit(listing)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(listing.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Applications Dialog */}
      {showApplicationsDialog && selectedListing && (
        <Dialog open={showApplicationsDialog} onOpenChange={setShowApplicationsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Applications for {getResourceTitle(selectedListing)}</DialogTitle>
              <DialogDescription>
                {applications.length} application{applications.length !== 1 ? "s" : ""}
              </DialogDescription>
            </DialogHeader>

            {applicationsLoading ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">Loading applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No applications yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <Card key={app.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{app.applicant_name}</h4>
                        <p className="text-sm text-gray-500">{app.applicant_email}</p>
                        <p className="text-sm text-gray-500">{app.applicant_phone}</p>
                      </div>
                      <Badge
                        className="text-xs"
                        style={
                          app.status === "accepted"
                            ? { backgroundColor: "#10b981", color: "white" }
                            : app.status === "rejected"
                              ? { backgroundColor: "#ef4444", color: "white" }
                              : app.status === "reviewing"
                                ? { backgroundColor: "#3b82f6", color: "white" }
                                : {}
                        }
                      >
                        {app.status}
                      </Badge>
                    </div>
                    {app.message && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{app.message}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex items-center gap-1"
                        onClick={async () => {
                          try {
                            const thread = await fetchResourcesThreadByListingAndApplication(selectedListing!.id, app.id);
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
                        <MessageSquare className="w-3 h-3" />
                        Message
                      </Button>
                      {app.status === "pending" && (
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            className="text-xs"
                            style={{ backgroundColor: "#10b981", color: "white" }}
                            onClick={() => handleUpdateApplicationStatus(app.id, "accepted")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-red-600"
                            onClick={() => handleUpdateApplicationStatus(app.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingListing && editForm && (
        <Dialog open={!!editingListing} onOpenChange={() => setEditingListing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Resource Listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
                </div>
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
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setEditingListing(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" style={{ backgroundColor: "#53ca97", color: "white" }} onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {lightboxPhotos.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center"
          onClick={() => setLightboxPhotos([])}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
            onClick={() => setLightboxPhotos([])}
          >
            <XIcon className="w-6 h-6" />
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
            {lightboxIndex + 1} / {lightboxPhotos.length}
          </div>

          {lightboxPhotos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length);
                }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length);
                }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <img
            src={
              lightboxPhotos[lightboxIndex].startsWith('http')
                ? lightboxPhotos[lightboxIndex]
                : `${API_BASE_URL}${lightboxPhotos[lightboxIndex]}`
            }
            alt={`Photo ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {lightboxPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {lightboxPhotos.map((_, idx) => (
                <button
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${idx === lightboxIndex ? 'bg-white' : 'bg-white/30 hover:bg-white/50'}`}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
