import type { Router } from "express";
import type { ModuleRegistry } from "./modules";
import analysisRoutes from "../modules/analysis/presentation/routes";
import profileRoutes from "../modules/users/presentation/routes";
import inspectionRoutes from "../modules/inspections/presentation/routes";
import accessCodeRoutes from "../modules/access-codes/presentation/routes";
import { createDefaultAnalyticsRouter } from "../modules/analytics/presentation/routes";
import uploadRoutes from "../modules/analysis/presentation/upload-routes";
import authRoutes from "../modules/auth/presentation/routes";
import chatRoutes from "../modules/chat/presentation/routes";
import marketLocationRoutes from "../modules/markets/presentation/routes";
import auditLogRoutes from "../modules/audit/presentation/routes";
import developerOptionsRoutes from "../modules/developer/presentation/options-routes";
import developerDashboardRoutes from "../modules/developer/presentation/dashboard-routes";
import userChatRoutes from "../modules/chat/presentation/user-chat-routes";
import { createDefaultModelAccuracyRouter } from "../modules/model-accuracy/presentation/routes";

export interface BackendRoute {
  readonly prefix: string;
  readonly router: Router;
}

export function createBackendRoutes(_modules?: ModuleRegistry): readonly BackendRoute[] {
  return [
    { prefix: "/api/analysis", router: analysisRoutes },
    { prefix: "/api/profiles", router: profileRoutes },
    { prefix: "/api/inspections", router: inspectionRoutes },
    { prefix: "/api/access-codes", router: accessCodeRoutes },
    { prefix: "/api/stats", router: createDefaultAnalyticsRouter() },
    { prefix: "/api/upload", router: uploadRoutes },
    { prefix: "/api/auth", router: authRoutes },
    { prefix: "/api/chat", router: chatRoutes },
    { prefix: "/api/market-locations", router: marketLocationRoutes },
    { prefix: "/api/audit-logs", router: auditLogRoutes },
    { prefix: "/api/developer-options", router: developerOptionsRoutes },
    { prefix: "/api/developer-dashboard", router: developerDashboardRoutes },
    { prefix: "/api/user-chat", router: userChatRoutes },
    { prefix: "/api/model-accuracy", router: createDefaultModelAccuracyRouter() },
  ];
}
