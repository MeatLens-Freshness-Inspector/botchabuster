import type { Server } from "http";
import { Config } from "./config";
import { createApp } from "./app";
import { createSessionCleanupService } from "./modules/auth/infrastructure/SessionCleanupService";

const config = Config.getInstance();
const app = createApp(config);
const fatalHandlerFlag = "__meatlensFatalHandlersInstalled";

function formatFatalError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

function installFatalHandlers(): void {
  const processWithFlag = process as NodeJS.Process & Record<string, unknown>;
  if (processWithFlag[fatalHandlerFlag]) {
    return;
  }

  processWithFlag[fatalHandlerFlag] = true;

  process.on("uncaughtException", (error) => {
    console.error(`[Fatal] Uncaught exception: ${formatFatalError(error)}`);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error(`[Fatal] Unhandled rejection: ${formatFatalError(reason)}`);
    process.exit(1);
  });
}

installFatalHandlers();

function handleServerError(error: NodeJS.ErrnoException): never {
  if (error.code === "EADDRINUSE") {
    console.error(`[Startup] Port ${config.port} is already in use.`);
    console.error(`[Startup] Stop the existing process or set PORT to a different value before starting backend.`);
    console.error(`[Startup] Example (PowerShell): $env:PORT=3002; npm run dev -w backend`);
    process.exit(1);
  }

  console.error("[Startup] Backend failed to start:", error);
  process.exit(1);
}

export function startServer(): Server {
  const sessionCleanup = createSessionCleanupService({
    intervalMs: config.sessionCleanupIntervalMs,
    idleTimeoutSeconds: config.sessionIdleTimeoutSeconds,
  });
  const server = app.listen(config.port, () => {
    console.log(`MeatLens backend running on port ${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/api/analysis/health`);
    console.log(
      `Allowed origins: ${config.allowedOrigins.length > 0 ? config.allowedOrigins.join(", ") : "none configured"}`,
    );
    sessionCleanup.start();
  });

  server.once("close", () => sessionCleanup.stop());
  server.on("error", handleServerError);
  return server;
}

if (require.main === module) {
  startServer();
}

export default app;
