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
import { Eye, Edit, Trash2, Users, Clock, MapPin, DollarSign, MessageSquare } from "lucide-react";
import { 
  fetchMyBuyAndSellListings, 
  deleteBuyAndSellListing, 
  updateBuyAndSellListing, 
  fetchBuyAndSellApplications, 
  updateBuyAndSellApplicationStatus, 
  type BuyAndSellListing, 
  type BuyAndSellApplication 
} from "../api/buyAndSell";
import { fetchBuySellThreadByListingAndApplication } from "../api/buySellMessages";
import { toast, swalConfirm } from '../lib/swal';
import { storage, STORAGE_KEYS } from "../lib/storage";
import { API_BASE_URL } from "../lib/api";

export default function MyBuyAndSellTab() {
  const navigate = useNavigate();
  const userRole = storage.get<string>(STORAGE_KEYS.USER_ROLE, "");
  const [listings, setListings] = useState<BuyAndSellListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<BuyAndSellListing | null>(null);
  const [showApplicationsDialog, setShowApplicationsDialog] = useState(false);
  const [applications, setApplications] = useState<BuyAndSellApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [editingListing, setEditingListing] = useState<BuyAndSellListing | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchMyBuyAndSellListings();
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
      await deleteBuyAndSellListing(listingId);
      toast.success("Listing deleted");
      loadListings();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete listing");
    }
  };

  const handleViewApplications = async (listing: BuyAndSellListing) => {
    setSelectedListing(listing);
    setShowApplicationsDialog(true);
    setApplicationsLoading(true);
    try {
      const result = await fetchBuyAndSellApplications(listing.id);
      setApplications(result.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load applications");
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: number, status: "pending" | "reviewing" | "accepted" | "rejected" | "withdrawn") => {
    try {
      await updateBuyAndSellApplicationStatus(applicationId, status);
      toast.success("Application status updated");
      if (selectedListing) {
        const result = await fetchBuyAndSellApplications(selectedListing.id);
        setApplications(result.items);
      }
      loadListings();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update application");
    }
  };

  const handleEdit = (listing: BuyAndSellListing) => {
    setEditingListing(listing);
    setEditForm({
      listing_type: listing.listing_type,
      category: listing.category,
      title: listing.title,
      description: listing.description,
      price: listing.price ? String(listing.price) : "",
      price_type: listing.price_type || "",
      payment_terms: listing.payment_terms || "",
      city: listing.city,
      state: listing.state,
      zip_code: listing.zip_code || "",
      contact_name: listing.contact_name,
      contact_phone: listing.contact_phone,
      contact_email: listing.contact_email || "",
      status: listing.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingListing) return;
    try {
      await updateBuyAndSellListing(editingListing.id, {
        ...editForm,
        price: editForm.price ? Number(editForm.price) : null,
      });
      toast.success("Listing updated");
      setEditingListing(null);
      setEditForm(null);
      loadListings();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update listing");
    }
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
        <h2 className="text-2xl font-semibold">My Buy & Sell Listings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your marketplace listings</p>
      </div>

      {listings.length === 0 ? (
        <Card className="p-8 text-center">
          <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">You haven't posted any listings yet</p>
          <Button
            onClick={() => navigate(`/${userRole}/post-buy-sell`)}
            style={{ backgroundColor: "#53ca97", color: "white" }}
          >
            Post Your First Listing
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden">
              {/* Image */}
              {listing.photos && listing.photos.length > 0 ? (
                <img
                  src={listing.photos[0].startsWith('http') ? listing.photos[0] : `${API_BASE_URL}${listing.photos[0]}`}
                  alt={listing.title}
                  className="h-40 w-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`h-40 flex items-center justify-center text-white ${listing.photos && listing.photos.length > 0 ? 'hidden' : ''}`}
                style={{ backgroundColor: "#53ca97" }}
              >
                <DollarSign className="w-12 h-12 opacity-50" />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm line-clamp-2 flex-1">{listing.title}</h3>
                  <Badge
                    variant={listing.status === "active" ? "default" : "outline"}
                    className="ml-2 text-xs"
                    style={listing.status === "active" ? { backgroundColor: "#53ca97", color: "white" } : {}}
                  >
                    {listing.status}
                  </Badge>
                </div>
                {listing.price && (
                  <div className="text-lg mb-2" style={{ color: "#53ca97" }}>
                    ${listing.price.toLocaleString()}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <MapPin className="w-3 h-3" />
                  <span>{listing.city}, {listing.state}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs capitalize">
                    {listing.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {listing.listing_type.replace("-", " ")}
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
          ))}
        </div>
      )}

      {/* Applications Dialog */}
      {showApplicationsDialog && selectedListing && (
        <Dialog open={showApplicationsDialog} onOpenChange={setShowApplicationsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Applications for {selectedListing.title}</DialogTitle>
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
                    {app.offered_price && (
                      <div className="mb-2">
                        <span className="text-sm text-gray-500">Offered Price: </span>
                        <span className="text-sm font-semibold" style={{ color: "#53ca97" }}>
                          ${app.offered_price.toLocaleString()}
                        </span>
                      </div>
                    )}
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
                            const thread = await fetchBuySellThreadByListingAndApplication(selectedListing!.id, app.id);
                            navigate(`/${userRole}/messages`);
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('open-buy-sell-thread', { detail: { threadId: thread.id } }));
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
              <DialogTitle>Edit Listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Listing Type</Label>
                  <Select value={editForm.listing_type} onValueChange={(value) => setEditForm({ ...editForm, listing_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="for-sale">For Sale</SelectItem>
                      <SelectItem value="wanted">Wanted</SelectItem>
                      <SelectItem value="for-rent">For Rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="livestock">Livestock</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="trailers">Trailers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                  <Label>Price</Label>
                  <Input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                </div>
                <div>
                  <Label>Price Type</Label>
                  <Select value={editForm.price_type} onValueChange={(value) => setEditForm({ ...editForm, price_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="negotiable">Negotiable</SelectItem>
                      <SelectItem value="per-unit">Per Unit</SelectItem>
                      <SelectItem value="per-head">Per Head</SelectItem>
                      <SelectItem value="obo">Or Best Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <SelectItem value="sold">Sold</SelectItem>
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
    </div>
  );
}
