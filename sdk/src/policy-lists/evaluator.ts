import type { PolicyLookupResult, ResolvedPolicyArtifact, ResolvedPolicyBundle } from './bundles.js';
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
