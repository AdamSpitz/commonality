import assert from 'assert';
import { createServer } from 'http';
import type { Address, Hex } from 'viem';
import { createApp } from './app.js';
import type { PlatformApiServiceConfig } from './config.js';
import { HttpError } from './errors.js';
import type { PlatformApiService } from './service.js';

const VALID_STATEMENT_CID = 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy' as const;

describe('createApp CORS', () => {
  it('allows wildcard cross-origin health requests by default', async () => {
    const server = await startTestServer({
      configOverrides: {
        corsAllowedOrigins: '*',
      },
    });

    try {
      const response = await fetch(`${server.baseUrl}/health`, {
        headers: {
          Origin: 'https://ui.example',
        },
      });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(response.headers.get('access-control-allow-methods'), 'GET,POST,OPTIONS');

      const body = await response.json();
      assert.deepStrictEqual(body, { ok: true });
    } finally {
      await server.close();
    }
  });

  it('responds to allowed preflight requests for configured origins', async () => {
    const server = await startTestServer({
      configOverrides: {
        corsAllowedOrigins: ['https://ui.example'],
      },
    });

    try {
      const response = await fetch(`${server.baseUrl}/resolve/channel`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://ui.example',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,x-request-id',
        },
      });

      assert.strictEqual(response.status, 204);
      assert.strictEqual(response.headers.get('access-control-allow-origin'), 'https://ui.example');
      assert.strictEqual(response.headers.get('access-control-allow-methods'), 'GET,POST,OPTIONS');
      assert.strictEqual(
        response.headers.get('access-control-allow-headers'),
        'content-type,x-request-id',
      );

      const vary = response.headers.get('vary');
      assert.ok(vary?.includes('Origin'));
      assert.ok(vary?.includes('Access-Control-Request-Headers'));
    } finally {
      await server.close();
    }
  });

  it('rejects disallowed preflight origins', async () => {
    const server = await startTestServer({
      configOverrides: {
        corsAllowedOrigins: ['https://ui.example'],
      },
    });

    try {
      const response = await fetch(`${server.baseUrl}/resolve/channel`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil.example',
          'Access-Control-Request-Method': 'POST',
        },
      });

      assert.strictEqual(response.status, 403);
      assert.strictEqual(response.headers.get('access-control-allow-origin'), null);

      const body = await response.json();
      assert.deepStrictEqual(body, {
        error: 'cors_origin_not_allowed',
        message: 'Origin is not allowed by CORS: https://evil.example',
      });
    } finally {
      await server.close();
    }
  });
});

