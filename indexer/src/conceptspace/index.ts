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
} from "../../ponder.schema";
import {
  bytes32ToCid,
  fetchStatementContent,
  extractExcerpt,
} from "./utils/ipfs";

// Belief state constants (matching Solidity)
const NO_OPINION = 0;
const BELIEVES = 1;
const DISBELIEVES = 2;

/**
 * Ensure a statement record exists in the database
 * Creates a placeholder if it doesn't exist, and queues IPFS fetch
 */
async function ensureStatement(
  ctx: { db: any },
  statementId: `0x${string}`,
  timestamp: bigint
) {
  const existing = await ctx.db.find(statements, { id: statementId });

  if (!existing) {
    const cid = bytes32ToCid(statementId);

    // Create placeholder record
    await ctx.db.insert(statements).values({
      id: statementId,
      cid,
      content: null,
      statementType: null,
      title: null,
      excerpt: null,
      believerCount: 0,
      disbelieverCount: 0,
      createdAt: timestamp,
      contentFetched: false,
    });

    // Try to fetch content from IPFS (async, don't block indexing)
    fetchStatementContent(cid).then(async (content) => {
      if (content) {
        try {
          await ctx.db
            .update(statements, { id: statementId })
            .set({
              content: JSON.stringify(content),
              statementType: content.statementType,
              title: content.metadata?.title || null,
              excerpt: extractExcerpt(content.content),
              contentFetched: true,
            });
        } catch (e) {
          // May fail if record was updated elsewhere, that's ok
          console.warn(`Failed to update statement ${statementId} content:`, e);
        }
      }
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

  // Ensure statement and user exist
  await ensureStatement(context, statementId, timestamp);
  await ensureUser(context, user, timestamp);

  // Get existing belief (if any)
  const existingBelief = await context.db.find(beliefs, {
    user,
    statementId,
  });

  const oldState = existingBelief?.beliefState ?? NO_OPINION;
  const newState = beliefState;

  // Update or insert belief record
  if (existingBelief) {
    await context.db
      .update(beliefs, { user, statementId })
      .set({
        beliefState: newState,
        updatedAt: timestamp,
        blockNumber,
      });
  } else {
    await context.db.insert(beliefs).values({
      user,
      statementId,
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
    const stmt = await context.db.find(statements, { id: statementId });
    if (stmt) {
      await context.db
        .update(statements, { id: statementId })
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
  const { attester, fromStatementId, toStatementId } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);

  // Ensure both statements and attester exist
  await ensureStatement(context, fromStatementId, timestamp);
  await ensureStatement(context, toStatementId, timestamp);
  await ensureAttester(context, attester, timestamp);

  // Check if this implication already exists (contract allows re-attestation)
  const existing = await context.db.find(implications, {
    attester,
    fromStatementId,
    toStatementId,
  });

  if (!existing) {
    // Create new implication record
    await context.db.insert(implications).values({
      attester,
      fromStatementId,
      toStatementId,
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
  }
  // If it already exists, we ignore re-attestations (idempotent)
});
