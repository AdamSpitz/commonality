import assert from 'assert';
import type { Request, Response } from 'express';
import {
  createRateLimiter,
  cleanupExpiredRateLimits,
} from '../src/rateLimit.js';

interface MockResponse extends Response {
  jsonBody?: unknown;
}

function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: {},
    socket: { remoteAddress: '127.0.0.1' } as never,
    ...overrides,
  };
}

function createMockResponse(): MockResponse {
  const response = {
    statusCode: 200,
    jsonBody: undefined,
    status(code: number) {
      this.statusCode = code;
      return this as unknown as Response;
    },
    json(body: unknown) {
      this.jsonBody = body;
      return this as unknown as Response;
    },
  };
  return response as MockResponse;
}

describe('createRateLimiter', () => {
  let testIpCounter = 0;

  function getUniqueRequest(overrides: Partial<Request> = {}): Request {
    testIpCounter++;
    return createMockRequest({
      socket: { remoteAddress: `192.168.1.${testIpCounter}` } as never,
      ...overrides,
    }) as Request;
  }

  it('allows request when under limit', () => {
    const rateLimiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 5,
    });

    const req = getUniqueRequest();
    const res = createMockResponse() as Response;
    let nextCalled = false;

    rateLimiter(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(res.statusCode, 200);
  });

  it('returns 429 when limit exceeded', () => {
    const rateLimiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 2,
    });

    const req = getUniqueRequest();

    rateLimiter(req, createMockResponse() as Response, () => {});
    rateLimiter(req, createMockResponse() as Response, () => {});

    const res = createMockResponse();
    let nextCalled = false;
    rateLimiter(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 429);
    assert.ok(res.jsonBody);
    assert.strictEqual((res.jsonBody as { error: string }).error, 'rate_limit_exceeded');
  });

  it('resets counter after window expires', (done) => {
    const shortWindow = 100;
    const rateLimiter = createRateLimiter({
      windowMs: shortWindow,
      maxRequests: 1,
    });

    const req = getUniqueRequest();

    rateLimiter(req, createMockResponse() as Response, () => {});

    const res2 = createMockResponse() as Response;
    rateLimiter(req, res2, () => {});
    assert.strictEqual(res2.statusCode, 429);

    setTimeout(() => {
      cleanupExpiredRateLimits();
      const res3 = createMockResponse() as Response;
      let nextCalled = false;
      rateLimiter(req, res3, () => {
        nextCalled = true;
      });

      try {
        assert.strictEqual(nextCalled, true);
        done();
      } catch (error) {
        done(error as Error);
      }
    }, shortWindow + 50);
  });
});
