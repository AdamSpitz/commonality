import assert from 'assert';
import {
  createNudgeBatch,
  type NudgeMessage,
  type NudgeRevocation,
} from './signer.js';

describe('createNudgeBatch', () => {
  it('builds a typed nudge-batch publication envelope', () => {
    const nudges: NudgeMessage[] = [
      {
        targetStatementCid: 'bafy-target',
        suggestedStatementCid: 'bafy-suggested',
        reason: 'These statements are closely related',
        confidence: 0.9,
      },
    ];
    const revocations: NudgeRevocation[] = [
      {
        targetStatementCid: 'bafy-old-target',
        suggestedStatementCid: 'bafy-old-suggested',
      },
    ];

    const batch = createNudgeBatch(
      '0x1234567890123456789012345678901234567890',
      nudges,
      revocations,
      1700000000
    );

    assert.deepStrictEqual(batch, {
      kind: 'nudge-batch',
      schemaVersion: 1,
      nudger: '0x1234567890123456789012345678901234567890',
      publishedAt: 1700000000,
      nudges,
      revocations,
    });
  });

  it('defaults revocations to an empty array', () => {
    const batch = createNudgeBatch(
      '0x1234567890123456789012345678901234567890',
      [],
      undefined,
      1700000000
    );

    assert.deepStrictEqual(batch.revocations, []);
  });
});
