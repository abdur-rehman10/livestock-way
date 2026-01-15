import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import OnboardingWizard from './OnboardingWizard';
import SignupLogin from '../pages/SignupLogin';
import LandingPage from '../pages/LandingPage';
import { Verification } from './Verification';
import { ForgotPassword } from '../pages/ForgotPassword';
import { ShipperDashboard } from '../pages/ShipperDashboard';
import { DriverDashboard } from '../pages/DriverDashboard';
import { HaulerDashboard } from '../pages/HaulerDashboard';
import HaulerMyLoads from '../pages/HaulerMyLoads';
import StakeholderDashboard from '../pages/StakeholderDashboard';
import StakeholderServices from '../pages/StakeholderServices';
import { SuperAdminDashboard } from '../pages/SuperAdminDashboard';
import { AppLayout } from './AppLayout';
import { Loadboard } from '../pages/Loadboard';
import TruckBoard from '../pages/TruckBoard';
import HaulerTruckListings from '../pages/HaulerTruckListings';
import { FleetManagement } from '../pages/FleetManagement';
import { TeamManagement } from './TeamManagement';
import WalletTab from '../pages/WalletTab';
import { DocumentsTab } from '../pages/DocumentsTab';
import { MarketplaceTab } from '../pages/MarketplaceTab';
import MyLoadsTab from '../pages/MyLoadsTab';
import TripDetail from '../pages/TripDetail';
import { TripsTab } from '../pages/TripsTab';
import TripTracking from '../pages/TripTracking';
import TripChat from '../pages/TripChat';
import HaulerBookingsTab from '../pages/HaulerBookingsTab';
import HaulerOffersTab from '../pages/HaulerOffersTab';
import HaulerContractsTab from '../pages/HaulerContractsTab';
import SuperAdminLogin from '../pages/SuperAdminLogin';
import { ExpensesTab } from '../pages/ExpensesTab';
import SupportTab from '../pages/SupportTab';
import { ProfileSettings } from '../pages/ProfileSettings';
import { KeyboardShortcutsDialog } from '../pages/KeyboardShortcutsDialog';
import { OfflineIndicator } from './OfflineIndicator';
import PostService from '../pages/PostService';
import TripRoutePlan from '../pages/TripRoutePlan';
import { Toaster } from './ui/sonner';
import { storage, STORAGE_KEYS, getPreferences, updatePreferences } from '../lib/storage';
import { toast } from 'sonner';
import { NotFound } from '../pages/ErrorPages';
import MarketplaceDevLab from '../pages/MarketplaceDevLab';
import AdminPricing from '../pages/AdminPricing';
import HaulerSubscription from '../pages/HaulerSubscription';
import AdminSubscriptions from '../pages/AdminSubscriptions';
import HaulerPayment from '../pages/HaulerPayment';
import ShipperOffersTab from '../pages/ShipperOffersTab';
import ShipperContractsTab from '../pages/ShipperContractsTab';
import PostJob from '../pages/PostJob';
import JobBoard from '../pages/JobBoard';
import JobMessages from '../pages/JobMessages';
import PostBuyAndSell from '../pages/PostBuyAndSell';
import BuyAndSellBoard from '../pages/BuyAndSellBoard';
import PostResource from '../pages/PostResource';
import ResourcesBoard from '../pages/ResourcesBoard';

type UserRole = 'shipper' | 'driver' | 'hauler' | 'stakeholder' | 'super-admin' | null;
type LandingRole = 'hauler' | 'shipper' | 'stakeholder';

interface AppRouterProps {
  showKeyboardShortcuts: boolean;
  onKeyboardShortcutsToggle: (open: boolean) => void;
}

