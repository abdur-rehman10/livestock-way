import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Onboarding } from './Onboarding';
import { Login } from './Login';
import { Verification } from './Verification';
import { ForgotPassword } from './ForgotPassword';
import { DriverDashboard } from './DriverDashboard';
import { ShipperDashboard } from './ShipperDashboard';
import { HaulerDashboard } from './HaulerDashboard';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { TripDetail } from './TripDetail';
import { TripTracking } from './TripTracking';
import { ErrorPage } from './ErrorPages';
import { ProfileSettings } from './ProfileSettings';
import { NotificationsCenter } from './NotificationsCenter';
import { Loadboard } from './Loadboard';
import { FleetManagement } from './FleetManagement';
import { 
  Maximize2, 
  Grid3x3, 
  Eye, 
  X,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

type ScreenType = 
  | 'onboarding' 
  | 'login'
  | 'verification'
  | 'forgot-password'
  | 'driver' 
  | 'trip-detail'
  | 'shipper'
  | 'trip-tracking'
  | 'profile-settings'
  | 'notifications'
  | 'hauler'
  | 'loadboard'
  | 'fleet-management'
  | 'super-admin'
  | 'error-404'
  | null;

const screens = [
  {
    id: 'onboarding',
    title: 'Onboarding Flow',
    category: 'Auth',
    color: 'bg-blue-500',
  },
  {
    id: 'login',
    title: 'Login & Registration',
    category: 'Auth',
    color: 'bg-purple-500',
  },
  {
    id: 'verification',
    title: 'OTP Verification',
    category: 'Auth',
    color: 'bg-cyan-500',
  },
  {
    id: 'forgot-password',
    title: 'Forgot Password',
    category: 'Auth',
    color: 'bg-violet-500',
  },
  {
    id: 'driver',
    title: 'Driver Dashboard',
    category: 'Mobile',
    color: 'bg-green-500',
  },
  {
    id: 'trip-detail',
    title: 'Trip Execution',
    category: 'Mobile',
    color: 'bg-emerald-500',
  },
  {
    id: 'shipper',
    title: 'Shipper Dashboard',
    category: 'Mobile',
    color: 'bg-orange-500',
  },
  {
    id: 'trip-tracking',
    title: 'Trip Tracking',
    category: 'Mobile',
    color: 'bg-amber-500',
  },
  {
    id: 'hauler',
    title: 'Hauler Dashboard',
    category: 'Web',
    color: 'bg-indigo-500',
  },
  {
    id: 'super-admin',
    title: 'Super Admin Portal',
    category: 'Web',
    color: 'bg-slate-500',
  },
  {
    id: 'profile-settings',
    title: 'Profile & Settings',
    category: 'Mobile',
    color: 'bg-teal-500',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    category: 'Mobile',
    color: 'bg-purple-500',
  },
  {
    id: 'loadboard',
    title: 'Loadboard',
    category: 'Web',
    color: 'bg-pink-500',
  },
  {
    id: 'fleet-management',
    title: 'Fleet Management',
    category: 'Web',
    color: 'bg-cyan-500',
  },
  {
    id: 'error-404',
    title: 'Error Pages',
    category: 'System',
    color: 'bg-red-500',
  },
] as const;

export function ScreenShowcase() {
  const [selectedScreen, setSelectedScreen] = useState<ScreenType>(null);
  const [viewMode, setViewMode] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  const handleScreenClick = (screenId: string) => {
    setSelectedScreen(screenId as ScreenType);
  };

  const handleClose = () => {
    setSelectedScreen(null);
  };

  const renderScreen = (screenId: ScreenType) => {
    const mockTrip = {
      id: 'T001',
      species: 'Cattle',
      quantity: '50 head',
      pickup: 'Austin, TX',
      dropoff: 'Dallas, TX',
      distance: '195 miles',
      payout: '$850',
      pickupTime: '8:00 AM - 10:00 AM',
      status: 'scheduled' as const,
    };

    const mockLoad = {
      id: 'L001',
      species: 'Cattle',
      quantity: '50 head',
      pickup: 'Austin, TX',
      dropoff: 'Dallas, TX',
      driver: 'John Smith',
      status: 'active',
    };

    switch (screenId) {
      case 'onboarding':
        return <Onboarding onComplete={() => {}} />;
      case 'login':
        return <Login onLogin={() => {}} />;
      case 'verification':
        return <Verification email="user@example.com" onVerified={() => {}} onBack={() => {}} />;
      case 'forgot-password':
        return <ForgotPassword onBack={() => {}} />;
      case 'driver':
        return <DriverDashboard onLogout={() => {}} onRoleSwitch={() => {}} />;
      case 'trip-detail':
        return <TripDetail trip={mockTrip} onBack={() => {}} />;
      case 'shipper':
        return <ShipperDashboard onLogout={() => {}} onRoleSwitch={() => {}} />;
      case 'trip-tracking':
        return <TripTracking load={mockLoad} onBack={() => {}} />;
      case 'profile-settings':
        return <ProfileSettings role="driver" onBack={() => {}} />;
      case 'notifications':
        return <NotificationsCenter onBack={() => {}} />;
      case 'hauler':
        return <HaulerDashboard onLogout={() => {}} />;
      case 'loadboard':
        return (
          <div className="bg-gray-50 min-h-screen">
            <Loadboard />
          </div>
        );
      case 'fleet-management':
        return (
          <div className="bg-gray-50 min-h-screen">
            <FleetManagement />
          </div>
        );
      case 'super-admin':
        return <SuperAdminDashboard onLogout={() => {}} />;
      case 'error-404':
        return <ErrorPage type="404" onBack={() => {}} onHome={() => {}} />;
      default:
        return null;
    }
  };

  if (selectedScreen) {
    const screenWidth = 
      viewMode === 'mobile' ? 'max-w-[375px]' :
      viewMode === 'tablet' ? 'max-w-[768px]' :
      'max-w-[1440px]';

    return (
      <div className="min-h-screen bg-gray-900 p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleClose}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <X className="w-4 h-4 mr-2" />
              Close Preview
            </Button>
            <h2 className="text-xl text-white">
              {screens.find(s => s.id === selectedScreen)?.title}
            </h2>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'mobile' ? 'default' : 'ghost'}
              onClick={() => setViewMode('mobile')}
              className={viewMode === 'mobile' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/20'}
            >
              <Smartphone className="w-4 h-4 mr-1" />
              Mobile
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'tablet' ? 'default' : 'ghost'}
              onClick={() => setViewMode('tablet')}
              className={viewMode === 'tablet' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/20'}
            >
              <Tablet className="w-4 h-4 mr-1" />
              Tablet
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'desktop' ? 'default' : 'ghost'}
              onClick={() => setViewMode('desktop')}
              className={viewMode === 'desktop' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/20'}
            >
              <Monitor className="w-4 h-4 mr-1" />
              Desktop
            </Button>
          </div>
        </div>

        {/* Screen Preview */}
        <div className="flex justify-center">
          <div className={`${screenWidth} w-full bg-white rounded-lg shadow-2xl overflow-hidden`}>
            <div className="h-[calc(100vh-140px)] overflow-auto">
              {renderScreen(selectedScreen)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Board View
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">LivestockWay Design System</h1>
            <p className="text-gray-600">All screens and components in one place</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Grid3x3 className="w-3 h-3" />
              {screens.length} Screens
            </Badge>
          </div>
        </div>
      </div>

      {/* Screen Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screens.map((screen) => (
            <Card 
              key={screen.id}
              className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden"
              onClick={() => handleScreenClick(screen.id)}
            >
              <div className={`h-2 ${screen.color}`} />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {screen.category}
                    </Badge>
                    <CardTitle className="text-lg">{screen.title}</CardTitle>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Preview Thumbnail */}
                <div className="relative aspect-[9/16] md:aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                  <div className="absolute inset-0 scale-[0.25] origin-top-left w-[400%] h-[400%]">
                    {renderScreen(screen.id as ScreenType)}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button className="bg-white text-gray-900 hover:bg-gray-100">
                      <Maximize2 className="w-4 h-4 mr-2" />
                      View Full Screen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto mt-12">
        <h2 className="text-xl text-gray-900 mb-4">Categories</h2>
        <div className="flex gap-3">
          {['Auth', 'Mobile', 'Web', 'System'].map((category) => (
            <Badge key={category} variant="secondary" className="px-4 py-2">
              {category} ({screens.filter(s => s.category === category).length})
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
