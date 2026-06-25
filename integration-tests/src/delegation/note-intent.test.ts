/**
 * NoteIntent Integration Tests
 *
 * Tests for note intent attestation indexing:
 * - Single attestation: attest a note's intended purpose, verify indexed
 * - Update attestation: re-attest with different statement, verify updated
 * - Batch attestation: batch-attest multiple notes, verify all indexed
 * - Multi-attester isolation: two attesters attest the same note differently
 */

import assert from 'assert';
import { DelegatableNotesAbi, NoteIntentAbi } from '@commonality/sdk/abis';
import { type DelegatableNotesContract, type NoteIntentContract, depositETH, attestNoteIntent, attestNoteIntentsBatch, getNoteIntentAttestation, getNoteIntentAttestationsByNote, getNoteIntentAttestationsByStatement } from '@commonality/sdk/delegation';
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync';
import { fakeIpfsCidV1 } from '@commonality/sdk/utils';
import { testLog, createIsolatedWriteClients } from '../utils/setup.js';
import { createActionTestingMachinery } from '../actions/action-machinery.js';

describe('NoteIntent Indexing', () => {
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const DELEGATABLE_NOTES_ADDRESS = process.env.DELEGATABLE_NOTES_ADDRESS as `0x${string}`;
  const NOTE_INTENT_ADDRESS = process.env.NOTE_INTENT_ADDRESS as `0x${string}`;

  const SUITE_NAME = 'note-intent';

  let delegatableNotesContract: DelegatableNotesContract;
  let noteIntentContract: NoteIntentContract;
  let machinery: ReturnType<typeof createActionTestingMachinery>;

  before(() => {
    if (!DELEGATABLE_NOTES_ADDRESS) {
      throw new Error('DELEGATABLE_NOTES_ADDRESS not set');
    }
    if (!NOTE_INTENT_ADDRESS) {
      throw new Error('NOTE_INTENT_ADDRESS not set');
    }

    delegatableNotesContract = {
      address: DELEGATABLE_NOTES_ADDRESS,
      abi: DelegatableNotesAbi,
    };

    noteIntentContract = {
      address: NOTE_INTENT_ADDRESS,
      abi: NoteIntentAbi,
    };

    machinery = createActionTestingMachinery();
  });

  /**
   * Helper: deposit ETH and return the noteId
   */
  async function depositAndGetNoteId(
    clients: ReturnType<typeof createIsolatedWriteClients>,
    amount: bigint
  ): Promise<bigint> {
    const { hash, noteId } = await depositETH(clients, delegatableNotesContract, { amount });
    await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
    return noteId;
  }

  it('should index a single note intent attestation', async function () {
    this.timeout(30000);

    const alice = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);

    // Create a note
    const noteId = await depositAndGetNoteId(alice, 1000000000000000000n);
    testLog('  Note created:', noteId.toString());

    // Create a statement for the intended purpose
    const statementCid = fakeIpfsCidV1('NoteIntentTest-purpose-1');

    // Attest the note's intent
    const txHash = await attestNoteIntent(
      alice,
      noteIntentContract,
      DELEGATABLE_NOTES_ADDRESS,
      noteId,
      statementCid
    );
    await waitForIndexerToSyncToTxHash(machinery, alice.publicClient, txHash);
    testLog('  Intent attested, tx:', txHash);

    // Query the indexed attestation
    const attestation = await getNoteIntentAttestation(
      machinery,
      alice.account,
      DELEGATABLE_NOTES_ADDRESS,
      noteId.toString()
    );

    assert.ok(attestation, 'Attestation should be indexed');
    assert.strictEqual(
      attestation!.intendedStatementId,
      statementCid,
      'Intended statement should match'
    );
    assert.strictEqual(
      attestation!.attester.toLowerCase(),
      alice.account.toLowerCase(),
      'Attester should match'
    );
    assert.strictEqual(
      attestation!.noteContract.toLowerCase(),
      DELEGATABLE_NOTES_ADDRESS.toLowerCase(),
      'Note contract should match'
    );
  });

  it('should update attestation when re-attested with different statement', async function () {
    this.timeout(30000);

    const alice = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);

    const noteId = await depositAndGetNoteId(alice, 1000000000000000000n);

    const statementCid1 = fakeIpfsCidV1('NoteIntentTest-purpose-update-1');
    const statementCid2 = fakeIpfsCidV1('NoteIntentTest-purpose-update-2');

    // Attest with first statement
    let txHash = await attestNoteIntent(
      alice,
      noteIntentContract,
      DELEGATABLE_NOTES_ADDRESS,
      noteId,
      statementCid1
    );
    await waitForIndexerToSyncToTxHash(machinery, alice.publicClient, txHash);

    // Verify first attestation
    let attestation = await getNoteIntentAttestation(
      machinery,
      alice.account,
      DELEGATABLE_NOTES_ADDRESS,
      noteId.toString()
    );
    assert.ok(attestation, 'First attestation should be indexed');
    assert.strictEqual(attestation!.intendedStatementId, statementCid1);

    // Re-attest with second statement
    txHash = await attestNoteIntent(
      alice,
      noteIntentContract,
      DELEGATABLE_NOTES_ADDRESS,
      noteId,
      statementCid2
    );
    await waitForIndexerToSyncToTxHash(machinery, alice.publicClient, txHash);

    // Verify updated attestation
    attestation = await getNoteIntentAttestation(
      machinery,
      alice.account,
      DELEGATABLE_NOTES_ADDRESS,
      noteId.toString()
    );
    assert.ok(attestation, 'Updated attestation should be indexed');
    assert.strictEqual(
      attestation!.intendedStatementId,
      statementCid2,
      'Intended statement should be updated to second value'
    );

    // Verify there's only one attestation for this note (not two)
    const allAttestations = await getNoteIntentAttestationsByNote(
      machinery,
      DELEGATABLE_NOTES_ADDRESS,
      noteId.toString()
    );
    const fromAlice = allAttestations.filter(
      (a) => a.attester.toLowerCase() === alice.account.toLowerCase()
    );
    assert.strictEqual(
      fromAlice.length,
      1,
      'Should have exactly one attestation from alice (updated, not duplicated)'
    );
  });

  it('should index batch attestations', async function () {
    this.timeout(30000);

    const alice = createIsolatedWriteClients(SUITE_NAME, 2, RPC_URL);

    // Create multiple notes
    const noteId1 = await depositAndGetNoteId(alice, 1000000000000000000n);
    const noteId2 = await depositAndGetNoteId(alice, 2000000000000000000n);
    const noteId3 = await depositAndGetNoteId(alice, 3000000000000000000n);

    const statementCid1 = fakeIpfsCidV1('NoteIntentTest-batch-1');
    const statementCid2 = fakeIpfsCidV1('NoteIntentTest-batch-2');
    const statementCid3 = fakeIpfsCidV1('NoteIntentTest-batch-3');

    // Batch attest
    const txHash = await attestNoteIntentsBatch(
      alice,
      noteIntentContract,
      DELEGATABLE_NOTES_ADDRESS,
      [noteId1, noteId2, noteId3],
      [statementCid1, statementCid2, statementCid3]
    );
    await waitForIndexerToSyncToTxHash(machinery, alice.publicClient, txHash);
    testLog('  Batch attested, tx:', txHash);

    // Verify each attestation
    for (const [noteId, expectedCid] of [
      [noteId1, statementCid1],
      [noteId2, statementCid2],
      [noteId3, statementCid3],
    ] as const) {
      const attestation = await getNoteIntentAttestation(
        machinery,
        alice.account,
        DELEGATABLE_NOTES_ADDRESS,
        noteId.toString()
      );
      assert.ok(attestation, `Attestation for note ${noteId} should be indexed`);
      assert.strictEqual(
        attestation!.intendedStatementId,
        expectedCid,
        `Note ${noteId} should have correct intended statement`
      );
    }
  });

  it('should track attestations separately per attester', async function () {
    this.timeout(30000);

    const alice = createIsolatedWriteClients(SUITE_NAME, 3, RPC_URL);
    const bob = createIsolatedWriteClients(SUITE_NAME, 4, RPC_URL);

    // Alice creates a note
    const noteId = await depositAndGetNoteId(alice, 1000000000000000000n);

    const aliceStatementCid = fakeIpfsCidV1('NoteIntentTest-alice-purpose');
    const bobStatementCid = fakeIpfsCidV1('NoteIntentTest-bob-purpose');

    // Alice attests
    let txHash = await attestNoteIntent(
      alice,
      noteIntentContract,
      DELEGATABLE_NOTES_ADDRESS,
      noteId,
      aliceStatementCid
    );
    await waitForIndexerToSyncToTxHash(machinery, alice.publicClient, txHash);

    // Bob attests the same note with different intent
    txHash = await attestNoteIntent(
      bob,
      noteIntentContract,
      DELEGATABLE_NOTES_ADDRESS,
      noteId,
      bobStatementCid
    );
    await waitForIndexerToSyncToTxHash(machinery, bob.publicClient, txHash);

    // Verify alice's attestation
    const aliceAttestation = await getNoteIntentAttestation(
      machinery,
      alice.account,
      DELEGATABLE_NOTES_ADDRESS,
      noteId.toString()
    );
    assert.ok(aliceAttestation, "Alice's attestation should exist");
    assert.strictEqual(aliceAttestation!.intendedStatementId, aliceStatementCid);

    // Verify bob's attestation
    const bobAttestation = await getNoteIntentAttestation(
      machinery,
      bob.account,
      DELEGATABLE_NOTES_ADDRESS,
      noteId.toString()
    );
    assert.ok(bobAttestation, "Bob's attestation should exist");
    assert.strictEqual(bobAttestation!.intendedStatementId, bobStatementCid);

    // Verify both attestations exist for this note
    const allAttestations = await getNoteIntentAttestationsByNote(
      machinery,
      DELEGATABLE_NOTES_ADDRESS,
      noteId.toString()
    );
    assert.strictEqual(
      allAttestations.length,
      2,
      'Should have 2 attestations (one per attester)'
    );
  });

  it('should query attestations by intended statement', async function () {
    this.timeout(30000);

    const alice = createIsolatedWriteClients(SUITE_NAME, 5, RPC_URL);

    // Create two notes both intended for the same statement
    const noteId1 = await depositAndGetNoteId(alice, 1000000000000000000n);
    const noteId2 = await depositAndGetNoteId(alice, 2000000000000000000n);

    const sharedStatementCid = fakeIpfsCidV1('NoteIntentTest-shared-purpose');

    // Attest both notes for the same statement
    let txHash = await attestNoteIntent(
      alice,
      noteIntentContract,
      DELEGATABLE_NOTES_ADDRESS,
      noteId1,
      sharedStatementCid
    );
    await waitForIndexerToSyncToTxHash(machinery, alice.publicClient, txHash);

    txHash = await attestNoteIntent(
      alice,
      noteIntentContract,
      DELEGATABLE_NOTES_ADDRESS,
      noteId2,
      sharedStatementCid
    );
    await waitForIndexerToSyncToTxHash(machinery, alice.publicClient, txHash);

    // Query by statement
    const attestations = await getNoteIntentAttestationsByStatement(
      machinery,
      sharedStatementCid
    );

    assert(attestations.length >= 2, 'Should find at least 2 attestations for this statement');

    const noteIds = attestations.map((a) => a.noteId);
    assert(
      noteIds.includes(noteId1.toString()),
      'Should include first note'
    );
    assert(
      noteIds.includes(noteId2.toString()),
      'Should include second note'
    );
  });
});
