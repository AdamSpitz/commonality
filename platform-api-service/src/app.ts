import express, { type Request, type Response } from 'express';
import { createRateLimiter } from './rateLimit.js';
import { toErrorResponse } from './errors.js';
import type { PlatformApiService } from './service.js';
import type { PlatformApiServiceConfig } from './config.js';

export function createApp(
  service: PlatformApiService,
  config: PlatformApiServiceConfig,
): express.Express {
  const app = express();
  app.use(express.json());

  const resolveLimiter = createRateLimiter({
    windowMs: config.resolveRateLimitWindowMs,
    maxRequests: config.resolveRateLimitMaxRequests,
    message: 'Too many resolution requests. Please wait before trying again.',
  });

  const verifyLimiter = createRateLimiter({
    windowMs: config.verifyRateLimitWindowMs,
    maxRequests: config.verifyRateLimitMaxRequests,
    message: 'Too many verification requests. Please wait before trying again.',
  });

  app.post('/resolve/channel', resolveLimiter, handleRoute(async (req: Request, res: Response) => {
    const { platform, handle } = req.body as {
      platform?: string;
      handle?: string;
    };

    if (typeof platform !== 'string' || typeof handle !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Missing required fields: platform, handle',
      });
      return;
    }

    res.json(await service.resolveChannel(platform, handle));
  }));

  app.post('/resolve/content', resolveLimiter, handleRoute(async (req: Request, res: Response) => {
    const { url } = req.body as { url?: string };
    if (typeof url !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Missing required field: url',
      });
      return;
    }

    res.json(await service.resolveContent(url));
  }));

  app.post('/verify/challenge', verifyLimiter, handleRoute(async (req: Request, res: Response) => {
    const { platform, handle, claimantAddress } = req.body as {
      platform?: string;
      handle?: string;
      claimantAddress?: string;
    };

    if (
      typeof platform !== 'string' ||
      typeof handle !== 'string' ||
      typeof claimantAddress !== 'string'
    ) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Missing required fields: platform, handle, claimantAddress',
      });
      return;
    }

    res.json(await service.createVerificationChallenge({
      platform,
      handle,
      claimantAddress,
    }));
  }));

  app.post('/verify/confirm', verifyLimiter, handleRoute(async (req: Request, res: Response) => {
    const { nonce } = req.body as { nonce?: string };
    if (typeof nonce !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Missing required field: nonce',
      });
      return;
    }

    res.json(await service.confirmVerification({ nonce }));
  }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json(service.health());
  });

  return app;
}

function handleRoute(
  handler: (req: Request, res: Response) => Promise<void>,
) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      const response = toErrorResponse(error);
      res.status(response.status).json(response.body);
    }
  };
}
