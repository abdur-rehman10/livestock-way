import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { getNetworkStatus, onNetworkStatusChange, type NetworkStatus } from '../lib/network';

export function OfflineIndicator() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('online');
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Initial check
    const status = getNetworkStatus();
    setNetworkStatus(status.status);
    setShowIndicator(status.status !== 'online');

    // Listen for changes
    const cleanup = onNetworkStatusChange((state) => {
      setNetworkStatus(state.status);
      setShowIndicator(state.status !== 'online');

      // Auto-hide after 5 seconds if back online
      if (state.status === 'online') {
        setTimeout(() => setShowIndicator(false), 5000);
      }
    });

    return cleanup;
  }, []);

  if (!showIndicator) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[200] max-w-md w-full px-4">
      <Alert
        variant={networkStatus === 'offline' ? 'destructive' : 'default'}
        className="shadow-lg animate-in slide-in-from-bottom-5"
      >
        <div className="flex items-center gap-2">
          {networkStatus === 'offline' ? (
            <WifiOff className="h-4 w-4" />
          ) : networkStatus === 'slow' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
          <AlertDescription>
            {networkStatus === 'offline' && 'You are currently offline. Some features may be unavailable.'}
            {networkStatus === 'slow' && 'Slow network connection detected. Some features may load slowly.'}
            {networkStatus === 'online' && 'Back online! All features are now available.'}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}
