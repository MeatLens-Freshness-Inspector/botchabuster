import express from "express";
import cors from "cors";
import fs from "fs";
import type { NextFunction, Request, Response } from "express";
import { Config } from "./config";
import { createCorsOptions, isOriginAllowed } from "./config/cors";
import { globalErrorHandler } from "./middleware/errorHandler";
import { applySecurityHeaders } from "./middleware/securityHeaders";
import analysisRoutes from "./routes/analysis";
import profileRoutes from "./routes/profiles";
import inspectionRoutes from "./routes/inspections";
import accessCodeRoutes from "./routes/accessCodes";
import statsRoutes from "./routes/stats";
import uploadRoutes from "./routes/upload";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import marketLocationRoutes from "./routes/marketLocations";
import auditLogRoutes from "./routes/auditLogs";
import developerOptionsRoutes from "./routes/developerOptions";
import developerDashboardRoutes from "./routes/developerDashboard";
import userChatRoutes from "./routes/userChat";

export function isSafeMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

export function createOriginRejectionMiddleware(config: Config) {
  return function rejectDisallowedOrigins(req: Request, res: Response, next: NextFunction): void {
    if (isSafeMethod(req.method) || isOriginAllowed(req.header("origin"), config.allowedOrigins)) {
      next();
      return;
    }

    res.status(403).json({ error: "Origin not allowed" });
  };
}

function ensureUploadDirectory(uploadDir: string): void {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export function createApp(config = Config.getInstance()) {
  const app = express();

  ensureUploadDirectory(config.uploadDir);

  app.use(applySecurityHeaders);
  app.use(createOriginRejectionMiddleware(config));
  app.use(cors(createCorsOptions(config.allowedOrigins)));
  app.use(express.json());

  app.use("/api/analysis", analysisRoutes);
  app.use("/api/profiles", profileRoutes);
  app.use("/api/inspections", inspectionRoutes);
  app.use("/api/access-codes", accessCodeRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/market-locations", marketLocationRoutes);
  app.use("/api/audit-logs", auditLogRoutes);
  app.use("/api/developer-options", developerOptionsRoutes);
  app.use("/api/developer-dashboard", developerDashboardRoutes);
  app.use("/api/user-chat", userChatRoutes);
  app.use(globalErrorHandler);

  return app;
}
