/**
 * Invariant checking utilities for integration tests
 *
 * These functions verify that the system maintains consistency properties
 * that should always be true, regardless of what actions are performed.
 *
 * Note: Invariants that previously checked old derived-table consistency
 * (assertBeliefCountsMatch, assertNoOrphanedData, assertAggregatedCountConsistency)
 * have been removed — the indexer no longer maintains derived tables.
 * Business logic correctness is now tested by the SDK fold unit tests.
 */

import assert from 'assert';
import { ActionTestingMachinery } from '../actions/action-machinery.js';
import {
  getIndirectSupporterCount, getIndirectSupporters, IpfsCidV1,
  getProject, getProjectContributions, getProjectRefunds,
  getTokenBurns, getNote, getDelegationChain,
  getUserRef, getRef, getUserRefHistory,
  getImplicationsFrom,
  getUserBelief,
  getMarketplaceTrades,
} from '@commonality/sdk';
import { createIsolatedTestClients } from './test-utils.js';

/**
 * State Consistency Invariant #2: Money conservation
 *
 * For any assurance contract (project):
 * - totalReceived should equal (sum of contributions) - (sum of refunds)
 */
export async function assertMoneyConservation(
  machinery: ActionTestingMachinery,
  projectAddress: string
): Promise<void> {
  const project = await getProject(machinery, projectAddress.toLowerCase());

  if (!project) {
    throw new Error(`Project ${projectAddress} not found`);
  }

  const contributions = await getProjectContributions(machinery, projectAddress.toLowerCase());
  const refunds = await getProjectRefunds(machinery, projectAddress.toLowerCase());

  const totalContributed = contributions.reduce((sum, contribution) => {
    return sum + BigInt(contribution.totalCost!);
  }, 0n);

  const totalRefunded = refunds.reduce((sum, refund) => {
    return sum + BigInt(refund.totalRefund);
  }, 0n);

  const expectedTotal = totalContributed - totalRefunded;
  const cachedTotal = BigInt(project.totalReceived);

  assert.strictEqual(
    cachedTotal,
    expectedTotal,
    `Project ${projectAddress}: totalReceived mismatch. ` +
    `Expected ${expectedTotal.toString()} (${totalContributed.toString()} from ${contributions.length} contributions ` +
    `minus ${totalRefunded.toString()} from ${refunds.length} refunds), ` +
    `got ${cachedTotal.toString()} (from cached totalReceived)`
  );
}

/**
 * State Consistency Invariant #3: Token conservation
 *
 * For any project (assurance contract):
 * - For each tokenId: tokens sold (from contributions) should equal tokens held by users + tokens burned
 */
export async function assertTokenConservation(
  machinery: ActionTestingMachinery,
  projectAddress: string
): Promise<void> {
  const contributions = await getProjectContributions(machinery, projectAddress.toLowerCase());
  if (contributions.length === 0) {
    return;
  }

  const erc1155Address = contributions[0].erc1155Address;
  if (!erc1155Address) {
    throw new Error(`Contribution for project ${projectAddress} has no erc1155Address`);
  }

  const burns = await getTokenBurns(machinery, erc1155Address.toLowerCase());

  const tokenStats = new Map<string, { sold: bigint; burned: bigint }>();

  for (const contribution of contributions) {
    if (contribution.erc1155Address?.toLowerCase() !== erc1155Address.toLowerCase()) {
      continue;
    }

    const tokenIds = JSON.parse(contribution.tokenIds!) as string[];
    const tokenCounts = JSON.parse(contribution.tokenCounts!) as string[];

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      const count = BigInt(tokenCounts[i]);

      const stats = tokenStats.get(tokenId) || { sold: 0n, burned: 0n };
      stats.sold += count;
      tokenStats.set(tokenId, stats);
    }
  }

  for (const burn of burns) {
    const tokenIds = JSON.parse(burn.tokenIds) as string[];
    const tokenCounts = JSON.parse(burn.tokenCounts) as string[];

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      const count = BigInt(tokenCounts[i]);

      const stats = tokenStats.get(tokenId) || { sold: 0n, burned: 0n };
      stats.burned += count;
      tokenStats.set(tokenId, stats);
    }
  }

  for (const [tokenId, stats] of tokenStats.entries()) {
    const held = stats.sold - stats.burned;

    assert(
      held >= 0n,
      `ERC1155 ${erc1155Address} tokenId ${tokenId}: Token conservation violation. ` +
      `Burned (${stats.burned.toString()}) exceeds sold (${stats.sold.toString()}). ` +
      `This would mean ${(-held).toString()} tokens were burned that were never purchased.`
    );
  }
}

