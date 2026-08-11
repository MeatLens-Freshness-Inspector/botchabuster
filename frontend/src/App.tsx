import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute, OnboardingRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { AIChatbot } from "@/components/AIChatbot";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineSyncManager } from "@/components/OfflineSyncManager";
import { InactivityGuard } from "@/components/InactivityGuard";
import { QueryProvider } from "@/app/providers/query-provider";
import { NotificationProvider } from "@/app/providers/notification-provider";
import { NetworkProvider } from "@/app/providers/network-provider";
import { ThemeController } from "@/app/providers/theme-controller";
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
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

                  {/* Protected app routes */}
                  <Route path="/inspect" element={<ProtectedRoute><AppLayout><InspectPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/history" element={<ProtectedRoute><AppLayout><HistoryPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><AppLayout><MessagesPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/dashboard" element={<Navigate to="/history" replace />} />
                  <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
                  <Route path="/profile/tutorial" element={<ProtectedRoute><AppLayout><ProfileTutorialPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/profile/help" element={<ProtectedRoute><AppLayout><ProfileHelpPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/profile/help/scope" element={<ProtectedRoute><AppLayout><ProfileHelpScopePage /></AppLayout></ProtectedRoute>} />

                  {/* Admin routes */}
                  <Route path="/admin" element={<AdminRoute><AdminDashboardWrapper /></AdminRoute>} />

                  <Route path="*" element={<NotFound />} />
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
