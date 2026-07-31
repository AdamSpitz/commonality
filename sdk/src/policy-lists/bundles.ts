import type { PolicyAction, PolicyActionRequestMap } from './actions.js';
import {
  parseLocalPolicyListDocument,
  type LocalPolicyListDocument,
} from './documents.js';
import {
  parsePolicyActionMap,
  type PolicyActionMap,
  type PolicyOnError,
} from './roots.js';
import type { CanonicalPolicySubject } from './subjects.js';

export const POLICY_BUNDLE_SCHEMA = 'commonality.policy-bundle/v1' as const;
export const POLICY_RUNTIME_STATUSES = ['current', 'stale', 'unavailable'] as const;

export type PolicyRuntimeStatus = (typeof POLICY_RUNTIME_STATUSES)[number];
export type PolicyDecision = 'allow' | 'block';

export interface PolicyLookupResult {
  assertedBy: readonly string[];
  digest: `0x${string}`;
}

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  assertedBy: readonly string[];
  subjects: readonly CanonicalPolicySubject[];
  digest: `0x${string}`;
  status: PolicyRuntimeStatus;
}

export interface ResolvedPolicyArtifact {
  source: string;
  contentHash: `0x${string}`;
  document: LocalPolicyListDocument;
}

export interface ResolvedPolicyException {
  ref?: ResolvedPolicyArtifact;
  unresolved?: true;
}

export interface ResolvedPolicyLayer {
  id: string;
  ref?: ResolvedPolicyArtifact;
  unresolved?: true;
  except?: ResolvedPolicyException;
  onError: PolicyOnError;
  freshness?: { maxResolutionAge: string };
  maxAdded?: string;
  maxRemoved?: string;
}

export interface ResolvedPolicyBundle {
  schema: typeof POLICY_BUNDLE_SCHEMA;
  layers: readonly ResolvedPolicyLayer[];
  actions: PolicyActionMap;
  honoredRetractors: readonly `0x${string}`[];
  sequence: string;
  digest: `0x${string}`;
}

/** Evaluator signature preserving the action/request relationship at compile time. */
export interface PolicyEvaluator {
  lookup(subject: CanonicalPolicySubject): PolicyLookupResult;
  evaluate<Action extends PolicyAction>(
    action: Action,
    request: PolicyActionRequestMap[Action],
  ): PolicyEvaluationResult;
}

export class PolicyBundleValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PolicyBundleValidationError';
  }
}

