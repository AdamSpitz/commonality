import {
  parsePolicySubject,
  policySubjectKey,
  type CanonicalPolicySubject,
  type PolicySubjectKey,
} from './subjects.js';
import { requireExactKeys, requireRecord, UNPAIRED_SURROGATE } from './validation.js';

export const LOCAL_POLICY_LIST_SCHEMA = 'commonality.policy-list-local/v1' as const;

const MAX_REASON_UTF8_BYTES = 512;

export interface PolicyListEntry {
  subject: CanonicalPolicySubject;
  reason?: string;
}

export interface LocalPolicyListDocument {
  schema: typeof LOCAL_POLICY_LIST_SCHEMA;
  entries: readonly PolicyListEntry[];
}

export class PolicyListDocumentValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PolicyListDocumentValidationError';
  }
}

const documentUnknownField = (field: string) =>
  new PolicyListDocumentValidationError(`Unknown policy list field: ${field}`);
const documentMissingField = (field: string) =>
  new PolicyListDocumentValidationError(`Missing policy list field: ${field}`);

function parseReason(value: unknown): string {
  if (typeof value !== 'string') {
    throw new PolicyListDocumentValidationError('Policy list entry reason must be a string');
  }
  if (UNPAIRED_SURROGATE.test(value)) {
    throw new PolicyListDocumentValidationError('Policy list entry reason must contain valid Unicode');
  }
  if (new TextEncoder().encode(value).byteLength > MAX_REASON_UTF8_BYTES) {
    throw new PolicyListDocumentValidationError(
      `Policy list entry reason must be at most ${MAX_REASON_UTF8_BYTES} UTF-8 bytes`,
    );
  }
  return value;
}

function parseEntry(input: unknown, index: number): PolicyListEntry {
  const description = `Policy list entry ${index}`;
  const record = requireRecord(input, () => new PolicyListDocumentValidationError(`${description} must be an object`));
  requireExactKeys(record, ['subject'], ['reason'], documentUnknownField, documentMissingField);

  let subject: CanonicalPolicySubject;
  try {
    subject = parsePolicySubject(record.subject);
  } catch (error) {
    throw new PolicyListDocumentValidationError(`Invalid policy list entry ${index} subject`, {
      cause: error,
    });
  }

  return Object.hasOwn(record, 'reason')
    ? { subject, reason: parseReason(record.reason) }
    : { subject };
}

/** Strictly validate an already-decoded local policy-list document. */
export function parseLocalPolicyListDocument(input: unknown): LocalPolicyListDocument {
  const record = requireRecord(input, () => new PolicyListDocumentValidationError('Local policy list document must be an object'));
  requireExactKeys(record, ['schema', 'entries'], [], documentUnknownField, documentMissingField);

  if (record.schema !== LOCAL_POLICY_LIST_SCHEMA) {
    throw new PolicyListDocumentValidationError(
      `Local policy list schema must be ${LOCAL_POLICY_LIST_SCHEMA}`,
    );
  }
  if (!Array.isArray(record.entries)) {
    throw new PolicyListDocumentValidationError('Local policy list entries must be an array');
  }

  const entries = record.entries.map(parseEntry);
  const seen = new Set<PolicySubjectKey>();
  for (const entry of entries) {
    const key = policySubjectKey(entry.subject);
    if (seen.has(key)) {
      throw new PolicyListDocumentValidationError(`Duplicate policy subject: ${key}`);
    }
    seen.add(key);
  }

  return { schema: LOCAL_POLICY_LIST_SCHEMA, entries };
}
