import type { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  cleanupIntervalMs?: number;
  now?: () => number;
}

interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export class MemoryRateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly now: () => number;
  private readonly cleanupIntervalMs: number;
  private lastCleanupTime: number;

  constructor(private readonly config: RateLimitConfig) {
    this.now = config.now ?? (() => Date.now());
    this.cleanupIntervalMs = config.cleanupIntervalMs ?? config.windowMs;
    this.lastCleanupTime = this.now();
  }

  check(identifier: string): RateLimitDecision {
    const now = this.now();
    this.cleanupExpiredEntries(now);

    const entry = this.store.get(identifier);

    if (!entry || now >= entry.resetTime) {
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return { allowed: true };
    }

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    entry.count += 1;
    return { allowed: true };
  }

  size(): number {
    this.cleanupExpiredEntries(this.now(), true);
    return this.store.size;
  }

  private cleanupExpiredEntries(now: number, force = false): void {
    if (!force && now - this.lastCleanupTime < this.cleanupIntervalMs) {
      return;
    }

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }

    this.lastCleanupTime = now;
  }
}

export function createRateLimiter(config: RateLimitConfig) {
  const limiter = new MemoryRateLimiter(config);
  const { message = 'Rate limit exceeded' } = config;

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const identifier = getClientIdentifier(req);
    const decision = limiter.check(identifier);

    if (!decision.allowed) {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        message,
        retryAfter: decision.retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}
