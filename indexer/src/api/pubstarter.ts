/**
 * Pubstarter Indexer API
 *
 * This module provides GraphQL and REST APIs for the Pubstarter subsystem.
 * It is logically separate from the Concept Space API.
 *
 * Endpoints:
 * - GET /pubstarter/graphql - GraphQL API for pubstarter data
 * - GET /pubstarter/projects - List all projects with filters
 * - GET /pubstarter/projects/:address - Single project details
 * - GET /pubstarter/projects/:address/contributors - Project contributors (donors vs investors)
 * - GET /pubstarter/markets/:address/orderbook - Order book for a marketplace
 * - GET /pubstarter/markets/:address/trades - Recent trades for a marketplace
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { graphql, eq, and, desc, asc, sql } from "ponder";
import {
  projects,
  projectTokens,
  contributions,
  refunds,
  saleListings,
  buyOrders,
  trades,
  participantSummaries,
} from "../../ponder.schema";

const app = new Hono();

// GraphQL API for pubstarter data
app.use("/graphql", graphql({ db, schema }));

// ============================================================================
// PROJECT ENDPOINTS
// ============================================================================

/**
 * List all projects with optional filters
 * Query params:
 * - status: "active" | "succeeded" | "failed" (computed based on deadline/threshold)
 * - sort: "newest" | "deadline" | "progress" | "threshold"
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
app.get("/projects", async (c) => {
  const status = c.req.query("status");
  const sort = c.req.query("sort") || "newest";
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  // Determine sort column
  const sortColumn =
    sort === "deadline"
      ? asc(projects.deadline)
      : sort === "progress"
        ? desc(projects.totalReceived)
        : sort === "threshold"
          ? desc(projects.threshold)
          : desc(projects.createdAt);

  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(sortColumn)
    .limit(limit)
    .offset(offset);

  // Compute status for each project
  const now = BigInt(Math.floor(Date.now() / 1000));
  const projectsWithStatus = allProjects.map((p) => ({
    ...p,
    computedStatus: computeProjectStatus(p, now),
    progressPercent:
      p.threshold > 0n
        ? Number((p.totalReceived * 100n) / p.threshold)
        : 0,
  }));

  // Filter by status if specified
  const filtered = status
    ? projectsWithStatus.filter((p) => p.computedStatus === status)
    : projectsWithStatus;

  return c.json({
    projects: filtered,
    count: filtered.length,
    limit,
    offset,
  });
});

/**
 * Get single project details with tokens
 */
app.get("/projects/:address", async (c) => {
  const address = c.req.param("address") as `0x${string}`;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, address))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Get tokens for this project
  const tokens = await db
    .select()
    .from(projectTokens)
    .where(eq(projectTokens.projectAddress, address));

  // Compute status
  const now = BigInt(Math.floor(Date.now() / 1000));
  const projectData = project[0];

  return c.json({
    ...projectData,
    computedStatus: computeProjectStatus(projectData!, now),
    progressPercent:
      projectData!.threshold > 0n
        ? Number((projectData!.totalReceived * 100n) / projectData!.threshold)
        : 0,
    tokens,
  });
});

/**
 * Get contributors for a project
 * Distinguishes between:
 * - Donors: net contributors (contributed > refunded)
 * - Investors: current token holders would require onchain balance check
 *
 * Query params:
 * - sort: "amount" | "earliest" | "latest"
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
app.get("/projects/:address/contributors", async (c) => {
  const address = c.req.param("address") as `0x${string}`;
  const sort = c.req.query("sort") || "amount";
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  // Determine sort column
  const sortColumn =
    sort === "earliest"
      ? asc(participantSummaries.firstContributionAt)
      : sort === "latest"
        ? desc(participantSummaries.lastContributionAt)
        : desc(participantSummaries.netContribution);

  const summaries = await db
    .select()
    .from(participantSummaries)
    .where(eq(participantSummaries.projectAddress, address))
    .orderBy(sortColumn)
    .limit(limit)
    .offset(offset);

  // Filter to only show net contributors (netContribution > 0)
  const contributors = summaries.filter((s) => s.netContribution > 0n);

  return c.json({
    contributors,
    count: contributors.length,
    limit,
    offset,
  });
});

/**
 * Get contribution history for a project
 */