describe('createApp routes', () => {
  it('forwards resolve/channel requests to the service', async () => {
    const seenRequests: Array<{ platform: string; handle: string }> = [];
    const server = await startTestServer({
      service: createStubService({
        resolveChannel: async (platform, handle) => {
          seenRequests.push({ platform, handle });
          return {
            platform: 'twitter',
            channelId: 'twitter:uid:12345678',
            handle,
            displayName: 'Alice',
          };
        },
      }),
    });

    try {
      const response = await postJson(`${server.baseUrl}/resolve/channel`, {
        platform: 'twitter',
        handle: '@alice',
      });

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), {
        platform: 'twitter',
        channelId: 'twitter:uid:12345678',
        handle: '@alice',
        displayName: 'Alice',
      });
      assert.deepStrictEqual(seenRequests, [
        {
          platform: 'twitter',
          handle: '@alice',
        },
      ]);
    } finally {
      await server.close();
    }
  });

  it('forwards resolve/content requests to the service', async () => {
    const seenRequests: string[] = [];
    const url = 'https://x.com/alice/status/18347';
    const server = await startTestServer({
      service: createStubService({
        resolveContent: async (requestUrl) => {
          seenRequests.push(requestUrl);
          return {
            platform: 'twitter',
            channelId: 'twitter:uid:12345678',
            contentSuffix: '18347',
            canonicalId: 'twitter:uid:12345678:18347',
            metadata: {
              authorHandle: '@alice',
            },
          };
        },
      }),
    });

    try {
      const response = await postJson(`${server.baseUrl}/resolve/content`, { url });

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), {
        platform: 'twitter',
        channelId: 'twitter:uid:12345678',
        contentSuffix: '18347',
        canonicalId: 'twitter:uid:12345678:18347',
        metadata: {
          authorHandle: '@alice',
        },
      });
      assert.deepStrictEqual(seenRequests, [url]);
    } finally {
      await server.close();
    }
  });

  it('lists queued content submissions', async () => {
    const submissions = [
      {
        contentUrl: 'https://x.com/alice/status/18347',
        statementCid: VALID_STATEMENT_CID,
      },
    ];
    const server = await startTestServer({
      service: createStubService({
        listContentSubmissions: async () => submissions,
      }),
    });

    try {
      const response = await fetch(`${server.baseUrl}/content-submission`);

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), submissions);
    } finally {
      await server.close();
    }
  });

  it('forwards content-submission requests to the service', async () => {
    const seenRequests: Array<{
      contentUrl: string;
      statementCid: string;
      declaredPerspective?: string;
    }> = [];
    const submission = {
      contentUrl: 'https://x.com/alice/status/18347',
      statementCid: VALID_STATEMENT_CID,
      declaredPerspective: 'supportive',
    };
    const server = await startTestServer({
      service: createStubService({
        submitContent: async (request) => {
          seenRequests.push(request);
          return request;
        },
      }),
    });

    try {
      const response = await postJson(`${server.baseUrl}/content-submission`, submission);

      assert.strictEqual(response.status, 201);
      assert.deepStrictEqual(await response.json(), submission);
      assert.deepStrictEqual(seenRequests, [submission]);
    } finally {
      await server.close();
    }
  });

  it('forwards verify/challenge requests to the service', async () => {
    const seenRequests: Array<{
      platform: string;
      handle: string;
      claimantAddress: string;
    }> = [];
    const server = await startTestServer({
      service: createStubService({
        createVerificationChallenge: async (request) => {
          seenRequests.push(request);
          return {
            nonce: '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex,
            challengeCode: 'challenge',
            channelId: 'twitter:uid:12345678',
            handle: request.handle,
            displayName: 'Alice',
            verificationPostTemplate: 'Claiming',
            deadline: 1_700_000_000,
          };
        },
      }),
    });

    try {
      const response = await postJson(`${server.baseUrl}/verify/challenge`, {
        platform: 'twitter',
        handle: '@alice',
        claimantAddress: '0x1234567890123456789012345678901234567890',
      });

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), {
        nonce: '0x1111111111111111111111111111111111111111111111111111111111111111',
        challengeCode: 'challenge',
        channelId: 'twitter:uid:12345678',
        handle: '@alice',
        displayName: 'Alice',
        verificationPostTemplate: 'Claiming',
        deadline: 1_700_000_000,
      });
      assert.deepStrictEqual(seenRequests, [
        {
          platform: 'twitter',
          handle: '@alice',
          claimantAddress: '0x1234567890123456789012345678901234567890',
        },
      ]);
    } finally {
      await server.close();
    }
  });

  it('forwards verify/confirm requests to the service', async () => {
    const seenRequests: Array<{ nonce: string }> = [];
    const nonce = '0x1111111111111111111111111111111111111111111111111111111111111111';
    const server = await startTestServer({
      service: createStubService({
        confirmVerification: async (request) => {
          seenRequests.push(request);
          return {
            proof: {
              channelId: 'twitter:uid:12345678',
              claimant: '0x1234567890123456789012345678901234567890' as Address,
              nonce: request.nonce as Hex,
              deadline: 1_700_000_000,
              verifierSignature: '0x11' as Hex,
            },
            observedPostId: 'tweet-1',
          };
        },
      }),
    });

    try {
      const response = await postJson(`${server.baseUrl}/verify/confirm`, { nonce });

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), {
        proof: {
          channelId: 'twitter:uid:12345678',
          claimant: '0x1234567890123456789012345678901234567890',
          nonce,
          deadline: 1_700_000_000,
          verifierSignature: '0x11',
        },
        observedPostId: 'tweet-1',
      });
      assert.deepStrictEqual(seenRequests, [{ nonce }]);
    } finally {
      await server.close();
    }
  });

  it('returns 400s for missing required request fields', async () => {
    const server = await startTestServer();

    try {
      const resolveChannelResponse = await postJson(`${server.baseUrl}/resolve/channel`, {
        platform: 'twitter',
      });
      assert.strictEqual(resolveChannelResponse.status, 400);
      assert.deepStrictEqual(await resolveChannelResponse.json(), {
        error: 'invalid_request',
        message: 'Missing required fields: platform, handle',
      });

      const resolveContentResponse = await postJson(`${server.baseUrl}/resolve/content`, {});
      assert.strictEqual(resolveContentResponse.status, 400);
      assert.deepStrictEqual(await resolveContentResponse.json(), {
        error: 'invalid_request',
        message: 'Missing required field: url',
      });

      const submissionResponse = await postJson(`${server.baseUrl}/content-submission`, {
        contentUrl: 'https://x.com/alice/status/18347',
      });
      assert.strictEqual(submissionResponse.status, 400);
      assert.deepStrictEqual(await submissionResponse.json(), {
        error: 'invalid_request',
        message: 'Missing required field: statementCid',
      });

      const challengeResponse = await postJson(`${server.baseUrl}/verify/challenge`, {
        platform: 'twitter',
        handle: '@alice',
      });
      assert.strictEqual(challengeResponse.status, 400);
      assert.deepStrictEqual(await challengeResponse.json(), {
        error: 'invalid_request',
        message: 'Missing required fields: platform, handle, claimantAddress',
      });

      const confirmResponse = await postJson(`${server.baseUrl}/verify/confirm`, {});
      assert.strictEqual(confirmResponse.status, 400);
      assert.deepStrictEqual(await confirmResponse.json(), {
        error: 'invalid_request',
        message: 'Missing required field: nonce',
      });
    } finally {
      await server.close();
    }
  });

  it('serializes service HttpErrors through the route layer', async () => {
    const server = await startTestServer({
      service: createStubService({
        resolveChannel: async () => {
          throw new HttpError(
            503,
            'service_unavailable',
            'twitter channel resolution is unavailable because the platform API credentials are not configured',
          );
        },
      }),
    });

    try {
      const response = await postJson(`${server.baseUrl}/resolve/channel`, {
        platform: 'twitter',
        handle: '@alice',
      });

      assert.strictEqual(response.status, 503);
      assert.deepStrictEqual(await response.json(), {
        error: 'service_unavailable',
        message: 'twitter channel resolution is unavailable because the platform API credentials are not configured',
      });
    } finally {
      await server.close();
    }
  });

  it('returns 500s for unexpected route-layer errors', async () => {
    const server = await startTestServer({
      service: createStubService({
        resolveContent: async () => {
          throw new Error('kaboom');
        },
      }),
    });

    try {
      const response = await postJson(`${server.baseUrl}/resolve/content`, {
        url: 'https://x.com/alice/status/18347',
      });

      assert.strictEqual(response.status, 500);
      assert.deepStrictEqual(await response.json(), {
        error: 'internal_error',
        message: 'kaboom',
      });
    } finally {
      await server.close();
    }
  });

  it('applies separate rate limits to resolve and verify routes', async () => {
    const server = await startTestServer({
      configOverrides: {
        resolveRateLimitMaxRequests: 1,
        verifyRateLimitMaxRequests: 1,
        submissionRateLimitMaxRequests: 1,
        resolveRateLimitWindowMs: 60_000,
        verifyRateLimitWindowMs: 60_000,
        submissionRateLimitWindowMs: 60_000,
      },
    });

    try {
      const firstResolve = await postJson(`${server.baseUrl}/resolve/channel`, {
        platform: 'twitter',
        handle: '@alice',
      });
      assert.strictEqual(firstResolve.status, 200);

      const secondResolve = await postJson(`${server.baseUrl}/resolve/content`, {
        url: 'https://x.com/alice/status/18347',
      });
      assert.strictEqual(secondResolve.status, 429);
      assert.deepStrictEqual(await secondResolve.json(), {
        error: 'rate_limit_exceeded',
        message: 'Too many resolution requests. Please wait before trying again.',
        retryAfter: 60,
      });

      const firstVerify = await postJson(`${server.baseUrl}/verify/challenge`, {
        platform: 'twitter',
        handle: '@alice',
        claimantAddress: '0x1234567890123456789012345678901234567890',
      });
      assert.strictEqual(firstVerify.status, 200);

      const secondVerify = await postJson(`${server.baseUrl}/verify/confirm`, {
        nonce: '0x1111111111111111111111111111111111111111111111111111111111111111',
      });
      assert.strictEqual(secondVerify.status, 429);
      assert.deepStrictEqual(await secondVerify.json(), {
        error: 'rate_limit_exceeded',
        message: 'Too many verification requests. Please wait before trying again.',
        retryAfter: 60,
      });

      const firstSubmission = await fetch(`${server.baseUrl}/content-submission`);
      assert.strictEqual(firstSubmission.status, 200);

      const secondSubmission = await postJson(`${server.baseUrl}/content-submission`, {
        contentUrl: 'https://x.com/alice/status/18347',
        statementCid: VALID_STATEMENT_CID,
      });
      assert.strictEqual(secondSubmission.status, 429);
      assert.deepStrictEqual(await secondSubmission.json(), {
        error: 'rate_limit_exceeded',
        message: 'Too many content submission requests. Please wait before trying again.',
        retryAfter: 60,
      });
    } finally {
      await server.close();
    }
  });
});

