import type { Request, Response } from 'express';
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
}) {
  const upstreamBase = options.upstreamGatewayUrl.replace(/\/$/, '');
  const fetchContent = options.fetchContent ?? fetch;

  return async (req: Request, res: Response): Promise<void> => {
    const decision = evaluatePolicyServe(options.runtime.snapshot(), req.params.cid);
    res.set(policySurfaceHeaders(decision.report));

    if (decision.decision === 'refuse') {
      res.status(decision.reason === 'policy' ? 451 : 503).json({
        error: decision.reason === 'policy' ? 'content_refused_by_policy' : 'policy_unavailable',
      });
      return;
    }

    const upstream = await fetchContent(`${upstreamBase}/${encodeURIComponent(req.params.cid)}`);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'content_unavailable' });
      return;
    }

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.type(contentType);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  };
}
