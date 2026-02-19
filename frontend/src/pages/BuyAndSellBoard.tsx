import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, DollarSign, Bookmark, MessageSquare } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  fetchBuyAndSellListings, 
  type BuyAndSellListing, 
  applyToBuyAndSellListing, 
  type ApplyBuyAndSellPayload, 
  fetchMyBuyAndSellApplication, 
  type BuyAndSellApplication 
} from "../api/buyAndSell";
import { fetchBuySellThreadByListingAndApplication } from "../api/buySellMessages";
import { toast } from '../lib/swal';
import { storage, STORAGE_KEYS } from "../lib/storage";
import { API_BASE_URL } from "../lib/api";

export default function BuyAndSellBoard() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<BuyAndSellListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<BuyAndSellListing | null>(null);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [savedListings, setSavedListings] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [filterListingType, setFilterListingType] = useState<"for-sale" | "wanted" | "for-rent" | undefined>(undefined);
  const [applicationForm, setApplicationForm] = useState({
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    offered_price: "",
    message: "",
  });
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [myApplications, setMyApplications] = useState<Map<number, BuyAndSellApplication>>(new Map());

  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const userRole = storage.get<string>(STORAGE_KEYS.USER_ROLE, "");

  useEffect(() => {
    loadListings();
  }, [filterCategory, filterListingType]);

  useEffect(() => {
    if (userId && listings.length > 0) {
      loadMyApplications();
    }
  }, [userId, listings]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const result = await fetchBuyAndSellListings({
        status: "active",
        category: filterCategory,
        listing_type: filterListingType,
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
      const applicationsMap = new Map<number, BuyAndSellApplication>();
      await Promise.all(
        listings.map(async (listing) => {
          try {
            const application = await fetchMyBuyAndSellApplication(listing.id);
            if (application) {
              applicationsMap.set(listing.id, application);
            }
          } catch (err) {
            // Silently ignore 404s (user hasn't applied)
            if ((err as any)?.message?.includes("404")) {
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

  const handleViewDetails = (listing: BuyAndSellListing) => {
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
      offered_price: selectedListing.price ? String(selectedListing.price) : "",
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
      const payload: ApplyBuyAndSellPayload = {
        applicant_name: applicationForm.applicant_name,
        applicant_email: applicationForm.applicant_email,
        applicant_phone: applicationForm.applicant_phone,
        offered_price: applicationForm.offered_price ? Number(applicationForm.offered_price) : null,
        message: applicationForm.message || null,
      };

      await applyToBuyAndSellListing(selectedListing.id, payload);
      toast.success("Interest registered.", {
        description: "The seller will review your enquiry and respond shortly.",
      });
      setShowApplicationDialog(false);
      
      // Reload applications to update the UI
      if (selectedListing) {
        try {
          const application = await fetchMyBuyAndSellApplication(selectedListing.id);
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
        offered_price: "",
        message: "",
      });
    } catch (err: any) {
      console.error("Error submitting application:", err);
      toast.error(err?.message ?? "Failed to submit application");
    } finally {
      setSubmittingApplication(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-sm text-gray-500">Loading listings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Buy & Sell Board</h1>
        <p className="text-sm text-gray-500 mt-1">Marketplace for livestock, equipment, and supplies</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <Select value={filterListingType || "all"} onValueChange={(value) => setFilterListingType(value === "all" ? undefined : value as "for-sale" | "wanted" | "for-rent")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="for-sale">For Sale</SelectItem>
            <SelectItem value="wanted">Wanted</SelectItem>
            <SelectItem value="for-rent">For Rent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory || "all"} onValueChange={(value) => setFilterCategory(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="livestock">Livestock</SelectItem>
            <SelectItem value="supplies">Supplies</SelectItem>
            <SelectItem value="services">Services</SelectItem>
            <SelectItem value="vehicles">Vehicles</SelectItem>
            <SelectItem value="trailers">Trailers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid Layout - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {listings.length === 0 ? (
          <Card className="p-8 text-center col-span-full">
            <p className="text-gray-500">No active listings found</p>
          </Card>
        ) : (
          listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-all relative">
              {/* Saved Indicator */}
              {savedListings.includes(String(listing.id)) && (
                <div className="absolute top-2 right-2 z-10">
                  <Bookmark className="w-5 h-5 fill-red-500 text-red-500" />
                </div>
              )}

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

              {/* Content */}
              <div className="p-3">
                <h3 className="text-sm line-clamp-2 mb-2 font-semibold">{listing.title}</h3>

                {listing.price && (
                  <div className="text-lg mb-2" style={{ color: "#53ca97" }}>
                    ${listing.price.toLocaleString()}
                    {listing.price_type && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({listing.price_type.replace("-", " ")})
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{listing.city}, {listing.state}</span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {listing.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {listing.listing_type.replace("-", " ")}
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
          ))
        )}
      </div>

      {/* Listing Details Dialog */}
      {selectedListing && (
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedListing.title}</DialogTitle>
              <DialogDescription>
                {selectedListing.listing_type.replace("-", " ").charAt(0).toUpperCase() + selectedListing.listing_type.replace("-", " ").slice(1)} • {selectedListing.category.charAt(0).toUpperCase() + selectedListing.category.slice(1)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Image Placeholder */}
              <div 
                className="h-64 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: "#53ca97" }}
              >
                <DollarSign className="w-24 h-24 opacity-50" />
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y">
                {selectedListing.price && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Price</div>
                    <div className="text-2xl" style={{ color: "#53ca97" }}>
                      ${selectedListing.price.toLocaleString()}
                      {selectedListing.price_type && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({selectedListing.price_type.replace("-", " ")})
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500 mb-1">Category</div>
                  <Badge className="capitalize">{selectedListing.category}</Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Listing Type</div>
                  <div className="text-sm capitalize">{selectedListing.listing_type.replace("-", " ")}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Location</div>
                  <div className="text-sm">{selectedListing.city}, {selectedListing.state}</div>
                </div>
                {selectedListing.payment_terms && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Payment Terms</div>
                    <div className="text-sm capitalize">{selectedListing.payment_terms}</div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-2 font-semibold">Description</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedListing.description}</p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="mb-2 font-semibold">Contact Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>Contact Person:</strong> {selectedListing.contact_name}
                  </p>
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
                    <Button
                      variant="outline"
                      className="px-6 py-3 flex items-center justify-center gap-2"
                      onClick={async () => {
                        const application = myApplications.get(selectedListing.id);
                        if (!application) return;
                        try {
                          const thread = await fetchBuySellThreadByListingAndApplication(selectedListing.id, application.id);
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
            <DialogTitle>Apply for {selectedListing?.title}</DialogTitle>
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
              <Label>Offered Price</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg">$</span>
                <Input
                  type="number"
                  value={applicationForm.offered_price}
                  onChange={(e) => setApplicationForm({ ...applicationForm, offered_price: e.target.value })}
                  placeholder={selectedListing?.price ? String(selectedListing.price) : "0.00"}
                />
              </div>
              {selectedListing?.price && (
                <p className="text-xs text-gray-500 mt-1">
                  Listed price: ${selectedListing.price.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={applicationForm.message}
                onChange={(e) => setApplicationForm({ ...applicationForm, message: e.target.value })}
                placeholder="Tell the seller about your interest..."
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
