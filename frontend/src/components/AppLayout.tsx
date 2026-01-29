import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import {
  Menu,
  ChevronLeft,
  Truck,
  MapPin,
  DollarSign,
  Users,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  LayoutDashboard,
  Package,
  Calendar,
  Shield,
  BarChart3,
  Wrench,
  ShoppingCart,
  MessageSquare,
  Briefcase,
  Plus,
  ChevronDown,
  Inbox,
  Route,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsCenter } from "./NotificationsCenter";
import logo from "../assets/livestockway-logo.svg";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { SubscriptionCTA } from "./SubscriptionCTA";
import { useHaulerSubscription } from "../hooks/useHaulerSubscription";
import {
  fetchBookings,
  fetchContracts,
  fetchShipperOfferCount,
  fetchHaulerOfferSummaries,
} from "../api/marketplace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { CreateTripModal } from "./CreateTripModal";

interface AppLayoutProps {
  children: React.ReactNode;
  userRole: 'hauler' | 'shipper' | 'stakeholder' | 'driver' | 'super-admin';
  onLogout: () => void;
}

export function AppLayout({ children, userRole, onLogout }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [haulerBookingCount, setHaulerBookingCount] = useState(0);
  const [haulerUnreadCount, setHaulerUnreadCount] = useState(0);
  const [createTripModalOpen, setCreateTripModalOpen] = useState(false);
  const [haulerContractCount, setHaulerContractCount] = useState(0);
  const [shipperOfferCount, setShipperOfferCount] = useState(0);
  const [shipperContractCount, setShipperContractCount] = useState(0);
  const accountMode = storage.get<string>(STORAGE_KEYS.ACCOUNT_MODE, 'COMPANY');
  const {
    isIndividualHauler,
    subscriptionStatus,
    freeTripUsed,
    monthlyPrice,
    yearlyPrice,
    planCode,
    needsPayment,
  } =
    useHaulerSubscription();

  const roleConfig = {
    hauler: {
      color: '#29CA8D',
      label: 'Hauler',
      routes: [
        { path: '/hauler/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/hauler/truck-listings', icon: Truck, label: 'My Listing' },
        { path: '/hauler/messages', icon: Inbox, label: 'Messages' },
        { path: '/hauler/contracts', icon: FileText, label: 'Contracts' },
        // { path: '/hauler/my-loads', icon: ClipboardList, label: 'My Loads' },
        { path: '/hauler/fleet', icon: Truck, label: 'My Fleet' },
        { path: '/hauler/trips', icon: MapPin, label: 'My Trips' },
        { path: '/hauler/earnings', icon: DollarSign, label: 'Earnings' },
        { path: '/hauler/team', icon: Users, label: 'Team' },
        { path: '/hauler/marketplace', icon: ShoppingCart, label: 'Marketplace' },
        { path: '/hauler/documents', icon: FileText, label: 'Documents' },
      ],
    },
    shipper: {
      color: '#F97316',
      label: 'Shipper',
      routes: [
        { path: '/shipper/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/shipper/my-loads', icon: Package, label: 'My Listing' },
        { path: '/shipper/messages', icon: Inbox, label: 'Messages' },
        { path: '/shipper/contracts', icon: FileText, label: 'Contracts' },
        { path: '/shipper/trips', icon: MapPin, label: 'My Trips' },
        { path: '/shipper/payments', icon: DollarSign, label: 'Payments' },
        { path: '/shipper/documents', icon: FileText, label: 'Documents' },
        { path: '/shipper/marketplace', icon: ShoppingCart, label: 'Marketplace' },
      ],
    },
    stakeholder: {
      color: '#6B7280',
      label: 'Service Provider',
      routes: [
        { path: '/stakeholder/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/stakeholder/services', icon: Wrench, label: 'My Services' },
        { path: '/stakeholder/my-listings', icon: Package, label: 'My Listing' },
        { path: '/stakeholder/messages', icon: Inbox, label: 'Messages' },
        { path: '/stakeholder/bookings', icon: Calendar, label: 'Bookings' },
        { path: '/stakeholder/marketplace', icon: ShoppingCart, label: 'Marketplace' },
        { path: '/stakeholder/earnings', icon: DollarSign, label: 'Earnings' },
        { path: '/stakeholder/documents', icon: FileText, label: 'Documents' },
      ],
    },
    driver: {
      color: '#29CA8D',
      label: 'Driver',
      routes: [
        { path: '/driver/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/driver/trips', icon: MapPin, label: 'My Trips' },
        { path: '/driver/expenses', icon: DollarSign, label: 'Expenses' },
        { path: '/driver/documents', icon: FileText, label: 'Documents' },
      ],
    },
    'super-admin': {
      color: '#172039',
      label: 'Super Admin',
      routes: [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/users', icon: Users, label: 'Users' },
        { path: '/admin/approvals', icon: Shield, label: 'Approvals' },
        { path: '/admin/pricing', icon: DollarSign, label: 'Pricing' },
        { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/admin/marketplace', icon: ShoppingCart, label: 'Marketplace' },
        { path: '/admin/support', icon: HelpCircle, label: 'Support' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
      ],
    },
  };

  useEffect(() => {
    let isMounted = true;

    const loadHaulerUnreadCount = async () => {
      if (userRole !== 'hauler') return;
      try {
        const resp = await fetchHaulerOfferSummaries();
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem("haulerOfferLastSeen")
            : null;
        let lastSeenMap: Record<string, string> = {};
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === "object") {
              lastSeenMap = parsed;
            }
          } catch {
            lastSeenMap = {};
          }
        }
        const unreadCount = resp.items.filter((item) => {
          if (!item.offer_id || !item.last_message_at) return false;
          const lastSeen = lastSeenMap[item.offer_id];
          if (!lastSeen) return true;
          return (
            new Date(item.last_message_at).getTime() >
            new Date(lastSeen).getTime()
          );
        }).length;
        if (isMounted) setHaulerUnreadCount(unreadCount);
      } catch {
        if (isMounted) setHaulerUnreadCount(0);
      }
    };

    loadHaulerUnreadCount();
    return () => {
      isMounted = false;
    };
  }, [userRole, location.pathname]);

  useEffect(() => {
    let isMounted = true;

    const loadBookingsCount = async () => {
      if (userRole !== 'hauler') return;
      try {
        const [bookingResp, contractResp] = await Promise.all([
          fetchBookings(),
          fetchContracts(),
        ]);
        const requestedCount = bookingResp.items.filter(
          (booking) => (booking.status ?? '').toUpperCase() === 'REQUESTED'
        ).length;
        const contractCount = contractResp.items.filter(
          (contract) => (contract.status ?? '').toUpperCase() === 'SENT'
        ).length;
        if (isMounted) {
          setHaulerBookingCount(requestedCount);
          setHaulerContractCount(contractCount);
        }
      } catch {
        if (isMounted) {
          setHaulerBookingCount(0);
          setHaulerContractCount(0);
        }
      }
    };

    loadBookingsCount();
    return () => {
      isMounted = false;
    };
  }, [userRole, location.pathname]);

  useEffect(() => {
    let isMounted = true;

    const loadOfferCount = async () => {
      if (userRole !== 'shipper') return;
      try {
        const unread = storage.get<number>(STORAGE_KEYS.SHIPPER_OFFERS_UNREAD, 0);
        if (unread > 0) {
          if (isMounted) setShipperOfferCount(unread);
          return;
        }
        const resp = await fetchShipperOfferCount();
        if (isMounted) setShipperOfferCount(Number(resp.count ?? 0));
      } catch {
        if (isMounted) setShipperOfferCount(0);
      }
    };

    loadOfferCount();
    return () => {
      isMounted = false;
    };
  }, [userRole, location.pathname]);

  useEffect(() => {
    if (userRole !== 'shipper') return;
    const syncUnread = () => {
      const unread = storage.get<number>(STORAGE_KEYS.SHIPPER_OFFERS_UNREAD, 0);
      if (unread > 0) {
        setShipperOfferCount(unread);
      }
    };
    syncUnread();
    window.addEventListener('shipper-offers-unread', syncUnread);
    return () => {
      window.removeEventListener('shipper-offers-unread', syncUnread);
    };
  }, [userRole]);

  useEffect(() => {
    let isMounted = true;

    const loadContractCount = async () => {
      if (userRole !== 'shipper') return;
      try {
        const resp = await fetchContracts();
        const count = resp.items.filter((contract) =>
          ['DRAFT', 'SENT'].includes((contract.status ?? '').toUpperCase())
        ).length;
        if (isMounted) setShipperContractCount(count);
      } catch {
        if (isMounted) setShipperContractCount(0);
      }
    };

    loadContractCount();
    return () => {
      isMounted = false;
    };
  }, [userRole, location.pathname]);

  const config = roleConfig[userRole];
  const routes =
    userRole === 'hauler' && accountMode === 'INDIVIDUAL'
      ? config.routes.filter(
          (route) => route.path !== '/hauler/team'
        )
      : config.routes;
  const userName = storage.get(STORAGE_KEYS.USER_NAME, 'User');
  const userEmail =
    storage.get(STORAGE_KEYS.USER_EMAIL, storage.get(STORAGE_KEYS.USER_PHONE, ''));

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      onLogout();
      navigate('/');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside 
        className={`
          fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
          transition-all duration-300 z-40
          ${isSidebarOpen ? 'w-64' : 'w-20'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            {isSidebarOpen && (
              <Link to="/" className="flex items-center gap-2">
                <img src={logo} alt="LivestockWay" className="h-8" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="ml-auto"
            >
              {isSidebarOpen ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Role Badge */}
          {isSidebarOpen && (
            <div className="p-4">
              <div 
                className="px-3 py-2 rounded-lg text-sm text-white"
                style={{ backgroundColor: config.color }}
              >
                {config.label}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {/* Post a Dropdown - For Hauler, Shipper, and Stakeholder */}
              {(userRole === 'hauler' || userRole === 'shipper' || userRole === 'stakeholder') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`
                        w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                        bg-primary text-primary-foreground hover:bg-primary/90
                        ${!isSidebarOpen && 'justify-center'}
                      `}
                    >
                      <Plus className="w-5 h-5 flex-shrink-0" />
                      {isSidebarOpen && (
                        <>
                          <span>Post a</span>
                          <ChevronDown className="w-4 h-4 ml-auto" />
                        </>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {userRole === 'shipper' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => {
                            navigate('/shipper/dashboard');
                            // Trigger PostLoadDialog after navigation
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('open-post-load-dialog'));
                            }, 100);
                          }}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Post a Load
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/shipper/post-job')}
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          Post a Job
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/shipper/post-buy-sell')}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Post Buy & Sell
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/shipper/post-resource')}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Post a Resource
                        </DropdownMenuItem>
                      </>
                    )}
                    {userRole === 'hauler' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => navigate('/hauler/fleet')}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Post a Fleet
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            navigate('/hauler/truck-listings');
                            // Trigger PostTruckDialog - we'll use a custom event
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('open-post-truck-dialog'));
                            }, 100);
                          }}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Post a Truck
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/hauler/post-job')}
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          Post a Job
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/hauler/post-buy-sell')}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Post Buy & Sell
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/hauler/post-resource')}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Post a Resource
                        </DropdownMenuItem>
                      </>
                    )}
                    {userRole === 'stakeholder' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => navigate('/stakeholder/post-job')}
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          Post a Job
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/stakeholder/post-buy-sell')}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Post Buy & Sell
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/stakeholder/post-resource')}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Post a Resource
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Create New Trip Button - For Haulers Only */}
              {userRole === 'hauler' && (
                <button
                  onClick={() => setCreateTripModalOpen(true)}
                  className={`
                    w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    text-sm font-medium
                    bg-primary text-white hover:bg-[#45b887] active:bg-[#3da575]
                    shadow-sm hover:shadow-md
                    ${!isSidebarOpen && 'justify-center'}
                  `}
                  title="Create New Trip"
                >
                  <Route className="w-5 h-5 flex-shrink-0" />
                  {isSidebarOpen && <span>Create New Trip</span>}
                </button>
              )}

              {routes.map((route) => {
                const Icon = route.icon;
                const showBookingBadge =
                  userRole === 'hauler' &&
                  route.path === '/hauler/bookings' &&
                  haulerBookingCount > 0;
                const showHaulerOfferBadge =
                  userRole === 'hauler' &&
                  route.path === '/hauler/offers' &&
                  haulerUnreadCount > 0;
                const showHaulerContractBadge =
                  userRole === 'hauler' &&
                  route.path === '/hauler/contracts' &&
                  haulerContractCount > 0;
                const showOfferBadge =
                  userRole === 'shipper' &&
                  route.path === '/shipper/offers' &&
                  shipperOfferCount > 0;
                const showContractBadge =
                  userRole === 'shipper' &&
                  route.path === '/shipper/contracts' &&
                  shipperContractCount > 0;
                return (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    className={({ isActive }) =>
                      [
                        "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
                        !isSidebarOpen && "justify-center",
                      ].join(" ")
                    }
                    data-testid={`nav-${route.path.replace(/[\\/]/g, "-")}`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {isSidebarOpen && <span>{route.label}</span>}
                    {showBookingBadge &&
                      (isSidebarOpen ? (
                        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                          {haulerBookingCount}
                        </span>
                      ) : (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                      ))}
                    {showHaulerOfferBadge &&
                      (isSidebarOpen ? (
                        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                          {haulerUnreadCount}
                        </span>
                      ) : (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                      ))}
                    {showHaulerContractBadge &&
                      (isSidebarOpen ? (
                        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                          {haulerContractCount}
                        </span>
                      ) : (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                      ))}
                    {showOfferBadge &&
                      (isSidebarOpen ? (
                        <span className="ml-auto rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
                          {shipperOfferCount}
                        </span>
                      ) : (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
                      ))}
                    {showContractBadge &&
                      (isSidebarOpen ? (
                        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                          {shipperContractCount}
                        </span>
                      ) : (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                      ))}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <Separator />

          {/* Bottom Actions */}
          <div className="p-2 space-y-1">
            <Link
              to={`/${userRole === 'super-admin' ? 'admin' : userRole}/settings`}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800
                ${!isSidebarOpen && 'justify-center'}
              `}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>Settings</span>}
            </Link>

            <Link
              to={`/${userRole === 'super-admin' ? 'admin' : userRole}/support`}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800
                ${!isSidebarOpen && 'justify-center'}
              `}
            >
              <HelpCircle className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>Support</span>}
            </Link>

            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950
                ${!isSidebarOpen && 'justify-center'}
              `}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>

          {/* User Profile */}
          {isSidebarOpen && (
            <>
              <Separator />
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback style={{ backgroundColor: config.color, color: 'white' }}>
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Create Trip Modal */}
      {userRole === 'hauler' && (
        <CreateTripModal
          open={createTripModalOpen}
          onOpenChange={setCreateTripModalOpen}
          onTripCreated={() => {
            setCreateTripModalOpen(false);
            // Refresh trips if on trips page
            if (location.pathname.includes('/trips')) {
              window.location.reload();
            } else {
              navigate('/hauler/trips');
            }
          }}
        />
      )}

      {/* Main Content */}
      <div 
        className={`
          flex-1 flex flex-col transition-all duration-300
          ${isSidebarOpen ? 'ml-64' : 'ml-20'}
        `}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl text-gray-900 dark:text-gray-100">
                {config.routes.find(r => isActiveRoute(r.path))?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Board Dropdown - For Hauler, Shipper, and Stakeholder */}
              {(userRole === 'hauler' || userRole === 'shipper' || userRole === 'stakeholder') && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                      >
                        <Briefcase className="w-4 h-4" />
                        <span>Boards</span>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {userRole === 'hauler' && (
                        <>
                          <DropdownMenuItem onClick={() => navigate('/hauler/loadboard')}>
                            <Package className="w-4 h-4 mr-2" />
                            Loadboard
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/hauler/job-board')}>
                            <Briefcase className="w-4 h-4 mr-2" />
                            Job Board
                          </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/hauler/buy-sell-board')}>
                          <DollarSign className="w-4 h-4 mr-2" />
                          Buy & Sell Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/hauler/resources-board')}>
                          <Wrench className="w-4 h-4 mr-2" />
                          Resources Board
                        </DropdownMenuItem>
                      </>
                    )}
                    {userRole === 'shipper' && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/shipper/truck-board')}>
                          <Truck className="w-4 h-4 mr-2" />
                          Truck Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/shipper/job-board')}>
                          <Briefcase className="w-4 h-4 mr-2" />
                          Job Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/shipper/buy-sell-board')}>
                          <DollarSign className="w-4 h-4 mr-2" />
                          Buy & Sell Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/shipper/resources-board')}>
                          <Wrench className="w-4 h-4 mr-2" />
                          Resources Board
                        </DropdownMenuItem>
                      </>
                    )}
                    {userRole === 'stakeholder' && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/stakeholder/job-board')}>
                          <Briefcase className="w-4 h-4 mr-2" />
                          Job Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/stakeholder/buy-sell-board')}>
                          <DollarSign className="w-4 h-4 mr-2" />
                          Buy & Sell Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/stakeholder/resources-board')}>
                          <Wrench className="w-4 h-4 mr-2" />
                          Resources Board
                        </DropdownMenuItem>
                      </>
                    )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 z-50">
                    <NotificationsCenter 
                      userRole={userRole}
                      onClose={() => setShowNotifications(false)}
                    />
                  </div>
                )}
              </div>

              {/* User Avatar (Mobile) */}
              <div className="lg:hidden">
                <Avatar>
                  <AvatarFallback style={{ backgroundColor: config.color, color: 'white' }}>
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 space-y-4">
            {userRole === 'hauler' &&
              isIndividualHauler &&
              (subscriptionStatus ?? '').toUpperCase() !== 'ACTIVE' && (
                <SubscriptionCTA
                  variant={freeTripUsed || needsPayment ? 'BLOCKED_UPGRADE' : 'INFO_FREE_TRIP'}
                  monthlyPrice={monthlyPrice ?? undefined}
                  yearlyPrice={yearlyPrice ?? undefined}
                  onUpgradeClick={() =>
                    navigate(needsPayment || planCode === 'PAID' ? '/hauler/payment' : '/hauler/subscription')
                  }
                />
              )}
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Create Trip Modal */}
      {userRole === 'hauler' && (
        <CreateTripModal
          open={createTripModalOpen}
          onOpenChange={setCreateTripModalOpen}
          onTripCreated={() => {
            setCreateTripModalOpen(false);
            // Refresh trips if on trips page
            if (location.pathname.includes('/trips')) {
              window.location.reload();
            } else {
              navigate('/hauler/trips');
            }
          }}
        />
      )}
    </div>
  );
}
