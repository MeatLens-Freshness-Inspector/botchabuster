import type { Router } from "express";
import analysisRoutes from "../routes/analysis";
import profileRoutes from "../routes/profiles";
import inspectionRoutes from "../routes/inspections";
import accessCodeRoutes from "../routes/accessCodes";
import statsRoutes from "../routes/stats";
import uploadRoutes from "../routes/upload";
import authRoutes from "../routes/auth";
import chatRoutes from "../routes/chat";
import marketLocationRoutes from "../routes/marketLocations";
import auditLogRoutes from "../routes/auditLogs";
import developerOptionsRoutes from "../routes/developerOptions";
import developerDashboardRoutes from "../routes/developerDashboard";
import userChatRoutes from "../routes/userChat";

export interface BackendRoute {
  readonly prefix: string;
  readonly router: Router;
}

export function createBackendRoutes(): readonly BackendRoute[] {
  return [
    { prefix: "/api/analysis", router: analysisRoutes },
    { prefix: "/api/profiles", router: profileRoutes },
    { prefix: "/api/inspections", router: inspectionRoutes },
    { prefix: "/api/access-codes", router: accessCodeRoutes },
    { prefix: "/api/stats", router: statsRoutes },
    { prefix: "/api/upload", router: uploadRoutes },
    { prefix: "/api/auth", router: authRoutes },
    { prefix: "/api/chat", router: chatRoutes },
    { prefix: "/api/market-locations", router: marketLocationRoutes },
    { prefix: "/api/audit-logs", router: auditLogRoutes },
    { prefix: "/api/developer-options", router: developerOptionsRoutes },
    { prefix: "/api/developer-dashboard", router: developerDashboardRoutes },
    { prefix: "/api/user-chat", router: userChatRoutes },
  ];
}
