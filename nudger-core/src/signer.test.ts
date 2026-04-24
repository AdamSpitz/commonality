import assert from 'assert';
import {
  createNudgerSigner,
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

  it('creates isolated signer instances per config', () => {
    const signerA = createNudgerSigner({
      nudgerPrivateKey: ('0x' + '11'.repeat(32)) as `0x${string}`,
      ethereumRpcUrl: 'http://localhost:8545',
      indexerUrl: 'http://localhost:3001',
      ipfsApiUrl: 'http://localhost:5001',
      ipfsGatewayUrl: 'http://localhost:8080',
      port: 3002,
      name: 'A',
      description: 'A',
      sourceType: 'test-a',
      version: '0.1.0',
      nudgePublicationsContractAddress: ('0x' + 'aa'.repeat(20)) as `0x${string}`,
    });
    const signerB = createNudgerSigner({
      nudgerPrivateKey: ('0x' + '22'.repeat(32)) as `0x${string}`,
      ethereumRpcUrl: 'http://localhost:8545',
      indexerUrl: 'http://localhost:3001',
      ipfsApiUrl: 'http://localhost:5001',
      ipfsGatewayUrl: 'http://localhost:8080',
      port: 3003,
      name: 'B',
      description: 'B',
      sourceType: 'test-b',
      version: '0.1.0',
      nudgePublicationsContractAddress: ('0x' + 'bb'.repeat(20)) as `0x${string}`,
    });

    assert.notStrictEqual(signerA.address, signerB.address);
  });
});
