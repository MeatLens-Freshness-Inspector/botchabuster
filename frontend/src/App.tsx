import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/widgets/navigation";
import { AssistantWidget } from "@/widgets/assistant";
import { OfflineBanner } from "@/widgets/navigation";
import { OfflineSyncManager } from "@/components/OfflineSyncManager";
import { InactivityGuard } from "@/components/InactivityGuard";
import { QueryProvider } from "@/app/providers/query-provider";
import { NotificationProvider } from "@/app/providers/notification-provider";
import { NetworkProvider } from "@/app/providers/network-provider";
import { ThemeController } from "@/app/providers/theme-controller";
import { ROUTE_PATHS } from "@/app/router/paths";
import { ProtectedRoute as ProtectedRouteGuard, type ProtectedRouteProps } from "@/app/router/guards/protected-route";
import { AdminRoute as AdminRouteGuard, type AdminRouteProps } from "@/app/router/guards/admin-route";
import { OnboardingRoute as OnboardingRouteGuard, type OnboardingRouteProps } from "@/app/router/guards/onboarding-route";
import { AppLayout } from "@/app/layouts/app-layout";
import { PublicLayout } from "@/app/layouts/public-layout";
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

function ThemeRouteController() {
  const { user, profile } = useAuth();

  return <ThemeController isAuthenticated={Boolean(user)} isDarkMode={profile?.is_dark_mode} />;
}

function AuthBottomNav() {
  const { isAdmin } = useAuth();

  return <BottomNav isAdmin={isAdmin} />;
}

function AuthAssistant() {
  const { isOnlineAuthenticated } = useAuth();

  return <AssistantWidget isOnlineAuthenticated={isOnlineAuthenticated} />;
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

function AuthAdminRoute({ children }: Pick<AdminRouteProps, "children">) {
  const { user, isAdmin, isLoading } = useAuth();

  return <AdminRouteGuard user={user} isAdmin={isAdmin} isLoading={isLoading}>{children}</AdminRouteGuard>;
}

function AuthOnboardingRoute({ children }: Pick<OnboardingRouteProps, "children">) {
  const { user, isAdmin, isLoading, profile, profileStatus, retryProfileLoad } = useAuth();

  return (
    <OnboardingRouteGuard
      user={user}
      isAdmin={isAdmin}
      isLoading={isLoading}
      profile={profile}
      profileStatus={profileStatus}
      retryProfileLoad={retryProfileLoad}
    >
      {children}
    </OnboardingRouteGuard>
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
                  <Route path={ROUTE_PATHS.landing} element={<PublicLayout><LandingPage /></PublicLayout>} />
                  <Route path={ROUTE_PATHS.login} element={<PublicLayout><LoginPage /></PublicLayout>} />
                  <Route path={ROUTE_PATHS.signup} element={<PublicLayout><SignupPage /></PublicLayout>} />
                  <Route path={ROUTE_PATHS.forgotPassword} element={<PublicLayout><ForgotPasswordPage /></PublicLayout>} />
                  <Route path={ROUTE_PATHS.resetPassword} element={<PublicLayout><ResetPasswordPage /></PublicLayout>} />
                  <Route path={ROUTE_PATHS.onboarding} element={<AuthOnboardingRoute><OnboardingPage /></AuthOnboardingRoute>} />

                  {/* Protected app routes */}
                  <Route path={ROUTE_PATHS.inspect} element={<AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><InspectPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.history} element={<AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><HistoryPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.messages} element={<AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><MessagesPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.dashboard} element={<Navigate to={ROUTE_PATHS.history} replace />} />
                  <Route path={ROUTE_PATHS.profile} element={<AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><ProfilePage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.profileTutorial} element={<AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><ProfileTutorialPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.profileHelp} element={<AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><ProfileHelpPage /></AppLayout></AuthProtectedRoute>} />
                  <Route path={ROUTE_PATHS.profileHelpScope} element={<AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><ProfileHelpScopePage /></AppLayout></AuthProtectedRoute>} />

                  {/* Admin routes */}
                  <Route path={ROUTE_PATHS.admin} element={<AuthAdminRoute><AdminDashboardWrapper /></AuthAdminRoute>} />

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
