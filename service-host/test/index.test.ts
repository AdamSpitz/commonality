import assert from 'node:assert';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { describe, it } from 'mocha';
import { parseServiceHostConfig } from '../src/config.js';
import { loadServiceHostConfigFromEnv } from '../src/envConfig.js';
import { createServiceHostApp } from '../src/index.js';

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
  const app = createServiceHostApp(
    {
      port: 0,
      services: [
        {
          name: 'implication-graph-nudger',
          kind: 'implication-graph-nudger',
          routePrefix: '/implication-graph-nudger',
          config: {} as never,
        },
        {
          name: 'bridge-creator',
          kind: 'bridge-creator',
          routePrefix: '/bridge-creator',
          config: {} as never,
        },
      ],
    },
    {
      serviceAppFactories: {
        'implication-graph-nudger': () => createStubApp('implication-graph-nudger'),
        'bridge-creator': () => createStubApp('bridge-creator'),
      },
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

describe('service host', () => {
  it('mounts routed worker apps under their configured prefixes', async () => {
    const server = await withServer();

    try {
      const implicationResponse = await fetch(`${server.baseUrl}/implication-graph-nudger/quote`);
      assert.strictEqual(implicationResponse.status, 200);
      assert.deepStrictEqual(await implicationResponse.json(), {
        service: 'implication-graph-nudger',
        route: 'quote',
      });

      const bridgeResponse = await fetch(`${server.baseUrl}/bridge-creator/quote`);
      assert.strictEqual(bridgeResponse.status, 200);
      assert.deepStrictEqual(await bridgeResponse.json(), {
        service: 'bridge-creator',
        route: 'quote',
      });

      const unprefixedResponse = await fetch(`${server.baseUrl}/quote`);
      assert.strictEqual(unprefixedResponse.status, 404);
    } finally {
      await server.close();
    }
  });

  it('parses routed worker config and requires a host port', () => {
    const parsed = parseServiceHostConfig({
      port: 3000,
      services: [
        {
          name: 'explorer-curator',
          kind: 'explorer-curator',
          routePrefix: '/explorer-curator',
          config: { foo: 'bar' },
        },
      ],
    });

    assert.strictEqual(parsed.port, 3000);
    assert.strictEqual(parsed.services[0]?.routePrefix, '/explorer-curator');

    assert.throws(
      () => parseServiceHostConfig({
        services: [
          {
            name: 'explorer-curator',
            kind: 'explorer-curator',
            routePrefix: '/explorer-curator',
            config: {},
          },
        ],
      }),
      /port is required/,
    );
  });

  it('builds the bundled service config from environment variables', () => {
    const config = loadServiceHostConfigFromEnv({
      SERVICE_HOST_PORT: '3011',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      INDEXER_URL: 'http://indexer.example',
      IPFS_API: 'http://ipfs-api.example',
      IPFS_GATEWAY: 'http://ipfs-gateway.example',
      IPFS_GATEWAY_URL: 'http://ipfs-gateway-url.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: '0xnudges',
      EVENT_CACHE_URL: 'http://events.example',
      PLATFORM_API_URL: 'http://platform.example',
      BELIEFS_CONTRACT_ADDRESS: '0xbeliefs',
      IMPLICATIONS_CONTRACT_ADDRESS: '0ximplications',
      IMPLICATION_FINDER_ATTESTER_URL: 'http://attester.example/implication-attester',
      IMPLICATION_FINDER_ATTESTER_FINDER_KEY: 'implication-finder-key',
      CONTENT_FINDER_ATTESTER_URL: 'http://attester.example/content-attester',
      CONTENT_FINDER_ATTESTER_FINDER_KEY: 'content-finder-key',
      IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY: '0xgraph',
      BRIDGE_CREATOR_PRIVATE_KEY: '0xbridge',
      BRIDGE_CREATOR_COMMONALITY_STATEMENTS: 'One, Two',
      EXPLORER_CURATOR_PRIVATE_KEY: '0xexplorer',
      EXPLORER_CURATOR_STREAM: 'fundable-project-explorer',
      IMPLICATION_ATTESTER_PRIVATE_KEY: '0ximplication',
      CONTENT_ATTESTER_PRIVATE_KEY: '0xcontent',
      IMPLICATION_ATTESTER_ROUTE_PREFIX: '/implication-attester',
      CONTENT_ATTESTER_ROUTE_PREFIX: '/content-attester',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0xalignment',
      ALIGNMENT_TOPIC_STATEMENT_CID: 'bafybeig',
      IMPLICATION_ATTESTER_PAYMENT_ADDRESS: '0xattesterPayment',
      CONTENT_ATTESTER_PAYMENT_ADDRESS: '0xcontentPayment',
      CONTENT_ATTESTER_PROMPT_TEMPLATE: 'Evaluate content: {{content}}',
    });

    assert.strictEqual(config.port, 3011);
    assert.strictEqual(config.services.length, 7);
    assert.strictEqual(config.services[0]?.name, 'implication-attester');
    assert.strictEqual(config.services[0]?.kind, 'implication-attester');
    assert.strictEqual(config.services[0]?.routePrefix, '/implication-attester');
    assert.strictEqual(config.services[1]?.name, 'content-attester');
    assert.strictEqual(config.services[1]?.kind, 'content-attester');
    assert.strictEqual(config.services[1]?.routePrefix, '/content-attester');
  });

  it('does not require worker-only env vars for an attester-only bundle', () => {
    const config = loadServiceHostConfigFromEnv({
      SERVICE_HOST_PORT: '3011',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      IMPLICATIONS_CONTRACT_ADDRESS: '0ximplications',
      IMPLICATION_ATTESTER_PRIVATE_KEY: '0ximplication',
      IMPLICATION_ATTESTER_PAYMENT_ADDRESS: '0xattesterPayment',
      CONTENT_ATTESTER_PRIVATE_KEY: '0xcontent',
      CONTENT_ATTESTER_PAYMENT_ADDRESS: '0xcontentPayment',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0xalignment',
      ALIGNMENT_TOPIC_STATEMENT_CID: 'bafybeig',
      CONTENT_ATTESTER_PROMPT_TEMPLATE: 'Evaluate content: {{content}}',
      IMPLICATION_FINDER_ENABLED: 'false',
      CONTENT_FINDER_ENABLED: 'false',
      IMPLICATION_GRAPH_NUDGER_ENABLED: 'false',
      BRIDGE_CREATOR_ENABLED: 'false',
      EXPLORER_CURATOR_ENABLED: 'false',
    });

    assert.deepStrictEqual(config.services.map((service) => service.name), [
      'implication-attester',
      'content-attester',
    ]);
  });

  it('does not require attester-only env vars for a worker-only bundle', () => {
    const config = loadServiceHostConfigFromEnv({
      SERVICE_HOST_PORT: '3011',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      INDEXER_URL: 'http://indexer.example',
      IPFS_API: 'http://ipfs-api.example',
      IPFS_GATEWAY: 'http://ipfs-gateway.example',
      IPFS_GATEWAY_URL: 'http://ipfs-gateway-url.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: '0xnudges',
      EVENT_CACHE_URL: 'http://events.example',
      PLATFORM_API_URL: 'http://platform.example',
      BELIEFS_CONTRACT_ADDRESS: '0xbeliefs',
      IMPLICATIONS_CONTRACT_ADDRESS: '0ximplications',
      IMPLICATION_FINDER_ATTESTER_URL: 'http://attester.example/implication-attester',
      IMPLICATION_FINDER_ATTESTER_FINDER_KEY: 'implication-finder-key',
      CONTENT_FINDER_ATTESTER_URL: 'http://attester.example/content-attester',
      CONTENT_FINDER_ATTESTER_FINDER_KEY: 'content-finder-key',
      IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY: '0xgraph',
      BRIDGE_CREATOR_PRIVATE_KEY: '0xbridge',
      EXPLORER_CURATOR_PRIVATE_KEY: '0xexplorer',
      IMPLICATION_ATTESTER_ENABLED: 'false',
      CONTENT_ATTESTER_ENABLED: 'false',
    });

    assert.deepStrictEqual(config.services.map((service) => service.name), [
      'implication-finder',
      'content-finder',
      'implication-graph-nudger',
      'bridge-creator',
      'explorer-curator',
    ]);
  });

  it('builds multiple instances of the same kind from SERVICE_HOST_INSTANCES', () => {
    const config = loadServiceHostConfigFromEnv({
      SERVICE_HOST_PORT: '3011',
      SERVICE_HOST_INSTANCES: 'content-attester-neutral,content-attester-left-eval-right',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0xalignment',
      ALIGNMENT_TOPIC_STATEMENT_CID: 'bafybeig',
      CONTENT_ATTESTER_PRIVATE_KEY: '0xcontent',
      CONTENT_ATTESTER_PAYMENT_ADDRESS: '0xcontentPayment',
      CONTENT_ATTESTER_NEUTRAL_PROMPT_TEMPLATE: 'Neutral prompt: {{content}}',
      CONTENT_ATTESTER_LEFT_EVAL_RIGHT_PROMPT_TEMPLATE: 'Left-eval-right prompt: {{content}}',
    });

    assert.strictEqual(config.services.length, 2);
    assert.strictEqual(config.services[0]?.name, 'content-attester-neutral');
    assert.strictEqual(config.services[0]?.kind, 'content-attester');
    assert.strictEqual(config.services[0]?.routePrefix, '/content-attester-neutral');
    assert.strictEqual(config.services[1]?.name, 'content-attester-left-eval-right');
    assert.strictEqual(config.services[1]?.kind, 'content-attester');
    assert.strictEqual(config.services[1]?.routePrefix, '/content-attester-left-eval-right');
  });

  it('prefers instance-specific env vars over kind-level env vars', () => {
    const config = loadServiceHostConfigFromEnv({
      SERVICE_HOST_PORT: '3011',
      SERVICE_HOST_INSTANCES: 'content-attester-primary,content-attester-secondary',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0xalignment',
      ALIGNMENT_TOPIC_STATEMENT_CID: 'bafybeig',
      CONTENT_ATTESTER_PRIVATE_KEY: '0xshared',
      CONTENT_ATTESTER_PAYMENT_ADDRESS: '0xcontentPayment',
      CONTENT_ATTESTER_PROMPT_TEMPLATE: 'Fallback prompt',
      CONTENT_ATTESTER_PRIMARY_PROMPT_TEMPLATE: 'Primary-specific prompt',
      CONTENT_ATTESTER_SECONDARY_PROMPT_TEMPLATE: 'Secondary-specific prompt',
    });

    assert.strictEqual(config.services.length, 2);
    assert.strictEqual(
      (config.services[0]?.config as Record<string, unknown>).promptTemplate,
      'Primary-specific prompt',
    );
    assert.strictEqual(
      (config.services[1]?.config as Record<string, unknown>).promptTemplate,
      'Secondary-specific prompt',
    );
  });

  it('falls back to kind-level env vars when instance-specific vars are not set', () => {
    const config = loadServiceHostConfigFromEnv({
      SERVICE_HOST_PORT: '3011',
      SERVICE_HOST_INSTANCES: 'content-attester-neutral,content-attester-left-eval-right',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0xalignment',
      ALIGNMENT_TOPIC_STATEMENT_CID: 'bafybeig',
      CONTENT_ATTESTER_PRIVATE_KEY: '0xcontent',
      CONTENT_ATTESTER_PAYMENT_ADDRESS: '0xcontentPayment',
      CONTENT_ATTESTER_PROMPT_TEMPLATE: 'Shared prompt for all instances',
    });

    assert.strictEqual(config.services.length, 2);
    assert.strictEqual(
      (config.services[0]?.config as Record<string, unknown>).promptTemplate,
      'Shared prompt for all instances',
    );
    assert.strictEqual(
      (config.services[1]?.config as Record<string, unknown>).promptTemplate,
      'Shared prompt for all instances',
    );
  });

  it('uses explicit route prefix from kind-level env var in multi-instance mode', () => {
    const config = loadServiceHostConfigFromEnv({
      SERVICE_HOST_PORT: '3011',
      SERVICE_HOST_INSTANCES: 'content-attester-neutral',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0xalignment',
      ALIGNMENT_TOPIC_STATEMENT_CID: 'bafybeig',
      CONTENT_ATTESTER_PRIVATE_KEY: '0xcontent',
      CONTENT_ATTESTER_PAYMENT_ADDRESS: '0xcontentPayment',
      CONTENT_ATTESTER_PROMPT_TEMPLATE: 'Prompt',
      CONTENT_ATTESTER_ROUTE_PREFIX: '/custom-content-attester',
    });

    assert.strictEqual(config.services[0]?.routePrefix, '/custom-content-attester');
  });

  it('throws when instance name does not match a known kind', () => {
    assert.throws(
      () => loadServiceHostConfigFromEnv({
        SERVICE_HOST_INSTANCES: 'unknown-service-foo',
        ETHEREUM_RPC_URL: 'http://rpc.example',
      }),
      /Cannot derive service kind/,
    );
  });

  it('supports mixed kinds in SERVICE_HOST_INSTANCES', () => {
    const config = loadServiceHostConfigFromEnv({
      SERVICE_HOST_PORT: '3011',
      SERVICE_HOST_INSTANCES: 'content-attester-neutral,implication-graph-nudger',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0xalignment',
      ALIGNMENT_TOPIC_STATEMENT_CID: 'bafybeig',
      CONTENT_ATTESTER_PRIVATE_KEY: '0xcontent',
      CONTENT_ATTESTER_PAYMENT_ADDRESS: '0xcontentPayment',
      CONTENT_ATTESTER_PROMPT_TEMPLATE: 'Prompt',
      IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY: '0xgraph',
      NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: '0xnudges',
    });

    assert.strictEqual(config.services.length, 2);
    assert.strictEqual(config.services[0]?.kind, 'content-attester');
    assert.strictEqual(config.services[1]?.kind, 'implication-graph-nudger');
  });
});
