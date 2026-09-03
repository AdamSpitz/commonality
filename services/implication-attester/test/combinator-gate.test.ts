import assert from 'node:assert';
import { describe, it } from 'mocha';
import {
  createCombinatorStatement,
  toCanonicalJson,
} from '@commonality/sdk/displayable-documents';
import { deterministicCombinatorEvaluation } from '../src/combinator-gate.js';
import type { IpfsCidV1 } from '@commonality/sdk/utils';

describe('deterministic combinator gate', () => {
  const a = 'bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as IpfsCidV1;
  const b = 'bafkreibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as IpfsCidV1;

  it('attests all → operand without calling an LLM', () => {
    const allDoc = createCombinatorStatement('all', [a, b]);
    const plank = { format: 'markdown-restricted', content: 'A plank.' };
    const result = deterministicCombinatorEvaluation(
      'bafkreicomboall' as IpfsCidV1,
      toCanonicalJson(allDoc),
      a,
      JSON.stringify(plank),
    );
    assert.strictEqual(result?.rule, 'conjunction-elimination');
  });

  it('does not attest any → operand', () => {
    const anyDoc = createCombinatorStatement('any', [a, b]);
    const plank = { format: 'markdown-restricted', content: 'A plank.' };
    const result = deterministicCombinatorEvaluation(
      'bafkreicomboany' as IpfsCidV1,
      toCanonicalJson(anyDoc),
      a,
      JSON.stringify(plank),
    );
    assert.strictEqual(result, null);
  });
});
