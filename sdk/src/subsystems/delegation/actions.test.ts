import assert from 'node:assert/strict';
import { encodeAbiParameters, encodeEventTopics, type Address, type Hash } from 'viem';
import { DelegatableNotesAbi } from '../../abis.js';
import type { WriteClients } from '../../utils/ethereum.js';
import { partialTakeback } from './actions.js';

const ADDRESS = '0xaaaa000000000000000000000000000000000000' as Address;
const OTHER = '0xbbbb000000000000000000000000000000000000' as Address;
const HASH = `0x${'12'.repeat(32)}` as Hash;
const contract = { address: ADDRESS, abi: DelegatableNotesAbi };
const params = { noteId: 7n, owners: [OTHER, ADDRESS], amount: 40n };

function takebackLog(address = ADDRESS, noteId = 7n, amount = 40n, sliceNoteId = 8n) {
  return {
    address,
    topics: encodeEventTopics({
      abi: DelegatableNotesAbi,
      eventName: 'NotePartiallyTakenBack',
      args: { noteId, sliceNoteId },
    }),
    data: encodeAbiParameters([{ type: 'uint256' }], [amount]),
  };
}

function mockClients(status: 'success' | 'reverted', logs: ReturnType<typeof takebackLog>[]) {
  return {
    walletClient: {
      account: { address: ADDRESS },
      writeContract: async () => HASH,
    },
    publicClient: {
      waitForTransactionReceipt: async ({ hash }: { hash: Hash }) => {
        assert.equal(hash, HASH);
        return { status, logs };
      },
    },
  } as unknown as WriteClients;
}

describe('partialTakeback', () => {
  it('returns the slice ID from the matching contract and takeback', async () => {
    const clients = mockClients('success', [
      takebackLog(OTHER, 7n, 40n, 99n),
      takebackLog(ADDRESS, 6n, 40n, 98n),
      takebackLog(),
    ]);
    assert.deepEqual(await partialTakeback(clients, contract, params), { hash: HASH, sliceNoteId: 8n });
  });

  it('rejects a transaction that was mined but reverted', async () => {
    await assert.rejects(partialTakeback(mockClients('reverted', []), contract, params), /transaction reverted/);
  });

  for (const [description, logs] of [
    ['missing events', []],
    ['another contract', [takebackLog(OTHER)]],
    ['another note', [takebackLog(ADDRESS, 6n)]],
    ['another amount', [takebackLog(ADDRESS, 7n, 39n)]],
  ] as const) {
    it(`rejects a successful receipt with ${description}`, async () => {
      await assert.rejects(
        partialTakeback(mockClients('success', [...logs]), contract, params),
        /Failed to find matching NotePartiallyTakenBack event/,
      );
    });
  }
});
