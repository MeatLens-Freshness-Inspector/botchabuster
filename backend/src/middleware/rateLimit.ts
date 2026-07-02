import type { NextFunction, Request, RequestHandler, Response } from "express";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
};

function defaultKeyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const message = options.message || "Too many requests. Please try again later.";
  let cleanupCursor = 0;

  function pruneExpiredBuckets(now: number): void {
    if (cleanupCursor % 256 !== 0) {
      cleanupCursor += 1;
      return;
    }

    cleanupCursor += 1;

    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    pruneExpiredBuckets(now);

    const key = keyGenerator(req);
    const existingBucket = buckets.get(key);

    if (!existingBucket || existingBucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (existingBucket.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existingBucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: message });
      return;
    }

    existingBucket.count += 1;
    next();
  };
}

export const publicAuthRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
  message: "Too many authentication attempts. Please try again later.",
});

export const chatRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 8,
  message: "Too many chat requests. Please wait a moment before trying again.",
  keyGenerator: (req) => req.auth?.userId || defaultKeyGenerator(req),
});