const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const LAYER_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const UINT64 = /^(0|[1-9][0-9]{0,19})$/;
const MAX_UINT64 = 18_446_744_073_709_551_615n;
const FIXED_DURATION = /^P(?=\d+D(?:T|$)|T)(?:\d+D)?(?:T(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/;

function record(input: unknown, description: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new PolicyBundleValidationError(`${description} must be an object`);
  }
  return input as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  const missing = required.find((key) => !Object.hasOwn(value, key));
  if (unknown) throw new PolicyBundleValidationError(`Unknown policy bundle field: ${unknown}`);
  if (missing) throw new PolicyBundleValidationError(`Missing policy bundle field: ${missing}`);
}

function hash(input: unknown, description: string): `0x${string}` {
  if (typeof input !== 'string' || !HASH.test(input)) {
    throw new PolicyBundleValidationError(`${description} must be a lowercase 32-byte 0x hash`);
  }
  return input as `0x${string}`;
}

function threshold(input: unknown, field: string): string {
  if (typeof input !== 'string' || !UINT64.test(input) || BigInt(input) > MAX_UINT64) {
    throw new PolicyBundleValidationError(`${field} must be a canonical uint64 decimal string`);
  }
  return input;
}

function artifact(input: unknown): ResolvedPolicyArtifact {
  const value = record(input, 'Resolved policy artifact');
  exactKeys(value, ['source', 'contentHash', 'document']);
  if (typeof value.source !== 'string' || (!value.source.startsWith('file:') && !value.source.startsWith('https:'))) {
    throw new PolicyBundleValidationError('Resolved policy artifact source must be a file: or https: locator');
  }
  let document: LocalPolicyListDocument;
  try {
    document = parseLocalPolicyListDocument(value.document);
  } catch (error) {
    throw new PolicyBundleValidationError('Resolved policy artifact document is invalid', { cause: error });
  }
  return {
    source: value.source,
    contentHash: hash(value.contentHash, 'Resolved policy artifact contentHash'),
    document,
  };
}

function exception(input: unknown): ResolvedPolicyException {
  const value = record(input, 'Resolved policy exception');
  const isUnresolved = value.unresolved === true;
  exactKeys(value, isUnresolved ? ['unresolved'] : ['ref']);
  return isUnresolved ? { unresolved: true } : { ref: artifact(value.ref) };
}

function layer(input: unknown): ResolvedPolicyLayer {
  const value = record(input, 'Resolved policy layer');
  const isUnresolved = value.unresolved === true;
  exactKeys(value, ['id', 'onError', ...(isUnresolved ? ['unresolved'] : ['ref'])], ['except', 'freshness', 'maxAdded', 'maxRemoved']);
  if (typeof value.id !== 'string' || !LAYER_ID.test(value.id)) throw new PolicyBundleValidationError('Resolved policy layer id is invalid');
  if (value.onError !== 'closed' && value.onError !== 'open') throw new PolicyBundleValidationError('Resolved policy layer onError must be closed or open');
  const result: ResolvedPolicyLayer = { id: value.id, onError: value.onError };
  if (isUnresolved) result.unresolved = true;
  else result.ref = artifact(value.ref);
  if (Object.hasOwn(value, 'except')) result.except = exception(value.except);
  if (Object.hasOwn(value, 'freshness')) {
    const freshness = record(value.freshness, 'Resolved policy freshness');
    exactKeys(freshness, ['maxResolutionAge']);
    if (typeof freshness.maxResolutionAge !== 'string' || !FIXED_DURATION.test(freshness.maxResolutionAge)) {
      throw new PolicyBundleValidationError('maxResolutionAge must be a fixed ISO 8601 duration');
    }
    result.freshness = { maxResolutionAge: freshness.maxResolutionAge };
  }
  if (Object.hasOwn(value, 'maxAdded')) result.maxAdded = threshold(value.maxAdded, 'maxAdded');
  if (Object.hasOwn(value, 'maxRemoved')) result.maxRemoved = threshold(value.maxRemoved, 'maxRemoved');
  return result;
}

export function parseResolvedPolicyBundle(input: unknown): ResolvedPolicyBundle {
  const value = record(input, 'Resolved policy bundle');
  exactKeys(value, ['schema', 'layers', 'actions', 'honoredRetractors', 'sequence', 'digest']);
  if (value.schema !== POLICY_BUNDLE_SCHEMA) throw new PolicyBundleValidationError(`Policy bundle schema must be ${POLICY_BUNDLE_SCHEMA}`);
  if (!Array.isArray(value.layers)) throw new PolicyBundleValidationError('Policy bundle layers must be an array');
  const layers = value.layers.map(layer);
  const ids = layers.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new PolicyBundleValidationError('Policy bundle layer ids must be unique');
  let actions: PolicyActionMap;
  try {
    actions = parsePolicyActionMap(value.actions);
  } catch (error) {
    throw new PolicyBundleValidationError('Invalid policy bundle action map', { cause: error });
  }
  const actionIds = Object.keys(actions);
  if (ids.some((id) => !Object.hasOwn(actions, id)) || actionIds.some((id) => !ids.includes(id))) {
    throw new PolicyBundleValidationError('Policy bundle layers and action-map layer ids must correspond exactly');
  }
  if (!Array.isArray(value.honoredRetractors)) throw new PolicyBundleValidationError('honoredRetractors must be an array');
  const honoredRetractors = value.honoredRetractors.map((address) => {
    if (typeof address !== 'string' || !ADDRESS.test(address)) throw new PolicyBundleValidationError('honoredRetractors entries must be 20-byte 0x addresses');
    return address.toLowerCase() as `0x${string}`;
  });
  if (typeof value.sequence !== 'string' || !DECIMAL.test(value.sequence)) throw new PolicyBundleValidationError('Policy bundle sequence must be a canonical decimal string');
  return {
    schema: POLICY_BUNDLE_SCHEMA,
    layers,
    actions,
    honoredRetractors: [...new Set(honoredRetractors)].sort(),
    sequence: value.sequence,
    digest: hash(value.digest, 'Policy bundle digest'),
  };
}
