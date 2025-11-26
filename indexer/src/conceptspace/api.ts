/**
 * Concept Space Indexer API
 *
 * This module provides the GraphQL API for the Concept Space subsystem.
 * It is logically separate from the Pubstarter API.
 *
 * The GraphQL API is auto-generated from the schema tables:
 * - statements
 * - beliefs
 * - implications
 * - users
 * - attesters
 *
 * All queries support filtering, sorting, and pagination through the
 * auto-generated GraphQL schema.
 *
 * Custom endpoints:
 * - /api/indirect-supporters/:statementId - Get indirect supporters via implications
 * - /api/statement-support/:statementId - Get direct + indirect support summary
 * - /api/suggestions/:userAddress - Get statement suggestions for a user
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { eq, and, inArray } from "ponder";
import {
  statements,
  beliefs,
  implications,
  users,
  attesters,
} from "../../ponder.schema";
import {
  isValidHash,
  isValidAddress,
  parseAddressList,
  invalidInputError,
} from "../utils/validation";

const app = new Hono();

// Expose SQL client for direct queries
app.use("/sql/*", client({ db, schema }));

// GraphQL API (auto-generated from schema)
app.use("/graphql", graphql({ db, schema }));

/**
 * Custom API endpoint: Get indirect supporters of a statement
 *
 * Indirect support = users who believe statements that imply this statement
 * (filtered by trusted attesters). Excludes users who disbelieve the target.
 *
 * NOTE: Implications are NOT transitive - we only look at direct implications.
 */
app.get("/api/indirect-supporters/:statementId", async (c) => {
  try {
    const statementId = c.req.param("statementId");

    if (!isValidHash(statementId)) {
      return c.json(invalidInputError("statementId", "Must be a valid 32-byte hash"), 400);
    }

    const trustedAttesters = parseAddressList(c.req.query("attesters"));

    if (!trustedAttesters || trustedAttesters.length === 0) {
      return c.json(invalidInputError("attesters", "Must provide comma-separated list of valid addresses"), 400);
    }

    // Step 1: Find all statements that imply this statement (from trusted attesters)
    const implyingStatements = await db
      .select({ fromStatementId: implications.fromStatementId })
      .from(implications)
      .where(
        and(
          eq(implications.toStatementId, statementId),
          inArray(implications.attester, trustedAttesters)
        )
      );

    if (implyingStatements.length === 0) {
      return c.json({ indirectSupporters: [], count: 0 });
    }

    const implyingIds = implyingStatements.map((s) => s.fromStatementId);

    // Step 2: Find all users who believe those implying statements
    const supporters = await db
      .select({ user: beliefs.user })
      .from(beliefs)
      .where(
        and(
          inArray(beliefs.statementId, implyingIds),
          eq(beliefs.beliefState, 1) // BELIEVES
        )
      );

    // Step 3: Exclude users who disbelieve the target statement
    const disbelievers = await db
      .select({ user: beliefs.user })
      .from(beliefs)
      .where(
        and(
          eq(beliefs.statementId, statementId),
          eq(beliefs.beliefState, 2) // DISBELIEVES
        )
      );

    const disbelieverSet = new Set(disbelievers.map((d) => d.user));
    const indirectSupporters = [...new Set(supporters.map((s) => s.user))]
      .filter((user) => !disbelieverSet.has(user));

    return c.json({
      indirectSupporters,
      count: indirectSupporters.length,
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

    const trustedAttesters = parseAddressList(c.req.query("attesters"));

    // Get statement info
    const statement = await db
      .select()
      .from(statements)
      .where(eq(statements.id, statementId))
      .limit(1);

    if (statement.length === 0) {
      return c.json({ error: "Statement not found" }, 404);
    }

    const directBelievers = statement[0]?.believerCount ?? 0;
    const directDisbelievers = statement[0]?.disbelieverCount ?? 0;

    // Calculate indirect supporters if attesters provided
    let indirectCount = 0;
    if (trustedAttesters && trustedAttesters.length > 0) {
      // Find implying statements
      const implyingStatements = await db
        .select({ fromStatementId: implications.fromStatementId })
        .from(implications)
        .where(
          and(
            eq(implications.toStatementId, statementId),
            inArray(implications.attester, trustedAttesters)
          )
        );

      if (implyingStatements.length > 0) {
        const implyingIds = implyingStatements.map((s) => s.fromStatementId);

        // Count unique believers of implying statements
        const supporters = await db
          .select({ user: beliefs.user })
          .from(beliefs)
          .where(
            and(
              inArray(beliefs.statementId, implyingIds),
              eq(beliefs.beliefState, 1)
            )
          );

        // Exclude disbelievers
        const disbelievers = await db
          .select({ user: beliefs.user })
          .from(beliefs)
          .where(
            and(
              eq(beliefs.statementId, statementId),
              eq(beliefs.beliefState, 2)
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
 */
app.get("/api/suggestions/:userAddress", async (c) => {
  try {
    const userAddress = c.req.param("userAddress");

    if (!isValidAddress(userAddress)) {
      return c.json(invalidInputError("userAddress", "Must be a valid Ethereum address"), 400);
    }

    const trustedAttesters = parseAddressList(c.req.query("attesters"));

    if (!trustedAttesters || trustedAttesters.length === 0) {
      return c.json(invalidInputError("attesters", "Must provide comma-separated list of valid addresses"), 400);
    }

    // Get statements the user believes
    const userBeliefs = await db
      .select({ statementId: beliefs.statementId })
      .from(beliefs)
      .where(
        and(
          eq(beliefs.user, userAddress),
          eq(beliefs.beliefState, 1)
        )
      );

    if (userBeliefs.length === 0) {
      return c.json({ suggestions: [] });
    }

    const believedIds = userBeliefs.map((b) => b.statementId);

    // Find statements implied by user's beliefs (that user hasn't already signed)
    const impliedStatements = await db
      .select({
        toStatementId: implications.toStatementId,
        fromStatementId: implications.fromStatementId,
      })
      .from(implications)
      .where(
        and(
          inArray(implications.fromStatementId, believedIds),
          inArray(implications.attester, trustedAttesters)
        )
      );

    // Filter out already-believed statements and get their info
    const notYetBelieved = impliedStatements
      .filter((s) => !believedIds.includes(s.toStatementId));

    if (notYetBelieved.length === 0) {
      return c.json({ suggestions: [] });
    }

    const targetIds = [...new Set(notYetBelieved.map((s) => s.toStatementId))];

    const targetStatements = await db
      .select()
      .from(statements)
      .where(inArray(statements.id, targetIds));

    // Get source statement believer counts for comparison
    const sourceIds = [...new Set(notYetBelieved.map((s) => s.fromStatementId))];
    const sourceStatements = await db
      .select()
      .from(statements)
      .where(inArray(statements.id, sourceIds));

    const sourceMap = new Map(sourceStatements.map((s) => [s.id, s]));

    // Build suggestions: target statements more popular than source
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
      .slice(0, 10);

    return c.json({ suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
