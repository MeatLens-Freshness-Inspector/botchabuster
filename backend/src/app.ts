import express from "express";
import cors from "cors";
import fs from "fs";
import type { NextFunction, Request, Response } from "express";
import { Config } from "./config";
import { createCorsOptions, isOriginAllowed } from "./config/cors";
import { globalErrorHandler } from "./middleware/errorHandler";
import { applySecurityHeaders } from "./middleware/securityHeaders";
import { createBackendDependencies } from "./bootstrap/dependencies";
import { createModuleRegistry } from "./bootstrap/modules";
import { createBackendRoutes } from "./bootstrap/routes";
import {
  createTestTransportKeyStore,
  createTransportKeyStore,
  type TransportKeyStore,
} from "./modules/transport/infrastructure/TransportKeyStore";
import { createTransportMiddleware } from "./middleware/transport";

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

export function createApp(
  config = Config.getInstance(),
  transportKeyStore?: TransportKeyStore,
) {
  const app = express();
  const dependencies = createBackendDependencies(config);
  const modules = createModuleRegistry(dependencies);
  const resolvedTransportKeyStore = transportKeyStore ?? (
    config.transportRsaPrivateKey
      ? createTransportKeyStore({
        privateKey: config.transportRsaPrivateKey,
        keyId: config.transportKeyId,
        nodeEnv: process.env.NODE_ENV,
      })
      : process.env.NODE_ENV === "production"
        ? createTransportKeyStore({
          keyId: config.transportKeyId,
          nodeEnv: process.env.NODE_ENV,
        })
        : createTestTransportKeyStore()
  );

  ensureUploadDirectory(config.uploadDir);

  app.use(applySecurityHeaders);
  app.use(createOriginRejectionMiddleware(config));
  app.use(cors(createCorsOptions(config.allowedOrigins)));
  app.use(express.json({ limit: config.transportMaxEnvelopeBytes }));
  app.use(createTransportMiddleware(resolvedTransportKeyStore, {
    maxPayloadBytes: config.transportMaxPayloadBytes,
  }));

  for (const route of createBackendRoutes(modules, resolvedTransportKeyStore)) {
    app.use(route.prefix, route.router);
  }
  app.use(globalErrorHandler);

  return app;
}
