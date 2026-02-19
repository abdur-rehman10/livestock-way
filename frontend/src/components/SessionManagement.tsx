import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Smartphone, 
  Monitor, 
  Tablet,
  MapPin,
  Clock,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { toast, swalConfirm } from '../lib/swal';

interface Session {
  id: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  deviceName: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  loginTime: string;
  isCurrent: boolean;
  isTrusted: boolean;
}

const mockSessions: Session[] = [
  {
    id: 'S001',
    deviceType: 'mobile',
    deviceName: 'iPhone 14 Pro',
    browser: 'Safari 17',
    location: 'Austin, TX, USA',
    ipAddress: '192.168.1.45',
    lastActive: 'Active now',
    loginTime: 'Oct 28, 2025 at 9:15 AM',
    isCurrent: true,
    isTrusted: true,
  },
  {
    id: 'S002',
    deviceType: 'desktop',
    deviceName: 'MacBook Pro',
    browser: 'Chrome 119',
    location: 'Austin, TX, USA',
    ipAddress: '192.168.1.102',
    lastActive: '2 hours ago',
    loginTime: 'Oct 28, 2025 at 7:30 AM',
    isCurrent: false,
    isTrusted: true,
  },
  {
    id: 'S003',
    deviceType: 'tablet',
    deviceName: 'iPad Air',
    browser: 'Safari 17',
    location: 'Dallas, TX, USA',
    ipAddress: '10.0.0.234',
    lastActive: '1 day ago',
    loginTime: 'Oct 27, 2025 at 2:45 PM',
    isCurrent: false,
    isTrusted: false,
  },
  {
    id: 'S004',
    deviceType: 'mobile',
    deviceName: 'Samsung Galaxy S23',
    browser: 'Chrome 119',
    location: 'Houston, TX, USA',
    ipAddress: '172.16.0.55',
    lastActive: '3 days ago',
    loginTime: 'Oct 25, 2025 at 11:20 AM',
    isCurrent: false,
    isTrusted: true,
  },
];

interface SessionManagementProps {
  onBack?: () => void;
}

export function SessionManagement({ onBack }: SessionManagementProps) {
  const [sessions, setSessions] = useState(mockSessions);
  const [showAlert, setShowAlert] = useState(true);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-8 h-8 text-[#29CA8D]" />;
      case 'desktop':
        return <Monitor className="w-8 h-8 text-[#29CA8D]" />;
      case 'tablet':
        return <Tablet className="w-8 h-8 text-[#29CA8D]" />;
      default:
        return <Monitor className="w-8 h-8 text-[#29CA8D]" />;
    }
  };

  const handleRevokeSession = async (sessionId: string, deviceName: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session?.isCurrent) {
      toast.error('Cannot revoke current session. Please use logout instead.');
      return;
    }

    const confirmed = await swalConfirm({
      title: 'Revoke Session',
      text: `Are you sure you want to revoke access for "${deviceName}"?`,
      confirmText: 'Yes, revoke',
    });
    if (confirmed) {
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast.success(`Session revoked for ${deviceName}`);
    }
  };

  const handleRevokeAll = async () => {
    const confirmed = await swalConfirm({
      title: 'Revoke All Sessions',
      text: 'This will sign you out from all other devices. Continue?',
      confirmText: 'Yes, revoke all',
    });
    if (confirmed) {
      setSessions(sessions.filter(s => s.isCurrent));
      toast.success('All other sessions have been revoked');
    }
  };

  const handleTrustDevice = (sessionId: string) => {
    setSessions(sessions.map(s => 
      s.id === sessionId ? { ...s, isTrusted: !s.isTrusted } : s
    ));
    const session = sessions.find(s => s.id === sessionId);
    toast.success(session?.isTrusted ? 'Device untrusted' : 'Device trusted');
  };

  const activeSessions = sessions.filter(s => !s.isCurrent).length;
  const trustedDevices = sessions.filter(s => s.isTrusted).length;
  const suspiciousSessions = sessions.filter(s => !s.isTrusted && !s.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-[#172039] mb-2">Active Sessions</h2>
        <p className="text-gray-600">
          Manage your active sessions and trusted devices across all platforms
        </p>
      </div>

      {/* Security Alert */}
      {suspiciousSessions.length > 0 && showAlert && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Security Notice:</strong> You have {suspiciousSessions.length} untrusted {suspiciousSessions.length === 1 ? 'session' : 'sessions'}. 
            Review and revoke any sessions you don't recognize.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl">{sessions.length}</p>
              </div>
              <Monitor className="w-8 h-8 text-[#29CA8D]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trusted Devices</p>
                <p className="text-2xl">{trustedDevices}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Needs Review</p>
                <p className="text-2xl">{suspiciousSessions.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revoke All Button */}
      {activeSessions > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleRevokeAll}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Revoke All Other Sessions
          </Button>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.map((session) => (
          <Card 
            key={session.id} 
            className={`${
              session.isCurrent 
                ? 'border-[#29CA8D] bg-[#29CA8D]/5' 
                : !session.isTrusted 
                ? 'border-orange-200' 
                : ''
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                {/* Device Info */}
                <div className="flex gap-4 flex-1">
                  <div className="flex-shrink-0">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Device Name & Current Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg">{session.deviceName}</h3>
                      {session.isCurrent && (
                        <Badge className="bg-[#29CA8D] text-white">
                          Current Session
                        </Badge>
                      )}
                      {session.isTrusted && !session.isCurrent && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Shield className="w-3 h-3 mr-1" />
                          Trusted
                        </Badge>
                      )}
                      {!session.isTrusted && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Untrusted
                        </Badge>
                      )}
                    </div>

                    {/* Browser */}
                    <p className="text-sm text-gray-600 mb-3">{session.browser}</p>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{session.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Last active: {session.lastActive}</span>
                      </div>
                      <div className="text-gray-600">
                        IP: {session.ipAddress}
                      </div>
                      <div className="text-gray-600">
                        Signed in: {session.loginTime}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {!session.isCurrent && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTrustDevice(session.id)}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {session.isTrusted ? 'Untrust' : 'Trust'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id, session.deviceName)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Revoke
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>• Review your active sessions regularly and revoke any you don't recognize</p>
          <p>• Mark devices you own as "Trusted" for easier session management</p>
          <p>• If you see suspicious activity, change your password immediately</p>
          <p>• Enable Two-Factor Authentication for additional security</p>
          <p>• Always log out when using shared or public devices</p>
        </CardContent>
      </Card>
    </div>
  );
}
