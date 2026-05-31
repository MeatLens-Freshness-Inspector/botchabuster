import { Loader2, WifiOff, ServerCrash, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StartupNetworkStatus } from "@/hooks/useStartupNetworkCheck";

type LoadingScreenStatus = StartupNetworkStatus | "auth_loading" | "profile_error";

interface NetworkLoadingScreenProps {
  status: LoadingScreenStatus;
  onRetry?: () => void;
}

const configByStatus: Record<LoadingScreenStatus, {
  title: string;
  message: string;
  hint?: string;
  canRetry: boolean;
  icon: "loader" | "offline" | "server" | "shield";
}> = {
  checking: {
    title: "Connecting to MeatLens",
    message: "Please wait while we check your network.",
    hint: "This usually takes a few seconds.",
    canRetry: false,
    icon: "loader",
  },
  auth_loading: {
    title: "Loading Your Account",
    message: "Please wait while we prepare your profile.",
    hint: "Do not close this page.",
    canRetry: false,
    icon: "shield",
  },
  profile_error: {
    title: "We Couldn't Load Your Onboarding Status",
    message: "Your account is signed in, but we could not confirm whether onboarding is complete.",
    hint: "Tap Try Again to reload your profile.",
    canRetry: true,
    icon: "shield",
  },
  offline: {
    title: "No Internet Connection",
    message: "Please check your Wi-Fi or mobile data, then try again.",
    hint: "Once internet returns, tap Try Again.",
    canRetry: true,
    icon: "offline",
  },
  server_unreachable: {
    title: "Server Not Responding",
    message: "We can’t reach the service right now.",
    hint: "Please wait a moment and try again.",
    canRetry: true,
    icon: "server",
  },
  ready: {
    title: "",
    message: "",
    canRetry: false,
    icon: "loader",
  },
};

export function NetworkLoadingScreen({ status, onRetry }: NetworkLoadingScreenProps) {
  const config = configByStatus[status];

  const renderIcon = () => {
    if (config.icon === "loader") {
      return <Loader2 className="h-9 w-9 animate-spin text-primary" />;
    }

    if (config.icon === "offline") {
      return <WifiOff className="h-9 w-9 text-warning" />;
    }

    if (config.icon === "server") {
      return <ServerCrash className="h-9 w-9 text-warning" />;
    }

    return <ShieldCheck className="h-9 w-9 text-primary" />;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] p-4">
      <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card/95 p-6 text-center shadow-[0_26px_80px_-36px_rgba(0,0,0,0.7)] sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-background/65">
          {renderIcon()}
        </div>

        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {config.title}
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          {config.message}
        </p>
        {config.hint && (
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {config.hint}
          </p>
        )}

        <div className="mt-6 rounded-xl border border-border/70 bg-background/55 p-3">
          <p className="font-display text-sm uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <p className="mt-1 text-lg font-semibold">
            {status === "checking"
              ? "Connecting..."
              : status === "auth_loading"
                ? "Loading..."
                : status === "profile_error"
                  ? "Profile unavailable"
                  : status === "offline"
                    ? "Offline"
                    : "Unavailable"}
          </p>
        </div>

        {config.canRetry && (
          <Button
            size="lg"
            onClick={onRetry}
            className="mt-6 h-12 w-full rounded-xl font-display text-base uppercase tracking-wider"
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
