import { useEffect, useState } from "react";
import {
  fetchTruckAvailability,
  createTruckAvailabilityEntry,
  requestBookingForTruckListing,
  type TruckAvailability,
} from "../api/marketplace";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { Badge } from "../components/ui/badge";

export default function TruckBoard() {
  const [listings, setListings] = useState<TruckAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    available_from: new Date().toISOString().slice(0, 16),
    capacity_headcount: "",
    notes: "",
  });
  const [bookingLoadId, setBookingLoadId] = useState("");
  const [posting, setPosting] = useState(false);
  const userRole = storage.get<string | null>(STORAGE_KEYS.USER_ROLE, null);

  const refresh = async () => {
    try {
      setLoading(true);
      const resp = await fetchTruckAvailability();
      setListings(resp.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load truck board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handlePostTruck = async () => {
    if (!form.origin.trim()) {
      toast.error("Origin is required");
      return;
    }
    try {
      setPosting(true);
      await createTruckAvailabilityEntry({
        origin_location_text: form.origin,
        destination_location_text: form.destination || null,
        available_from: new Date(form.available_from).toISOString(),
        capacity_headcount: form.capacity_headcount
          ? Number(form.capacity_headcount)
          : null,
        notes: form.notes || null,
      });
      toast.success("Truck availability posted.");
      setForm({
        origin: "",
        destination: "",
        available_from: new Date().toISOString().slice(0, 16),
        capacity_headcount: "",
        notes: "",
      });
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to post truck");
    } finally {
      setPosting(false);
    }
  };

  const handleRequestBooking = async (availabilityId: string) => {
    if (!bookingLoadId.trim()) {
      toast.error("Enter the load ID you want to assign.");
      return;
    }
    try {
      await requestBookingForTruckListing(availabilityId, {
        load_id: bookingLoadId,
        requested_headcount: undefined,
      });
      toast.success("Booking requested.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to request booking");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Truck Board</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading trucks…</p>
          ) : listings.length === 0 ? (
            <p className="text-sm text-gray-500">No active trucks posted.</p>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="border rounded-xl p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {listing.origin_location_text}
                      {listing.destination_location_text
                        ? ` → ${listing.destination_location_text}`
                        : ""}
                    </div>
                    <div className="text-xs text-gray-500">
                      Available{" "}
                      {new Date(listing.available_from).toLocaleDateString()}
                    </div>
                    {listing.capacity_headcount && (
                      <div className="text-xs text-gray-600">
                        Capacity: {listing.capacity_headcount} head
                      </div>
                    )}
                    {listing.notes && (
                      <p className="text-xs text-gray-600 mt-1">
                        {listing.notes}
                      </p>
                    )}
                  </div>
                  {userRole === "shipper" && (
                    <div className="flex flex-col gap-2 items-end">
                      <Badge className="text-[10px]">
                        {listing.allow_shared ? "Shared" : "Exclusive"}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleRequestBooking(listing.id)}
                      >
                        Request Booking
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {userRole === "shipper" && (
        <Card>
          <CardHeader>
            <CardTitle>Request Truck Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label className="text-xs">Load ID</Label>
            <Input
              placeholder="Enter load ID to match with a truck"
              value={bookingLoadId}
              onChange={(e) => setBookingLoadId(e.target.value)}
            />
            <p className="text-[11px] text-gray-500">
              Select a truck above and click “Request Booking”
            </p>
          </CardContent>
        </Card>
      )}

      {userRole === "hauler" && (
        <Card>
          <CardHeader>
            <CardTitle>Post Available Truck</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Origin</Label>
              <Input
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
                placeholder="City, State"
              />
            </div>
            <div>
              <Label className="text-xs">Destination (optional)</Label>
              <Input
                value={form.destination}
                onChange={(e) =>
                  setForm({ ...form, destination: e.target.value })
                }
                placeholder="City, State"
              />
            </div>
            <div>
              <Label className="text-xs">Available From</Label>
              <Input
                type="datetime-local"
                value={form.available_from}
                onChange={(e) =>
                  setForm({ ...form, available_from: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Capacity (headcount)</Label>
              <Input
                type="number"
                value={form.capacity_headcount}
                onChange={(e) =>
                  setForm({ ...form, capacity_headcount: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Equipment, special info, etc."
              />
            </div>
            <Button onClick={handlePostTruck} disabled={posting}>
              {posting ? "Posting…" : "Post Availability"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
