import { parseResolvedPolicyBundle, type PolicyEvaluator, type PolicyRuntimeStatus, type ResolvedPolicyBundle } from './bundles.js';
import { createPolicyEvaluator } from './evaluator.js';

export interface PolicyRuntimeSnapshot {
  bundle?: ResolvedPolicyBundle;
  evaluator?: PolicyEvaluator;
  status: PolicyRuntimeStatus;
  error?: Error;
}

export interface PolicyBundleFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type PolicyBundleFetch = (url: string, init: { cache: 'no-store' }) => Promise<PolicyBundleFetchResponse>;

/** Owns one atomically replaceable policy bundle for browser or server surfaces. */
export class PolicyBundleRuntime {
  private snapshotValue: PolicyRuntimeSnapshot = { status: 'unavailable' };
  private refreshGeneration = 0;

  snapshot(): PolicyRuntimeSnapshot {
    return this.snapshotValue;
  }

  activate(input: unknown): PolicyRuntimeSnapshot {
    const bundle = parseResolvedPolicyBundle(input);
    this.snapshotValue = { bundle, evaluator: createPolicyEvaluator(bundle, 'current'), status: 'current' };
    return this.snapshotValue;
  }

  async refresh(url: string, fetchBundle: PolicyBundleFetch): Promise<PolicyRuntimeSnapshot> {
    const generation = ++this.refreshGeneration;
    try {
      const response = await fetchBundle(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load policy bundle: HTTP ${response.status}`);
      const bundle = parseResolvedPolicyBundle(await response.json());
      if (generation !== this.refreshGeneration) return this.snapshotValue;
      this.snapshotValue = { bundle, evaluator: createPolicyEvaluator(bundle, 'current'), status: 'current' };
    } catch (cause) {
      if (generation !== this.refreshGeneration) return this.snapshotValue;
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const bundle = this.snapshotValue.bundle;
      this.snapshotValue = bundle
        ? { bundle, evaluator: createPolicyEvaluator(bundle, 'stale'), status: 'stale', error }
        : { status: 'unavailable', error };
    }
    return this.snapshotValue;
  }
}
