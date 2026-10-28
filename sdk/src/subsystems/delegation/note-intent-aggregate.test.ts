import assert from 'assert';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import { DelegatableNotesAbi } from '../../../abis/DelegatableNotesAbi.js';
import { NoteIntentAbi } from '../../../abis/NoteIntentAbi.js';
import type { SDKMachinery } from '../../machinery.js';
import { cidToBytes32 } from '../../utils/cid-types.js';
import { MemoryFoldStore } from '../../utils/resumableFold.js';
import { getNoteIntentAggregate } from './queries.js';

const ALICE = '0x1111111111111111111111111111111111111111';
const BOB = '0x2222222222222222222222222222222222222222';
const NOTES = '0x3333333333333333333333333333333333333333';
const RECEIPTS = '0x4444444444444444444444444444444444444444';
const TOKEN = '0x6666666666666666666666666666666666666666';
const MARKET = '0x5555555555555555555555555555555555555555';
const STATEMENT = 'bafybeigdyrzt5sfp7edupa6g6csmvofsnquhcsstrmfe737k63zgla52gq';

function encode(eventName: string, abi: readonly unknown[], args: Record<string, unknown>, blockNumber: bigint, logIndex: number) {
  const item = (abi as Array<{ type: string; name: string; inputs?: Array<{ name: string; indexed?: boolean }> }>).find(
    entry => entry.type === 'event' && entry.name === eventName,
  )!;
  const inputs = item.inputs ?? [];
  const topics = encodeEventTopics({ abi: [item], eventName, args } as never);
  const nonIndexed = inputs.filter(input => !input.indexed);
  return {
    id: `${blockNumber}:${logIndex}:${eventName}`,
    contractAddress: eventName === 'NoteIntentAttested' ? MARKET : NOTES,
    eventName,
    blockNumber: blockNumber.toString(),
    blockTimestamp: (1_700_000_000n + blockNumber).toString(),
    transactionHash: `0x${blockNumber.toString(16).padStart(64, '0')}`,
    logIndex,
    topic0: topics[0] ?? null,
    topic1: topics[1] ?? null,
    topic2: topics[2] ?? null,
    topic3: topics[3] ?? null,
    data: encodeAbiParameters(nonIndexed as never, nonIndexed.map(input => args[input.name]) as never),
  };
}

describe('getNoteIntentAggregate', () => {
  it('counts a root attestation on a refunded note whose chain comes from the purchase', async () => {
    const events = [
      encode('NoteCreated', DelegatableNotesAbi, { noteId: 1n, owner: ALICE, amount: 100n, token: TOKEN, tokenType: 0, tokenId: 0n }, 1n, 0),
      encode('NoteDelegated', DelegatableNotesAbi, { parentNoteId: 1n, childNoteId: 1n, delegate: BOB, amount: 100n }, 2n, 0),
      encode('NoteConsumed', DelegatableNotesAbi, { noteId: 1n, amountConsumed: 100n, remainingAmount: 0n, deleted: true }, 3n, 0),
      encode('NoteCreated', DelegatableNotesAbi, { noteId: 2n, owner: BOB, amount: 1n, token: RECEIPTS, tokenType: 1, tokenId: 7n }, 3n, 1),
      encode('ERC1155Purchased', DelegatableNotesAbi, { buyer: BOB, erc1155Contract: RECEIPTS, tokenIds: [7n], counts: [1n], totalCost: 100n, inputNoteIds: [1n], outputNoteIds: [2n] }, 3n, 2),
      encode('NoteConsumed', DelegatableNotesAbi, { noteId: 2n, amountConsumed: 1n, remainingAmount: 0n, deleted: true }, 4n, 0),
      encode('NoteCreated', DelegatableNotesAbi, { noteId: 3n, owner: BOB, amount: 100n, token: TOKEN, tokenType: 0, tokenId: 0n }, 4n, 1),
      encode('RefundedIntoNote', DelegatableNotesAbi, { caller: BOB, primaryMarket: MARKET, erc1155Contract: RECEIPTS, tokenId: 7n, refundValue: 100n, paymentToken: TOKEN, inputNoteId: 2n, outputNoteId: 3n }, 4n, 2),
      encode('NoteIntentAttested', NoteIntentAbi, { attester: ALICE, intendedStatementId: cidToBytes32(STATEMENT), noteId: 3n, noteContract: NOTES }, 5n, 0),
    ];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async input => {
      const url = new URL(String(input));
      if (url.pathname.includes('event-segments')) return new Response('', { status: 404 });
      const items = events.filter(event => {
        if (event.eventName !== url.searchParams.get('eventName')) return false;
        return ['topic1', 'topic2', 'topic3'].every(topic => {
          const expected = url.searchParams.get(topic);
          const list = url.searchParams.get(`${topic}_in`);
          const actual = event[topic as 'topic1'];
          return (!expected || actual === expected) && (!list || list.split(',').includes(String(actual)));
        });
      });
      return new Response(JSON.stringify({ items }));
    }) as typeof fetch;

    try {
      const aggregate = await getNoteIntentAggregate({
        eventCacheUrl: 'http://intent.test',
        defaultChainId: 31337,
        contractAddresses: { delegatableNotes: NOTES },
        settlementTokenAddresses: [TOKEN],
        foldStore: new MemoryFoldStore(),
      } as SDKMachinery, STATEMENT);
      assert.equal(aggregate.noteCount, 1);
      assert.equal(aggregate.currencies[0]?.amount, '100');
      assert.equal(aggregate.contributorCount, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
