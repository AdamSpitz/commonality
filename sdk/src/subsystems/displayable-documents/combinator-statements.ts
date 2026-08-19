/**
 * Canonical combinator statements: all / any over other statement CIDs.
 * See specs/tech/subsystems/conceptspace/combinator-statements.md
 */

import {
  createDisplayableDocument,
  isDisplayableDocument,
  validateDisplayableDocument,
  type DisplayableDocument,
} from './displayable-document.js';

export type CombinatorKind = 'all' | 'any';

export const COMBINATOR_STATEMENT_TYPE = 'combinator-statement';

export const COMBINATOR_GLOSS: Record<CombinatorKind, string> = {
  all: 'I believe all of the referenced statements.',
  any: 'I believe at least one of the referenced statements.',
};

export interface ParsedCombinator {
  combinator: CombinatorKind;
  operandCids: string[];
}

function uniqueSortedCids(cids: readonly string[]): string[] {
  return [...new Set(cids.map((cid) => cid.trim()).filter(Boolean))].sort();
}

function isCombinatorKind(value: unknown): value is CombinatorKind {
  return value === 'all' || value === 'any';
}

/**
 * Canonical combinator document. Bytes depend only on operator + sorted operand CIDs.
 */
export function createCombinatorStatement(
  combinator: CombinatorKind,
  operandCids: readonly string[],
): DisplayableDocument {
  const sorted = uniqueSortedCids(operandCids);
  if (sorted.length < 2) {
    throw new Error('A combinator statement needs at least two operand CIDs.');
  }
  return createDisplayableDocument({
    format: 'markdown-restricted',
    content: COMBINATOR_GLOSS[combinator],
    extras: {
      combinator,
      statementType: COMBINATOR_STATEMENT_TYPE,
    },
    references: sorted.map((cid) => ({ cid })),
  });
}

/**
 * Strict parse: only documents that match the template are combinators.
 * Any extra extras key, label, unsorted refs, or gloss mismatch is not.
 */
export function parseCombinatorStatement(doc: DisplayableDocument): ParsedCombinator | null {
  if (doc.format !== 'markdown-restricted') return null;
  const extras = doc.extras;
  if (!extras || typeof extras !== 'object') return null;
  const keys = Object.keys(extras).sort();
  if (keys.length !== 2 || keys[0] !== 'combinator' || keys[1] !== 'statementType') {
    return null;
  }
  if (extras.statementType !== COMBINATOR_STATEMENT_TYPE) return null;
  if (!isCombinatorKind(extras.combinator)) return null;
  if (doc.content !== COMBINATOR_GLOSS[extras.combinator]) return null;
  if (!doc.references || doc.references.length < 2) return null;
  if (doc.assets && Object.keys(doc.assets).length > 0) return null;

  const operandCids: string[] = [];
  for (const ref of doc.references) {
    if (!ref.cid || typeof ref.cid !== 'string') return null;
    if (ref.label !== undefined) return null;
    operandCids.push(ref.cid);
  }
  const sorted = uniqueSortedCids(operandCids);
  if (sorted.length !== operandCids.length) return null;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== operandCids[i]) return null;
  }
  return { combinator: extras.combinator, operandCids: sorted };
}

export function parseCombinatorFromUnknown(raw: unknown): ParsedCombinator | null {
  if (!isDisplayableDocument(raw)) return null;
  if (!validateDisplayableDocument(raw).valid) return null;
  return parseCombinatorStatement(raw);
}

export type CombinatorImplicationRule =
  | 'conjunction-elimination'
  | 'disjunction-introduction';

export interface CombinatorImplication {
  implies: true;
  rule: CombinatorImplicationRule;
}

/**
 * Deterministic pairwise arrows only. Returns null when this pair is not one of
 * those arrows (caller should use the LLM attester).
 */
export function combinatorImplication(
  fromCid: string,
  fromDoc: unknown,
  toCid: string,
  toDoc: unknown,
): CombinatorImplication | null {
  const from = parseCombinatorFromUnknown(fromDoc);
  const to = parseCombinatorFromUnknown(toDoc);

  if (from?.combinator === 'all' && from.operandCids.includes(toCid)) {
    return { implies: true, rule: 'conjunction-elimination' };
  }
  if (to?.combinator === 'any' && to.operandCids.includes(fromCid)) {
    return { implies: true, rule: 'disjunction-introduction' };
  }
  return null;
}

export function combinatorAttestationPairs(
  combinatorCid: string,
  parsed: ParsedCombinator,
): { fromCid: string; toCid: string }[] {
  if (parsed.combinator === 'all') {
    return parsed.operandCids.map((operandCid) => ({
      fromCid: combinatorCid,
      toCid: operandCid,
    }));
  }
  return parsed.operandCids.map((operandCid) => ({
    fromCid: operandCid,
    toCid: combinatorCid,
  }));
}

export function combinatorImplicationReasoning(rule: CombinatorImplicationRule): string {
  if (rule === 'conjunction-elimination') {
    return 'Conjunction elimination: an all-combinator implies each referenced operand.';
  }
  return 'Disjunction introduction: each operand implies the any-combinator.';
}
