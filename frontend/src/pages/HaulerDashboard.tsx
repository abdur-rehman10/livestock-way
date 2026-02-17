import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TruckIcon,
  Package,
  FileText,
  DollarSign,
  Gauge,
  MapPin,
  Activity,
  Clock,
  Route,
  Fuel,
  Banknote,
  PawPrint,
  MapPinned,
  ListChecks,
  ShieldCheck,
  MessageCircle,
  Phone,
  Plus,
  AlertCircle,
  X,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import {
  fetchHaulerDashboard,
  fetchContracts,
  type HaulerDashboardStats,
  type HaulerDashboardActivity,
  type ContractRecord,
} from "../api/marketplace";

interface HaulerDashboardProps {
  onLogout?: () => void;
}

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

function activityMeta(activity: HaulerDashboardActivity) {
  const action = activity.action ?? "";
  const resource = activity.resource ?? "";

  if (action.startsWith("trip:create")) {
    return {
      Icon: TruckIcon,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      title: "Trip created",
      description: resource || "New trip created",
      nav: "trips",
    };
  }
  if (action === "trip:update-status") {
    return {
      Icon: Activity,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      title: "Trip status updated",
      description: resource || "Trip status changed",
      nav: "trips",
    };
  }
  if (action === "trip:epod-upload") {
    return {
      Icon: FileText,
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600",
      title: "ePOD uploaded",
      description: resource || "Proof of delivery uploaded",
      nav: "trips",
    };
  }
  if (action === "trip:load-pickup") {
    return {
      Icon: Package,
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
      title: "Load picked up",
      description: resource || "Pickup completed",
      nav: "trips",
    };
  }
  if (action === "trip:load-delivery") {
    return {
      Icon: MapPin,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      title: "Load delivered",
      description: resource || "Delivery completed",
      nav: "trips",
    };
  }
  if (action === "trip:expense-create") {
    return {
      Icon: DollarSign,
      bgColor: "bg-violet-100",
      iconColor: "text-violet-600",
      title: "Expense recorded",
      description: resource || "Trip expense added",
      nav: "earnings",
    };
  }
  if (action === "trip:route-plan" || action === "trip:route-plan-generate") {
    return {
      Icon: Route,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      title: "Route plan updated",
      description: resource || "Route plan saved or generated",
      nav: "trips",
    };
  }
  if (action === "trip:pretrip") {
    return {
      Icon: ShieldCheck,
      bgColor: "bg-teal-100",
      iconColor: "text-teal-600",
      title: "Pre-trip check completed",
      description: resource || "Pre-trip inspection done",
      nav: "trips",
    };
  }
  if (action === "trip:delete") {
    return {
      Icon: AlertCircle,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      title: "Trip deleted",
      description: resource || "A trip was removed",
      nav: "trips",
    };
  }
  if (action.includes("contract")) {
    return {
      Icon: FileText,
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
      title: "Contract activity",
      description: resource || "Contract updated",
      nav: "contracts",
    };
  }
  if (action.includes("offer")) {
    return {
      Icon: MessageCircle,
      bgColor: "bg-sky-100",
      iconColor: "text-sky-600",
      title: "Offer activity",
      description: resource || "Offer sent or updated",
      nav: "contracts",
    };
  }
  if (action.includes("payment") || action.includes("fund") || action.includes("escrow")) {
    return {
      Icon: DollarSign,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      title: "Payment activity",
      description: resource || "Payment updated",
      nav: "earnings",
    };
  }
  if (action.includes("truck") || action.includes("fleet") || action.includes("vehicle")) {
    return {
      Icon: TruckIcon,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      title: "Fleet activity",
      description: resource || "Truck or fleet updated",
      nav: "fleet",
    };
  }
  if (action.includes("kyc") || action.includes("document")) {
    return {
      Icon: FileText,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      title: "Document activity",
      description: resource || "Document submitted",
      nav: "documents",
    };
  }
  // Fallback
  return {
    Icon: Activity,
    bgColor: "bg-gray-100",
    iconColor: "text-gray-600",
    title: action.replace(/:/g, " ").replace(/-/g, " "),
    description: resource || "—",
    nav: null as string | null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function HaulerDashboard(_props: HaulerDashboardProps) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<HaulerDashboardStats | null>(null);
  const [contractsAwaitingResponse, setContractsAwaitingResponse] = useState<ContractRecord[]>([]);
  const [acceptedContracts, setAcceptedContracts] = useState<ContractRecord[]>([]);
  const [recentActivities, setRecentActivities] = useState<HaulerDashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmergencyPopup, setShowEmergencyPopup] = useState(false);
  const [showAddExpensesModal, setShowAddExpensesModal] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    fuel: 0,
    maintenance: 0,
    tolls: 0,
    driver: 0,
    insurance: 0,
    other: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [dashRes, contractsRes, acceptedRes] = await Promise.all([
          fetchHaulerDashboard(),
          fetchContracts({ status: "SENT" }),
          fetchContracts({ status: "ACCEPTED" }),
        ]);
        if (cancelled) return;
        setDashboard(dashRes);
        setContractsAwaitingResponse(contractsRes.items ?? []);
        setAcceptedContracts(acceptedRes.items ?? []);
        setRecentActivities(dashRes.recent_activities ?? []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTrip = dashboard?.active_trip ?? null;
  const stats = dashboard
    ? [
        {
          label: "Active Trips",
          value: String(dashboard.active_trips_count),
          trend:
            dashboard.active_trips_count > 0
              ? `${dashboard.active_trips_count} in progress`
              : "None in progress",
          color: "#53ca97",
          clickAction: "trips",
        },
        {
          label: "Available Trucks",
          value: String(dashboard.available_trucks_count),
          trend: "Fleet status",
          color: "#3b82f6",
          clickAction: "fleet",
        },
        {
          label: "Pending Contracts",
          value: String(dashboard.pending_contracts_count),
          trend:
            dashboard.pending_contracts_count > 0
              ? "Awaiting your response"
              : "None pending",
          color: "#f59e0b",
          clickAction: "contracts",
        },
        {
          label: "Monthly Revenue",
          value: formatCurrency(dashboard.monthly_revenue),
          trend:
            dashboard.monthly_revenue_trend_percent !== 0
              ? `${dashboard.monthly_revenue_trend_percent > 0 ? "+" : ""}${dashboard.monthly_revenue_trend_percent}% vs last month`
              : "This month",
          color: "#8b5cf6",
          clickAction: "earnings",
        },
      ]
    : [];

  const quickActions = [
    { label: "Create Trip", action: "trips", icon: TruckIcon },
    { label: "Browse Loads", action: "loadboard", icon: Package },
    { label: "View Fleet", action: "fleet", icon: Gauge },
  ];

  const handleNavigate = (section: string) => {
    const path =
      section === "trips"
        ? "/hauler/trips"
        : section === "fleet"
          ? "/hauler/fleet"
          : section === "contracts"
            ? "/hauler/contracts"
            : section === "payments" || section === "earnings"
              ? "/hauler/earnings"
              : section === "loadboard"
                ? "/hauler/loadboard"
                : `/hauler/${section}`;
    navigate(path);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold mb-2">Welcome back! 👋</h1>
        <p className="text-gray-500">
          Here&apos;s what&apos;s happening with your livestock logistics today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon =
            stat.label === "Active Trips" || stat.label === "Available Trucks"
              ? TruckIcon
              : stat.label === "Pending Contracts"
                ? FileText
                : DollarSign;
          return (
            <Card
              key={index}
              className="hover:shadow-lg transition-all cursor-pointer group p-5"
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
                <div className="text-2xl mb-1 font-semibold">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{stat.trend}</div>
              </div>
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
                className="p-4 hover:shadow-md transition-all cursor-pointer group border-2 border-transparent hover:border-[#53ca97]"
                onClick={() => handleNavigate(action.action)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "#e8f7f1" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#53ca97" }} />
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

      {/* Active Trip */}
      {(dashboard?.active_trips_count ?? 0) > 0 && activeTrip && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium flex items-center gap-2">
              Active Trip
              <Badge className="text-xs px-2 py-0.5 bg-[#53ca97] text-white">Live</Badge>
            </h2>
            <Button variant="outline" size="sm" className="text-sm" onClick={() => handleNavigate("trips")}>
              View All Trips
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 overflow-hidden">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Live Location</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs px-3 py-1.5 h-auto"
                    onClick={() => navigate(`/hauler/trips`)}
                  >
                    Driver Mode
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs px-3 py-1.5 h-auto"
                    onClick={() => setShowAddExpensesModal(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Expenses
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs px-3 py-1.5 h-auto bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setShowEmergencyPopup(true)}
                  >
                    <Phone className="w-3.5 h-3.5 mr-1.5" />
                    Emergency
                  </Button>
                </div>
              </div>

              <div className="relative h-64 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden mb-3">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 mx-auto mb-2 text-[#53ca97] animate-pulse" />
                    <p className="text-sm text-gray-600 font-medium">
                      {activeTrip.current_location || activeTrip.route || "En route"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-0.5">Trip ID</p>
                  <p className="text-sm font-medium">{activeTrip.id}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-0.5">Progress</p>
                  <p className="text-sm font-medium text-[#53ca97]">
                    {activeTrip.progress != null ? `${activeTrip.progress}%` : "—"}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-0.5">Route</p>
                  <p className="text-xs font-medium truncate" title={activeTrip.route}>
                    {activeTrip.route}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-0.5">ETA</p>
                  <p className="text-sm font-medium text-[#53ca97]">{activeTrip.eta || "—"}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#53ca97]" />
                <h3 className="text-sm font-medium">Trip Metrics</h3>
                <Badge className="text-xs px-2 py-0.5 bg-[#53ca97] text-white">Live</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600 mb-1" />
                  <p className="text-xs text-blue-900 font-medium">{activeTrip.eta || "—"}</p>
                  <p className="text-[10px] text-blue-700">Time Left</p>
                </div>
                <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                  <Route className="w-4 h-4 text-purple-600 mb-1" />
                  <p className="text-xs text-purple-900 font-medium">—</p>
                  <p className="text-[10px] text-purple-700">Distance</p>
                </div>
                <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg">
                  <Gauge className="w-4 h-4 text-green-600 mb-1" />
                  <p className="text-xs text-green-900 font-medium">—</p>
                  <p className="text-[10px] text-green-700">Fuel Avg</p>
                </div>
                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                  <Fuel className="w-4 h-4 text-orange-600 mb-1" />
                  <p className="text-xs text-orange-900 font-medium">—</p>
                  <p className="text-[10px] text-orange-700">Consumed</p>
                </div>
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <Banknote className="w-4 h-4 text-indigo-600 mb-1" />
                  <p className="text-xs text-indigo-900 font-medium">—</p>
                  <p className="text-[10px] text-indigo-700">Spent</p>
                </div>
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg">
                  <PawPrint className="w-4 h-4 text-teal-600 mb-1" />
                  <p className="text-xs text-teal-900 font-medium">—</p>
                  <p className="text-[10px] text-teal-700">Animals</p>
                </div>
                <div className="p-2.5 bg-pink-50 border border-pink-200 rounded-lg">
                  <MapPinned className="w-4 h-4 text-pink-600 mb-1" />
                  <p className="text-xs text-pink-900 font-medium">—</p>
                  <p className="text-[10px] text-pink-700">Next Stop</p>
                </div>
                <div className="p-2.5 bg-cyan-50 border border-cyan-200 rounded-lg">
                  <ListChecks className="w-4 h-4 text-cyan-600 mb-1" />
                  <p className="text-xs text-cyan-900 font-medium">—</p>
                  <p className="text-[10px] text-cyan-700">Stops</p>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                  <p className="text-xs text-emerald-900 font-medium">—</p>
                  <p className="text-[10px] text-emerald-700">Compliance</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Fleet & Fuel */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Fleet & Fuel</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="p-5 hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-[#53ca97]"
            onClick={() => handleNavigate("fleet")}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-[#e8f7f1]">
                <Gauge className="w-5 h-5 text-[#53ca97]" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#53ca97]">Fuel Efficiency</h3>
                <p className="text-xs text-gray-500">Trip comparison</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Fleet size</p>
              <p className="text-xl font-semibold">{dashboard?.available_trucks_count ?? 0} trucks</p>
            </div>
          </Card>

          <Card
            className="p-5 hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-blue-500"
            onClick={() => handleNavigate("fleet")}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-blue-100">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-600">Transport Health</h3>
                <p className="text-xs text-gray-500">Maintenance status</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Vehicles</p>
              <p className="text-base font-medium">{dashboard?.available_trucks_count ?? 0} operational</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Contracts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Contracts</h2>
          <Button variant="outline" size="sm" className="text-sm" onClick={() => handleNavigate("contracts")}>
            View All Contracts
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Awaiting Response */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              Awaiting Your Response
              <Badge className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700">
                {contractsAwaitingResponse.length} Pending
              </Badge>
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {contractsAwaitingResponse.length === 0 ? (
                <p className="text-sm text-gray-500">No contracts awaiting your response.</p>
              ) : (
                contractsAwaitingResponse.slice(0, 4).map((contract) => (
                  <div
                    key={contract.id}
                    className="p-3 border-2 rounded-lg hover:border-[#53ca97] transition-all bg-white cursor-pointer hover:shadow-md border-gray-200"
                    onClick={() => handleNavigate("contracts")}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">Contract #{contract.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">
                          {contract.updated_at ? formatTimeAgo(contract.updated_at) : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {contract.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Price:</span>{" "}
                        {contract.price_amount != null
                          ? `$${Number(contract.price_amount).toLocaleString()}`
                          : "—"}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t gap-2">
                        <Button
                          size="sm"
                          className="text-xs px-2.5 py-1 h-auto bg-[#53ca97] text-white hover:bg-[#45b886]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate("contracts");
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
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
                acceptedContracts.slice(0, 4).map((contract) => (
                  <div
                    key={contract.id}
                    className="p-3 border-2 rounded-lg hover:border-green-400 transition-all bg-white cursor-pointer hover:shadow-md border-green-200"
                    onClick={() => handleNavigate("contracts")}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">Contract #{contract.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">
                          {contract.accepted_at
                            ? `Accepted ${formatTimeAgo(contract.accepted_at)}`
                            : contract.updated_at
                              ? formatTimeAgo(contract.updated_at)
                              : ""}
                        </p>
                      </div>
                      <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
                        Accepted
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Price:</span>{" "}
                        {contract.price_amount != null
                          ? `$${Number(contract.price_amount).toLocaleString()}`
                          : "—"}
                      </p>
                      {contract.payment_method && (
                        <p>
                          <span className="font-medium">Payment:</span> {contract.payment_method}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Recent Activities</h2>
          <Button variant="outline" size="sm" className="text-sm" onClick={() => handleNavigate("trips")}>
            View All Trips
          </Button>
        </div>
        <Card className="p-4">
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity yet.</p>
            ) : (
              recentActivities.map((activity) => {
                const info = activityMeta(activity);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => info.nav && handleNavigate(info.nav)}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${info.bgColor}`}
                    >
                      <info.Icon className={`w-5 h-5 ${info.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{info.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTimeAgo(activity.created_at)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Emergency Popup */}
      {showEmergencyPopup && activeTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowEmergencyPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Emergency Call</h2>
              <p className="text-sm text-gray-600">Need immediate assistance? Call emergency support.</p>
            </div>
            <div className="space-y-3 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Trip ID</p>
                <p className="text-sm font-medium">{activeTrip.id}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Current Location</p>
                <p className="text-sm font-medium">{activeTrip.current_location || activeTrip.route || "—"}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Emergency Hotline</p>
                <p className="text-lg font-medium text-red-600">1-800-LIVESTOCK</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowEmergencyPopup(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  toast.success("Connecting to emergency support...");
                  setShowEmergencyPopup(false);
                }}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Now
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Expenses Modal */}
      {showAddExpensesModal && activeTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setShowAddExpensesModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">Add Trip Expenses</h2>
              <p className="text-sm text-gray-600">Record expenses for {activeTrip.id}</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(["fuel", "maintenance", "tolls", "driver", "insurance", "other"] as const).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-2 capitalize">{key}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        className="w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#53ca97]"
                        placeholder="0"
                        value={expenseFormData[key] || ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          setExpenseFormData((prev) => ({ ...prev, [key]: v }));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Expenses</span>
                  <span className="text-xl font-medium text-[#53ca97]">
                    ${Object.values(expenseFormData).reduce((s, v) => s + v, 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddExpensesModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#53ca97] hover:bg-[#45b886] text-white"
                  onClick={() => {
                    toast.success("Expenses recorded. Submit via trip detail when ready.");
                    setExpenseFormData({
                      fuel: 0,
                      maintenance: 0,
                      tolls: 0,
                      driver: 0,
                      insurance: 0,
                      other: 0,
                    });
                    setShowAddExpensesModal(false);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expenses
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
