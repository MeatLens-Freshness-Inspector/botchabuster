import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";
import { NetworkLoadingScreen } from "@/components/NetworkLoadingScreen";
import { hasSkippedOnboardingForSession } from "@/lib/onboardingSession";

export function ProtectedRoute({ children }: { children: ReactNode }) {
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

  const skippedForSession = hasSkippedOnboardingForSession(user.id);

  if (!isAdmin && !profile?.onboarding_completed_at && !skippedForSession) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <NetworkLoadingScreen status="auth_loading" />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/inspect" replace />;
  return <>{children}</>;
}

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
