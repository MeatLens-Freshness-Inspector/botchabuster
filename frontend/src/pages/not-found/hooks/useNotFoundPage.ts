import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildQuickLinks,
  formatMissingPath,
  reportMissingRoute,
} from "../utils/notFoundPage";

export function useNotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    reportMissingRoute(location.pathname);
  }, [location.pathname]);

  const missingPath = useMemo(
    () => formatMissingPath(location.pathname),
    [location.pathname],
  );

  const quickLinks = useMemo(
    () => buildQuickLinks(Boolean(user)),
    [user],
  );

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  };

  return {
    missingPath,
    quickLinks,
    handleGoBack,
  };
}
