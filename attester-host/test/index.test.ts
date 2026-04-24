import assert from 'node:assert';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { describe, it } from 'mocha';
import { parseAttesterHostConfig } from '../src/config.js';
import { loadAttesterHostConfigFromEnv } from '../src/envConfig.js';
import { createAttesterHostApp } from '../src/index.js';

function createStubApp(name: string) {
  const app = express();
  app.get('/health', (_req, res) => {
    res.json({ service: name });
  });
  app.get('/quote', (_req, res) => {
    res.json({ service: name, route: 'quote' });
  });
  return app;
}

async function withServer() {
  const app = createAttesterHostApp(
    {
      port: 0,
      implicationAttester: {
        routePrefix: '/implication-attester',
        config: {} as never,
      },
      contentAttester: {
        routePrefix: '/content-attester',
        config: {} as never,
      },
    },
    {
      createImplicationApp: () => createStubApp('implication'),
      createContentApp: () => createStubApp('content'),
    },
  );

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  };
}

describe('attester host', () => {
  it('mounts each attester under its configured route prefix', async () => {
    const server = await withServer();

    try {
      const implicationResponse = await fetch(`${server.baseUrl}/implication-attester/quote`);
      assert.strictEqual(implicationResponse.status, 200);
      assert.deepStrictEqual(await implicationResponse.json(), {
        service: 'implication',
        route: 'quote',
      });

      const contentResponse = await fetch(`${server.baseUrl}/content-attester/quote`);
      assert.strictEqual(contentResponse.status, 200);
      assert.deepStrictEqual(await contentResponse.json(), {
        service: 'content',
        route: 'quote',
      });

      const unprefixedResponse = await fetch(`${server.baseUrl}/quote`);
      assert.strictEqual(unprefixedResponse.status, 404);
    } finally {
      await server.close();
    }
  });

  it('parses the JSON config shape and rejects malformed route prefixes', () => {
    const parsed = parseAttesterHostConfig({
      port: 3000,
      implicationAttester: {
        routePrefix: '/implication-attester',
        config: { foo: 'bar' },
      },
      contentAttester: {
        routePrefix: '/content-attester',
        config: { baz: 'qux' },
      },
    });

    assert.strictEqual(parsed.port, 3000);
    assert.strictEqual(parsed.implicationAttester.routePrefix, '/implication-attester');
    assert.strictEqual(parsed.contentAttester.routePrefix, '/content-attester');

    assert.throws(
      () => parseAttesterHostConfig({
        port: 3000,
        implicationAttester: {
          routePrefix: 'implication-attester',
          config: {},
        },
        contentAttester: {
          routePrefix: '/content-attester',
          config: {},
        },
      }),
      /must start with/,
    );
  });

  it('builds host config from prefixed environment variables', () => {
    const config = loadAttesterHostConfigFromEnv({
      ATTESTER_HOST_PORT: '3010',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      IPFS_API: 'http://ipfs-api.example',
      IPFS_GATEWAY: 'http://ipfs-gateway.example',
      IMPLICATION_ATTESTER_PRIVATE_KEY: '0ximplication',
      IMPLICATIONS_CONTRACT_ADDRESS: '0ximplications',
      IMPLICATION_ATTESTER_PAYMENT_ADDRESS: '0xpay1',
      IMPLICATION_ATTESTER_TRUSTED_FINDER_KEY: 'implication-finder-secret',
      CONTENT_ATTESTER_PRIVATE_KEY: '0xcontent',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0xalignment',
      ALIGNMENT_TOPIC_STATEMENT_CID: 'bafycontent',
      CONTENT_ATTESTER_PAYMENT_ADDRESS: '0xpay2',
      CONTENT_ATTESTER_NAME: 'neutral',
      CONTENT_ATTESTER_PROMPT_TEMPLATE: 'prompt body',
      CONTENT_ATTESTER_TRUSTED_FINDER_KEY: 'finder-secret',
    });

    assert.strictEqual(config.port, 3010);
    assert.strictEqual(config.implicationAttester.routePrefix, '/implication-attester');
    assert.strictEqual(config.implicationAttester.config.port, 0);
    assert.strictEqual(config.implicationAttester.config.ethereumRpcUrl, 'http://rpc.example');
    assert.strictEqual(config.implicationAttester.config.trustedFinderKey, 'implication-finder-secret');
    assert.strictEqual(config.contentAttester.routePrefix, '/content-attester');
    assert.strictEqual(config.contentAttester.config.port, 0);
    assert.strictEqual(config.contentAttester.config.promptTemplate, 'prompt body');
    assert.strictEqual(config.contentAttester.config.trustedFinderKey, 'finder-secret');
  });
});
