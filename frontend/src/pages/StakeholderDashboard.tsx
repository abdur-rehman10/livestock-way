import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  Package,
  FileText,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Users,
  Activity,
  Plus,
  AlertCircle,
  MessageCircle,
  Inbox,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from '../lib/swal';
import {
  fetchProviderDashboard,
  fetchProviderServiceBookings,
  respondToServiceBooking,
  confirmServiceBookingPayment,
  type ProviderDashboardStats,
  type ProviderDashboardActivity,
  type ProviderDashboardBooking,
  type ServiceBooking,
} from "../api/services";

/* ---------- helpers ---------- */

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

function activityMeta(a: ProviderDashboardActivity) {
  const action = a.action ?? "";
  const resource = a.resource ?? "";

  if (action.includes("service:create") || action.includes("service:post")) {
    return { Icon: Wrench, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Service created", description: resource || "New service listing", nav: "services" };
  }
  if (action.includes("service:update")) {
    return { Icon: Wrench, bgColor: "bg-blue-100", iconColor: "text-blue-600", title: "Service updated", description: resource || "Service listing edited", nav: "services" };
  }
  if (action.includes("service:delete") || action.includes("service:archive")) {
    return { Icon: AlertCircle, bgColor: "bg-red-100", iconColor: "text-red-600", title: "Service removed", description: resource || "Service archived", nav: "services" };
  }
  if (action.includes("booking:accept")) {
    return { Icon: CheckCircle, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Booking accepted", description: resource || "A booking was accepted", nav: "bookings" };
  }
  if (action.includes("booking:reject")) {
    return { Icon: XCircle, bgColor: "bg-red-100", iconColor: "text-red-600", title: "Booking rejected", description: resource || "A booking was declined", nav: "bookings" };
  }
  if (action.includes("booking:complete")) {
    return { Icon: CheckCircle, bgColor: "bg-emerald-100", iconColor: "text-emerald-600", title: "Booking completed", description: resource || "A booking was completed", nav: "bookings" };
  }
  if (action.includes("booking") || action.includes("book")) {
    return { Icon: Calendar, bgColor: "bg-orange-100", iconColor: "text-orange-600", title: "Booking activity", description: resource || "Booking updated", nav: "bookings" };
  }
  if (action.includes("resource:create") || action.includes("resource:post")) {
    return { Icon: Package, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Resource posted", description: resource || "New resource listing", nav: "resources-board" };
  }
  if (action.includes("resource")) {
    return { Icon: Package, bgColor: "bg-blue-100", iconColor: "text-blue-600", title: "Resource activity", description: resource || "Resource updated", nav: "resources-board" };
  }
  if (action.includes("payment") || action.includes("fund") || action.includes("escrow")) {
    return { Icon: DollarSign, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Payment activity", description: resource || "Payment updated", nav: "earnings" };
  }
  if (action.includes("message")) {
    return { Icon: MessageCircle, bgColor: "bg-sky-100", iconColor: "text-sky-600", title: "New message", description: resource || "Message received", nav: "messages" };
  }
  if (action.includes("kyc") || action.includes("document")) {
    return { Icon: FileText, bgColor: "bg-orange-100", iconColor: "text-orange-600", title: "Document activity", description: resource || "Document submitted", nav: "documents" };
  }
  if (action.includes("job")) {
    return { Icon: FileText, bgColor: "bg-violet-100", iconColor: "text-violet-600", title: "Job activity", description: resource || "Job listing updated", nav: "job-board" };
  }
  return { Icon: Activity, bgColor: "bg-gray-100", iconColor: "text-gray-600", title: action.replace(/:/g, " ").replace(/-/g, " "), description: resource || "—", nav: null as string | null };
}

/* ---------- component ---------- */

export default function StakeholderDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<ProviderDashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<ProviderDashboardActivity[]>([]);
  const [pendingBookings, setPendingBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const loadDashboard = async () => {
    try {
      const [dashRes, bookingsRes] = await Promise.all([
        fetchProviderDashboard(),
        fetchProviderServiceBookings({ status: ["pending"] }),
      ]);
      setDashboard(dashRes);
      setRecentActivities(dashRes.recent_activities ?? []);
      setPendingBookings(bookingsRes);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Poll bookings every 15s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const bookings = await fetchProviderServiceBookings({ status: ["pending"] });
        setPendingBookings(bookings);
      } catch {
        /* silent */
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRespond = async (bookingId: number, action: "accept" | "reject" | "complete") => {
    try {
      setRespondingId(bookingId);
      await respondToServiceBooking(bookingId, action);
      await loadDashboard();
      toast.success(
        action === "accept"
          ? "Booking accepted — the client has been notified."
          : action === "reject"
            ? "Booking declined."
            : "Service marked as completed.",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} booking`);
    } finally {
      setRespondingId(null);
    }
  };

  const handleConfirmPayment = async (bookingId: number) => {
    try {
      setRespondingId(bookingId);
      await confirmServiceBookingPayment(bookingId);
      await loadDashboard();
      toast.success("Payment confirmed.", {
        description: "The booking is now marked as paid.",
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm payment");
    } finally {
      setRespondingId(null);
    }
  };

  const handleNavigate = (section: string) => {
    const path =
      section === "services" || section === "listings"
        ? "/stakeholder/services"
        : section === "bookings"
          ? "/stakeholder/bookings"
          : section === "messages" || section === "messenger"
            ? "/stakeholder/messages"
            : section === "marketplace"
              ? "/stakeholder/marketplace"
              : section === "earnings"
                ? "/stakeholder/earnings"
                : section === "documents"
                  ? "/stakeholder/documents"
                  : section === "post-resource"
                    ? "/stakeholder/post-resource"
                    : section === "resources-board"
                      ? "/stakeholder/resources-board"
                      : section === "job-board"
                        ? "/stakeholder/job-board"
                        : `/stakeholder/${section}`;
    navigate(path);
  };

  /* ---- derived data ---- */

  const stats = dashboard
    ? [
        {
          label: "Active Services",
          value: String(dashboard.active_services_count),
          trend:
            dashboard.active_services_count > 0
              ? `${dashboard.active_services_count} listed`
              : "None listed",
          color: "#53ca97",
          icon: Wrench,
          clickAction: "services",
        },
        {
          label: "Pending Bookings",
          value: String(dashboard.pending_bookings_count),
          trend:
            dashboard.pending_bookings_count > 0
              ? `${dashboard.pending_bookings_count} awaiting response`
              : "All clear",
          color: "#f59e0b",
          icon: Clock,
          clickAction: "bookings",
        },
        {
          label: "Completed Jobs",
          value: String(dashboard.completed_bookings_count),
          trend: "Total completed",
          color: "#3b82f6",
          icon: CheckCircle,
          clickAction: "services",
        },
        {
          label: "Resource Listings",
          value: String(dashboard.active_resources_count),
          trend:
            dashboard.active_resources_count > 0
              ? `${dashboard.active_resources_count} active`
              : "None posted",
          color: "#8b5cf6",
          icon: Package,
          clickAction: "resources-board",
        },
      ]
    : [];

  const quickActions = [
    { label: "Add Service", action: "services/new", icon: Wrench },
    { label: "Post Resource", action: "post-resource", icon: Package },
    { label: "View Listings", action: "services", icon: FileText },
    { label: "Check Messages", action: "messages", icon: Inbox },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold mb-2">Welcome back!</h1>
        <p className="text-gray-500">
          Here&apos;s what&apos;s happening with your resources &amp; services today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="p-5 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => handleNavigate(stat.clickAction)}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
              <div className="mb-1">
                <div className="text-2xl mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{stat.trend}</div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card
                key={index}
                className="p-4 hover:shadow-md transition-all cursor-pointer group border-2 border-transparent hover:border-[#6B7280]"
                onClick={() => handleNavigate(action.action)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "#f3f4f6" }}
                  >
                    <Icon className="w-5 h-5 transition-colors" style={{ color: "#6B7280" }} />
                  </div>
                  <div className="text-sm font-medium group-hover:translate-x-1 transition-transform">
                    {action.label}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Pending Booking Requests */}
      {pendingBookings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium flex items-center gap-2">
              Pending Requests
              <Badge className="text-xs px-2 py-0.5 bg-orange-500 text-white">
                {pendingBookings.length}
              </Badge>
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => handleNavigate("bookings")}
            >
              View All Bookings
            </Button>
          </div>

          <div className="space-y-3">
            {pendingBookings.slice(0, 5).map((booking) => {
              const requestedBy = booking.hauler_company || booking.hauler_name || "Hauler";
              const createdAt = booking.created_at ? new Date(booking.created_at) : null;
              const dateLabel = createdAt ? createdAt.toLocaleDateString() : "—";
              const locationLabel = booking.service?.city
                ? `${booking.service.city}${booking.service.state ? `, ${booking.service.state}` : ""}`
                : "—";
              const priceLabel = booking.price ?? booking.service?.base_price ?? null;
              const status = String(booking.status ?? "").toLowerCase();
              const paymentStatus = String(booking.payment_status ?? "").toLowerCase();

              return (
                <Card
                  key={booking.id}
                  className="p-4 border-l-4 border-l-orange-400"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">
                          {booking.service?.title ?? "Service Request"}
                        </h4>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {requestedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateLabel}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {locationLabel}
                        </span>
                        {priceLabel !== null && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            ${priceLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleRespond(booking.id, "accept")}
                            disabled={respondingId === booking.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRespond(booking.id, "reject")}
                            disabled={respondingId === booking.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      {status === "accepted" && (paymentStatus === "sent" || paymentStatus === "pending") && (
                        <Button
                          size="sm"
                          className="bg-[#303845] hover:bg-[#1f2735] text-white"
                          onClick={() => handleConfirmPayment(booking.id)}
                          disabled={respondingId === booking.id}
                        >
                          Confirm Payment
                        </Button>
                      )}
                      {status === "accepted" && paymentStatus === "paid" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRespond(booking.id, "complete")}
                          disabled={respondingId === booking.id}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Services & Bookings Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Services overview */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#6B7280]" />
              <h3 className="text-sm font-medium">My Services</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleNavigate("services")}
            >
              Manage
            </Button>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Active Services</span>
                <span className="text-lg font-medium">{dashboard?.active_services_count ?? 0}</span>
              </div>
              <p className="text-xs text-gray-500">Listed and available for bookings</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Completed Bookings</span>
                <span className="text-lg font-medium">{dashboard?.completed_bookings_count ?? 0}</span>
              </div>
              <p className="text-xs text-gray-500">All-time completed jobs</p>
            </div>
            <Button
              className="w-full bg-[#6B7280] hover:bg-[#4B5563] text-white"
              size="sm"
              onClick={() => handleNavigate("services/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Service
            </Button>
          </div>
        </Card>

        {/* Resource Listings overview */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#8b5cf6]" />
              <h3 className="text-sm font-medium">Resource Listings</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleNavigate("resources-board")}
            >
              View Board
            </Button>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Active Listings</span>
                <span className="text-lg font-medium">{dashboard?.active_resources_count ?? 0}</span>
              </div>
              <p className="text-xs text-gray-500">Resource listings you have posted</p>
            </div>
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-violet-600 mt-0.5" />
                <div>
                  <p className="text-sm text-violet-900 font-medium">Post a Resource</p>
                  <p className="text-xs text-violet-700 mt-0.5">
                    Share logistics, insurance, washout, hay and more with the community.
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
              size="sm"
              onClick={() => handleNavigate("post-resource")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Post a Resource
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Bookings + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Bookings */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Recent Bookings</h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleNavigate("bookings")}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {(dashboard?.recent_bookings ?? []).length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No bookings yet</p>
              </div>
            ) : (
              (dashboard?.recent_bookings ?? []).slice(0, 6).map((b: ProviderDashboardBooking) => {
                const statusColor =
                  b.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : b.status === "accepted"
                      ? "bg-blue-100 text-blue-700"
                      : b.status === "pending"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-600";
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.service_title}</p>
                      <p className="text-xs text-gray-500">
                        {b.city ? `${b.city}${b.state ? `, ${b.state}` : ""}` : "—"} &middot;{" "}
                        {formatTimeAgo(b.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {b.price != null && (
                        <span className="text-sm font-medium">${b.price}</span>
                      )}
                      <Badge className={`text-xs capitalize ${statusColor}`}>{b.status}</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Recent Activities */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Recent Activities</h3>
          </div>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              recentActivities.slice(0, 8).map((act) => {
                const m = activityMeta(act);
                const Icon = m.Icon;
                return (
                  <div
                    key={act.id}
                    className={`flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${m.nav ? "cursor-pointer" : ""}`}
                    onClick={() => m.nav && handleNavigate(m.nav)}
                  >
                    <div className={`w-8 h-8 rounded-full ${m.bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${m.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-gray-500 truncate">{m.description}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatTimeAgo(act.created_at)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
