/**
 * Funding Portal Indexer API
 *
 * This module provides the GraphQL API for the Funding Portal subsystem.
 * It is logically separate from the foundational subsystem APIs (Concept Space,
 * Pubstarter, Delegation) and federates queries to those APIs for cross-cutting views.
 *
 * The GraphQL API is auto-generated from the schema tables:
 * - projectAlignments
 *
 * All queries support filtering, sorting, and pagination through the
 * auto-generated GraphQL schema.
 *
 * Custom endpoints:
 * - /api/aligned-projects/:statementId - Get all projects aligned with a statement (directly + indirectly)
 * - /api/available-funding/:statementId - Get total available funding for a statement (from delegatable notes)
 * - /api/contributor-leaderboard/:statementId - Get top contributors across all aligned projects
 * - /api/project-statements/:projectAddress - Get all statements a project is aligned with
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { eq, and, inArray } from "ponder";
import {
  projectAlignments,
  statements,
  implications,
  delegatableNotes,
  projects,
  participantSummaries,
} from "../../ponder.schema";

const app = new Hono();

// Expose SQL client for direct queries
app.use("/sql/*", client({ db, schema }));

// GraphQL API (auto-generated from schema)
app.use("/graphql", graphql({ db, schema }));

/**
 * Custom API endpoint: Get all projects aligned with a statement
 *
 * This implements the key Funding Portal feature:
 * - Find projects directly aligned with the statement
 * - Find projects aligned with statements that imply the target statement (indirect alignment)
 * - Filter by trusted attesters
 * - Include project details from Pubstarter subsystem
 *
 * NOTE: Implications are NOT transitive - we only look at direct implications.
 *
 * Example: GET /api/aligned-projects/0xabc...?attesters=0x123,0x456
 * Response: {
 *   statementId: "0xabc...",
 *   directlyAlignedProjects: [
 *     {
 *       projectAddress: "0xproject1...",
 *       attesters: ["0x123..."],
 *       projectDetails: { ... }
 *     }
 *   ],
 *   indirectlyAlignedProjects: [
 *     {
 *       projectAddress: "0xproject2...",
 *       alignedVia: "0xstatement2...",
 *       attesters: ["0x456..."],
 *       projectDetails: { ... }
 *     }
 *   ],
 *   totalProjects: 12
 * }
 */
