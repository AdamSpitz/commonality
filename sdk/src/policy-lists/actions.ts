import type {
  CanonicalPolicySubject,
  PolicySubject,
  PolicySubjectKey,
  PolicySubjectType,
} from './subjects.js';
import { parsePolicySubject, policySubjectKey } from './subjects.js';

export const POLICY_ACTIONS = [
  'suppress',
  'exclude-aggregation',
  'refuse-serve',
] as const;

export type PolicyAction = (typeof POLICY_ACTIONS)[number];

export interface PolicyAddressReference {
  value: string;
  chainId: string;
}

/** The subjects a rendered or aggregated item must identify for policy evaluation. */
export interface PolicyContentItem {
  cid: string;
  publisher: PolicyAddressReference;
  projectContract: PolicyAddressReference;
  channel?: string;
}

export interface SuppressPolicyRequest {
  item: PolicyContentItem;
}

export interface ExcludeAggregationPolicyRequest {
  item: PolicyContentItem;
}

export interface RefuseServePolicyRequest {
  cid: string;
}

export interface PolicyActionRequestMap {
  suppress: SuppressPolicyRequest;
  'exclude-aggregation': ExcludeAggregationPolicyRequest;
  'refuse-serve': RefuseServePolicyRequest;
}

export type PolicyActionRequest = PolicyActionRequestMap[PolicyAction];

export const POLICY_ACTION_SUBJECT_TYPES = {
  suppress: ['cid', 'address', 'channel'],
  'exclude-aggregation': ['cid', 'address', 'channel'],
  'refuse-serve': ['cid'],
} as const satisfies Record<PolicyAction, readonly PolicySubjectType[]>;

function addressSubject(reference: PolicyAddressReference): PolicySubject {
  return {
    type: 'address',
    value: reference.value,
    chainId: reference.chainId,
  };
}

function canonicalSubjectSet(subjects: readonly PolicySubject[]): readonly CanonicalPolicySubject[] {
  const canonicalSubjects: CanonicalPolicySubject[] = [];
  const seen = new Set<PolicySubjectKey>();

  for (const subject of subjects) {
    const canonical = parsePolicySubject(subject);
    const key = policySubjectKey(canonical);
    if (!seen.has(key)) {
      seen.add(key);
      canonicalSubjects.push(canonical);
    }
  }

  return canonicalSubjects;
}

function extractContentItemSubjects(item: PolicyContentItem): readonly CanonicalPolicySubject[] {
  const subjects: PolicySubject[] = [
    { type: 'cid', value: item.cid },
    addressSubject(item.publisher),
    addressSubject(item.projectContract),
  ];
  if (item.channel !== undefined) {
    subjects.push({ type: 'channel', value: item.channel });
  }
  return canonicalSubjectSet(subjects);
}

/** Extract every exact subject governed by the suppress action. */
export function extractSuppressPolicySubjects(
  request: SuppressPolicyRequest,
): readonly CanonicalPolicySubject[] {
  return extractContentItemSubjects(request.item);
}

/** Extract every exact subject governed by the exclude-aggregation action. */
export function extractExcludeAggregationPolicySubjects(
  request: ExcludeAggregationPolicyRequest,
): readonly CanonicalPolicySubject[] {
  return extractContentItemSubjects(request.item);
}

/** Extract the requested CID governed by the refuse-serve action. */
export function extractRefuseServePolicySubjects(
  request: RefuseServePolicyRequest,
): readonly CanonicalPolicySubject[] {
  return canonicalSubjectSet([{ type: 'cid', value: request.cid }]);
}

/** Dispatch to the normative extractor for an action. */
export function extractPolicySubjects<Action extends PolicyAction>(
  action: Action,
  request: PolicyActionRequestMap[Action],
): readonly CanonicalPolicySubject[] {
  switch (action) {
    case 'suppress':
      return extractSuppressPolicySubjects(request as SuppressPolicyRequest);
    case 'exclude-aggregation':
      return extractExcludeAggregationPolicySubjects(request as ExcludeAggregationPolicyRequest);
    case 'refuse-serve':
      return extractRefuseServePolicySubjects(request as RefuseServePolicyRequest);
  }
}
