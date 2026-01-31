/**
 * Concept Space Indexer API
 *
 * This module provides the GraphQL API for the Concept Space subsystem.
 * It is logically separate from the Pubstarter API.
 *
 * The GraphQL API is auto-generated from the schema tables:
 * - schema.statements
 * - schema.beliefs
 * - schema.implications
 * - schema.users
 * - schema.attesters
 *
 * All queries support filtering, sorting, and pagination through the
 * auto-generated GraphQL schema.
 *
 * Custom endpoints:
 * - /api/indirect-supporters/:statementId - Get indirect supporters via schema.implications
 * - /api/statement-support/:statementId - Get direct + indirect support summary
 * - /api/suggestions/:userAddress - Get statement suggestions for a user
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { eq, and, inArray } from "ponder";
import {
  isValidHash,
  isValidAddress,
  parseAddressList,
  parsePositiveInt,
  invalidInputError,
} from "../utils/validation";
import { runIpfsSyncIteration } from "../conceptspace/utils/ipfsSyncJob";

const app = new Hono();

// Expose SQL client for direct queries
app.use("/sql/*", client({ db, schema }));

// GraphQL API (auto-generated from schema)
app.use("/graphql", graphql({ db, schema }));

/**
 * Custom API endpoint: Manually trigger IPFS content sync
 *
 * This is useful for E2E tests or situations where you want to force
 * immediate IPFS content fetching instead of waiting for the background job.
 *
 * Returns:
 *   - success: boolean
 *   - message: string
 *   - syncedCount: number (if successful)
 */
