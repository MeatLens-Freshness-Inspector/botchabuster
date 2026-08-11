import React, { type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { NetworkLoadingScreen } from "@/shared/ui/network-loading-screen";

type OnboardingRouteProfile = {
  onboarding_completed_at?: string | null;
} | null;

export type OnboardingRouteProps = {
  children: ReactNode;
  user: { id: string } | null;
  isAdmin: boolean;
  isLoading: boolean;
  profile: OnboardingRouteProfile;
  profileStatus: string;
  retryProfileLoad: () => Promise<void> | void;
};

export function OnboardingRoute({
  children,
  user,
  isAdmin,
  isLoading,
  profile,
  profileStatus,
  retryProfileLoad,
}: OnboardingRouteProps) {
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
