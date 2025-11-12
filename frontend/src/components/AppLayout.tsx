import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import {
  Menu,
  X,
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
  Search,
  LayoutDashboard,
  Package,
  Calendar,
  Shield,
  BarChart3,
  Wrench,
  ShoppingCart,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsCenter } from "./NotificationsCenter";
import logo from "../assets/livestockway-logo.svg";
import { storage, STORAGE_KEYS } from "../lib/storage";

interface AppLayoutProps {
  children: React.ReactNode;
  userRole: 'hauler' | 'shipper' | 'stakeholder' | 'driver' | 'super-admin';
  onLogout: () => void;
}

export function AppLayout({ children, userRole, onLogout }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const roleConfig = {
    hauler: {
      color: '#29CA8D',
      label: 'Hauler',
      routes: [
        { path: '/hauler/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/hauler/loadboard', icon: Package, label: 'Loadboard' },
        { path: '/hauler/fleet', icon: Truck, label: 'Fleet' },
        { path: '/hauler/trips', icon: MapPin, label: 'Trips' },
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
        { path: '/shipper/loads', icon: Package, label: 'My Loads' },
        { path: '/shipper/loadboard', icon: Search, label: 'Find Carriers' },
        { path: '/shipper/trips', icon: MapPin, label: 'Track Shipments' },
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
        { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/admin/marketplace', icon: ShoppingCart, label: 'Marketplace' },
        { path: '/admin/support', icon: HelpCircle, label: 'Support' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
      ],
    },
  };

  const config = roleConfig[userRole];
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
              {config.routes.map((route) => {
                const Icon = route.icon;
                const isActive = isActiveRoute(route.path);
                
                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                      ${!isSidebarOpen && 'justify-center'}
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {isSidebarOpen && <span>{route.label}</span>}
                  </Link>
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
              {/* Reset Demo Button */}
              <Button
                onClick={() => {
                  storage.clear();
                  window.location.reload();
                }}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                Reset Demo
              </Button>

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
          <div className="container mx-auto p-6">
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
    </div>
  );
}
