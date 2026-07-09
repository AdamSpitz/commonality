import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { createRateLimiter } from './rateLimit.js';
import { toErrorResponse } from './errors.js';
import type { PlatformApiService } from './service.js';
import type { PlatformApiServiceConfig } from './config.js';
import { parseContentSubmission } from './submissions.js';

export function createApp(
  service: PlatformApiService,
  config: PlatformApiServiceConfig,
): express.Express {
  const app = express();
  app.use(createCorsMiddleware(config));
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

  const submissionLimiter = createRateLimiter({
    windowMs: config.submissionRateLimitWindowMs,
    maxRequests: config.submissionRateLimitMaxRequests,
    message: 'Too many content submission requests. Please wait before trying again.',
  });

  const onrampLimiter = createRateLimiter({
    windowMs: config.onrampRateLimitWindowMs,
    maxRequests: config.onrampRateLimitMaxRequests,
    message: 'Too many on-ramp requests. Please wait before trying again.',
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

  app.post('/context/local', resolveLimiter, handleRoute(async (req: Request, res: Response) => {
    const { url, canonicalId, authorRecentLimit, threadLimit, repliesLimit } = req.body as {
      url?: string;
      canonicalId?: string;
      authorRecentLimit?: number;
      threadLimit?: number;
      repliesLimit?: number;
    };

    if (typeof url !== 'string' && typeof canonicalId !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Missing required field: url or canonicalId',
      });
      return;
    }

    res.json(await service.getLocalContentContext(removeUndefinedValues({
      url,
      canonicalId,
      authorRecentLimit,
      threadLimit,
      repliesLimit,
    })));
  }));

  app.get('/content-submission', submissionLimiter, handleRoute(async (_req: Request, res: Response) => {
    res.json(await service.listContentSubmissions());
  }));

  app.post('/content-submission', submissionLimiter, handleRoute(async (req: Request, res: Response) => {
    const submission = parseContentSubmission(req.body);
    const created = await service.submitContent(submission);
    res.status(201).json(created);
  }));

  app.post('/onramp/coinbase/session', onrampLimiter, handleRoute(async (req: Request, res: Response) => {
    const { address, clientIp, presetFiatAmount, fiatCurrency } = req.body as {
      address?: string;
      clientIp?: string;
      presetFiatAmount?: string;
      fiatCurrency?: string;
    };

    if (typeof address !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Missing required field: address',
      });
      return;
    }

    res.json(await service.createCoinbaseOnrampSession(removeUndefinedValues({
      address,
      clientIp,
      presetFiatAmount,
      fiatCurrency,
    })));
  }));

  app.get('/onramp/base-usdc-balance', onrampLimiter, handleRoute(async (req: Request, res: Response) => {
    const address = req.query.address;
    if (typeof address !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Missing required query parameter: address',
      });
      return;
    }

    res.json(await service.getBaseUsdcBalance(address));
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

function createCorsMiddleware(config: PlatformApiServiceConfig) {
  const allowAnyOrigin = config.corsAllowedOrigins === '*';
  const allowedOrigins = allowAnyOrigin ? undefined : new Set(config.corsAllowedOrigins);

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const requestHeaders = req.headers['access-control-request-headers'];
    const isAllowedOrigin = typeof origin === 'string' &&
      (allowAnyOrigin || allowedOrigins?.has(origin) === true);

    if (isAllowedOrigin && typeof origin === 'string') {
      res.setHeader('Access-Control-Allow-Origin', allowAnyOrigin ? '*' : origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        typeof requestHeaders === 'string' && requestHeaders.trim()
          ? requestHeaders
          : 'Content-Type',
      );
      res.setHeader('Access-Control-Max-Age', '600');

      if (!allowAnyOrigin) {
        res.setHeader('Vary', appendVaryHeader(res.getHeader('Vary'), 'Origin'));
      }
      if (typeof requestHeaders === 'string' && requestHeaders.trim()) {
        res.setHeader(
          'Vary',
          appendVaryHeader(res.getHeader('Vary'), 'Access-Control-Request-Headers'),
        );
      }
    }

    if (req.method === 'OPTIONS') {
      if (typeof origin === 'string' && !isAllowedOrigin) {
        res.status(403).json({
          error: 'cors_origin_not_allowed',
          message: `Origin is not allowed by CORS: ${origin}`,
        });
        return;
      }

      res.status(204).end();
      return;
    }

    next();
  };
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

function removeUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function appendVaryHeader(
  existing: number | string | string[] | undefined,
  value: string,
): string {
  const varyValues = new Set(
    (Array.isArray(existing) ? existing.join(',') : typeof existing === 'string' ? existing : '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  varyValues.add(value);
  return [...varyValues].join(', ');
}
