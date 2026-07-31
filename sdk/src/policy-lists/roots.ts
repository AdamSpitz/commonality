import {
  POLICY_ACTIONS,
  POLICY_ACTION_SUBJECT_TYPES,
  type PolicyAction,
} from './actions.js';
import type { PolicySubjectType } from './subjects.js';

export const POLICY_ROOT_SCHEMA = 'commonality.policy-root/v1' as const;
export const POLICY_ON_ERROR_VALUES = ['closed', 'open'] as const;

export type PolicyOnError = (typeof POLICY_ON_ERROR_VALUES)[number];
export type PolicyActionMap = Readonly<Record<string, Partial<Record<PolicySubjectType, readonly PolicyAction[]>>>>;

export interface LocalPolicyListRef {
  source: string;
  contentHash?: `0x${string}`;
}

export interface PolicyRootException {
  ref: LocalPolicyListRef & { contentHash: `0x${string}` };
}

export interface PolicyRootLayer {
  id: string;
  ref: LocalPolicyListRef;
  op: 'block';
  except?: PolicyRootException;
  maxResolutionAge?: string;
  onError: PolicyOnError;
  maxAdded?: string;
  maxRemoved?: string;
}

export interface PolicyRootDocument {
  schema: typeof POLICY_ROOT_SCHEMA;
  layers: readonly PolicyRootLayer[];
  actions: PolicyActionMap;
  honoredRetractors: readonly `0x${string}`[];
}

export class PolicyRootValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyRootValidationError';
  }
}

const LAYER_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const DECIMAL_UINT64 = /^(0|[1-9][0-9]{0,19})$/;
const MAX_UINT64 = 18_446_744_073_709_551_615n;
const FIXED_DURATION = /^P(?=\d+D(?:T|$)|T)(?:\d+D)?(?:T(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/;
const SUBJECT_TYPES: readonly PolicySubjectType[] = ['cid', 'address', 'channel'];

function record(input: unknown, description: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new PolicyRootValidationError(`${description} must be an object`);
  }
  return input as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  const missing = required.find((key) => !Object.hasOwn(value, key));
  if (unknown) throw new PolicyRootValidationError(`Unknown policy root field: ${unknown}`);
  if (missing) throw new PolicyRootValidationError(`Missing policy root field: ${missing}`);
}

function parseHash(input: unknown, description: string): `0x${string}` {
  if (typeof input !== 'string' || !HASH.test(input)) {
    throw new PolicyRootValidationError(`${description} must be a lowercase 32-byte 0x hash`);
  }
  return input as `0x${string}`;
}

function parseRef(input: unknown, requireHash: boolean): LocalPolicyListRef {
  const value = record(input, 'Policy list ref');
  exactKeys(value, ['source', ...(requireHash ? ['contentHash'] : [])], requireHash ? [] : ['contentHash']);
  if (typeof value.source !== 'string' || (!value.source.startsWith('file:') && !value.source.startsWith('https:'))) {
    throw new PolicyRootValidationError('Policy list ref source must be a file: or https: locator');
  }
  if (value.source === 'file:' || value.source === 'https:') {
    throw new PolicyRootValidationError('Policy list ref source locator must not be empty');
  }
  if (value.source.startsWith('https:')) {
    try {
      const url = new URL(value.source);
      if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) throw new Error();
    } catch {
      throw new PolicyRootValidationError('Policy list https: source must be an absolute URL without credentials');
    }
  }
  const ref: LocalPolicyListRef = { source: value.source };
  if (Object.hasOwn(value, 'contentHash')) ref.contentHash = parseHash(value.contentHash, 'Policy list ref contentHash');
  return ref;
}

function parseThreshold(input: unknown, field: string): string {
  if (typeof input !== 'string' || !DECIMAL_UINT64.test(input) || BigInt(input) > MAX_UINT64) {
    throw new PolicyRootValidationError(`${field} must be a canonical uint64 decimal string`);
  }
  return input;
}