app.get("/projects/:address/contributions", async (c) => {
  const address = c.req.param("address") as `0x${string}`;
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  const projectContributions = await db
    .select()
    .from(contributions)
    .where(eq(contributions.projectAddress, address))
    .orderBy(desc(contributions.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    contributions: projectContributions,
    count: projectContributions.length,
    limit,
    offset,
  });
});

// ============================================================================
// MARKETPLACE ENDPOINTS
// ============================================================================

/**
 * Get order book for a marketplace
 * Returns active sale listings (asks) and buy orders (bids)
 *
 * Query params:
 * - tokenId: filter by specific token ID (optional)
 */
app.get("/markets/:address/orderbook", async (c) => {
  const marketplaceAddress = c.req.param("address") as `0x${string}`;
  const tokenIdParam = c.req.query("tokenId");
  const tokenId = tokenIdParam ? BigInt(tokenIdParam) : undefined;

  // Get active sale listings (asks)
  let asksQuery = db
    .select()
    .from(saleListings)
    .where(
      and(
        eq(saleListings.marketplaceAddress, marketplaceAddress),
        eq(saleListings.status, "active")
      )
    )
    .orderBy(asc(saleListings.pricePerToken));

  // Get active buy orders (bids)
  let bidsQuery = db
    .select()
    .from(buyOrders)
    .where(
      and(
        eq(buyOrders.marketplaceAddress, marketplaceAddress),
        eq(buyOrders.status, "active")
      )
    )
    .orderBy(desc(buyOrders.pricePerToken));

  const [asks, bids] = await Promise.all([asksQuery, bidsQuery]);

  // Filter by tokenId if specified
  const filteredAsks = tokenId !== undefined
    ? asks.filter((a) => a.tokenId === tokenId)
    : asks;
  const filteredBids = tokenId !== undefined
    ? bids.filter((b) => b.tokenId === tokenId)
    : bids;

  return c.json({
    marketplaceAddress,
    tokenId: tokenId?.toString(),
    asks: filteredAsks.map((a) => ({
      ...a,
      listingId: a.listingId.toString(),
      tokenId: a.tokenId.toString(),
      originalCount: a.originalCount.toString(),
      remainingCount: a.remainingCount.toString(),
      pricePerToken: a.pricePerToken.toString(),
    })),
    bids: filteredBids.map((b) => ({
      ...b,
      orderId: b.orderId.toString(),
      tokenId: b.tokenId.toString(),
      originalCount: b.originalCount.toString(),
      remainingCount: b.remainingCount.toString(),
      pricePerToken: b.pricePerToken.toString(),
    })),
  });
});

/**
 * Get recent trades for a marketplace
 *
 * Query params:
 * - tokenId: filter by specific token ID (optional)
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
app.get("/markets/:address/trades", async (c) => {
  const marketplaceAddress = c.req.param("address") as `0x${string}`;
  const tokenIdParam = c.req.query("tokenId");
  const tokenId = tokenIdParam ? BigInt(tokenIdParam) : undefined;
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  let query = db
    .select()
    .from(trades)
    .where(eq(trades.marketplaceAddress, marketplaceAddress))
    .orderBy(desc(trades.createdAt))
    .limit(limit)
    .offset(offset);

  const allTrades = await query;

  // Filter by tokenId if specified
  const filteredTrades = tokenId !== undefined
    ? allTrades.filter((t) => t.tokenId === tokenId)
    : allTrades;

  return c.json({
    trades: filteredTrades.map((t) => ({
      ...t,
      orderId: t.orderId.toString(),
      tokenId: t.tokenId.toString(),
      count: t.count.toString(),
      pricePerToken: t.pricePerToken.toString(),
      totalPrice: t.totalPrice.toString(),
    })),
    count: filteredTrades.length,
    limit,
    offset,
  });
});

/**
 * Get price history for a token on a marketplace
 */
