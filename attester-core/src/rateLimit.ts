import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

const requestStore = new Map<string, RateLimitEntry>();

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, message = 'Rate limit exceeded' } = config;

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const identifier = getClientIdentifier(req);
    const now = Date.now();

    const entry = requestStore.get(identifier);

    if (!entry || now > entry.resetTime) {
      requestStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    entry.count++;
    next();
  };
}

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || 'unknown';

  return ip;
}

export function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  for (const [identifier, entry] of requestStore.entries()) {
    if (now > entry.resetTime) {
      requestStore.delete(identifier);
    }
  }
}

setInterval(cleanupExpiredRateLimits, 60 * 1000).unref();

export function getRateLimitStoreSize(): number {
  return requestStore.size;
}
