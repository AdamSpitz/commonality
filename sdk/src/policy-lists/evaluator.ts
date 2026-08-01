import { extractPolicySubjects, type PolicyAction, type PolicyActionRequestMap } from './actions.js';
import type {
  PolicyEvaluator,
  PolicyLookupResult,
  PolicyRuntimeStatus,
  ResolvedPolicyArtifact,
  ResolvedPolicyBundle,
} from './bundles.js';
import { policySubjectKey, type CanonicalPolicySubject, type PolicySubjectKey } from './subjects.js';

function artifactSubjectKeys(artifact: ResolvedPolicyArtifact | undefined): Set<PolicySubjectKey> {
  return new Set(
    artifact?.document.entries.map(({ subject }) => policySubjectKey(subject)) ?? [],
  );
}

/**
 * Build the pure membership lookup for one already-validated, immutable bundle.
 *
 * Unresolved block layers assert nothing because the bundle has no membership data
 * for them. An unresolved exception likewise subtracts nothing; resolver/runtime
 * status handling is deliberately separate from exact membership evaluation.
 */
export function createPolicyLookup(
  bundle: ResolvedPolicyBundle,
): (subject: CanonicalPolicySubject) => PolicyLookupResult {
  const layers = bundle.layers.map((layer) => ({
    id: layer.id,
    blocked: artifactSubjectKeys(layer.ref),
    excepted: artifactSubjectKeys(layer.except?.ref),
  }));

  return (subject) => {
    const key = policySubjectKey(subject);
    return {
      assertedBy: layers
        .filter(({ blocked, excepted }) => blocked.has(key) && !excepted.has(key))
        .map(({ id }) => id),
      digest: bundle.digest,
    };
  };
}

/** Look up one subject without retaining a reusable indexed lookup. */
export function lookupPolicySubject(
  bundle: ResolvedPolicyBundle,
  subject: CanonicalPolicySubject,
): PolicyLookupResult {
  return createPolicyLookup(bundle)(subject);
}

/** Build the action-aware evaluator for one atomically activated bundle. */
export function createPolicyEvaluator(
  bundle: ResolvedPolicyBundle,
  status: PolicyRuntimeStatus,
): PolicyEvaluator {
  const lookup = createPolicyLookup(bundle);
  const layerOrder = bundle.layers.map(({ id }) => id);
  const unresolvedClosedLayers = new Set(
    bundle.layers
      .filter((layer) => layer.unresolved === true && layer.onError === 'closed')
      .map(({ id }) => id),
  );

  function evaluate<Action extends PolicyAction>(
    action: Action,
    request: PolicyActionRequestMap[Action],
  ) {
    const subjects = extractPolicySubjects(action, request);
    const decisiveLayers = new Set<string>();

    for (const subject of subjects) {
      for (const layerId of lookup(subject).assertedBy) {
        if (bundle.actions[layerId]?.[subject.type]?.includes(action)) {
          decisiveLayers.add(layerId);
        }
      }

      for (const layerId of unresolvedClosedLayers) {
        if (bundle.actions[layerId]?.[subject.type]?.includes(action)) {
          decisiveLayers.add(layerId);
        }
      }
    }

    const assertedBy = layerOrder.filter((layerId) => decisiveLayers.has(layerId));
    return {
      decision: assertedBy.length > 0 ? 'block' as const : 'allow' as const,
      assertedBy,
      subjects,
      digest: bundle.digest,
      status,
    };
  }

  return { lookup, evaluate };
}