app.get("/api/aligned-projects/:statementId", async (c) => {
  const statementId = c.req.param("statementId") as `0x${string}`;
  const trustedAttesters = c.req.query("attesters")?.split(",") as `0x${string}`[] | undefined;

  if (!trustedAttesters || trustedAttesters.length === 0) {
    return c.json({ error: "Must provide trusted attesters" }, 400);
  }

  // Step 1: Find projects directly aligned with this statement
  const directAlignments = await db
    .select({
      projectAddress: projectAlignments.projectAddress,
      attester: projectAlignments.attester,
    })
    .from(projectAlignments)
    .where(
      and(
        eq(projectAlignments.statementId, statementId),
        inArray(projectAlignments.attester, trustedAttesters)
      )
    );

  // Group by project and collect attesters
  const directProjectMap = new Map<string, string[]>();
  for (const alignment of directAlignments) {
    const existing = directProjectMap.get(alignment.projectAddress) || [];
    existing.push(alignment.attester);
    directProjectMap.set(alignment.projectAddress, existing);
  }

  // Step 2: Find statements that imply this statement (from trusted attesters)
  const implyingStatements = await db
    .select({ fromStatementId: implications.fromStatementId })
    .from(implications)
    .where(
      and(
        eq(implications.toStatementId, statementId),
        inArray(implications.attester, trustedAttesters)
      )
    );

  const implyingIds = [...new Set(implyingStatements.map((s) => s.fromStatementId))];

  // Step 3: Find projects aligned with those implying statements
  let indirectAlignments: any[] = [];
  if (implyingIds.length > 0) {
    indirectAlignments = await db
      .select({
        projectAddress: projectAlignments.projectAddress,
        statementId: projectAlignments.statementId,
        attester: projectAlignments.attester,
      })
      .from(projectAlignments)
      .where(
        and(
          inArray(projectAlignments.statementId, implyingIds),
          inArray(projectAlignments.attester, trustedAttesters)
        )
      );
  }

  // Group indirect alignments by project
  const indirectProjectMap = new Map<string, { alignedVia: Set<string>; attesters: Set<string> }>();
  for (const alignment of indirectAlignments) {
    // Skip if already directly aligned
    if (directProjectMap.has(alignment.projectAddress)) {
      continue;
    }

    const existing = indirectProjectMap.get(alignment.projectAddress) || {
      alignedVia: new Set(),
      attesters: new Set(),
    };
    existing.alignedVia.add(alignment.statementId);
    existing.attesters.add(alignment.attester);
    indirectProjectMap.set(alignment.projectAddress, existing);
  }

  // Step 4: Get project details from Pubstarter subsystem
  const allProjectAddresses = [
    ...Array.from(directProjectMap.keys()),
    ...Array.from(indirectProjectMap.keys()),
  ];

  let projectDetails = new Map<string, any>();
  if (allProjectAddresses.length > 0) {
    const projectRecords = await db
      .select()
      .from(projects)
      .where(inArray(projects.id, allProjectAddresses as `0x${string}`[]));

    for (const project of projectRecords) {
      projectDetails.set(project.id, {
        address: project.id,
        recipient: project.recipient,
        threshold: project.threshold.toString(),
        deadline: project.deadline.toString(),
        totalReceived: project.totalReceived.toString(),
        withdrawn: project.withdrawn,
        metadataCid: project.metadataCid,
        metadataContent: project.metadataContent,
        createdAt: project.createdAt.toString(),
      });
    }
  }

  // Step 5: Build response
  const directlyAlignedProjects = Array.from(directProjectMap.entries()).map(([address, attesters]) => ({
    projectAddress: address,
    attesters,
    projectDetails: projectDetails.get(address) || null,
  }));

  const indirectlyAlignedProjects = Array.from(indirectProjectMap.entries()).map(([address, data]) => ({
    projectAddress: address,
    alignedVia: Array.from(data.alignedVia),
    attesters: Array.from(data.attesters),
    projectDetails: projectDetails.get(address) || null,
  }));

  return c.json({
    statementId,
    directlyAlignedProjects,
    indirectlyAlignedProjects,
    totalProjects: directlyAlignedProjects.length + indirectlyAlignedProjects.length,
  });
});

/**
 * Custom API endpoint: Get available funding for a statement
 *
 * Federates to the Delegation subsystem to calculate total funding available
 * for this cause from delegatable notes. Includes:
 * - Notes directly intended for this statement
 * - Notes intended for statements that imply this statement (indirect funding)
 *
 * Example: GET /api/available-funding/0xabc...?attesters=0x123,0x456
 * Response: {
 *   statementId: "0xabc...",
 *   directFunding: "5000000000000000000",
 *   indirectFunding: "2000000000000000000",
 *   totalFunding: "7000000000000000000",
 *   noteCount: 15,
 *   uniqueOwners: 8,
 *   byToken: {
 *     "0x0000...": "7000000000000000000"
 *   }
 * }
 */
