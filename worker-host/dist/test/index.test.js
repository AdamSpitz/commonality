import assert from 'node:assert';
import express from 'express';
import { describe, it } from 'mocha';
import { parseWorkerHostConfig } from '../src/config.js';
import { createWorkerHostApp } from '../src/index.js';
function createStubApp(name) {
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
    const app = createWorkerHostApp({
        port: 0,
        workers: [
            {
                name: 'implication-graph-nudger',
                kind: 'implication-graph-nudger',
                routePrefix: '/implication-graph-nudger',
                config: {},
            },
            {
                name: 'bridge-creator',
                kind: 'bridge-creator',
                routePrefix: '/bridge-creator',
                config: {},
            },
        ],
    }, {
        workerAppFactories: {
            'implication-graph-nudger': () => createStubApp('implication-graph-nudger'),
            'bridge-creator': () => createStubApp('bridge-creator'),
        },
    });
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, () => resolve(instance));
    });
    const address = server.address();
    return {
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((resolve, reject) => {
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
describe('worker host', () => {
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
        }
        finally {
            await server.close();
        }
    });
    it('parses routed worker config and requires a host port', () => {
        const parsed = parseWorkerHostConfig({
            port: 3000,
            workers: [
                {
                    name: 'explorer-curator',
                    kind: 'explorer-curator',
                    routePrefix: '/explorer-curator',
                    config: { foo: 'bar' },
                },
            ],
        });
        assert.strictEqual(parsed.port, 3000);
        assert.strictEqual(parsed.workers[0]?.routePrefix, '/explorer-curator');
        assert.throws(() => parseWorkerHostConfig({
            workers: [
                {
                    name: 'explorer-curator',
                    kind: 'explorer-curator',
                    routePrefix: '/explorer-curator',
                    config: {},
                },
            ],
        }), /port is required/);
    });
});
//# sourceMappingURL=index.test.js.map