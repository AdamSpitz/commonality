import type { Request, Response as ExpressResponse } from 'express';
import { HttpError } from './errors.js';
import {
  evaluatePolicyServe,
  policySurfaceHeaders,
  type PolicyBundleRuntime,
} from '@commonality/sdk/policy-lists';

/**
 * Serve CID-addressed bytes through the operator's active policy bundle.
 *
 * The upstream gateway remains an untrusted availability source. PublishedData
 * callers verify the returned bytes against the CID after this route returns.
 */
export function createPolicyContentGatewayHandler(options: {
  runtime: PolicyBundleRuntime;
  upstreamGatewayUrl: string;
  fetchContent?: typeof fetch;
  maxContentBytes?: number;
  timeoutMs?: number;
}) {
  const maxContentBytes = options.maxContentBytes ?? 8 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const upstreamBase = options.upstreamGatewayUrl.replace(/\/$/, '');
  const fetchContent = options.fetchContent ?? fetch;

  return async (req: Request, res: ExpressResponse): Promise<void> => {
    const decision = evaluatePolicyServe(options.runtime.snapshot(), req.params.cid);
    res.set(policySurfaceHeaders(decision.report));

    if (decision.decision === 'refuse') {
      res.status(decision.reason === 'policy' ? 451 : 503).json({
        error: decision.reason === 'policy' ? 'content_refused_by_policy' : 'policy_unavailable',
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const upstream = await fetchContent(`${upstreamBase}/${encodeURIComponent(req.params.cid)}`, {
        signal: controller.signal,
      });
      if (!upstream.ok) {
        await upstream.body?.cancel();
        res.status(upstream.status).json({ error: 'content_unavailable' });
        return;
      }

      const contentType = upstream.headers.get('content-type');
      if (contentType) res.type(contentType);
      res.send(await readBoundedResponseBody(upstream, maxContentBytes));
    } catch (error) {
      if (controller.signal.aborted) {
        throw new HttpError(504, 'content_gateway_timeout', 'Content gateway request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
}

/** Read an upstream body without ever buffering more than the configured cap. */
export async function readBoundedResponseBody(response: Response, maxBytes: number): Promise<Buffer> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    await response.body?.cancel();
    throw new HttpError(413, 'content_too_large', `Content exceeds the ${maxBytes}-byte limit`);
  }

  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, 'content_too_large', `Content exceeds the ${maxBytes}-byte limit`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length);
}
