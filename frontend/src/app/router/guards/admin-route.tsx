import React, { type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { NetworkLoadingScreen } from "@/shared/ui/network-loading-screen";

export type AdminRouteProps = {
  children: ReactNode;
  user: { id: string } | null;
  isAdmin: boolean;
  isLoading: boolean;
};

export function AdminRoute({ children, user, isAdmin, isLoading }: AdminRouteProps) {
  if (isLoading) {
    return <NetworkLoadingScreen status="auth_loading" />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/inspect" replace />;
  return <>{children}</>;
}
