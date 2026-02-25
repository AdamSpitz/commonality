/**
 * Concept Space Indexer Event Handlers
 *
 * This module handles events from the Concept Space subsystem:
 * - Beliefs contract events (DirectSupport - expressing belief/disbelief in statements)
 * - Implications contract events (ImplicationAttestation - "S1 implies S2" relationships)
 *
 * These handlers are logically separate from the Pubstarter indexer.
 */

import { ponder } from "ponder:registry";
import {
  statements,
  beliefs,
  implications,
  users,
  attesters,
} from "ponder:schema";
import { BeliefState } from "../constants";
import { IpfsCidBytes32, bytes32ToCid } from "../utils/cid-types";

// Belief state constants (matching Solidity)
const NO_OPINION = BeliefState.NO_OPINION;
const BELIEVES = BeliefState.BELIEVES;
const DISBELIEVES = BeliefState.DISBELIEVES;

/**
 * Ensure a statement record exists in the database
 * Creates a placeholder if it doesn't exist.
 *
 * IPFS content fetching is handled by the background sync job in
 * conceptspace/utils/ipfsSyncJob.ts, which periodically retries
 * fetching content for statements where contentFetched = false.
 */
async function ensureStatement(
  ctx: { db: any },
  statementIdBytes32: IpfsCidBytes32,
  timestamp: bigint
) {
  const cidV1 = bytes32ToCid(statementIdBytes32);
  const existing = await ctx.db.find(statements, { cidV1 });

  if (!existing) {
    // Create placeholder record
    // The background IPFS sync job will fetch content later
    await ctx.db.insert(statements).values({
      cidV1,
      content: null,
      statementType: null,
      title: null,
      excerpt: null,
      believerCount: 0,
      disbelieverCount: 0,
      createdAt: timestamp,
      contentFetched: false,
    });
  }
}

/**
 * Ensure a user record exists
 */
async function ensureUser(
  ctx: { db: any },
  userId: `0x${string}`,
  timestamp: bigint
) {
  const existing = await ctx.db.find(users, { id: userId });

  if (!existing) {
    await ctx.db.insert(users).values({
      id: userId,
      beliefCount: 0,
      disbeliefCount: 0,
      createdAt: timestamp,
    });
  }
}

/**
 * Ensure an attester record exists
 */
async function ensureAttester(
  ctx: { db: any },
  attesterId: `0x${string}`,
  timestamp: bigint
) {
  const existing = await ctx.db.find(attesters, { id: attesterId });

  if (!existing) {
    await ctx.db.insert(attesters).values({
      id: attesterId,
      implicationCount: 0,
      createdAt: timestamp,
    });
  }
}

/**
 * Handle DirectSupport events from the Beliefs contract
 * Updates belief records and statement/user counts
 */
ponder.on("Beliefs:DirectSupport", async ({ event, context }) => {
  const { user, statementId, beliefState } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);

  // Convert bytes32 to CIDv1 for storage
  const statementIdCidV1 = bytes32ToCid(statementId as IpfsCidBytes32);

  // Ensure statement and user exist
  await ensureStatement(context, statementId as IpfsCidBytes32, timestamp);
  await ensureUser(context, user, timestamp);

  // Get existing belief (if any)
  const existingBelief = await context.db.find(beliefs, {
    user,
    statementId: statementIdCidV1,
  });

  const oldState = existingBelief?.beliefState ?? NO_OPINION;
  const newState = beliefState;

  // Update or insert belief record
  if (existingBelief) {
    await context.db
      .update(beliefs, { user, statementId: statementIdCidV1 })
      .set({
        beliefState: newState,
        updatedAt: timestamp,
        blockNumber,
      });
  } else {
    await context.db.insert(beliefs).values({
      user,
      statementId: statementIdCidV1,
      beliefState: newState,
      updatedAt: timestamp,
      blockNumber,
    });
  }

  // Update statement counts
  let believerDelta = 0;
  let disbelieverDelta = 0;

  if (oldState === BELIEVES && newState !== BELIEVES) believerDelta = -1;
  if (oldState !== BELIEVES && newState === BELIEVES) believerDelta = 1;
  if (oldState === DISBELIEVES && newState !== DISBELIEVES) disbelieverDelta = -1;
  if (oldState !== DISBELIEVES && newState === DISBELIEVES) disbelieverDelta = 1;

  if (believerDelta !== 0 || disbelieverDelta !== 0) {
    const stmt = await context.db.find(statements, { cidV1: statementIdCidV1 });
    if (stmt) {
      await context.db
        .update(statements, { cidV1: statementIdCidV1 })
        .set({
          believerCount: stmt.believerCount + believerDelta,
          disbelieverCount: stmt.disbelieverCount + disbelieverDelta,
        });
    }
  }

  // Update user counts
  let userBeliefDelta = 0;
  let userDisbeliefDelta = 0;

  if (oldState === BELIEVES && newState !== BELIEVES) userBeliefDelta = -1;
  if (oldState !== BELIEVES && newState === BELIEVES) userBeliefDelta = 1;
  if (oldState === DISBELIEVES && newState !== DISBELIEVES) userDisbeliefDelta = -1;
  if (oldState !== DISBELIEVES && newState === DISBELIEVES) userDisbeliefDelta = 1;

  if (userBeliefDelta !== 0 || userDisbeliefDelta !== 0) {
    const usr = await context.db.find(users, { id: user });
    if (usr) {
      await context.db
        .update(users, { id: user })
        .set({
          beliefCount: usr.beliefCount + userBeliefDelta,
          disbeliefCount: usr.disbeliefCount + userDisbeliefDelta,
        });
    }
  }
});

/**
 * Handle ImplicationAttestation events from the Implications contract
 * Creates implication records and ensures statements exist
 */
ponder.on("Implications:ImplicationAttestation", async ({ event, context }) => {
  const { attester, fromStatementCid, toStatementCid, explanationCid } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);

  // Convert bytes32 to CIDv1 for storage
  const fromStatementCidCidV1 = bytes32ToCid(fromStatementCid as IpfsCidBytes32);
  const toStatementCidCidV1 = bytes32ToCid(toStatementCid as IpfsCidBytes32);
  const explanationCidV1 = bytes32ToCid(explanationCid as IpfsCidBytes32);

  // Ensure both statements and attester exist
  await ensureStatement(context, fromStatementCid as IpfsCidBytes32, timestamp);
  await ensureStatement(context, toStatementCid as IpfsCidBytes32, timestamp);
  await ensureAttester(context, attester, timestamp);

  // Check if this implication already exists (contract allows re-attestation)
  const existing = await context.db.find(implications, {
    attester,
    fromStatementCid: fromStatementCidCidV1,
    toStatementCid: toStatementCidCidV1,
  });

  if (!existing) {
    // Create new implication record
    await context.db.insert(implications).values({
      attester,
      fromStatementCid: fromStatementCidCidV1,
      toStatementCid: toStatementCidCidV1,
      explanationCid: explanationCidV1,
      createdAt: timestamp,
      blockNumber,
    });

    // Update attester count
    const att = await context.db.find(attesters, { id: attester });
    if (att) {
      await context.db
        .update(attesters, { id: attester })
        .set({
          implicationCount: att.implicationCount + 1,
        });
    }
  } else {
    // Update explanation if re-attesting
    await context.db
      .update(implications, {
        attester,
        fromStatementCid: fromStatementCidCidV1,
        toStatementCid: toStatementCidCidV1,
      })
      .set({
        explanationCid: explanationCidV1,
      });
  }
});
