import {
  combinatorImplication,
  combinatorImplicationReasoning,
  type CombinatorImplication,
} from '@commonality/sdk/displayable-documents';
import type { IpfsCidV1 } from '@commonality/sdk/utils';

export function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function statementTextForLlm(raw: string, parsed: unknown): string {
  if (parsed && typeof parsed === 'object' && parsed !== null && 'content' in parsed) {
    const content = (parsed as { content?: unknown }).content;
    if (typeof content === 'string') return content;
    if (content && typeof content === 'object' && content !== null && 'text' in content) {
      const text = (content as { text?: unknown }).text;
      if (typeof text === 'string') return text;
    }
  }
  if (parsed && typeof parsed === 'object' && parsed !== null && 'text' in parsed) {
    const text = (parsed as { text?: unknown }).text;
    if (typeof text === 'string') return text;
  }
  return raw;
}

export function deterministicCombinatorEvaluation(
  fromStatementCid: IpfsCidV1,
  fromRaw: string,
  toStatementCid: IpfsCidV1,
  toRaw: string,
): CombinatorImplication | null {
  const fromDoc = parseJsonObject(fromRaw);
  const toDoc = parseJsonObject(toRaw);
  return combinatorImplication(fromStatementCid, fromDoc, toStatementCid, toDoc);
}

export { combinatorImplicationReasoning };
