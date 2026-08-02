import assert from 'node:assert/strict';
import {
  POLICY_BUNDLE_SCHEMA,
  PolicyBundleRuntime,
  canonicalJsonSha256,
  resolvedPolicyBundleDigest,
  type JsonValue,
} from '@commonality/sdk/policy-lists';
import type { Request, Response as ExpressResponse } from 'express';
import { HttpError } from './errors.js';
import { createPolicyContentGatewayHandler, readBoundedResponseBody } from './policyContentGateway.js';

const BLOCKED_CID = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m' as const;
const ALLOWED_CID = 'bafkreib6z3wp7uj3d7ct6e3efwvl7yuxtzvqhvzq2g3m5v45x7zqsc2xmi' as const;

describe('policy content gateway bounds', () => {
  it('rejects a declared oversized response without reading it', async () => {
    const response = new globalThis.Response('too large', { headers: { 'content-length': '100' } });
    await assert.rejects(
      readBoundedResponseBody(response, 10),
      (error: unknown) => error instanceof HttpError && error.status === 413,
    );
  });

  it('rejects a streamed response that crosses the byte cap', async () => {
    const response = new globalThis.Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(8));
        controller.enqueue(new Uint8Array(8));
        controller.close();
      },
    }));
    await assert.rejects(
      readBoundedResponseBody(response, 10),
      (error: unknown) => error instanceof HttpError && error.status === 413,
    );
  });

  it('aborts a stalled upstream request at the configured timeout', async () => {
    const handler = createPolicyContentGatewayHandler({
      runtime: activeRuntime(),
      upstreamGatewayUrl: 'https://ipfs.example/ipfs',
      timeoutMs: 5,
      fetchContent: async (_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    });

    const request = { params: { cid: ALLOWED_CID } } as unknown as Request;
    const response = { set() { return this; } } as unknown as ExpressResponse;
    await assert.rejects(
      handler(request, response),
      (error: unknown) => error instanceof HttpError && error.status === 504,
    );
  });
});

function activeRuntime(): PolicyBundleRuntime {
  const document = {
    schema: 'commonality.policy-list-local/v1' as const,
    entries: [{ subject: { type: 'cid' as const, value: BLOCKED_CID } }],
  };
  const withoutDigest = {
    schema: POLICY_BUNDLE_SCHEMA,
    layers: [{
      id: 'starter',
      onError: 'closed' as const,
      ref: {
        source: 'https://lists.example/starter.json',
        contentHash: canonicalJsonSha256(document as JsonValue),
        document,
      },
    }],
    actions: { starter: { cid: ['refuse-serve' as const] } },
    honoredRetractors: [],
    sequence: '1',
  };
  const runtime = new PolicyBundleRuntime();
  runtime.activate({ ...withoutDigest, digest: resolvedPolicyBundleDigest(withoutDigest) });
  return runtime;
}
