import { useEffect, useState } from 'react';

interface ConnectivityState {
  isOnline: boolean;
  lastChanged: Date | null;
}

export const useConnectivity = (): ConnectivityState => {
  const [state, setState] = useState<ConnectivityState>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChanged: null,
  }));

  useEffect(() => {
    const handleOnline = () => setState({ isOnline: true, lastChanged: new Date() });
    const handleOffline = () => setState({ isOnline: false, lastChanged: new Date() });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return state;
};


