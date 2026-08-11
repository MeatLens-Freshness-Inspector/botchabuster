import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider } from "@/app/providers";
import { useAuth } from "@/entities/user";
import { BottomNav } from "@/widgets/navigation";
import { AssistantWidget } from "@/widgets/assistant";
import { OfflineBanner } from "@/widgets/navigation";
import { OfflineSyncManager, type OfflineSyncDependencies } from "@/features/offline-sync";
import { InactivityGuard } from "@/features/auth";
import { QueryProvider } from "@/app/providers/query-provider";
import { NotificationProvider } from "@/app/providers/notification-provider";
import { NetworkProvider } from "@/app/providers/network-provider";
import { ThemeController } from "@/app/providers/theme-controller";
import { ROUTE_PATHS } from "@/app/router/paths";
import { AppRouter } from "@/app/router/app-router";
import { ProtectedRoute as ProtectedRouteGuard, type ProtectedRouteProps } from "@/app/router/guards/protected-route";
import { AdminRoute as AdminRouteGuard, type AdminRouteProps } from "@/app/router/guards/admin-route";
import { OnboardingRoute as OnboardingRouteGuard, type OnboardingRouteProps } from "@/app/router/guards/onboarding-route";
import { AppLayout } from "@/app/layouts/app-layout";
import { PublicLayout } from "@/app/layouts/public-layout";
import { hasSkippedOnboardingForSession } from "@/lib/onboardingSession";
import { uploadClient } from "@/integrations/api/UploadClient";
import { inspectionClient } from "@/entities/inspection";
import { auditLogClient } from "@/integrations/api/AuditLogClient";
import {
  getPendingAuditLogs,
  getPendingScans,
  removeAuditLog,
  removeScan,
} from "@/features/offline-sync";
import { PROTOCOL_SPOILED_REASON, buildProtocolSpoiledAnalysisResult } from "@/entities/inspection";
import { analyzeOffline, prewarmModel, setActiveAnalysisMode } from "@/features/offline-analysis";
import { setActiveMobileNetModelVariant } from "@/features/offline-analysis";
import { getDeveloperOptionsFlags, getDeveloperOptionsSession, isDeveloperOptionsSessionExpired } from "@/lib/developerOptions";
import { applyTheme } from "@/shared/lib/theme-preference";
import { scrubSensitiveAuthHashFromUrl } from "@/shared/api";
import { Capacitor } from "@capacitor/core";
import LandingPage from "./pages/LandingPage";
import { LoginPage, SignupPage } from "@/pages/auth";
import { ForgotPasswordPage, ResetPasswordPage } from "@/pages/auth";
import InspectPage from "./pages/inspector/inspect-page";
import HistoryPage from "./pages/inspector/history-page";
import AdminDashboard from "./pages/AdminDashboard";
import DesktopAdminDashboard from "./pages/DesktopAdminDashboard";
import AdminDashboardWrapper from "./pages/AdminDashboardWrapper";
import ProfilePage from "./pages/inspector/profile-page";
import ProfileHelpPage from "./pages/ProfileHelpPage";
import ProfileHelpScopePage from "./pages/ProfileHelpScopePage";
import ProfileTutorialPage from "./pages/ProfileTutorialPage";
import MessagesPage from "./pages/inspector/messages-page";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/not-found/NotFound";

const offlineSyncDependencies: OfflineSyncDependencies = {
  uploadInspectionImage: (file) => uploadClient.uploadInspectionImage(file),
  createInspection: (inspection) => inspectionClient.create(inspection),
  createAuditBatch: (events) => auditLogClient.createBatch(events),
  getPendingScans,
  removeScan,
  getPendingAuditLogs,
  removeAuditLog,
  protocolSpoiledReason: PROTOCOL_SPOILED_REASON,
  buildProtocolSpoiledAnalysisResult,
  analyzeOffline,
  prewarmModel,
  setActiveAnalysisMode,
  setActiveMobileNetModelVariant,
  getDeveloperOptionsFlags,
  getDeveloperOptionsSession,
  isDeveloperOptionsSessionExpired: (session) =>
    isDeveloperOptionsSessionExpired(session as Parameters<typeof isDeveloperOptionsSessionExpired>[0]),
};

export function initializeAppRuntime() {
  // Start in light mode; the app router/auth layer will apply user preference from DB.
  applyTheme(false);
  // Immediately clear auth tokens from URL fragments to avoid accidental leakage.
  scrubSensitiveAuthHashFromUrl();
  // Start ONNX model warmup as early as possible in app boot.
  prewarmModel();

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    document.body.classList.add("capacitor-android");
  }
}

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

function AuthOfflineSyncManager() {
  const { user, isAdmin, isOnlineAuthenticated } = useAuth();

  return (
    <OfflineSyncManager
      user={user ? { id: user.id } : null}
      isAdmin={isAdmin}
      isOnlineAuthenticated={isOnlineAuthenticated}
      dependencies={offlineSyncDependencies}
    />
  );
}

function AuthInactivityGuard() {
  const { user, lock } = useAuth();

  return <InactivityGuard user={user ? { id: user.id } : null} lock={lock} loginPath={ROUTE_PATHS.login} />;
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
                <AuthOfflineSyncManager />
                <AuthInactivityGuard />
                <ThemeRouteController />
                <AppRouter elements={{
                  landing: <PublicLayout><LandingPage /></PublicLayout>,
                  login: <PublicLayout><LoginPage /></PublicLayout>,
                  signup: <PublicLayout><SignupPage /></PublicLayout>,
                  forgotPassword: <PublicLayout><ForgotPasswordPage /></PublicLayout>,
                  resetPassword: <PublicLayout><ResetPasswordPage /></PublicLayout>,
                  onboarding: <AuthOnboardingRoute><OnboardingPage /></AuthOnboardingRoute>,
                  inspect: <AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><InspectPage /></AppLayout></AuthProtectedRoute>,
                  history: <AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><HistoryPage /></AppLayout></AuthProtectedRoute>,
                  messages: <AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><MessagesPage /></AppLayout></AuthProtectedRoute>,
                  profile: <AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><ProfilePage /></AppLayout></AuthProtectedRoute>,
                  profileTutorial: <AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><ProfileTutorialPage /></AppLayout></AuthProtectedRoute>,
                  profileHelp: <AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><ProfileHelpPage /></AppLayout></AuthProtectedRoute>,
                  profileHelpScope: <AuthProtectedRoute><AppLayout bottomNavigation={<AuthBottomNav />} assistant={<AuthAssistant />}><ProfileHelpScopePage /></AppLayout></AuthProtectedRoute>,
                  admin: <AuthAdminRoute><AdminDashboardWrapper /></AuthAdminRoute>,
                  notFound: <NotFound />,
                }} />
              </AuthProvider>
            </NetworkProvider>
          </BrowserRouter>
        </NotificationProvider>
      </TooltipProvider>
    </QueryProvider>
  );
};

export default App;
