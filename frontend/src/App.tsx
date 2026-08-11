import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminRoute, OnboardingRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { AIChatbot } from "@/components/AIChatbot";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineSyncManager } from "@/components/OfflineSyncManager";
import { InactivityGuard } from "@/components/InactivityGuard";
import { QueryProvider } from "@/app/providers/query-provider";
import { NotificationProvider } from "@/app/providers/notification-provider";
import { NetworkProvider } from "@/app/providers/network-provider";
import { ThemeController } from "@/app/providers/theme-controller";
import { ROUTE_PATHS } from "@/app/router/paths";
import { ProtectedRoute as ProtectedRouteGuard, type ProtectedRouteProps } from "@/app/router/guards/protected-route";
import { hasSkippedOnboardingForSession } from "@/lib/onboardingSession";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import InspectPage from "./pages/Index";
import HistoryPage from "./pages/HistoryPage";
import AdminDashboard from "./pages/AdminDashboard";
import DesktopAdminDashboard from "./pages/DesktopAdminDashboard";
import AdminDashboardWrapper from "./pages/AdminDashboardWrapper";
import ProfilePage from "./pages/ProfilePage";
import ProfileHelpPage from "./pages/ProfileHelpPage";
import ProfileHelpScopePage from "./pages/ProfileHelpScopePage";
import ProfileTutorialPage from "./pages/ProfileTutorialPage";
import MessagesPage from "./pages/MessagesPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/not-found/NotFound";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
      <AIChatbot />
    </>
  );
}

function ThemeRouteController() {
  const { user, profile } = useAuth();

  return <ThemeController isAuthenticated={Boolean(user)} isDarkMode={profile?.is_dark_mode} />;
}

function AuthProtectedRoute({ children }: Pick<ProtectedRouteProps, "children">) {
  const { user, isAdmin, isLoading, profile, profileStatus, retryProfileLoad } = useAuth();

  return (
    <ProtectedRouteGuard
      user={user}
      isAdmin={isAdmin}
      isLoading={isLoading}
      profile={profile}
      profileStatus={profileStatus}
      retryProfileLoad={retryProfileLoad}
      skippedForSession={user ? hasSkippedOnboardingForSession(user.id) : false}
    >
      {children}
    </ProtectedRouteGuard>
  );
}

const App = () => {
  return (
    <QueryProvider>
      <OfflineBanner />
      <TooltipProvider>
        <NotificationProvider>
          <BrowserRouter>
            <NetworkProvider>
              <AuthProvider>
                <OfflineSyncManager />
                <InactivityGuard />
                <ThemeRouteController />
                <Routes>
                  {/* Public routes */}
                  <Route path={ROUTE_PATHS.landing} element={<LandingPage />} />
                  <Route path={ROUTE_PATHS.login} element={<LoginPage />} />
                  <Route path={ROUTE_PATHS.signup} element={<SignupPage />} />
                  <Route path={ROUTE_PATHS.forgotPassword} element={<ForgotPasswordPage />} />
                  <Route path={ROUTE_PATHS.resetPassword} element={<ResetPasswordPage />} />
                  <Route path={ROUTE_PATHS.onboarding} element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

                  {/* Protected app routes */}
                  <Route path={ROUTE_PATHS.inspect} element={<AuthProtectedRoute><AppLayout><InspectPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.history} element={<AuthProtectedRoute><AppLayout><HistoryPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.messages} element={<AuthProtectedRoute><AppLayout><MessagesPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.dashboard} element={<Navigate to={ROUTE_PATHS.history} replace />} />
                  <Route path={ROUTE_PATHS.profile} element={<AuthProtectedRoute><AppLayout><ProfilePage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.profileTutorial} element={<AuthProtectedRoute><AppLayout><ProfileTutorialPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.profileHelp} element={<AuthProtectedRoute><AppLayout><ProfileHelpPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.profileHelpScope} element={<AuthProtectedRoute><AppLayout><ProfileHelpScopePage /></AppLayout></AuthProtectedRoute>} />

                  {/* Admin routes */}
                  <Route path={ROUTE_PATHS.admin} element={<AdminRoute><AdminDashboardWrapper /></AdminRoute>} />

                  <Route path={ROUTE_PATHS.notFound} element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </NetworkProvider>
          </BrowserRouter>
        </NotificationProvider>
      </TooltipProvider>
    </QueryProvider>
  );
};

export default App;