/**
 * State Consistency Invariant #4: Delegation chain integrity
 *
 * For any delegation note with a chain:
 * - Following the delegation chain should never create a cycle
 * - Each address in the chain should appear exactly once
 * - The chain positions should be sequential (0, 1, 2, ...)
 * - The first position (0) should be the rootOwner
 * - The last position should be the current owner (leaf)
 */
export async function assertDelegationChainIntegrity(
  machinery: ActionTestingMachinery,
  noteId: string
): Promise<void> {
  const note = await getNote(machinery, noteId);
  if (!note) {
    throw new Error(`Note ${noteId} not found`);
  }

  const chain = await getDelegationChain(machinery, noteId);

  if (chain.length === 0) {
    assert.strictEqual(
      note.owner.toLowerCase(),
      note.rootOwner.toLowerCase(),
      `Note ${noteId}: Root note (no chain) should have owner === rootOwner. ` +
      `Owner: ${note.owner}, RootOwner: ${note.rootOwner}`
    );
    return;
  }

  const addressSet = new Set<string>();
  for (const link of chain) {
    const normalizedAddress = link.address.toLowerCase();
    if (addressSet.has(normalizedAddress)) {
      throw new Error(
        `Note ${noteId}: Delegation chain contains cycle. ` +
        `Address ${link.address} appears multiple times in the chain.`
      );
    }
    addressSet.add(normalizedAddress);
  }

  for (let i = 0; i < chain.length; i++) {
    assert.strictEqual(
      chain[i].position,
      i,
      `Note ${noteId}: Chain position mismatch at index ${i}. ` +
      `Expected position ${i}, got ${chain[i].position}`
    );
  }

  assert.strictEqual(
    chain[0].address.toLowerCase(),
    note.rootOwner.toLowerCase(),
    `Note ${noteId}: First chain position (0) should be rootOwner. ` +
    `Chain[0]: ${chain[0].address}, RootOwner: ${note.rootOwner}`
  );

  const lastChainLink = chain[chain.length - 1];
  assert.strictEqual(
    lastChainLink.address.toLowerCase(),
    note.owner.toLowerCase(),
    `Note ${noteId}: Last chain position should be current owner (leaf). ` +
    `Chain[${chain.length - 1}]: ${lastChainLink.address}, Owner: ${note.owner}`
  );
}

/**
 * State Transition Property: Token transfer consistency
 *
 * When tokens are transferred in the secondary market (via trade), verify that:
 * - The trade record has internally consistent data
 * - Buyer and seller are different addresses
 * - Token count is greater than 0
 * - Total price equals count * pricePerToken
 */
