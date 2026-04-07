import type { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, RateLimitEntry>();
  const { windowMs, maxRequests, message = 'Rate limit exceeded' } = config;

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const identifier = getClientIdentifier(req);
    const now = Date.now();
    const entry = store.get(identifier);

    if (!entry || now > entry.resetTime) {
      store.set(identifier, {
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

    entry.count += 1;
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