app.get("/api/available-funding/:statementId", async (c) => {
  const statementId = c.req.param("statementId") as `0x${string}`;
  const trustedAttesters = c.req.query("attesters")?.split(",") as `0x${string}`[] | undefined;

  if (!trustedAttesters || trustedAttesters.length === 0) {
    return c.json({ error: "Must provide trusted attesters" }, 400);
  }

  // Step 1: Get direct funding (notes intended for this statement)
  const directNotes = await db
    .select()
    .from(delegatableNotes)
    .where(
      and(
        eq(delegatableNotes.intendedStatementId, statementId),
        eq(delegatableNotes.active, true)
      )
    );

  // Step 2: Find statements that imply this statement
  const implyingStatements = await db
    .select({ fromStatementId: implications.fromStatementId })
    .from(implications)
    .where(
      and(
        eq(implications.toStatementId, statementId),
        inArray(implications.attester, trustedAttesters)
      )
    );

  const implyingIds = [...new Set(implyingStatements.map((s) => s.fromStatementId))];

  // Step 3: Get indirect funding (notes intended for implying statements)
  let indirectNotes: any[] = [];
  if (implyingIds.length > 0) {
    indirectNotes = await db
      .select()
      .from(delegatableNotes)
      .where(
        and(
          inArray(delegatableNotes.intendedStatementId, implyingIds),
          eq(delegatableNotes.active, true)
        )
      );
  }

  // Step 4: Calculate totals
  let directFunding = 0n;
  let indirectFunding = 0n;
  const byToken: Record<string, bigint> = {};
  const uniqueOwners = new Set<string>();

  for (const note of directNotes) {
    directFunding += note.amount;
    uniqueOwners.add(note.owner.toLowerCase());
    const tokenKey = note.token.toLowerCase();
    byToken[tokenKey] = (byToken[tokenKey] || 0n) + note.amount;
  }

  for (const note of indirectNotes) {
    indirectFunding += note.amount;
    uniqueOwners.add(note.owner.toLowerCase());
    const tokenKey = note.token.toLowerCase();
    byToken[tokenKey] = (byToken[tokenKey] || 0n) + note.amount;
  }

  // Convert bigints to strings for JSON
  const byTokenStr: Record<string, string> = {};
  for (const [token, amount] of Object.entries(byToken)) {
    byTokenStr[token] = amount.toString();
  }

  return c.json({
    statementId,
    directFunding: directFunding.toString(),
    indirectFunding: indirectFunding.toString(),
    totalFunding: (directFunding + indirectFunding).toString(),
    noteCount: directNotes.length + indirectNotes.length,
    uniqueOwners: uniqueOwners.size,
    byToken: byTokenStr,
  });
});

/**
 * Custom API endpoint: Get contributor leaderboard for a statement
 *
 * Aggregates contributions across all projects aligned with a statement
 * (both directly and indirectly via implications). Shows top contributors
 * with their delegation chains for transparency.
 *
 * This is a complex federated query that joins data from:
 * - Funding Portal (project alignments)
 * - Concept Space (implications)
 * - Pubstarter (contributions)
 * - Delegation (delegation chains)
 *
 * Example: GET /api/contributor-leaderboard/0xabc...?attesters=0x123,0x456&limit=20
 * Response: {
 *   statementId: "0xabc...",
 *   contributors: [
 *     {
 *       address: "0xuser1...",
 *       totalContributed: "10000000000000000000",
 *       projectCount: 5,
 *       // If contributed via delegation:
 *       delegationChain: ["0xalice...", "0xbob...", "0xuser1..."],
 *       rootOwner: "0xalice..."
 *     },
 *     ...
 *   ],
 *   totalContributions: "50000000000000000000",
 *   uniqueContributors: 42
 * }
 */