export async function assertTradeDataConsistency(
  machinery: ActionTestingMachinery,
  marketplaceAddress: string,
  transactionHash: string
): Promise<void> {
  const allTrades = await getMarketplaceTrades(machinery, marketplaceAddress);

  const trade = allTrades.find(
    t => t.transactionHash.toLowerCase() === transactionHash.toLowerCase()
  );

  if (!trade) {
    throw new Error(
      `Trade not found for marketplace ${marketplaceAddress} ` +
      `in transaction ${transactionHash}`
    );
  }

  const buyerNormalized = trade.buyer.toLowerCase();
  const sellerNormalized = trade.seller.toLowerCase();

  assert.notStrictEqual(
    buyerNormalized,
    sellerNormalized,
    `Trade ${trade.id}: Buyer and seller must be different addresses. ` +
    `Both are ${trade.buyer}`
  );

  const count = BigInt(trade.count);
  assert(
    count > 0n,
    `Trade ${trade.id}: Count must be greater than 0. Got ${count.toString()}`
  );

  const pricePerToken = BigInt(trade.pricePerToken);
  const totalPrice = BigInt(trade.totalPrice);
  const expectedTotalPrice = count * pricePerToken;

  assert.strictEqual(
    totalPrice,
    expectedTotalPrice,
    `Trade ${trade.id}: Total price mismatch. ` +
    `Expected ${expectedTotalPrice.toString()} (${count.toString()} * ${pricePerToken.toString()}), ` +
    `got ${totalPrice.toString()}`
  );
}

/**
 * Query Consistency Check: Indirect supporter count vs list
 *
 * Verifies that different ways of querying indirect supporters return consistent results:
 * - The count query should return the same number as the length of the list query
 */