function parseLayer(input: unknown): PolicyRootLayer {
  const value = record(input, 'Policy root layer');
  exactKeys(value, ['id', 'ref', 'op', 'onError'], ['except', 'maxResolutionAge', 'maxAdded', 'maxRemoved', 'maxDiff']);
  if (typeof value.id !== 'string' || !LAYER_ID.test(value.id)) throw new PolicyRootValidationError('Policy root layer id is invalid');
  if (value.op !== 'block') throw new PolicyRootValidationError('Policy root layer op must be block');
  if (value.onError !== 'closed' && value.onError !== 'open') throw new PolicyRootValidationError('Policy root layer onError must be closed or open');
  if (Object.hasOwn(value, 'maxDiff') && (Object.hasOwn(value, 'maxAdded') || Object.hasOwn(value, 'maxRemoved'))) {
    throw new PolicyRootValidationError('maxDiff cannot be combined with maxAdded or maxRemoved');
  }

  const layer: PolicyRootLayer = { id: value.id, ref: parseRef(value.ref, false), op: 'block', onError: value.onError };
  if (Object.hasOwn(value, 'except')) {
    const exception = record(value.except, 'Policy root exception');
    exactKeys(exception, ['ref']);
    layer.except = { ref: parseRef(exception.ref, true) as LocalPolicyListRef & { contentHash: `0x${string}` } };
  }
  if (Object.hasOwn(value, 'maxResolutionAge')) {
    if (typeof value.maxResolutionAge !== 'string' || !FIXED_DURATION.test(value.maxResolutionAge)) {
      throw new PolicyRootValidationError('maxResolutionAge must be a fixed ISO 8601 duration');
    }
    layer.maxResolutionAge = value.maxResolutionAge;
  }
  if (Object.hasOwn(value, 'maxDiff')) {
    const threshold = parseThreshold(value.maxDiff, 'maxDiff');
    layer.maxAdded = threshold;
    layer.maxRemoved = threshold;
  } else {
    if (Object.hasOwn(value, 'maxAdded')) layer.maxAdded = parseThreshold(value.maxAdded, 'maxAdded');
    if (Object.hasOwn(value, 'maxRemoved')) layer.maxRemoved = parseThreshold(value.maxRemoved, 'maxRemoved');
  }
  return layer;
}

function parseActions(input: unknown): PolicyActionMap {
  const value = record(input, 'Policy root actions');
  const result: Record<string, Partial<Record<PolicySubjectType, readonly PolicyAction[]>>> = {};
  for (const [layerId, mapping] of Object.entries(value)) {
    const expanded: Partial<Record<PolicySubjectType, PolicyAction[]>> = {};
    if (Array.isArray(mapping)) {
      if (mapping.length === 0) throw new PolicyRootValidationError(`Action map for ${layerId} must not be empty`);
      for (const action of mapping) {
        if (!POLICY_ACTIONS.includes(action as PolicyAction)) throw new PolicyRootValidationError(`Unknown policy action: ${String(action)}`);
        for (const type of POLICY_ACTION_SUBJECT_TYPES[action as PolicyAction]) (expanded[type] ??= []).push(action as PolicyAction);
      }
    } else {
      const long = record(mapping, `Action map for ${layerId}`);
      if (Object.keys(long).length === 0) throw new PolicyRootValidationError(`Action map for ${layerId} must not be empty`);
      const unknownType = Object.keys(long).find((type) => !SUBJECT_TYPES.includes(type as PolicySubjectType));
      if (unknownType) throw new PolicyRootValidationError(`Unknown policy subject type in action map: ${unknownType}`);
      for (const [type, actions] of Object.entries(long) as [PolicySubjectType, unknown][]) {
        if (!Array.isArray(actions) || actions.length === 0) throw new PolicyRootValidationError(`Actions for ${layerId}.${type} must be a non-empty array`);
        for (const action of actions) {
          if (!POLICY_ACTIONS.includes(action as PolicyAction)) throw new PolicyRootValidationError(`Unknown policy action: ${String(action)}`);
          if (!POLICY_ACTION_SUBJECT_TYPES[action as PolicyAction].includes(type as never)) throw new PolicyRootValidationError(`${action as string} cannot extract ${type} subjects`);
          (expanded[type] ??= []).push(action as PolicyAction);
        }
      }
    }
    for (const type of SUBJECT_TYPES) {
      const actions = expanded[type];
      if (actions) expanded[type] = [...new Set(actions)].sort();
    }
    result[layerId] = expanded;
  }
  return result;
}

export function parsePolicyRootDocument(input: unknown): PolicyRootDocument {
  const value = record(input, 'Policy root document');
  exactKeys(value, ['schema', 'layers', 'actions', 'honoredRetractors']);
  if (value.schema !== POLICY_ROOT_SCHEMA) throw new PolicyRootValidationError(`Policy root schema must be ${POLICY_ROOT_SCHEMA}`);
  if (!Array.isArray(value.layers)) throw new PolicyRootValidationError('Policy root layers must be an array');
  const layers = value.layers.map(parseLayer);
  const ids = layers.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new PolicyRootValidationError('Policy root layer ids must be unique');
  const actions = parseActions(value.actions);
  const actionIds = Object.keys(actions);
  if (ids.some((id) => !Object.hasOwn(actions, id)) || actionIds.some((id) => !ids.includes(id))) {
    throw new PolicyRootValidationError('Policy root layers and action-map layer ids must correspond exactly');
  }
  if (!Array.isArray(value.honoredRetractors)) throw new PolicyRootValidationError('honoredRetractors must be an array');
  const honoredRetractors = value.honoredRetractors.map((address) => {
    if (typeof address !== 'string' || !ADDRESS.test(address)) throw new PolicyRootValidationError('honoredRetractors entries must be 20-byte 0x addresses');
    return address.toLowerCase() as `0x${string}`;
  });
  return { schema: POLICY_ROOT_SCHEMA, layers, actions, honoredRetractors: [...new Set(honoredRetractors)].sort() };
}
