import type { NextFunction, Request, RequestHandler, Response } from "express";

const WINDOW_MS = 60_000;
const MAX_SENDS_PER_WINDOW = 30;
const LIMIT_MESSAGE = "Too many messages. Please wait before sending again.";

interface SendBucket {
  timestamps: number[];
}

export function createUserChatSendRateLimit(nowMs: () => number = () => Date.now()): RequestHandler {
  const buckets = new Map<string, SendBucket>();
  let requestCount = 0;

  function pruneExpired(now: number): void {
    requestCount += 1;
    if (requestCount % 256 !== 0) return;
    for (const [userId, bucket] of buckets) {
      bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp > now - WINDOW_MS);
      if (bucket.timestamps.length === 0) buckets.delete(userId);
    }
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const now = nowMs();
    pruneExpired(now);
    const bucket = buckets.get(userId);
    if (!bucket) {
      buckets.set(userId, { timestamps: [now] });
      next();
      return;
    }

    bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp > now - WINDOW_MS);
    if (bucket.timestamps.length >= MAX_SENDS_PER_WINDOW) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.timestamps[0] + WINDOW_MS - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: LIMIT_MESSAGE });
      return;
    }

    bucket.timestamps.push(now);
    next();
  };
}

export const userChatSendRateLimit = createUserChatSendRateLimit();