export function AppRouter({ showKeyboardShortcuts, onKeyboardShortcutsToggle }: AppRouterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const savedRole = storage.get<UserRole>(STORAGE_KEYS.USER_ROLE, null);
  const savedLandingRole = storage.get<LandingRole | null>(STORAGE_KEYS.LANDING_ROLE, null);
  const [userRole, setUserRole] = useState<UserRole>(savedRole);
  const [isAuthenticated, setIsAuthenticated] = useState(!!savedRole);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole>(null);
  const [verificationContact, setVerificationContact] = useState('');
  const [selectedLandingRole, setSelectedLandingRole] = useState<LandingRole | null>(savedLandingRole);

  // Load auth state
  useEffect(() => {
    const savedRole = storage.get<UserRole>(STORAGE_KEYS.USER_ROLE, null);
    
    if (savedRole) {
      setUserRole(savedRole);
      setIsAuthenticated(true);
      
      // Check if user completed onboarding
      const prefs = getPreferences();
      setNeedsOnboarding(prefs.showOnboarding && 
        (savedRole === 'hauler' || savedRole === 'shipper' || savedRole === 'stakeholder'));
    }
  }, []);

  // Handlers
  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
    storage.set(STORAGE_KEYS.USER_ROLE, role);
    setSelectedLandingRole(null);
    storage.remove(STORAGE_KEYS.LANDING_ROLE);
    
    // Check if needs onboarding
    const hasOnboardingWizard = role === 'hauler' || role === 'shipper' || role === 'stakeholder';
    const prefs = getPreferences();
    
    if (hasOnboardingWizard && prefs.showOnboarding) {
      setNeedsOnboarding(true);
      navigate('/onboarding');
    } else {
      setNeedsOnboarding(false);
      // Navigate to dashboard
      const dashboardPath = role === 'super-admin' ? '/admin/dashboard' : `/${role}/dashboard`;
      navigate(dashboardPath);
    }
    
    toast.success(`Logged in as ${role}`);
  };

  const handleNeedVerification = (contact: string, role: UserRole) => {
    setVerificationContact(contact);
    setPendingRole(role);
    storage.set(STORAGE_KEYS.USER_EMAIL, contact);
    storage.set('pendingRole', role);
    navigate('/verification');
  };

  const handleVerificationComplete = () => {
    if (pendingRole) {
      handleLogin(pendingRole);
    }
  };

  const handleLogout = () => {
    const nextPath = userRole === 'super-admin' ? '/admin/login' : '/';
    setIsAuthenticated(false);
    setUserRole(null);
    setNeedsOnboarding(false);
    storage.remove(STORAGE_KEYS.USER_ROLE);
    storage.remove(STORAGE_KEYS.USER_EMAIL);
    storage.remove(STORAGE_KEYS.USER_ID);
    storage.remove(STORAGE_KEYS.ACCOUNT_MODE);
    storage.remove(STORAGE_KEYS.INDIVIDUAL_PLAN_CODE);
    storage.remove('pendingRole');
    toast.success('Logged out successfully');
    
    // Navigate to landing page
    navigate(nextPath);
  };

  const handleRoleSwitch = (role: 'shipper' | 'driver') => {
    setUserRole(role);
    setIsAuthenticated(true);
    setNeedsOnboarding(false);
    storage.set(STORAGE_KEYS.USER_ROLE, role);
    navigate(`/${role}/dashboard`);
    toast.success(`Switched to ${role} view`);
  };

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    updatePreferences({ showOnboarding: false });
    toast.success('Welcome to LivestockWay TMS!');
    
    // Navigate to dashboard
    if (userRole) {
      const dashboardPath = userRole === 'super-admin' ? '/admin/dashboard' : `/${userRole}/dashboard`;
      navigate(dashboardPath);
    }
  };

  const handleLandingRoleSelect = (role: LandingRole) => {
    setSelectedLandingRole(role);
    storage.set(STORAGE_KEYS.LANDING_ROLE, role);
  };

  // Protected Route Component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const isAdminPath = location.pathname.startsWith('/admin');
    if (!isAuthenticated || !userRole) {
      return <Navigate to={isAdminPath ? '/admin/login' : '/'} replace />;
    }

    if (isAdminPath && userRole !== 'super-admin') {
      return <Navigate to="/" replace />;
    }

    // Redirect to onboarding if needed
    if (needsOnboarding && location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
  };

  // Auth Route (redirect if already logged in)
  const AuthRoute = ({ children }: { children: React.ReactNode }) => {
    if (isAuthenticated && userRole && !needsOnboarding) {
      const path = userRole === 'super-admin' ? '/admin/dashboard' : `/${userRole}/dashboard`;
      return <Navigate to={path} replace />;
    }
    return <>{children}</>;
  };

  return (
    <>
      <OfflineIndicator />
      <Toaster position="top-right" />
      <KeyboardShortcutsDialog 
        open={showKeyboardShortcuts}
        onOpenChange={onKeyboardShortcutsToggle}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <AuthRoute>
            <LandingPage onSelectRole={handleLandingRoleSelect} />
          </AuthRoute>
        } />

        <Route path="/login" element={
          <AuthRoute>
            <SignupLogin 
              preselectedRole={selectedLandingRole ?? undefined}
              onAuth={handleLogin}
              onNeedVerification={handleNeedVerification}
            />
          </AuthRoute>
        } />

        <Route path="/dev/marketplace" element={<MarketplaceDevLab />} />

        <Route path="/job-board" element={<JobBoard />} />

        <Route path="/admin/login" element={
          <AuthRoute>
            <SuperAdminLogin onLoginSuccess={() => handleLogin('super-admin')} />
          </AuthRoute>
        } />

        <Route path="/verification" element={
          <Verification 
            contact={verificationContact}
            role={pendingRole}
            onVerified={handleVerificationComplete}
            onResend={() => toast.success('Code resent!')}
          />
        } />

        <Route path="/forgot-password" element={<ForgotPassword onBack={() => navigate(-1)} />} />

        {/* Onboarding Route */}
        <Route path="/onboarding" element={
          isAuthenticated && needsOnboarding ? (
            <OnboardingWizard 
              role={userRole as 'hauler' | 'shipper' | 'stakeholder'}
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingComplete}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } />

        {/* Hauler Routes */}
        <Route path="/hauler/*" element={
          <ProtectedRoute>
            {userRole === 'hauler' ? (
              <AppLayout userRole="hauler" onLogout={handleLogout}>
                <Routes>
                  <Route path="dashboard" element={<HaulerDashboard onLogout={handleLogout} />} />
                  <Route path="bookings" element={<HaulerBookingsTab />} />
                  <Route path="offers" element={<HaulerOffersTab />} />
                  <Route path="contracts" element={<HaulerContractsTab />} />
                  <Route path="my-loads" element={<HaulerMyLoads />} />
                  <Route path="loadboard" element={<Loadboard />} />
                  <Route path="truck-board" element={<TruckBoard />} />
                  <Route path="truck-listings" element={<HaulerTruckListings />} />
                  <Route path="messages" element={<JobMessages />} />
                  <Route path="post-job" element={<PostJob />} />
                  <Route path="job-board" element={<JobBoard />} />
                  <Route path="post-buy-sell" element={<PostBuyAndSell />} />
                  <Route path="buy-sell-board" element={<BuyAndSellBoard />} />
                  <Route path="post-resource" element={<PostResource />} />
                  <Route path="resources-board" element={<ResourcesBoard />} />
                  <Route path="fleet" element={<FleetManagement />} />
                  <Route path="trips" element={<TripsTab role="hauler" onViewTrip={() => toast.info('Trip view coming soon')} />} />
                  <Route path="trips/:id/route-plan" element={<TripRoutePlan />} />
                  <Route path="trips/:id" element={<TripDetail />} />
                  <Route path="trips/:id/tracking" element={<TripTracking />} />
                  <Route path="trips/:id/chat" element={<TripChat />} />
                  <Route path="earnings" element={<WalletTab />} />
                  <Route path="subscription" element={<HaulerSubscription />} />
                  <Route path="payment" element={<HaulerPayment />} />
                  <Route path="team" element={<TeamManagement />} />
                  <Route path="truck-board" element={<TruckBoard />} />
                  <Route path="marketplace" element={<MarketplaceTab userRole="hauler" />} />
                  <Route path="documents" element={<DocumentsTab />} />
                  <Route path="settings" element={<div>Hauler settings coming soon</div>} />
                  <Route path="support" element={<SupportTab />} />
                  <Route path="*" element={<Navigate to="/hauler/dashboard" replace />} />
                </Routes>
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        } />

        {/* Shipper Routes */}
        <Route path="/shipper/*" element={
          <ProtectedRoute>
            {userRole === 'shipper' ? (
              <AppLayout userRole="shipper" onLogout={handleLogout}>
                <Routes>
                  <Route path="dashboard" element={<ShipperDashboard onLogout={handleLogout} onRoleSwitch={handleRoleSwitch} />} />
                  <Route path="my-loads" element={<MyLoadsTab />} />
                  <Route path="messages" element={<JobMessages />} />
                  <Route path="post-job" element={<PostJob />} />
                  <Route path="job-board" element={<JobBoard />} />
                  <Route path="post-buy-sell" element={<PostBuyAndSell />} />
                  <Route path="buy-sell-board" element={<BuyAndSellBoard />} />
                  <Route path="post-resource" element={<PostResource />} />
                  <Route path="resources-board" element={<ResourcesBoard />} />
                  <Route path="offers" element={<ShipperOffersTab />} />
                  <Route path="contracts" element={<ShipperContractsTab />} />
                  <Route path="loadboard" element={<Navigate to="/shipper/dashboard" replace />} />
                  <Route path="truck-board" element={<TruckBoard />} />
                  <Route path="trips" element={<TripsTab role="shipper" onViewTrip={() => toast.info('Trip view coming soon')} />} />
                  <Route path="trips/:id/route-plan" element={<TripRoutePlan />} />
                  <Route path="trips/:id" element={<TripDetail />} />
                  <Route path="trips/:id/tracking" element={<TripTracking />} />
                  <Route path="trips/:id/chat" element={<TripChat />} />
                  <Route path="payments" element={<WalletTab />} />
                  <Route path="documents" element={<DocumentsTab />} />
                  <Route path="truck-board" element={<TruckBoard />} />
                  <Route path="marketplace" element={<MarketplaceTab userRole="shipper" />} />
                  <Route path="settings" element={<ProfileSettings role="shipper" onBack={() => navigate(-1)} />} />
                  <Route path="support" element={<SupportTab />} />
                  <Route path="*" element={<Navigate to="/shipper/dashboard" replace />} />
                </Routes>
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        } />

        {/* Driver Routes */}
        <Route path="/driver/*" element={
          <ProtectedRoute>
            {userRole === 'driver' ? (
              <AppLayout userRole="driver" onLogout={handleLogout}>
                <Routes>
                  <Route path="dashboard" element={<DriverDashboard onLogout={handleLogout} onRoleSwitch={handleRoleSwitch} />} />
                  <Route path="job-board" element={<JobBoard />} />
                  <Route path="trips" element={<TripsTab role="driver" onViewTrip={() => toast.info('Trip view coming soon')} />} />
                  <Route path="expenses" element={<ExpensesTab />} />
                  <Route path="documents" element={<DocumentsTab />} />
                  <Route path="settings" element={<ProfileSettings role="driver" onBack={() => navigate(-1)} />} />
                  <Route path="support" element={<SupportTab />} />
                  <Route path="*" element={<Navigate to="/driver/dashboard" replace />} />
                </Routes>
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        } />

        {/* Stakeholder Routes */}
        <Route path="/stakeholder/*" element={
          <ProtectedRoute>
            {userRole === 'stakeholder' ? (
              <AppLayout userRole="stakeholder" onLogout={handleLogout}>
                <Routes>
                  <Route path="dashboard" element={<StakeholderDashboard />} />
                  <Route path="services" element={<StakeholderServices />} />
                  <Route path="my-listings" element={<MyLoadsTab />} />
                  <Route path="messages" element={<JobMessages />} />
                  <Route path="post-job" element={<PostJob />} />
                  <Route path="job-board" element={<JobBoard />} />
                  <Route path="post-buy-sell" element={<PostBuyAndSell />} />
                  <Route path="buy-sell-board" element={<BuyAndSellBoard />} />
                  <Route path="post-resource" element={<PostResource />} />
                  <Route path="resources-board" element={<ResourcesBoard />} />
                  <Route path="bookings" element={<div>Bookings (Coming Soon)</div>} />
                  <Route path="marketplace" element={<MarketplaceTab userRole="stakeholder" />} />
                  <Route path="services/new" element={<PostService />} />
                  <Route path="earnings" element={<WalletTab />} />
                  <Route path="documents" element={<DocumentsTab />} />
                  <Route path="settings" element={<div>Service provider settings coming soon</div>} />
                  <Route path="support" element={<SupportTab />} />
                  <Route path="*" element={<Navigate to="/stakeholder/dashboard" replace />} />
                </Routes>
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <ProtectedRoute>
            {userRole === 'super-admin' ? (
              <AppLayout userRole="super-admin" onLogout={handleLogout}>
                <Routes>
                  <Route path="dashboard" element={<SuperAdminDashboard onLogout={handleLogout} />} />
                  <Route path="users" element={<div>User Management (Coming Soon)</div>} />
                  <Route path="approvals" element={<div>Approval Queue (Coming Soon)</div>} />
                  <Route path="pricing" element={<AdminPricing />} />
                  <Route path="subscriptions" element={<AdminSubscriptions />} />
                  <Route path="analytics" element={<div>Analytics (Coming Soon)</div>} />
                  <Route path="marketplace" element={<MarketplaceTab userRole="super-admin" />} />
                  <Route path="support" element={<SupportTab />} />
                  <Route path="settings" element={<div>Admin settings coming soon</div>} />
                  <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Routes>
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