app.get("/markets/:address/price-history", async (c) => {
  const marketplaceAddress = c.req.param("address") as `0x${string}`;
  const tokenIdParam = c.req.query("tokenId");

  if (!tokenIdParam) {
    return c.json({ error: "tokenId query parameter is required" }, 400);
  }

  const tokenId = BigInt(tokenIdParam);
  const limit = Math.min(parseInt(c.req.query("limit") || "100"), 500);

  const priceHistory = await db
    .select({
      timestamp: trades.createdAt,
      pricePerToken: trades.pricePerToken,
      count: trades.count,
      totalPrice: trades.totalPrice,
    })
    .from(trades)
    .where(
      and(
        eq(trades.marketplaceAddress, marketplaceAddress),
        eq(trades.tokenId, tokenId)
      )
    )
    .orderBy(asc(trades.createdAt))
    .limit(limit);

  return c.json({
    marketplaceAddress,
    tokenId: tokenId.toString(),
    priceHistory: priceHistory.map((p) => ({
      timestamp: p.timestamp.toString(),
      pricePerToken: p.pricePerToken.toString(),
      count: p.count.toString(),
      totalPrice: p.totalPrice.toString(),
    })),
  });
});

// ============================================================================
// USER ENDPOINTS
// ============================================================================

/**
 * Get all projects a user has contributed to
 */
app.get("/users/:address/contributions", async (c) => {
  const userAddress = c.req.param("address") as `0x${string}`;
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  const userContributions = await db
    .select()
    .from(participantSummaries)
    .where(eq(participantSummaries.participant, userAddress))
    .orderBy(desc(participantSummaries.netContribution))
    .limit(limit)
    .offset(offset);

  // Get project details for each contribution
  const projectIds = userContributions.map((c) => c.projectAddress);
  const projectDetails =
    projectIds.length > 0
      ? await db.select().from(projects)
      : [];

  const projectMap = new Map(projectDetails.map((p) => [p.id, p]));

  const contributionsWithProjects = userContributions
    .filter((c) => c.netContribution > 0n)
    .map((c) => ({
      ...c,
      project: projectMap.get(c.projectAddress),
    }));

  return c.json({
    contributions: contributionsWithProjects,
    count: contributionsWithProjects.length,
    limit,
    offset,
  });
});

/**
 * Get user's active market orders (listings and buy orders)
 */
app.get("/users/:address/orders", async (c) => {
  const userAddress = c.req.param("address") as `0x${string}`;

  const [userListings, userBuyOrders] = await Promise.all([
    db
      .select()
      .from(saleListings)
      .where(
        and(
          eq(saleListings.seller, userAddress),
          eq(saleListings.status, "active")
        )
      ),
    db
      .select()
      .from(buyOrders)
      .where(
        and(
          eq(buyOrders.buyer, userAddress),
          eq(buyOrders.status, "active")
        )
      ),
  ]);

  return c.json({
    saleListings: userListings,
    buyOrders: userBuyOrders,
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compute project status based on funding and deadline
 */
function computeProjectStatus(
  project: {
    totalReceived: bigint;
    threshold: bigint;
    deadline: bigint;
    withdrawn: boolean;
  },
  now: bigint
): "active" | "succeeded" | "failed" {
  // If recipient has withdrawn, project succeeded
  if (project.withdrawn) {
    return "succeeded";
  }

  // If threshold reached, project succeeded (even if not yet withdrawn)
  if (project.totalReceived >= project.threshold) {
    return "succeeded";
  }

  // If deadline passed and threshold not reached, project failed
  if (now >= project.deadline) {
    return "failed";
  }

  // Otherwise still active
  return "active";
}

export default app;
