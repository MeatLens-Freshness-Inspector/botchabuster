import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL } from "@/shared/api/base-url";
import { NetworkLoadingScreen } from "@/shared/ui/network-loading-screen";

const ENABLE_BACKEND_STARTUP_CHECK = import.meta.env?.VITE_ENABLE_BACKEND_STARTUP_CHECK === "true";

export function useStartupNetworkCheck() {
  const [status, setStatus] = useState<StartupNetworkStatus>("checking");
  const [attempt, setAttempt] = useState(0);

  const checkNetwork = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }

    if (!ENABLE_BACKEND_STARTUP_CHECK) {
      setStatus("ready");
      return;
    }

    setStatus("checking");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(`${API_BASE_URL}/analysis/health`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (res.ok) {
        setStatus("ready");
      } else {
        setStatus("server_unreachable");
      }
    } catch {
      setStatus(navigator.onLine ? "server_unreachable" : "offline");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    void checkNetwork();
  }, [checkNetwork, attempt]);

  useEffect(() => {
    const handleOnline = () => setAttempt((prev) => prev + 1);
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    status,
    retry: () => setAttempt((prev) => prev + 1),
  };
}

type NetworkProviderProps = {
  children: ReactNode;
};

export function NetworkProvider({ children }: NetworkProviderProps) {
  const { status, retry } = useStartupNetworkCheck();

  if (status === "checking") {
    return <NetworkLoadingScreen status={status} onRetry={retry} />;
  }

  return <>{children}</>;
}
