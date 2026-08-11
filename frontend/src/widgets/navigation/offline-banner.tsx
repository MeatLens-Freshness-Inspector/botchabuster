import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export type OfflineBannerProps = {
  initialIsOnline?: boolean;
};

export function OfflineBanner({ initialIsOnline }: OfflineBannerProps = {}) {
  const [isOnline, setIsOnline] = useState(initialIsOnline ?? navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-medium text-warning-foreground shadow-md">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You're offline — showing cached data. New inspections won't be available.</span>
    </div>
  );
}
