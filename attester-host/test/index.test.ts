import assert from 'node:assert';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { describe, it } from 'mocha';
import { parseAttesterHostConfig } from '../src/config.js';
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
});
