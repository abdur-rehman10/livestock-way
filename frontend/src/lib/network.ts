/**
 * Network status monitoring
 * Detects online/offline status
 */

export type NetworkStatus = 'online' | 'offline' | 'slow';

export interface NetworkState {
  status: NetworkStatus;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
}

/**
 * Get current network status
 */
export function getNetworkStatus(): NetworkState {
  if (typeof window === 'undefined') {
    return { status: 'online' };
  }

  const isOnline = window.navigator.onLine;
  
  // Check if Network Information API is available
  const connection = (window.navigator as any).connection 
    || (window.navigator as any).mozConnection 
    || (window.navigator as any).webkitConnection;

  if (connection) {
    return {
      status: isOnline ? (connection.effectiveType === 'slow-2g' ? 'slow' : 'online') : 'offline',
      downlink: connection.downlink,
      effectiveType: connection.effectiveType,
      rtt: connection.rtt,
    };
  }

  return {
    status: isOnline ? 'online' : 'offline',
  };
}

/**
 * Listen to network status changes
 */
export function onNetworkStatusChange(callback: (state: NetworkState) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => callback(getNetworkStatus());
  const handleOffline = () => callback(getNetworkStatus());

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Listen to connection changes if available
  const connection = (window.navigator as any).connection 
    || (window.navigator as any).mozConnection 
    || (window.navigator as any).webkitConnection;

  if (connection) {
    connection.addEventListener('change', handleOnline);
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (connection) {
      connection.removeEventListener('change', handleOnline);
    }
  };
}

/**
 * Simulate real-time updates with polling
 */
export function createPollingInterval(
  callback: () => void,
  interval: number = 5000,
  enabled: boolean = true
): () => void {
  if (!enabled || typeof window === 'undefined') {
    return () => {};
  }

  const intervalId = setInterval(callback, interval);

  return () => clearInterval(intervalId);
}
