import { getSessionLimitService } from "./SessionLimitService";

export interface SessionCleanupRunner {
  removeInactiveSessions(idleTimeoutSeconds: number): Promise<number>;
}

export interface SessionCleanupScheduler {
  setInterval(callback: () => void, delayMs: number): ReturnType<typeof setInterval>;
  clearInterval(handle: ReturnType<typeof setInterval>): void;
}

export interface SessionCleanupServiceOptions {
  intervalMs: number;
  idleTimeoutSeconds: number;
}

const defaultScheduler: SessionCleanupScheduler = {
  setInterval: (callback, delayMs) => globalThis.setInterval(callback, delayMs),
  clearInterval: (handle) => globalThis.clearInterval(handle),
};

export class SessionCleanupService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private cleanupInProgress = false;

  constructor(
    private readonly runner: SessionCleanupRunner,
    private readonly options: SessionCleanupServiceOptions,
    private readonly scheduler: SessionCleanupScheduler = defaultScheduler,
  ) { }

  start(): void {
    if (this.timer) {
      return;
    }

    void this.runOnce().catch((error) => {
      console.error("Session cleanup error:", error);
    });

    this.timer = this.scheduler.setInterval(() => {
      void this.runOnce().catch((error) => {
        console.error("Session cleanup error:", error);
      });
    }, this.options.intervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    this.scheduler.clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce(): Promise<number> {
    if (this.cleanupInProgress) {
      return 0;
    }

    this.cleanupInProgress = true;
    try {
      return await this.runner.removeInactiveSessions(this.options.idleTimeoutSeconds);
    } finally {
      this.cleanupInProgress = false;
    }
  }
}

export function createSessionCleanupService(options: SessionCleanupServiceOptions): SessionCleanupService {
  return new SessionCleanupService(getSessionLimitService(), options);
}