app.get("/api/contributor-leaderboard/:statementId", async (c) => {
  const statementId = c.req.param("statementId") as `0x${string}`;
  const trustedAttesters = c.req.query("attesters")?.split(",") as `0x${string}`[] | undefined;
  const limit = parseInt(c.req.query("limit") || "20");

  if (!trustedAttesters || trustedAttesters.length === 0) {
    return c.json({ error: "Must provide trusted attesters" }, 400);
  }

  // Step 1: Get all aligned projects (direct + indirect)
  const directAlignments = await db
    .select({ projectAddress: projectAlignments.projectAddress })
    .from(projectAlignments)
    .where(
      and(
        eq(projectAlignments.statementId, statementId),
        inArray(projectAlignments.attester, trustedAttesters)
      )
    );

  const directProjectAddresses = [...new Set(directAlignments.map((a) => a.projectAddress))];

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

  const implyingIds = [...new Set(implyingStatements.map((s) => s.fromStatementId))];

  let indirectProjectAddresses: string[] = [];
  if (implyingIds.length > 0) {
    const indirectAlignments = await db
      .select({ projectAddress: projectAlignments.projectAddress })
      .from(projectAlignments)
      .where(
        and(
          inArray(projectAlignments.statementId, implyingIds),
          inArray(projectAlignments.attester, trustedAttesters)
        )
      );
    indirectProjectAddresses = [...new Set(indirectAlignments.map((a) => a.projectAddress))];
  }

  const allProjectAddresses = [...new Set([...directProjectAddresses, ...indirectProjectAddresses])];

  if (allProjectAddresses.length === 0) {
    return c.json({
      statementId,
      contributors: [],
      totalContributions: "0",
      uniqueContributors: 0,
    });
  }

  // Step 2: Get contribution summaries for these projects
  const summaries = await db
    .select()
    .from(participantSummaries)
    .where(inArray(participantSummaries.projectAddress, allProjectAddresses as `0x${string}`[]));

  // Step 3: Aggregate by contributor
  const contributorMap = new Map<string, { total: bigint; projectCount: number }>();

  for (const summary of summaries) {
    const existing = contributorMap.get(summary.participant) || {
      total: 0n,
      projectCount: 0,
    };
    existing.total += summary.netContribution;
    existing.projectCount += 1;
    contributorMap.set(summary.participant, existing);
  }

  // Step 4: Sort by total contribution and take top N
  const sortedContributors = Array.from(contributorMap.entries())
    .sort((a, b) => {
      const diff = b[1].total - a[1].total;
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    })
    .slice(0, limit);

  // Step 5: Build response
  const contributors = sortedContributors.map(([address, data]) => ({
    address,
    totalContributed: data.total.toString(),
    projectCount: data.projectCount,
  }));

  const totalContributions = Array.from(contributorMap.values()).reduce(
    (sum, data) => sum + data.total,
    0n
  );

  return c.json({
    statementId,
    contributors,
    totalContributions: totalContributions.toString(),
    uniqueContributors: contributorMap.size,
  });
});

/**
 * Custom API endpoint: Get all statements a project is aligned with
 *
 * Shows which causes/statements this project supports, filtered by trusted attesters.
 *
 * Example: GET /api/project-statements/0xproject...?attesters=0x123,0x456
 * Response: {
 *   projectAddress: "0xproject...",
 *   alignedStatements: [
 *     {
 *       statementId: "0xstatement1...",
 *       attesters: ["0x123..."],
 *       statementDetails: { ... }
 *     },
 *     ...
 *   ],
 *   totalStatements: 3
 * }
 */
app.get("/api/project-statements/:projectAddress", async (c) => {
  const projectAddress = c.req.param("projectAddress") as `0x${string}`;
  const trustedAttesters = c.req.query("attesters")?.split(",") as `0x${string}`[] | undefined;

  if (!trustedAttesters || trustedAttesters.length === 0) {
    return c.json({ error: "Must provide trusted attesters" }, 400);
  }

  // Get all alignments for this project
  const alignments = await db
    .select({
      statementId: projectAlignments.statementId,
      attester: projectAlignments.attester,
    })
    .from(projectAlignments)
    .where(
      and(
        eq(projectAlignments.projectAddress, projectAddress),
        inArray(projectAlignments.attester, trustedAttesters)
      )
    );

  // Group by statement
  const statementMap = new Map<string, string[]>();
  for (const alignment of alignments) {
    const existing = statementMap.get(alignment.statementId) || [];
    existing.push(alignment.attester);
    statementMap.set(alignment.statementId, existing);
  }

  // Get statement details
  const statementIds = Array.from(statementMap.keys());
  let statementDetails = new Map<string, any>();

  if (statementIds.length > 0) {
    const stmts = await db
      .select()
      .from(statements)
      .where(inArray(statements.id, statementIds as `0x${string}`[]));

    for (const stmt of stmts) {
      statementDetails.set(stmt.id, {
        id: stmt.id,
        cid: stmt.cid,
        statementType: stmt.statementType,
        title: stmt.title,
        excerpt: stmt.excerpt,
        believerCount: stmt.believerCount,
        disbelieverCount: stmt.disbelieverCount,
      });
    }
  }

  // Build response
  const alignedStatements = Array.from(statementMap.entries()).map(([statementId, attesters]) => ({
    statementId,
    attesters,
    statementDetails: statementDetails.get(statementId) || null,
  }));

  return c.json({
    projectAddress,
    alignedStatements,
    totalStatements: alignedStatements.length,
  });
});

export default app;
