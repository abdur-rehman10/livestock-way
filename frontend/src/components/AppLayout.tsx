import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { swalConfirm } from "../lib/swal";
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
  Briefcase,
  Plus,
  ChevronDown,
  Inbox,
  Calculator,
  Fuel,
  Gauge,
  Wallet,
  FileStack,
  UserCog,
  Heart,
  ClipboardCheck,
  FolderOpen,
  MessageSquare,
  Bookmark,
  CheckCircle,
  User,
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

  type SidebarRoute = { path: string; icon: typeof LayoutDashboard; label: string };
  type SidebarSection = SidebarRoute[];

  const roleConfig: Record<string, {
    color: string;
    label: string;
    sections: SidebarSection[];
  }> = {
    hauler: {
      color: '#29CA8D',
      label: 'Hauler',
      sections: [
        // Main menu
        [
          { path: '/hauler/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/hauler/trips', icon: Truck, label: 'My Trips' },
          { path: '/hauler/contracts', icon: FileText, label: 'My Contracts' },
          { path: '/hauler/truck-listings', icon: Package, label: 'My Listings' },
          { path: '/hauler/earnings', icon: Wallet, label: 'Payments' },
          { path: '/hauler/messages', icon: MessageSquare, label: 'Messenger' },
        ],
        // Fleet section
        [
          { path: '/hauler/fleet', icon: Truck, label: accountMode === 'COMPANY' ? 'Fleet Management' : 'My Fleet' },
          ...(accountMode === 'COMPANY' ? [{ path: '/hauler/team', icon: Users, label: 'Driver Management' }] : []),
          { path: '/hauler/weight-calculator', icon: Calculator, label: 'Weight Calculator' },
        ],
        // Monitors section
        [
          { path: '/hauler/compliance', icon: Shield, label: 'Compliance Monitor' },
          { path: '/hauler/fuel', icon: Fuel, label: 'Fuel Monitor' },
          { path: '/hauler/performance', icon: Gauge, label: 'Performance Monitor' },
        ],
        // Bottom section
        [
          { path: '/hauler/finance', icon: DollarSign, label: 'Finance' },
          ...(accountMode === 'COMPANY' ? [{ path: '/hauler/hr', icon: UserCog, label: 'HR Management' }] : []),
          { path: '/hauler/documents', icon: FileStack, label: 'Documents' },
        ],
      ],
    },
    shipper: {
      color: '#F97316',
      label: 'Shipper',
      sections: [
        // Main menu
        [
          { path: '/shipper/dashboard', icon: Package, label: 'Dashboard' },
          { path: '/shipper/trips', icon: Truck, label: 'My Trips' },
          { path: '/shipper/contracts', icon: FileText, label: 'My Contracts' },
          { path: '/shipper/my-loads', icon: Package, label: 'My Listings' },
          { path: '/shipper/payments', icon: DollarSign, label: 'Payments' },
          { path: '/shipper/messages', icon: MessageSquare, label: 'Messages' },
        ],
        // Welfare & compliance section
        [
          { path: '/shipper/welfare', icon: Heart, label: 'Welfare & Compliance' },
          { path: '/shipper/checklists', icon: ClipboardCheck, label: 'Pre-Journey Checklists' },
          { path: '/shipper/grouping', icon: Users, label: 'Animal Grouping' },
          { path: '/shipper/documents', icon: FolderOpen, label: 'Documents' },
        ],
      ],
    },
    stakeholder: {
      color: '#6B7280',
      label: 'Service Provider',
      sections: [
        [
          { path: '/stakeholder/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/stakeholder/services', icon: Wrench, label: 'My Services' },
          { path: '/stakeholder/my-listings', icon: Package, label: 'My Listing' },
          { path: '/stakeholder/messages', icon: Inbox, label: 'Messages' },
          { path: '/stakeholder/bookings', icon: Calendar, label: 'Bookings' },
          { path: '/stakeholder/marketplace', icon: ShoppingCart, label: 'Marketplace' },
          { path: '/stakeholder/earnings', icon: DollarSign, label: 'Earnings' },
          { path: '/stakeholder/documents', icon: FileText, label: 'Documents' },
        ],
      ],
    },
    driver: {
      color: '#29CA8D',
      label: 'Driver',
      sections: [
        [
          { path: '/driver/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/driver/trips', icon: MapPin, label: 'My Trips' },
          { path: '/driver/expenses', icon: DollarSign, label: 'Expenses' },
          { path: '/driver/documents', icon: FileText, label: 'Documents' },
        ],
      ],
    },
    'super-admin': {
      color: '#172039',
      label: 'Super Admin',
      sections: [
        [
          { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/admin/users', icon: Users, label: 'Users' },
          { path: '/admin/approvals', icon: Shield, label: 'Approvals' },
          { path: '/admin/pricing', icon: DollarSign, label: 'Pricing' },
          { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
          { path: '/admin/marketplace', icon: ShoppingCart, label: 'Marketplace' },
          { path: '/admin/support', icon: HelpCircle, label: 'Support' },
          { path: '/admin/settings', icon: Settings, label: 'Settings' },
        ],
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
  const allRoutes = config.sections.flat();
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

  const handleLogout = async () => {
    const confirmed = await swalConfirm({
      title: 'Logout',
      text: 'Are you sure you want to logout?',
      confirmText: 'Yes, logout',
      icon: 'question',
      confirmColor: '#ef4444',
    });
    if (confirmed) {
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

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {/* Create New Trip Button - For Haulers Only (above Post a) */}
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
                  <Truck className="w-5 h-5 flex-shrink-0" />
                  {isSidebarOpen && <span className="font-semibold">+ Create Trip</span>}
                </button>
              )}

              {/* Post a Dropdown - For Hauler, Shipper, and Stakeholder */}
              {(userRole === 'hauler' || userRole === 'shipper' || userRole === 'stakeholder') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`
                        w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                        ${userRole === 'hauler'
                          ? 'border-2 border-primary text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-primary hover:text-white'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'}
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
                          Load
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/shipper/post-job')}
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          Job
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/shipper/post-buy-sell')}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Buy & Sell
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/shipper/post-resource')}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Resource
                        </DropdownMenuItem>
                      </>
                    )}
                    {userRole === 'hauler' && (
                      <>
                        {/* <DropdownMenuItem
                          onClick={() => navigate('/hauler/fleet')}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Post a Fleet
                        </DropdownMenuItem> */}
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
                          Truck / Route
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/hauler/post-job')}
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                        Job
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/hauler/post-buy-sell')}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Buy & Sell
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/hauler/post-resource')}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Resource
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

              {config.sections.map((section, sIdx) => (
                <div key={sIdx}>
                  {sIdx > 0 && <div className="border-t border-gray-200 dark:border-gray-700 my-2" />}
                  <div className="space-y-2">
                    {section.map((route) => {
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
                </div>
              ))}
            </div>
          </nav>

          <Separator />

          {/* Bottom Actions */}
          <div className="p-2 space-y-2">
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
        {/* Top Bar - aligned with Header.tsx reference */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-3 md:px-6 py-3">
            {/* LEFT: Page title + Role badge */}
            <div className="flex items-center gap-3">
              {/* Role Badge (static, no dropdown) */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg"
                style={{ borderColor: config.color }}
              >
                <User className="w-4 h-4" style={{ color: config.color }} />
                <span className="capitalize" style={{ color: config.color }}>
                  {userRole === 'stakeholder' ? 'Resource Provider'
                    : userRole === 'hauler' && accountMode === 'COMPANY' ? 'Enterprise Hauler'
                    : userRole === 'hauler' ? 'Independent Hauler'
                    : userRole === 'super-admin' ? 'Super Admin'
                    : config.label}
                </span>
              </div>
            </div>

            {/* RIGHT: Navigation and Actions */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Boards Dropdown */}
              {(userRole === 'hauler' || userRole === 'shipper' || userRole === 'stakeholder') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border-2 rounded-lg transition-colors"
                      style={{ borderColor: '#53ca97', color: '#000000', backgroundColor: 'white' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#53ca97'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#000000'; }}
                    >
                      Boards
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {userRole === 'hauler' && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/hauler/loadboard')}>
                          <Package className="w-4 h-4 mr-2" />
                          Load Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/hauler/truck-board')}>
                          <Truck className="w-4 h-4 mr-2" />
                          Truck Board
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/hauler/job-board')}>
                          <Briefcase className="w-4 h-4 mr-2" />
                          Job Board
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
                        <DropdownMenuItem onClick={() => navigate('/stakeholder/resources-board')}>
                          <Wrench className="w-4 h-4 mr-2" />
                          Resources Board
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Resources Dropdown */}
              {(userRole === 'hauler' || userRole === 'shipper' || userRole === 'stakeholder') && (
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-colors"
                      style={{ backgroundColor: '#53ca97' }}
                      onClick={() => navigate(`/${userRole}/resources-board`)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#48b587'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#53ca97'; }}
                    >
                      Resources
                    </button>
              )}

              {/* Buy & Sell */}
              {(userRole === 'hauler' || userRole === 'shipper' || userRole === 'stakeholder') && (
                <button
                  className="px-4 py-2 text-sm rounded-lg text-white transition-colors"
                  style={{ backgroundColor: '#53ca97' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#48b587'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#53ca97'; }}
                  onClick={() => navigate(`/${userRole}/buy-sell-board`)}
                >
                  Buy & Sell
                </button>
              )}

              {/* Saved / Bookmark */}
              <button
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                onClick={() => {
                  const base = userRole === 'super-admin' ? 'admin' : userRole;
                  navigate(`/${base}/dashboard`);
                }}
                title="Saved"
              >
                <Bookmark className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <div className="relative">
                <button
                  className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#53ca97' }}
                  />
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 z-50">
                    <NotificationsCenter
                      userRole={userRole}
                      onClose={() => setShowNotifications(false)}
                    />
                  </div>
                )}
              </div>

              {/* Profile */}
              <Link
                to={`/${userRole === 'super-admin' ? 'admin' : userRole}/settings`}
                className="flex items-center gap-2 md:gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 md:px-3 py-2 transition-colors"
              >
                <div className="text-right hidden md:block">
                  <div className="flex items-center gap-1 justify-end">
                    <CheckCircle className="w-4 h-4" style={{ color: '#53ca97' }} />
                  </div>
                </div>
                <Avatar className="w-8 h-8 md:w-10 md:h-10">
                  <AvatarFallback style={{ backgroundColor: config.color, color: 'white' }}>
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </Link>
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
