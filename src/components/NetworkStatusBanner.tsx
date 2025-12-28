import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useEffect, useState } from 'react';

export function NetworkStatusBanner() {
  const { isOnline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && showReconnected) {
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
    if (!isOnline) {
      setShowReconnected(true);
    }
  }, [isOnline, showReconnected]);

  if (isOnline && !showReconnected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[55] animate-in slide-in-from-top pointer-events-none">
      {!isOnline ? (
        <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-b-2 border-destructive bg-destructive text-destructive-foreground pointer-events-auto">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <span className="font-semibold">
              Sin conexión a internet
            </span>
            <span className="text-sm opacity-90">
              Algunas funciones pueden no estar disponibles
            </span>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-b-2 border-green-600 bg-green-600 text-white pointer-events-auto">
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">
              Conexión restaurada
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

