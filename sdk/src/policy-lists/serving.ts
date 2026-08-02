import type { PolicyEvaluationResult, PolicyRuntimeStatus } from './bundles.js';
import type { PolicyRuntimeSnapshot } from './runtime.js';

export const POLICY_STATUS_HEADER = 'x-commonality-policy-status';
export const POLICY_DIGEST_HEADER = 'x-commonality-policy-digest';

export interface PolicySurfaceReport {
  status: PolicyRuntimeStatus;
  digest?: `0x${string}`;
}

export type PolicyServeDecision =
  | {
      decision: 'serve';
      report: PolicySurfaceReport;
      evaluation: PolicyEvaluationResult;
    }
  | {
      decision: 'refuse';
      reason: 'policy';
      report: PolicySurfaceReport;
      evaluation: PolicyEvaluationResult;
    }
  | {
      decision: 'refuse';
      reason: 'unavailable';
      report: PolicySurfaceReport;
    };

/** Return the digest and runtime status a surface is enforcing. */
export function policySurfaceReport(snapshot: PolicyRuntimeSnapshot): PolicySurfaceReport {
  return snapshot.bundle
    ? { status: snapshot.status, digest: snapshot.bundle.digest }
    : { status: snapshot.status };
}

/**
 * Guard a CID-addressed content-serving route with one atomic runtime snapshot.
 *
 * Cold start fails closed because there is no activated policy with which to
 * verify the requested bytes. A stale last-known-good bundle remains usable and
 * is reported as stale, matching the content-policy freshness rules.
 */
export function evaluatePolicyServe(
  snapshot: PolicyRuntimeSnapshot,
  cid: string,
): PolicyServeDecision {
  const report = policySurfaceReport(snapshot);
  if (!snapshot.evaluator) {
    return { decision: 'refuse', reason: 'unavailable', report };
  }

  const evaluation = snapshot.evaluator.evaluate('refuse-serve', { cid });
  if (evaluation.decision === 'block') {
    return { decision: 'refuse', reason: 'policy', report, evaluation };
  }
  return { decision: 'serve', report, evaluation };
}

/** Headers for HTTP responses, including denials and unavailable cold starts. */
export function policySurfaceHeaders(report: PolicySurfaceReport): Readonly<Record<string, string>> {
  return report.digest
    ? { [POLICY_STATUS_HEADER]: report.status, [POLICY_DIGEST_HEADER]: report.digest }
    : { [POLICY_STATUS_HEADER]: report.status };
}
