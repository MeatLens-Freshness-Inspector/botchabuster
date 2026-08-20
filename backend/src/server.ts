import type { Server } from "http";
import { Config } from "./config";
import { createApp } from "./app";
import { createSessionCleanupService } from "./modules/auth/infrastructure/SessionCleanupService";
import { chatRealtimeHub } from "./modules/chat/infrastructure/SupabaseChatRealtimeSource";

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

  const shutdown = createGracefulShutdown(server, sessionCleanup, chatRealtimeHub);
  const onSignal = () => {
    void shutdown().catch((error) => console.error("[Shutdown] Failed to stop backend services:", error));
  };
  process.once("SIGTERM", onSignal);
  process.once("SIGINT", onSignal);
  server.once("close", () => {
    process.off("SIGTERM", onSignal);
    process.off("SIGINT", onSignal);
  });
  server.on("error", handleServerError);
  return server;
}

export function createGracefulShutdown(
  server: Pick<Server, "close"> & Partial<Pick<Server, "closeAllConnections">>,
  sessionCleanup: { stop(): void },
  realtimeHub: { shutdown(): Promise<void> },
  forceTimeoutMs = 10_000,
): () => Promise<void> {
  let shutdownPromise: Promise<void> | null = null;
  return () => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      sessionCleanup.stop();
      const serverClose = new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      const realtimeStop = realtimeHub.shutdown();
      let forceHandle: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        server.closeAllConnections?.();
      }, forceTimeoutMs);
      try {
        await Promise.race([Promise.all([realtimeStop, serverClose]).then(() => undefined), new Promise<void>((resolve) => {
          setTimeout(resolve, forceTimeoutMs + 100);
        })]);
      } finally {
        if (forceHandle) clearTimeout(forceHandle);
        forceHandle = null;
        await realtimeStop;
      }
    })();
    return shutdownPromise;
  };
}

export async function stopServerServices(
  sessionCleanup: { stop(): void },
  realtimeHub: { shutdown(): Promise<void> },
): Promise<void> {
  sessionCleanup.stop();
  await realtimeHub.shutdown();
}

if (require.main === module) {
  startServer();
}

export default app;
