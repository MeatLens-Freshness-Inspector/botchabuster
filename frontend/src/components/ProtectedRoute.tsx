import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";
import { NetworkLoadingScreen } from "@/components/NetworkLoadingScreen";

export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading, profile, profileStatus, retryProfileLoad } = useAuth();

  if (isLoading || profileStatus === "loading") {
    return <NetworkLoadingScreen status="auth_loading" />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profileStatus === "error") {
    return <NetworkLoadingScreen status="profile_error" onRetry={() => void retryProfileLoad()} />;
  }
  if (profileStatus !== "ready") {
    return <NetworkLoadingScreen status="auth_loading" />;
  }
  if (isAdmin || profile?.onboarding_completed_at) {
    return <Navigate to="/inspect" replace />;
  }

  return <>{children}</>;
}
