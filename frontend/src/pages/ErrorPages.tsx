import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AlertCircle, Lock, ServerCrash, FileQuestion, Home, ArrowLeft, WifiOff } from 'lucide-react';

interface ErrorPageProps {
  type: '404' | '403' | '500' | 'network';
  onBack?: () => void;
  onHome?: () => void;
}

export function ErrorPage({ type, onBack, onHome }: ErrorPageProps) {
  const configs = {
    '404': {
      icon: FileQuestion,
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist or has been moved.',
      color: 'text-gray-600',
    },
    '403': {
      icon: Lock,
      title: 'Access Denied',
      message: 'You do not have permission to access this resource. Please contact your administrator.',
      color: 'text-orange-600',
    },
    '500': {
      icon: ServerCrash,
      title: 'Something Went Wrong',
      message: 'We are experiencing technical difficulties. Please try again later or contact support.',
      color: 'text-red-600',
    },
    'network': {
      icon: WifiOff,
      title: 'No Internet Connection',
      message: 'Please check your network connection and try again. Some features may be unavailable in offline mode.',
      color: 'text-blue-600',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-12 text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center ${config.color}`}>
            <Icon className="w-10 h-10" />
          </div>
          
          <h1 className="text-2xl text-[#172039] mb-3">{config.title}</h1>
          <p className="text-gray-600 mb-6">{config.message}</p>

          {type === '500' && (
            <p className="text-sm text-gray-500 mb-6">
              Error Code: ERR_500 • {new Date().toISOString()}
            </p>
          )}

          <div className="flex gap-3">
            {onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
            {onHome && (
              <Button
                onClick={onHome}
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            )}
            {type === 'network' && (
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                Retry Connection
              </Button>
            )}
          </div>

          {type === '403' && (
            <Button
              variant="link"
              className="mt-4 text-[#29CA8D]"
            >
              Contact Support
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Offline Banner Component
export function OfflineBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <WifiOff className="w-5 h-5" />
        <span className="text-sm">No internet connection. Some features may be unavailable.</span>
      </div>
      <Button
        size="sm"
        onClick={onRetry}
        className="bg-white text-orange-600 hover:bg-gray-100"
      >
        Retry
      </Button>
    </div>
  );
}

export function NotFound() {
  const navigate = useNavigate();

  return (
    <ErrorPage
      type="404"
      onBack={() => navigate(-1)}
      onHome={() => navigate('/')}
    />
  );
}
