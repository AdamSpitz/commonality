import { base32, base32upper } from 'multiformats/bases/base32';
import { base36, base36upper } from 'multiformats/bases/base36';
import { base58btc } from 'multiformats/bases/base58';
import { CID } from 'multiformats/cid';
import type { IpfsCidV1 } from '../utils/cid-types.js';

const RAW_CODEC = 0x55;
const SHA2_256_CODE = 0x12;
const SHA2_256_SIZE = 32;
const CANONICAL_DECIMAL = /^(0|[1-9][0-9]*)$/;
const LOWERCASE_ADDRESS = /^0x[0-9a-f]{40}$/;
const VISIBLE_ASCII_WITHOUT_COLON = /^[\x21-\x39\x3b-\x7e]+$/;
const UNPAIRED_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/;

const CID_DECODER = base32.decoder
  .or(base32upper.decoder)
  .or(base36.decoder)
  .or(base36upper.decoder)
  .or(base58btc.decoder);

export type PolicySubjectType = 'cid' | 'address' | 'channel';

export interface CidPolicySubject {
  type: 'cid';
  value: string;
}

export interface AddressPolicySubject {
  type: 'address';
  value: string;
  chainId: string;
}

export interface ChannelPolicySubject {
  type: 'channel';
  value: string;
}

export type PolicySubject = CidPolicySubject | AddressPolicySubject | ChannelPolicySubject;

export interface CanonicalCidPolicySubject {
  type: 'cid';
  value: IpfsCidV1;
}

export interface CanonicalAddressPolicySubject {
  type: 'address';
  value: `0x${string}`;
  chainId: string;
}

export interface CanonicalChannelPolicySubject {
  type: 'channel';
  value: string;
}

export type CanonicalPolicySubject =
  | CanonicalCidPolicySubject
  | CanonicalAddressPolicySubject
  | CanonicalChannelPolicySubject;

export type PolicySubjectKey =
  | `cid:${string}`
  | `address:${string}:${string}`
  | `channel:${string}`;

export class PolicySubjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicySubjectValidationError';
  }
}

function requireRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new PolicySubjectValidationError('Policy subject must be an object');
  }
  return input as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expectedKeys: readonly string[]): void {
  const expected = new Set(expectedKeys);
  const unknown = Object.keys(record).filter((key) => !expected.has(key));
  const missing = expectedKeys.filter((key) => !Object.hasOwn(record, key));

  if (unknown.length > 0) {
    throw new PolicySubjectValidationError(`Unknown policy subject field: ${unknown[0]}`);
  }
  if (missing.length > 0) {
    throw new PolicySubjectValidationError(`Missing policy subject field: ${missing[0]}`);
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new PolicySubjectValidationError(`Policy subject ${field} must be a string`);
  }
  if (UNPAIRED_SURROGATE.test(value)) {
    throw new PolicySubjectValidationError(`Policy subject ${field} must contain valid Unicode`);
  }
  return value;
}

function canonicalizeCid(value: string): IpfsCidV1 {
  let cid: CID;
  try {
    cid = CID.parse(value, CID_DECODER);
  } catch {
    throw new PolicySubjectValidationError(`Invalid CID policy subject: ${value}`);
  }

  if (cid.version !== 1) {
    throw new PolicySubjectValidationError('CID policy subjects must use CIDv1');
  }
  if (cid.code !== RAW_CODEC) {
    throw new PolicySubjectValidationError('CID policy subjects must use the raw codec');
  }
  if (cid.multihash.code !== SHA2_256_CODE || cid.multihash.size !== SHA2_256_SIZE) {
    throw new PolicySubjectValidationError('CID policy subjects must use a 32-byte sha2-256 multihash');
  }

  return cid.toString(base32) as IpfsCidV1;
}

function canonicalizeAddress(record: Record<string, unknown>): CanonicalAddressPolicySubject {
  const value = requireString(record.value, 'value');
  const chainId = requireString(record.chainId, 'chainId');

  if (!LOWERCASE_ADDRESS.test(value)) {
    throw new PolicySubjectValidationError(
      'Address policy subject value must be exactly 20 bytes of lowercase 0x hex',
    );
  }
  if (!CANONICAL_DECIMAL.test(chainId)) {
    throw new PolicySubjectValidationError(
      'Address policy subject chainId must be a canonical unsigned decimal string',
    );
  }

  return { type: 'address', value: value as `0x${string}`, chainId };
}

function canonicalizeChannel(value: string): string {
  const firstSeparator = value.indexOf(':');
  const secondSeparator = value.indexOf(':', firstSeparator + 1);
  if (firstSeparator <= 0 || secondSeparator <= firstSeparator + 1 || secondSeparator === value.length - 1) {
    throw new PolicySubjectValidationError(
      'Channel policy subject value must have the form platform:kind:id',
    );
  }

  const platform = value.slice(0, firstSeparator);
  const kind = value.slice(firstSeparator + 1, secondSeparator);
  const id = value.slice(secondSeparator + 1);
  if (!VISIBLE_ASCII_WITHOUT_COLON.test(platform) || !VISIBLE_ASCII_WITHOUT_COLON.test(kind)) {
    throw new PolicySubjectValidationError(
      'Channel policy subject platform and kind must be non-empty visible ASCII without colons',
    );
  }

  return `${platform.toLowerCase()}:${kind.toLowerCase()}:${id}`;
}

/** Strictly validate a policy subject and return its canonical representation. */
export function parsePolicySubject(input: unknown): CanonicalPolicySubject {
  const record = requireRecord(input);
  const type = requireString(record.type, 'type');

  switch (type) {
    case 'cid':
      requireExactKeys(record, ['type', 'value']);
      return { type, value: canonicalizeCid(requireString(record.value, 'value')) };
    case 'address':
      requireExactKeys(record, ['type', 'value', 'chainId']);
      return canonicalizeAddress(record);
    case 'channel':
      requireExactKeys(record, ['type', 'value']);
      return { type, value: canonicalizeChannel(requireString(record.value, 'value')) };
    default:
      throw new PolicySubjectValidationError(`Unknown policy subject type: ${type}`);
  }
}

/** Return the byte-stable membership key for a validated policy subject. */
export function policySubjectKey(subject: PolicySubject | CanonicalPolicySubject): PolicySubjectKey {
  const canonical = parsePolicySubject(subject);
  switch (canonical.type) {
    case 'cid':
      return `cid:${canonical.value}`;
    case 'address':
      return `address:${canonical.chainId}:${canonical.value}`;
    case 'channel':
      return `channel:${canonical.value}`;
  }
}

/** Reject duplicate canonical subjects, including differently encoded equivalents. */
export function assertUniquePolicySubjects(
  subjects: Iterable<PolicySubject | CanonicalPolicySubject>,
): void {
  const seen = new Set<PolicySubjectKey>();
  for (const subject of subjects) {
    const key = policySubjectKey(subject);
    if (seen.has(key)) {
      throw new PolicySubjectValidationError(`Duplicate policy subject: ${key}`);
    }
    seen.add(key);
  }
}
