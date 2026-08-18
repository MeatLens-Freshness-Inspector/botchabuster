import assert from "node:assert/strict";
import test from "node:test";
import {
  SessionCleanupService,
  type SessionCleanupRunner,
  type SessionCleanupScheduler,
} from "../../../src/modules/auth/infrastructure/SessionCleanupService";

class FakeScheduler implements SessionCleanupScheduler {
  intervalCallback: (() => void) | null = null;
  intervalDelayMs: number | null = null;
  clearCalls = 0;

  setInterval(callback: () => void, delayMs: number): ReturnType<typeof setInterval> {
    this.intervalCallback = callback;
    this.intervalDelayMs = delayMs;
    return 1 as ReturnType<typeof setInterval>;
  }

  clearInterval(): void {
    this.clearCalls += 1;
    this.intervalCallback = null;
  }

  async trigger(): Promise<void> {
    this.intervalCallback?.();
    await Promise.resolve();
  }
}

function createRunner(removeInactiveSessions: SessionCleanupRunner["removeInactiveSessions"]): SessionCleanupRunner {
  return { removeInactiveSessions };
}

test("runOnce delegates the configured idle timeout", async () => {
  let receivedIdleTimeout = 0;
  const service = new SessionCleanupService(
    createRunner(async (idleTimeoutSeconds) => {
      receivedIdleTimeout = idleTimeoutSeconds;
      return 3;
    }),
    { intervalMs: 60_000, idleTimeoutSeconds: 600 },
  );

  assert.equal(await service.runOnce(), 3);
  assert.equal(receivedIdleTimeout, 600);
});

test("start is idempotent and schedules cleanup at the configured interval", async () => {
  let calls = 0;
  const scheduler = new FakeScheduler();
  const service = new SessionCleanupService(
    createRunner(async () => {
      calls += 1;
      return 0;
    }),
    { intervalMs: 30_000, idleTimeoutSeconds: 600 },
    scheduler,
  );

  service.start();
  service.start();
  await Promise.resolve();

  assert.equal(calls, 1);
  assert.equal(scheduler.intervalDelayMs, 30_000);

  await scheduler.trigger();
  assert.equal(calls, 2);
});

test("stop is idempotent and prevents future scheduled cleanups", async () => {
  let calls = 0;
  const scheduler = new FakeScheduler();
  const service = new SessionCleanupService(
    createRunner(async () => {
      calls += 1;
      return 0;
    }),
    { intervalMs: 30_000, idleTimeoutSeconds: 600 },
    scheduler,
  );

  service.start();
  await Promise.resolve();
  service.stop();
  service.stop();
  await scheduler.trigger();

  assert.equal(calls, 1);
  assert.equal(scheduler.clearCalls, 1);
});

test("runOnce prevents overlapping cleanup operations", async () => {
  let calls = 0;
  let release: (() => void) | null = null;
  const service = new SessionCleanupService(
    createRunner(() => {
      calls += 1;
      return new Promise<number>((resolve) => {
        release = () => resolve(1);
      });
    }),
    { intervalMs: 30_000, idleTimeoutSeconds: 600 },
  );

  const first = service.runOnce();
  assert.equal(await service.runOnce(), 0);
  assert.equal(calls, 1);

  release?.();
  assert.equal(await first, 1);
});
