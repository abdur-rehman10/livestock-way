import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";
import {
  fetchBookings,
  respondToBooking,
  type LoadBooking,
} from "../api/marketplace";

export default function HaulerBookingsTab() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<LoadBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDialogMessage, setBlockDialogMessage] = useState(
    "Free trip already used or active trip exists. Please upgrade your subscription."
  );

  const refresh = async () => {
    try {
      setLoading(true);
      const resp = await fetchBookings();
      setBookings(resp.items);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAction = async (bookingId: string, action: "accept" | "reject") => {
    try {
      setBusyId(bookingId);
      await respondToBooking(bookingId, action);
      toast.success(action === "accept" ? "Booking accepted" : "Booking rejected");
      refresh();
    } catch (err: any) {
      const rawMessage: string = err?.message ?? "Failed to update booking";
      const normalized = rawMessage.toLowerCase();
      if (
        normalized.includes("free trip already used") ||
        normalized.includes("subscription_required") ||
        normalized.includes("upgrade required")
      ) {
        setBlockDialogMessage(
          "Free trip already used or active trip exists. Please upgrade your subscription."
        );
        setBlockDialogOpen(true);
      } else if (normalized.includes("payment_required")) {
        setBlockDialogMessage(
          "Payment required to activate your Paid plan. Complete payment to continue."
        );
        setBlockDialogOpen(true);
        navigate("/hauler/payment");
      } else {
        toast.error(rawMessage);
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading bookings…</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Booking Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-500">No booking requests yet.</p>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-gray-900">
                    Load #{booking.load_id}
                  </div>
                  <div className="text-xs text-gray-500">
                    Requested{" "}
                    {booking.requested_headcount
                      ? `${booking.requested_headcount} head`
                      : "capacity"}
                  </div>
                  {(() => {
                    const mode = (booking.payment_mode ?? "ESCROW").toString().toUpperCase();
                    const isDirect = mode === "DIRECT";
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={
                            isDirect
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }
                        >
                          Payment: {isDirect ? "Direct" : "Escrow"}
                        </Badge>
                        {isDirect && (
                          <span className="text-[11px] text-amber-700">
                            Direct payment. Escrow & disputes disabled.
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  {booking.notes && (
                    <p className="mt-1 text-xs text-gray-600">{booking.notes}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="capitalize">
                    {booking.status.toLowerCase()}
                  </Badge>
                  {booking.status === "REQUESTED" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === booking.id}
                        onClick={() => handleAction(booking.id, "reject")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#29CA8D]"
                        disabled={busyId === booking.id}
                        onClick={() => handleAction(booking.id, "accept")}
                      >
                        {busyId === booking.id ? "Processing…" : "Accept"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>{blockDialogMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setBlockDialogOpen(false)} className="bg-[#29CA8D] hover:bg-[#24b67d]">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