async function startTestServer(options: {
  configOverrides?: Partial<PlatformApiServiceConfig>;
  service?: PlatformApiService;
} = {}) {
  const app = createApp(options.service ?? createStubService(), {
    port: 3001,
    corsAllowedOrigins: '*',
    commonalityTwitterHandle: '@commonality',
    claimPageBaseUrl: undefined,
    contentSubmissionsFilePath: './platform-api-content-submissions.json',
    xApiBearerToken: 'token',
    xApiBaseUrl: 'https://api.x.com',
    youtubeApiKey: 'key',
    youtubeApiBaseUrl: 'https://www.googleapis.com/youtube/v3',
    verifierPrivateKey: undefined,
    ethereumRpcUrl: undefined,
    channelRegistryAddress: undefined,
    channelVerifierAddress: undefined,
    chainId: undefined,
    submitVerificationTx: false,
    challengeTtlSeconds: 1800,
    contentCacheTtlSeconds: 3600,
    resolveRateLimitWindowMs: 60_000,
    resolveRateLimitMaxRequests: 60,
    verifyRateLimitWindowMs: 60_000,
    verifyRateLimitMaxRequests: 5,
    submissionRateLimitWindowMs: 60_000,
    submissionRateLimitMaxRequests: 5,
    ...options.configOverrides,
  });

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine test server address');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function createStubService(overrides: Partial<{
  resolveChannel: (platform: string, handle: string) => ReturnType<PlatformApiService['resolveChannel']>;
  resolveContent: (url: string) => ReturnType<PlatformApiService['resolveContent']>;
  listContentSubmissions: () => ReturnType<PlatformApiService['listContentSubmissions']>;
  submitContent: (
    request: Parameters<PlatformApiService['submitContent']>[0],
  ) => ReturnType<PlatformApiService['submitContent']>;
  createVerificationChallenge: (
    request: {
      platform: string;
      handle: string;
      claimantAddress: string;
    },
  ) => ReturnType<PlatformApiService['createVerificationChallenge']>;
  confirmVerification: (
    request: { nonce: string },
  ) => ReturnType<PlatformApiService['confirmVerification']>;
  health: () => ReturnType<PlatformApiService['health']>;
}> = {}): PlatformApiService {
  return {
    resolveChannel: overrides.resolveChannel ?? (async () => ({
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      handle: '@alice',
      displayName: 'Alice',
    })),
    resolveContent: overrides.resolveContent ?? (async () => ({
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      contentSuffix: '18347',
      canonicalId: 'twitter:uid:12345678:18347',
      metadata: {},
    })),
    listContentSubmissions: overrides.listContentSubmissions ?? (async () => []),
    submitContent: overrides.submitContent ?? (async (request) => request),
    createVerificationChallenge: overrides.createVerificationChallenge ?? (async () => ({
      nonce: '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex,
      challengeCode: 'challenge',
      channelId: 'twitter:uid:12345678',
      handle: '@alice',
      displayName: 'Alice',
      verificationPostTemplate: 'Claiming',
      deadline: 1_700_000_000,
    })),
    confirmVerification: overrides.confirmVerification ?? (async () => ({
      proof: {
        channelId: 'twitter:uid:12345678',
        claimant: '0x1234567890123456789012345678901234567890' as Address,
        nonce: '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex,
        deadline: 1_700_000_000,
        verifierSignature: '0x11' as Hex,
      },
    })),
    health: overrides.health ?? (() => ({ ok: true })),
  } as unknown as PlatformApiService;
}
