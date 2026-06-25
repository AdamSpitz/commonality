import assert from 'node:assert';
import type { ImplicationsContract } from '@commonality/sdk/conceptspace';
import type { IpfsCidV1, WriteClients } from '@commonality/sdk/utils';
import {
  createBridgeImplicationSubmitter,
  submitBridgeImplication,
  type BridgeImplicationPublisherDependencies,
} from '../src/implicationPublisher.js';

const TEST_CLIENTS = { marker: 'clients' } as unknown as WriteClients;
const FROM_CID = 'bafy-from' as IpfsCidV1;
const TO_CID = 'bafy-to' as IpfsCidV1;
const EXPLANATION_CID = 'bafy-explanation' as IpfsCidV1;

function makeDependencies(calls: unknown[]): BridgeImplicationPublisherDependencies {
  return {
    createWriteClients: (privateKey, rpcUrl) => {
      calls.push({ type: 'createWriteClients', privateKey, rpcUrl });
      return TEST_CLIENTS;
    },
    attestImplication: async (clients, contract, fromCid, toCid, explanationCid) => {
      calls.push({ type: 'attestImplication', clients, contract, fromCid, toCid, explanationCid });
      return `0xhash${calls.length}`;
    },
  };
}

describe('submitBridgeImplication', () => {
  it('submits a modified-statement to common-ground implication with an optional explanation', async () => {
    const calls: unknown[] = [];
    const txHash = await submitBridgeImplication(
      {
        fromStatementCid: FROM_CID,
        toStatementCid: TO_CID,
        explanationCid: EXPLANATION_CID,
      },
      {
        testClients: TEST_CLIENTS,
        implicationsContract: {
          address: '0x0000000000000000000000000000000000000001',
          abi: [],
        } as unknown as ImplicationsContract,
      },
      makeDependencies(calls),
    );

    assert.strictEqual(txHash, '0xhash1');
    assert.deepStrictEqual(calls, [
      {
        type: 'attestImplication',
        clients: TEST_CLIENTS,
        contract: {
          address: '0x0000000000000000000000000000000000000001',
          abi: [],
        },
        fromCid: FROM_CID,
        toCid: TO_CID,
        explanationCid: EXPLANATION_CID,
      },
    ]);
  });
});

describe('createBridgeImplicationSubmitter', () => {
  it('creates blockchain clients once and reuses them for sequential submissions', async () => {
    const calls: unknown[] = [];
    const submitter = createBridgeImplicationSubmitter(
      {
        ethereumPrivateKey: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        ethereumRpcUrl: 'http://rpc.local',
        implicationsContractAddress: '0x0000000000000000000000000000000000000002',
      },
      makeDependencies(calls),
    );

    const txHashes = await submitter.submitImplications([
      { fromStatementCid: FROM_CID, toStatementCid: TO_CID },
      { fromStatementCid: TO_CID, toStatementCid: FROM_CID, explanationCid: EXPLANATION_CID },
    ]);

    assert.deepStrictEqual(txHashes, ['0xhash2', '0xhash3']);
    assert.deepStrictEqual(
      calls.map((call) => (call as { type: string }).type),
      ['createWriteClients', 'attestImplication', 'attestImplication'],
    );
  });
});
