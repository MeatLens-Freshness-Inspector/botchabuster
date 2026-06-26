import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute, OnboardingRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { AIChatbot } from "@/components/AIChatbot";
import { NetworkLoadingScreen } from "@/components/NetworkLoadingScreen";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineSyncManager } from "@/components/OfflineSyncManager";
import { InactivityGuard } from "@/components/InactivityGuard";
import { useStartupNetworkCheck } from "@/hooks/useStartupNetworkCheck";
import { applyTheme } from "@/lib/themePreference";
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
import ProfileTutorialPage from "./pages/ProfileTutorialPage";
import MessagesPage from "./pages/MessagesPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/not-found/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 60 * 24, // keep cache 24 h so offline users see their data
      retry: (failureCount, _error) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
      <AIChatbot />
    </>
  );
}

function NetworkStartupGate({ children }: { children: React.ReactNode }) {
  const { status, retry } = useStartupNetworkCheck();

  // Only hard-block while the initial connectivity check is in flight.
  // Once we know the outcome (ready, offline, or server unreachable) let
  // the app render — users will see cached data and an OfflineBanner.
  if (status === "checking") {
    return <NetworkLoadingScreen status={status} onRetry={retry} />;
  }

  return <>{children}</>;
}

function ThemeRouteController() {
  const location = useLocation();
  const { user, profile } = useAuth();

  useEffect(() => {
    const forceLightPaths = new Set(["/", "/signup", "/login", "/forgot-password", "/reset-password", "/onboarding"]);
    const forceLight = forceLightPaths.has(location.pathname);
    if (forceLight) {
      applyTheme(false);
      return;
    }

    const isDarkMode = Boolean(user && profile?.is_dark_mode);
    applyTheme(isDarkMode);
  }, [location.pathname, user, profile?.is_dark_mode]);

  return null;
}

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <OfflineBanner />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NetworkStartupGate>
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

              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboardWrapper /></AdminRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </NetworkStartupGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
