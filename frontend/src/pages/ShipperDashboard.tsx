import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  TruckIcon,
  FileText,
  DollarSign,
  MapPin,
  Clock,
  Activity,
  Plus,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Route,
  Eye,
  Phone,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { PostLoadDialog } from "./PostLoadDialog";
import {
  fetchShipperDashboard,
  fetchContracts,
  type ShipperDashboardStats,
  type ShipperDashboardActivity,
  type ShipperDashboardPendingOffer,
  type ContractRecord,
} from "../api/marketplace";

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function activityMeta(a: ShipperDashboardActivity) {
  const action = a.action ?? "";
  const resource = a.resource ?? "";

  if (action.includes("load:create") || action.includes("load:post")) {
    return { Icon: Package, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Load posted", description: resource || "New load created", nav: "my-loads" };
  }
  if (action.includes("load:update") || action.includes("load:status")) {
    return { Icon: Package, bgColor: "bg-blue-100", iconColor: "text-blue-600", title: "Load updated", description: resource || "Load status changed", nav: "my-loads" };
  }
  if (action.includes("load:delete")) {
    return { Icon: AlertCircle, bgColor: "bg-red-100", iconColor: "text-red-600", title: "Load removed", description: resource || "A load was deleted", nav: "my-loads" };
  }
  if (action.includes("offer:accept") || action.includes("load-offer:accept")) {
    return { Icon: CheckCircle, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Offer accepted", description: resource || "An offer was accepted", nav: "offers" };
  }
  if (action.includes("offer:reject") || action.includes("load-offer:reject")) {
    return { Icon: AlertCircle, bgColor: "bg-red-100", iconColor: "text-red-600", title: "Offer declined", description: resource || "An offer was declined", nav: "offers" };
  }
  if (action.includes("offer")) {
    return { Icon: MessageCircle, bgColor: "bg-orange-100", iconColor: "text-orange-600", title: "Offer activity", description: resource || "Offer updated", nav: "offers" };
  }
  if (action.includes("contract:create") || action.includes("contract:send")) {
    return { Icon: FileText, bgColor: "bg-amber-100", iconColor: "text-amber-600", title: "Contract sent", description: resource || "A contract was created", nav: "contracts" };
  }
  if (action.includes("contract:accept")) {
    return { Icon: CheckCircle, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Contract accepted", description: resource || "Contract was accepted", nav: "contracts" };
  }
  if (action.includes("contract")) {
    return { Icon: FileText, bgColor: "bg-amber-100", iconColor: "text-amber-600", title: "Contract activity", description: resource || "Contract updated", nav: "contracts" };
  }
  if (action.includes("trip:create")) {
    return { Icon: TruckIcon, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Trip created", description: resource || "New trip started", nav: "trips" };
  }
  if (action === "trip:update-status") {
    return { Icon: Activity, bgColor: "bg-blue-100", iconColor: "text-blue-600", title: "Trip status updated", description: resource || "Trip status changed", nav: "trips" };
  }
  if (action === "trip:epod-upload") {
    return { Icon: FileText, bgColor: "bg-emerald-100", iconColor: "text-emerald-600", title: "ePOD uploaded", description: resource || "Proof of delivery uploaded", nav: "trips" };
  }
  if (action === "trip:load-pickup") {
    return { Icon: Package, bgColor: "bg-amber-100", iconColor: "text-amber-600", title: "Load picked up", description: resource || "Pickup completed", nav: "trips" };
  }
  if (action === "trip:load-delivery") {
    return { Icon: MapPin, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Load delivered", description: resource || "Delivery completed", nav: "trips" };
  }
  if (action.includes("trip:route")) {
    return { Icon: Route, bgColor: "bg-purple-100", iconColor: "text-purple-600", title: "Route planned", description: resource || "Route plan updated", nav: "trips" };
  }
  if (action.includes("payment") || action.includes("fund") || action.includes("escrow")) {
    return { Icon: DollarSign, bgColor: "bg-green-100", iconColor: "text-green-600", title: "Payment activity", description: resource || "Payment updated", nav: "payments" };
  }
  if (action.includes("booking")) {
    return { Icon: TruckIcon, bgColor: "bg-blue-100", iconColor: "text-blue-600", title: "Booking activity", description: resource || "Booking updated", nav: "contracts" };
  }
  if (action.includes("message")) {
    return { Icon: MessageCircle, bgColor: "bg-sky-100", iconColor: "text-sky-600", title: "New message", description: resource || "Message received", nav: "messages" };
  }
  if (action.includes("kyc") || action.includes("document")) {
    return { Icon: FileText, bgColor: "bg-orange-100", iconColor: "text-orange-600", title: "Document activity", description: resource || "Document submitted", nav: "documents" };
  }
  return { Icon: Activity, bgColor: "bg-gray-100", iconColor: "text-gray-600", title: action.replace(/:/g, " ").replace(/-/g, " "), description: resource || "—", nav: null as string | null };
}

/* ---------- component ---------- */

interface ShipperDashboardProps {
  onLogout?: () => void;
  onRoleSwitch?: (role: "shipper" | "driver") => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ShipperDashboard(_props: ShipperDashboardProps) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<ShipperDashboardStats | null>(null);
  const [contractsNegotiating, setContractsNegotiating] = useState<ContractRecord[]>([]);
  const [acceptedContracts, setAcceptedContracts] = useState<ContractRecord[]>([]);
  const [recentActivities, setRecentActivities] = useState<ShipperDashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPostLoadOpen, setIsPostLoadOpen] = useState(false);

  useEffect(() => {
    const handleOpenPostLoad = () => setIsPostLoadOpen(true);
    window.addEventListener("open-post-load-dialog", handleOpenPostLoad);
    return () => window.removeEventListener("open-post-load-dialog", handleOpenPostLoad);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [dashRes, contractsRes, acceptedRes] = await Promise.all([
          fetchShipperDashboard(),
          fetchContracts({ status: "SENT" }),
          fetchContracts({ status: "ACCEPTED" }),
        ]);
        if (cancelled) return;
        setDashboard(dashRes);
        setRecentActivities(dashRes.recent_activities ?? []);
        setContractsNegotiating(contractsRes.items ?? []);
        setAcceptedContracts(acceptedRes.items ?? []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleNavigate = (section: string) => {
    const path =
      section === "my-loads" || section === "listings"
        ? "/shipper/my-loads"
        : section === "trips"
          ? "/shipper/trips"
          : section === "contracts"
            ? "/shipper/contracts"
            : section === "offers"
              ? "/shipper/offers"
              : section === "payments"
                ? "/shipper/payments"
                : section === "messages" || section === "messenger"
                  ? "/shipper/messages"
                  : section === "documents"
                    ? "/shipper/documents"
                    : section === "truck-board"
                      ? "/shipper/truck-board"
                      : section === "resources"
                        ? "/shipper/resources-board"
                        : section === "post-load"
                          ? "/shipper/my-loads"
                          : `/shipper/${section}`;
    navigate(path);
  };

  const activeTrip = dashboard?.active_trip ?? null;

  const stats = dashboard
    ? [
        {
          label: "Active Loads",
          value: String(dashboard.active_loads_count),
          trend:
            dashboard.active_loads_count > 0
              ? `${dashboard.active_loads_count} posted`
              : "None posted",
          color: "#53ca97",
          icon: Package,
          clickAction: "my-loads",
        },
        {
          label: "Active Trips",
          value: String(dashboard.active_trips_count),
          trend:
            dashboard.active_trips_count > 0
              ? `${dashboard.active_trips_count} in transit`
              : "None in transit",
          color: "#3b82f6",
          icon: TruckIcon,
          clickAction: "trips",
        },
        {
          label: "Pending Contracts",
          value: String(dashboard.pending_contracts_count),
          trend:
            dashboard.pending_contracts_count > 0
              ? "Need your attention"
              : "All clear",
          color: "#f59e0b",
          icon: FileText,
          clickAction: "contracts",
        },
        {
          label: "Monthly Spent",
          value: formatCurrency(dashboard.monthly_spent),
          trend:
            dashboard.monthly_spent_trend_percent !== 0
              ? `${dashboard.monthly_spent_trend_percent > 0 ? "+" : ""}${dashboard.monthly_spent_trend_percent}% vs last month`
              : "This month",
          color: "#8b5cf6",
          icon: DollarSign,
          clickAction: "payments",
        },
      ]
    : [];

  const quickActions = [
    { label: "Post a Load", action: "post-load", icon: Package, isPostLoad: true },
    { label: "Browse Trucks", action: "truck-board", icon: TruckIcon, isPostLoad: false },
    { label: "Browse Resources", action: "resources", icon: FileText, isPostLoad: false },
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
          Here&apos;s what&apos;s happening with your livestock logistics today.
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
              <div className="p-3">

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
              </ div>
          
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card
                key={index}
                className="p-4 hover:shadow-md transition-all cursor-pointer group border-2 border-transparent hover:border-[#F97316]"
                onClick={() => {
                  if (action.isPostLoad) {
                    setIsPostLoadOpen(true);
                  } else {
                    handleNavigate(action.action);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "#fff7ed" }}
                  >
                    <Icon className="w-5 h-5 transition-colors" style={{ color: "#F97316" }} />
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

      {/* Active Trip Section */}
      {activeTrip && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium flex items-center gap-2">
              Active Trip
              <Badge className="text-xs px-2 py-0.5" style={{ backgroundColor: "#53ca97", color: "white" }}>
                Live
              </Badge>
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => handleNavigate("trips")}
            >
              View All Trips
            </Button>
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="text-xs bg-blue-100 text-blue-700 capitalize">
                    {activeTrip.status}
                  </Badge>
                  <span className="text-xs text-gray-500">Trip #{activeTrip.id}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">Route</p>
                    <p className="text-xs font-medium">{activeTrip.route}</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">Hauler</p>
                    <p className="text-sm font-medium">{activeTrip.hauler}</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">Driver</p>
                    <p className="text-sm font-medium">{activeTrip.driver}</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-0.5">Livestock</p>
                    <p className="text-sm font-medium">
                      {activeTrip.species ?? "—"}
                      {activeTrip.animal_count != null ? ` (${activeTrip.animal_count} head)` : ""}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => navigate(`/shipper/trips/${activeTrip.id}/tracking`)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Track Live
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => navigate(`/shipper/trips/${activeTrip.id}/chat`)}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Chat
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => toast.info("Emergency hotline: 1-800-LIVESTOCK")}
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5" />
                  Emergency
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Pending Offers */}
      {(dashboard?.pending_offers ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium flex items-center gap-2">
              Pending Offers
              <Badge className="text-xs px-2 py-0.5 bg-orange-500 text-white">
                {dashboard!.pending_offers.length}
              </Badge>
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => handleNavigate("offers")}
            >
              View All Offers
            </Button>
          </div>
          <div className="space-y-3">
            {dashboard!.pending_offers.slice(0, 5).map((offer: ShipperDashboardPendingOffer) => (
              <Card
                key={offer.id}
                className="p-4 border-l-4 border-l-orange-400 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleNavigate("offers")}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">
                        {offer.load_title || `${offer.species ?? "Load"} - ${offer.animal_count ?? "?"} head`}
                      </h4>
                      <Badge className="text-xs bg-orange-100 text-orange-700">Pending</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {offer.pickup_location_text && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {offer.pickup_location_text}
                        </span>
                      )}
                      {offer.dropoff_location_text && (
                        <span>→ {offer.dropoff_location_text}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(offer.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {offer.offered_amount != null && (
                      <p className="text-lg font-semibold text-[#F97316]">
                        {formatCurrency(offer.offered_amount)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Contracts */}
      {(contractsNegotiating.length > 0 || acceptedContracts.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Contracts</h2>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => handleNavigate("contracts")}
            >
              View All Contracts
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Awaiting Response */}
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                Awaiting Response
                <Badge className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700">
                  {contractsNegotiating.length} Pending
                </Badge>
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {contractsNegotiating.length === 0 ? (
                  <p className="text-sm text-gray-500">No contracts awaiting response.</p>
                ) : (
                  contractsNegotiating.slice(0, 4).map((c) => {
                    const price = c.price_amount ? formatCurrency(Number(c.price_amount)) : "TBD";
                    return (
                      <div
                        key={c.id}
                        className="p-3 border-2 rounded-lg hover:border-[#F97316] transition-all bg-white cursor-pointer hover:shadow-md border-gray-200"
                        onClick={() => handleNavigate("contracts")}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">Contract #{c.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500">
                              {formatTimeAgo(c.created_at)}
                            </p>
                          </div>
                          <Badge className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 capitalize">
                            {c.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{c.payment_method ?? "—"}</span>
                          <span className="font-medium text-gray-900">{price}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Accepted / Confirmed */}
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                Accepted Contracts
                <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
                  {acceptedContracts.length} Confirmed
                </Badge>
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {acceptedContracts.length === 0 ? (
                  <p className="text-sm text-gray-500">No accepted contracts yet.</p>
                ) : (
                  acceptedContracts.slice(0, 4).map((c) => {
                    const price = c.price_amount ? formatCurrency(Number(c.price_amount)) : "TBD";
                    return (
                      <div
                        key={c.id}
                        className="p-3 border-2 rounded-lg hover:border-green-400 transition-all bg-white cursor-pointer hover:shadow-md border-green-200"
                        onClick={() => handleNavigate("contracts")}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">Contract #{c.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500">
                              {c.accepted_at
                                ? `Accepted ${formatTimeAgo(c.accepted_at)}`
                                : formatTimeAgo(c.updated_at)}
                            </p>
                          </div>
                          <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
                            Accepted
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{c.payment_method ?? "—"}</span>
                          <span className="font-medium text-gray-900">{price}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Load Stats + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Load Overview */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#F97316]" />
              <h3 className="text-sm font-medium">My Loads Overview</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleNavigate("my-loads")}
            >
              Manage
            </Button>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Active Loads</span>
                <span className="text-lg font-medium">{dashboard?.active_loads_count ?? 0}</span>
              </div>
              <p className="text-xs text-gray-500">Open, assigned, or in transit</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Completed Loads</span>
                <span className="text-lg font-medium">{dashboard?.completed_loads_count ?? 0}</span>
              </div>
              <p className="text-xs text-gray-500">Successfully delivered</p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">This Month&apos;s Spend</span>
                </div>
                <span className="text-base font-medium text-green-700">
                  {formatCurrency(dashboard?.monthly_spent ?? 0)}
                </span>
              </div>
            </div>
            <Button
              className="w-full bg-[#F97316] hover:bg-[#ea580c] text-white"
              size="sm"
              onClick={() => setIsPostLoadOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Post a New Load
            </Button>
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

      {/* Post Load Dialog */}
      <PostLoadDialog open={isPostLoadOpen} onOpenChange={setIsPostLoadOpen} />
    </div>
  );
}