export async function assertIndirectSupporterCountConsistency(
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<void> {
  const count = await getIndirectSupporterCount(machinery, statementCid, trustedAttesters);
  const supporters = await getIndirectSupporters(machinery, statementCid, trustedAttesters);
  const actualCount = supporters.length;

  const attesterInfo = trustedAttesters?.length ? ` (filtered by attesters ${trustedAttesters.join(', ')})` : '';
  assert.strictEqual(
    count,
    actualCount,
    `Statement ${statementCid}${attesterInfo}: Indirect supporter count mismatch. ` +
    `Count query returned ${count}, but list query returned ${actualCount} supporters. ` +
    `This indicates a query consistency issue in the indexer.`
  );
}

/**
 * Business Logic Constraint: Unique statements (CID-based deduplication)
 *
 * Verifies that statements with identical IPFS content have the same statementId.
 */
export async function assertUniqueStatements(
  statementId1: string,
  statementId2: string,
  context?: string
): Promise<void> {
  const contextMsg = context ? ` ${context}` : '';

  assert.strictEqual(
    statementId1.toLowerCase(),
    statementId2.toLowerCase(),
    `Statement uniqueness violation${contextMsg}. ` +
    `Two statements with identical IPFS content should have the same statementId (CID-based deduplication). ` +
    `Got ${statementId1} and ${statementId2}. ` +
    `This indicates that either the CID calculation is non-deterministic or deduplication is not working correctly.`
  );
}

/**
 * Temporal/Historical Property: Monotonic project funding
 *
 * Verifies that a project's totalReceived amount never decreases between two snapshots
 * (unless a refund occurred, in which case the decrease should match the refund amount).
 */
export async function assertMonotonicProjectFunding(
  machinery: ActionTestingMachinery,
  projectAddress: string,
  expectedBefore: bigint,
  allowRefunds: boolean = false
): Promise<void> {
  const project = await getProject(machinery, projectAddress.toLowerCase());

  if (!project) {
    throw new Error(`Project ${projectAddress} not found`);
  }

  const currentTotal = BigInt(project.totalReceived);

  if (allowRefunds) {
    assert(
      currentTotal >= 0n,
      `Project ${projectAddress}: totalReceived became negative: ${currentTotal.toString()}`
    );
  } else {
    assert(
      currentTotal >= expectedBefore,
      `Project ${projectAddress}: totalReceived decreased without refunds. ` +
      `Expected at least ${expectedBefore.toString()}, got ${currentTotal.toString()}. ` +
      `This violates the monotonic funding property - totalReceived should only increase ` +
      `unless refunds are processed.`
    );
  }
}

/**
 * Business Logic Constraint: Assurance contract refund eligibility
 *
 * Verifies that the refund eligibility rules for assurance contracts are correctly enforced.
 */
export async function assertAssuranceContractRefundLogic(
  machinery: ActionTestingMachinery,
  projectAddress: string,
  currentBlockTimestamp: bigint,
  shouldAllowRefunds?: boolean
): Promise<void> {
  const project = await getProject(machinery, projectAddress.toLowerCase());

  if (!project) {
    throw new Error(`Project ${projectAddress} not found`);
  }

  const totalReceived = BigInt(project.totalReceived);
  const threshold = BigInt(project.threshold);
  const deadline = BigInt(project.deadline);

  if (threshold === 0n && deadline === 0n) {
    return;
  }

  const deadlineHasPassed = currentBlockTimestamp >= deadline;
  const thresholdWasMet = totalReceived >= threshold;
  const refundsAllowed = deadlineHasPassed && !thresholdWasMet;

  if (shouldAllowRefunds !== undefined) {
    assert.strictEqual(
      refundsAllowed,
      shouldAllowRefunds,
      `Project ${projectAddress}: Refund eligibility mismatch. ` +
      `Expected refunds ${shouldAllowRefunds ? 'allowed' : 'not allowed'}, ` +
      `but calculated ${refundsAllowed ? 'allowed' : 'not allowed'}. ` +
      `State: totalReceived=${totalReceived.toString()}, threshold=${threshold.toString()}, ` +
      `deadline=${deadline.toString()}, currentTime=${currentBlockTimestamp.toString()}`
    );
  }

  if (!deadlineHasPassed) {
    assert(
      !refundsAllowed,
      `Project ${projectAddress}: Refunds are allowed before deadline. ` +
      `This violates the business rule that refunds require deadline to pass. ` +
      `Deadline: ${deadline.toString()}, CurrentTime: ${currentBlockTimestamp.toString()}`
    );
  }

  if (deadlineHasPassed && thresholdWasMet) {
    assert(
      !refundsAllowed,
      `Project ${projectAddress}: Refunds are allowed for successful project. ` +
      `This violates the business rule that successful projects cannot be refunded. ` +
      `TotalReceived: ${totalReceived.toString()}, Threshold: ${threshold.toString()}`
    );
  }

  if (deadlineHasPassed && !thresholdWasMet) {
    assert(
      refundsAllowed,
      `Project ${projectAddress}: Refunds are not allowed for failed project. ` +
      `This violates the business rule that failed projects must allow refunds. ` +
      `TotalReceived: ${totalReceived.toString()}, Threshold: ${threshold.toString()}, ` +
      `Deadline: ${deadline.toString()}, CurrentTime: ${currentBlockTimestamp.toString()}`
    );
  }
}

/**
 * State Consistency Invariant: Implication bidirectionality
 *
 * Verifies that the indexer's view of implications is consistent with on-chain reality.
 */
export async function assertImplicationBidirectionality(
  machinery: ActionTestingMachinery,
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1,
  attesterAddress: string
): Promise<void> {
  const normalizedAttester = attesterAddress.toLowerCase();

  const implications = await getImplicationsFrom(machinery, fromStatementCid);

  const implication = implications.find(
    (imp) =>
      imp.toStatementCid === toStatementCid &&
      ((imp.attester as any).id || imp.attester).toLowerCase() === normalizedAttester
  );

  if (!implication) {
    throw new Error(
      `Implication ${fromStatementCid}→${toStatementCid} by ${attesterAddress} not found in indexer. ` +
      `Cannot verify bidirectionality.`
    );
  }

  assert.ok(
    implication.fromStatementCid,
    `Implication ${fromStatementCid}→${toStatementCid}: fromStatementCid should not be null/empty`
  );

  assert.ok(
    implication.toStatementCid,
    `Implication ${fromStatementCid}→${toStatementCid}: toStatementCid should not be null/empty`
  );

  assert.ok(
    implication.attester,
    `Implication ${fromStatementCid}→${toStatementCid}: attester should not be null/empty`
  );

  assert.strictEqual(
    implication.fromStatementCid,
    fromStatementCid,
    `Implication fromStatementCid mismatch. Expected ${fromStatementCid}, ` +
    `got ${implication.fromStatementCid}`
  );

  assert.strictEqual(
    implication.toStatementCid,
    toStatementCid,
    `Implication toStatementCid mismatch. Expected ${toStatementCid}, ` +
    `got ${implication.toStatementCid}`
  );

  const attesterIdFromResponse = (implication.attester as any).id || implication.attester;
  assert.strictEqual(
    attesterIdFromResponse.toLowerCase(),
    normalizedAttester,
    `Implication attester mismatch. Expected ${attesterAddress}, ` +
    `got ${attesterIdFromResponse}`
  );
}

/**
 * Business Logic Constraint: Implication non-transitivity
 *
 * Verifies that the system correctly implements non-transitive implication semantics.
 */
export async function assertImplicationNonTransitivity(
  machinery: ActionTestingMachinery,
  s1Cid: IpfsCidV1,
  s2Cid: IpfsCidV1,
  s3Cid: IpfsCidV1,
  attesterAddress: string,
  believerAddress: string
): Promise<void> {
  const { BELIEVES, DISBELIEVES } = await import('@commonality/sdk');
  const normalizedAttester = attesterAddress.toLowerCase();
  const normalizedBeliever = believerAddress.toLowerCase();

  const implicationsFromS1 = await getImplicationsFrom(machinery, s1Cid);
  const s1ToS2 = implicationsFromS1.find(
    (imp) =>
      imp.toStatementCid === s2Cid &&
      ((imp.attester as any).id || imp.attester).toLowerCase() === normalizedAttester
  );

  assert.ok(
    s1ToS2,
    `Non-transitivity test setup error: S1→S2 implication should exist. ` +
    `Attester ${attesterAddress} has not attested ${s1Cid}→${s2Cid}`
  );

  const implicationsFromS2 = await getImplicationsFrom(machinery, s2Cid);
  const s2ToS3 = implicationsFromS2.find(
    (imp) =>
      imp.toStatementCid === s3Cid &&
      ((imp.attester as any).id || imp.attester).toLowerCase() === normalizedAttester
  );

  assert.ok(
    s2ToS3,
    `Non-transitivity test setup error: S2→S3 implication should exist. ` +
    `Attester ${attesterAddress} has not attested ${s2Cid}→${s3Cid}`
  );

  const s1ToS3 = implicationsFromS1.find(
    (imp) =>
      imp.toStatementCid === s3Cid &&
      ((imp.attester as any).id || imp.attester).toLowerCase() === normalizedAttester
  );

  assert.ok(
    !s1ToS3,
    `Non-transitivity test setup error: S1→S3 implication should NOT exist. ` +
    `Found unexpected direct attestation ${s1Cid}→${s3Cid} by ${attesterAddress}. ` +
    `This test requires S1→S2 and S2→S3 to exist WITHOUT a direct S1→S3.`
  );

  const believerS1Belief = await getUserBelief(machinery, normalizedBeliever, s1Cid);
  assert.strictEqual(
    believerS1Belief?.beliefState,
    BELIEVES,
    `Non-transitivity test setup error: User ${believerAddress} should believe S1 (${s1Cid}). ` +
    `Got beliefState: ${believerS1Belief?.beliefState}`
  );

  const believerS2Belief = await getUserBelief(machinery, normalizedBeliever, s2Cid);
  assert.notStrictEqual(
    believerS2Belief?.beliefState,
    DISBELIEVES,
    `Non-transitivity test setup error: User ${believerAddress} should NOT disbelieve S2 (${s2Cid}).`
  );

  const believerS3Belief = await getUserBelief(machinery, normalizedBeliever, s3Cid);
  assert.notStrictEqual(
    believerS3Belief?.beliefState,
    DISBELIEVES,
    `Non-transitivity test setup error: User ${believerAddress} should NOT disbelieve S3 (${s3Cid}).`
  );

  const s2IndirectSupporters = await getIndirectSupporters(machinery, s2Cid, [normalizedAttester]);
  const s2SupporterAddresses = s2IndirectSupporters.map(s => s.user.toLowerCase());

  assert.ok(
    s2SupporterAddresses.includes(normalizedBeliever),
    `Implication transitivity violation: User ${believerAddress} believes S1 (${s1Cid}), ` +
    `and S1→S2 exists, so they should appear as indirect supporter of S2 (${s2Cid}). ` +
    `Found ${s2IndirectSupporters.length} indirect supporters, ` +
    `but ${believerAddress} is not among them: [${s2SupporterAddresses.join(', ')}]`
  );

  const s3IndirectSupporters = await getIndirectSupporters(machinery, s3Cid, [normalizedAttester]);
  const s3SupporterAddresses = s3IndirectSupporters.map(s => s.user.toLowerCase());

  assert.ok(
    !s3SupporterAddresses.includes(normalizedBeliever),
    `Implication NON-transitivity violation: User ${believerAddress} believes S1 (${s1Cid}), ` +
    `and we have S1→S2 and S2→S3 (but NO direct S1→S3), so they should NOT appear ` +
    `as indirect supporter of S3 (${s3Cid}). The system incorrectly propagated support ` +
    `through TWO hops.`
  );
}

/**
 * State Consistency Invariant: Ref contract-indexer consistency
 *
 * Verifies that the value of a mutable ref in the indexer matches the value
 * stored directly on the blockchain contract.
 */
export async function assertRefContractIndexerConsistency(
  machinery: ActionTestingMachinery,
  mutableRefContract: any,
  userAddress: string,
  refName: string
): Promise<void> {
  const indexerRef = await getUserRef(machinery, userAddress, refName);
  const indexerValue = indexerRef?.value ?? '';

  const clients = createIsolatedTestClients('ref-check', 0, process.env.RPC_URL || 'http://localhost:8545');
  const contractValue = await getRef(clients, mutableRefContract, userAddress as `0x${string}`, refName);

  assert.strictEqual(
    indexerValue,
    contractValue,
    `Ref ${refName} for user ${userAddress}: Indexer value doesn't match contract value. ` +
    `Indexer: "${indexerValue}", Contract: "${contractValue}".`
  );
}

/**
 * State Consistency Invariant: Ref history ordering
 *
 * Verifies that the history entries for a mutable ref are properly ordered.
 */
export async function assertRefHistoryOrdering(
  machinery: ActionTestingMachinery,
  userAddress: string,
  refName: string
): Promise<void> {
  const history = await getUserRefHistory(machinery, userAddress, refName);

  for (let i = 0; i < history.length - 1; i++) {
    const current = history[i];
    const next = history[i + 1];

    const currentBlock = BigInt(current.blockNumber);
    const nextBlock = BigInt(next.blockNumber);

    if (currentBlock < nextBlock) {
      throw new Error(
        `Ref ${refName} for user ${userAddress}: History ordering violation. ` +
        `Entry at index ${i} has blockNumber ${currentBlock}, ` +
        `but entry at index ${i + 1} has blockNumber ${nextBlock}. ` +
        `History should be in reverse chronological order (newest first).`
      );
    }

    if (currentBlock === nextBlock) {
      const currentLogIndex = current.logIndex ?? 0;
      const nextLogIndex = next.logIndex ?? 0;

      if (currentLogIndex < nextLogIndex) {
        throw new Error(
          `Ref ${refName} for user ${userAddress}: History ordering violation within block ${currentBlock}. ` +
          `Entry at index ${i} has logIndex ${currentLogIndex}, ` +
          `but entry at index ${i + 1} has logIndex ${nextLogIndex}.`
        );
      }
    }
  }
}
