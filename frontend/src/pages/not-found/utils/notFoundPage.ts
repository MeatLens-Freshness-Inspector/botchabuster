import type { NotFoundQuickLink } from "../types";

export function reportMissingRoute(pathname: string) {
  console.error("404 Error: User attempted to access non-existent route:", pathname);
}

export function formatMissingPath(pathname: string): string {
  const trimmedPath = pathname.trim();
  return trimmedPath.length > 0 ? trimmedPath : "/";
}

export function buildQuickLinks(isSignedIn: boolean): NotFoundQuickLink[] {
  if (isSignedIn) {
    return [
      {
        label: "Inspect",
        description: "Return to the live freshness workflow.",
        to: "/inspect",
        kind: "inspect",
      },
      {
        label: "History",
        description: "Review saved inspection results.",
        to: "/history",
        kind: "history",
      },
      {
        label: "Profile",
        description: "Open account settings and tutorials.",
        to: "/profile",
        kind: "profile",
      },
    ];
  }

  return [
    {
      label: "Home",
      description: "Return to the main landing page.",
      to: "/",
      kind: "home",
    },
    {
      label: "Login",
      description: "Sign in to continue working.",
      to: "/login",
      kind: "login",
    },
    {
      label: "Sign Up",
      description: "Create a new MeatLens account.",
      to: "/signup",
      kind: "signup",
    },
  ];
}
