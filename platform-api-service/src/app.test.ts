import assert from 'assert';
import { createServer } from 'http';
import type { Address, Hex } from 'viem';
import { createApp } from './app.js';
import type { PlatformApiServiceConfig } from './config.js';
import type { PlatformApiService } from './service.js';

describe('createApp CORS', () => {
  it('allows wildcard cross-origin health requests by default', async () => {
    const server = await startTestServer({
      corsAllowedOrigins: '*',
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
      corsAllowedOrigins: ['https://ui.example'],
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
      corsAllowedOrigins: ['https://ui.example'],
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

async function startTestServer(configOverrides: Partial<PlatformApiServiceConfig>) {
  const app = createApp(createStubService(), {
    port: 3001,
    corsAllowedOrigins: '*',
    commonalityTwitterHandle: '@commonality',
    claimPageBaseUrl: undefined,
    xApiBearerToken: 'token',
    xApiBaseUrl: 'https://api.x.com',
    youtubeApiKey: 'key',
    youtubeApiBaseUrl: 'https://www.googleapis.com/youtube/v3',
    verifierPrivateKey: undefined,
    ethereumRpcUrl: undefined,
    channelRegistryAddress: undefined,
    submitVerificationTx: false,
    challengeTtlSeconds: 1800,
    contentCacheTtlSeconds: 3600,
    resolveRateLimitWindowMs: 60_000,
    resolveRateLimitMaxRequests: 60,
    verifyRateLimitWindowMs: 60_000,
    verifyRateLimitMaxRequests: 5,
    ...configOverrides,
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

function createStubService(): PlatformApiService {
  return {
    resolveChannel: async () => ({
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      handle: '@alice',
      displayName: 'Alice',
    }),
    resolveContent: async () => ({
      platform: 'twitter',
      channelId: 'twitter:uid:12345678',
      contentSuffix: '18347',
      canonicalId: 'twitter:uid:12345678:18347',
      metadata: {},
    }),
    createVerificationChallenge: async () => ({
      nonce: '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex,
      challengeCode: 'challenge',
      channelId: 'twitter:uid:12345678',
      handle: '@alice',
      displayName: 'Alice',
      tweetTemplate: 'Claiming',
      deadline: 1_700_000_000,
    }),
    confirmVerification: async () => ({
      proof: {
        channelId: 'twitter:uid:12345678',
        claimant: '0x1234567890123456789012345678901234567890' as Address,
        nonce: '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex,
        deadline: 1_700_000_000,
        verifierSignature: '0x11' as Hex,
      },
    }),
    health: () => ({ ok: true }),
  } as unknown as PlatformApiService;
}
