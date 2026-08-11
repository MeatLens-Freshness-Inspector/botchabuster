import React, { type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ROUTE_PATHS } from "./paths";

export type AppRouteElements = {
  landing: ReactNode;
  login: ReactNode;
  signup: ReactNode;
  forgotPassword: ReactNode;
  resetPassword: ReactNode;
  onboarding: ReactNode;
  inspect: ReactNode;
  history: ReactNode;
  messages: ReactNode;
  profile: ReactNode;
  profileTutorial: ReactNode;
  profileHelp: ReactNode;
  profileHelpScope: ReactNode;
  admin: ReactNode;
  notFound: ReactNode;
};

export type AppRouterProps = {
  elements: AppRouteElements;
};

export function AppRouter({ elements }: AppRouterProps) {
  return (
    <Routes>
      <Route path={ROUTE_PATHS.landing} element={elements.landing} />
      <Route path={ROUTE_PATHS.login} element={elements.login} />
      <Route path={ROUTE_PATHS.signup} element={elements.signup} />
      <Route path={ROUTE_PATHS.forgotPassword} element={elements.forgotPassword} />
      <Route path={ROUTE_PATHS.resetPassword} element={elements.resetPassword} />
      <Route path={ROUTE_PATHS.onboarding} element={elements.onboarding} />
      <Route path={ROUTE_PATHS.inspect} element={elements.inspect} />
      <Route path={ROUTE_PATHS.history} element={elements.history} />
      <Route path={ROUTE_PATHS.messages} element={elements.messages} />
      <Route path={ROUTE_PATHS.dashboard} element={<Navigate to={ROUTE_PATHS.history} replace />} />
      <Route path={ROUTE_PATHS.profile} element={elements.profile} />
      <Route path={ROUTE_PATHS.profileTutorial} element={elements.profileTutorial} />
      <Route path={ROUTE_PATHS.profileHelp} element={elements.profileHelp} />
      <Route path={ROUTE_PATHS.profileHelpScope} element={elements.profileHelpScope} />
      <Route path={ROUTE_PATHS.admin} element={elements.admin} />
      <Route path={ROUTE_PATHS.notFound} element={elements.notFound} />
    </Routes>
  );
}
