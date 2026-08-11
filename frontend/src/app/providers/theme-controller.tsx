import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { applyTheme } from "@/shared/lib/theme-preference";

const FORCE_LIGHT_PATHS = new Set([
  "/",
  "/signup",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
]);

export function resolveThemePreference(
  pathname: string,
  isAuthenticated: boolean,
  isDarkMode: boolean | null | undefined,
): boolean {
  if (FORCE_LIGHT_PATHS.has(pathname)) {
    return false;
  }

  return Boolean(isAuthenticated && isDarkMode);
}

type ThemeControllerProps = {
  isAuthenticated: boolean;
  isDarkMode: boolean | null | undefined;
};

export function ThemeController({ isAuthenticated, isDarkMode }: ThemeControllerProps) {
  const location = useLocation();

  useEffect(() => {
    applyTheme(resolveThemePreference(location.pathname, isAuthenticated, isDarkMode));
  }, [location.pathname, isAuthenticated, isDarkMode]);

  return null;
}