app.post("/api/sync-ipfs", async (c) => {
  try {
    let successCount = 0;
    let failureCount = 0;

    await runIpfsSyncIteration({
      db,
      log: {
        info: (msg: string) => {
          console.log(`[Manual IPFS Sync] ${msg}`);
          if (msg.includes("succeeded")) {
            const match = msg.match(/(\d+) succeeded, (\d+) failed/);
            if (match) {
              successCount = parseInt(match[1], 10);
              failureCount = parseInt(match[2], 10);
            }
          }
        },
        warn: (msg: string) => console.warn(`[Manual IPFS Sync] ${msg}`),
        error: (msg: string) => console.error(`[Manual IPFS Sync] ${msg}`),
      },
    });

    return c.json({
      success: true,
      message: "IPFS sync completed",
      syncedCount: successCount,
      failedCount: failureCount,
    });
  } catch (error) {
    console.error("Error during manual IPFS sync:", error);
    return c.json(
      {
        success: false,
        message: "IPFS sync failed",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

/**
 * Custom API endpoint: Get indirect supporters of a statement
 *
 * Indirect support = schema.users who believe schema.statements that imply this statement
 * (filtered by trusted schema.attesters). Excludes schema.users who disbelieve the target.
 *
 * NOTE: Implications are NOT transitive - we only look at direct schema.implications.
 *
 * Query params:
 *   - schema.attesters: comma-separated list of trusted attester addresses (required)
 *   - limit: number (default 100, max 1000) - maximum number of supporters to return
 *   - offset: number (default 0) - number of supporters to skip
 */
app.get("/api/indirect-supporters/:statementId", async (c) => {
  try {
    const statementId = c.req.param("statementId");

    if (!isValidHash(statementId)) {
      return c.json(invalidInputError("statementId", "Must be a valid 32-byte hash"), 400);
    }

    const trustedAttesters = parseAddressList(c.req.query("schema.attesters"));

    if (!trustedAttesters || trustedAttesters.length === 0) {
      return c.json(invalidInputError("schema.attesters", "Must provide comma-separated list of valid addresses"), 400);
    }

    const limit = Math.min(parsePositiveInt(c.req.query("limit"), 100), 1000);
    const offset = parsePositiveInt(c.req.query("offset"), 0);

    // Step 1: Find all schema.statements that imply this statement (from trusted schema.attesters)
    const implyingStatements = await db
      .select({ fromStatementId: schema.implications.fromStatementId })
      .from(schema.implications)
      .where(
        and(
          eq(schema.implications.toStatementId, statementId),
          inArray(schema.implications.attester, trustedAttesters)
        )
      );

    if (implyingStatements.length === 0) {
      return c.json({ indirectSupporters: [], totalCount: 0, limit, offset });
    }

    const implyingIds = implyingStatements.map((s) => s.fromStatementId);

    // Step 2: Find all schema.users who believe those implying schema.statements
    const supporters = await db
      .select({ user: schema.beliefs.user })
      .from(schema.beliefs)
      .where(
        and(
          inArray(schema.beliefs.statementId, implyingIds),
          eq(schema.beliefs.beliefState, 1) // BELIEVES
        )
      );

    // Step 3: Exclude schema.users who disbelieve the target statement
    const disbelievers = await db
      .select({ user: schema.beliefs.user })
      .from(schema.beliefs)
      .where(
        and(
          eq(schema.beliefs.statementId, statementId),
          eq(schema.beliefs.beliefState, 2) // DISBELIEVES
        )
      );

    const disbelieverSet = new Set(disbelievers.map((d) => d.user));
    const allIndirectSupporters = [...new Set(supporters.map((s) => s.user))]
      .filter((user) => !disbelieverSet.has(user));

    const totalCount = allIndirectSupporters.length;

    // Apply pagination
    const indirectSupporters = allIndirectSupporters.slice(offset, offset + limit);

    return c.json({
      indirectSupporters,
      totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching indirect supporters:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Custom API endpoint: Get statement support summary
 * Returns both direct and indirect support counts
 */
app.get("/api/statement-support/:statementId", async (c) => {
  try {
    const statementId = c.req.param("statementId");

    if (!isValidHash(statementId)) {
      return c.json(invalidInputError("statementId", "Must be a valid 32-byte hash"), 400);
    }

    const trustedAttesters = parseAddressList(c.req.query("schema.attesters"));

    // Get statement info
    const statement = await db
      .select()
      .from(schema.statements)
      .where(eq(schema.statements.id, statementId))
      .limit(1);

    if (statement.length === 0) {
      return c.json({ error: "Statement not found" }, 404);
    }

    const directBelievers = statement[0]?.believerCount ?? 0;
    const directDisbelievers = statement[0]?.disbelieverCount ?? 0;

    // Calculate indirect supporters if schema.attesters provided
    let indirectCount = 0;
    if (trustedAttesters && trustedAttesters.length > 0) {
      // Find implying schema.statements
      const implyingStatements = await db
        .select({ fromStatementId: schema.implications.fromStatementId })
        .from(schema.implications)
        .where(
          and(
            eq(schema.implications.toStatementId, statementId),
            inArray(schema.implications.attester, trustedAttesters)
          )
        );

      if (implyingStatements.length > 0) {
        const implyingIds = implyingStatements.map((s) => s.fromStatementId);

        // Count unique believers of implying schema.statements
        const supporters = await db
          .select({ user: schema.beliefs.user })
          .from(schema.beliefs)
          .where(
            and(
              inArray(schema.beliefs.statementId, implyingIds),
              eq(schema.beliefs.beliefState, 1)
            )
          );

        // Exclude disbelievers
        const disbelievers = await db
          .select({ user: schema.beliefs.user })
          .from(schema.beliefs)
          .where(
            and(
              eq(schema.beliefs.statementId, statementId),
              eq(schema.beliefs.beliefState, 2)
            )
          );

        const disbelieverSet = new Set(disbelievers.map((d) => d.user));
        indirectCount = [...new Set(supporters.map((s) => s.user))]
          .filter((user) => !disbelieverSet.has(user)).length;
      }
    }

    return c.json({
      statementId,
      directBelievers,
      directDisbelievers,
      indirectBelievers: indirectCount,
      totalBelievers: directBelievers + indirectCount,
      statement: statement[0],
    });
  } catch (error) {
    console.error("Error fetching statement support:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Custom API endpoint: Get suggestions for a user
 * "You signed S1, and there's a statement S2 that is implied by S1 and
 * is more popular than S1; maybe you'd like to sign S2 as well."
 *
 * Query params:
 *   - schema.attesters: comma-separated list of trusted attester addresses (required)
 *   - limit: number (default 10, max 100) - maximum number of suggestions to return
 */
app.get("/api/suggestions/:userAddress", async (c) => {
  try {
    const userAddress = c.req.param("userAddress");

    if (!isValidAddress(userAddress)) {
      return c.json(invalidInputError("userAddress", "Must be a valid Ethereum address"), 400);
    }

    const trustedAttesters = parseAddressList(c.req.query("schema.attesters"));

    if (!trustedAttesters || trustedAttesters.length === 0) {
      return c.json(invalidInputError("schema.attesters", "Must provide comma-separated list of valid addresses"), 400);
    }

    const limit = Math.min(parsePositiveInt(c.req.query("limit"), 10), 100);

    // Get schema.statements the user believes
    const userBeliefs = await db
      .select({ statementId: schema.beliefs.statementId })
      .from(schema.beliefs)
      .where(
        and(
          eq(schema.beliefs.user, userAddress),
          eq(schema.beliefs.beliefState, 1)
        )
      );

    if (userBeliefs.length === 0) {
      return c.json({ suggestions: [] });
    }

    const believedIds = userBeliefs.map((b) => b.statementId);

    // Find schema.statements implied by user's schema.beliefs (that user hasn't already signed)
    const impliedStatements = await db
      .select({
        toStatementId: schema.implications.toStatementId,
        fromStatementId: schema.implications.fromStatementId,
      })
      .from(schema.implications)
      .where(
        and(
          inArray(schema.implications.fromStatementId, believedIds),
          inArray(schema.implications.attester, trustedAttesters)
        )
      );

    // Filter out already-believed schema.statements and get their info
    const notYetBelieved = impliedStatements
      .filter((s) => !believedIds.includes(s.toStatementId));

    if (notYetBelieved.length === 0) {
      return c.json({ suggestions: [] });
    }

    const targetIds = [...new Set(notYetBelieved.map((s) => s.toStatementId))];

    const targetStatements = await db
      .select()
      .from(schema.statements)
      .where(inArray(schema.statements.id, targetIds));

    // Get source statement believer counts for comparison
    const sourceIds = [...new Set(notYetBelieved.map((s) => s.fromStatementId))];
    const sourceStatements = await db
      .select()
      .from(schema.statements)
      .where(inArray(schema.statements.id, sourceIds));

    const sourceMap = new Map(sourceStatements.map((s) => [s.id, s]));

    // Build suggestions: target schema.statements more popular than source
    const suggestions = targetStatements
      .map((target) => {
        const implication = notYetBelieved.find((i) => i.toStatementId === target.id);
        const source = sourceMap.get(implication!.fromStatementId);

        if (!source || target.believerCount <= source.believerCount) {
          return null;
        }

        return {
          suggestedStatement: target,
          becauseYouBelieve: source,
          popularityGain: target.believerCount - source.believerCount,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.popularityGain - a!.popularityGain)
      .slice(0, limit);

    return c.json({ suggestions, limit });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
