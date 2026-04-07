import assert from 'assert';
import { MemoryRateLimiter } from './rateLimit.js';

describe('MemoryRateLimiter', () => {
  it('allows requests again after the rate-limit window expires', () => {
    let now = 1_000;
    const limiter = new MemoryRateLimiter({
      windowMs: 1_000,
      maxRequests: 1,
      now: () => now,
    });

    assert.deepStrictEqual(limiter.check('client-1'), { allowed: true });
    assert.deepStrictEqual(limiter.check('client-1'), {
      allowed: false,
      retryAfterSeconds: 1,
    });

    now = 2_000;

    assert.deepStrictEqual(limiter.check('client-1'), { allowed: true });
  });

  it('cleans up expired client entries during periodic sweeps', () => {
    let now = 0;
    const limiter = new MemoryRateLimiter({
      windowMs: 1_000,
      maxRequests: 2,
      cleanupIntervalMs: 1_000,
      now: () => now,
    });

    assert.deepStrictEqual(limiter.check('client-1'), { allowed: true });
    assert.deepStrictEqual(limiter.check('client-2'), { allowed: true });
    assert.strictEqual(limiter.size(), 2);

    now = 1_500;

    assert.deepStrictEqual(limiter.check('client-3'), { allowed: true });
    assert.strictEqual(limiter.size(), 1);
  });
});
