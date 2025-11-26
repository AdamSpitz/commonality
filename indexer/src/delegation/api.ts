/**
 * Delegation Indexer API
 *
 * This module provides the GraphQL API for the Delegation subsystem.
 * It is logically separate from the Concept Space and Pubstarter APIs.
 *
 * The GraphQL API is auto-generated from the schema tables:
 * - delegatableNotes
 * - delegationChains
 * - noteEvents
 *
 * All queries support filtering, sorting, and pagination through the
 * auto-generated GraphQL schema.
 *
 * Custom endpoints:
 * - /api/delegation-chain/:noteId - Get full delegation chain for a note
 * - /api/active-notes/:address - Get all active notes owned by an address
 * - /api/available-funding/:statementId - Get total available funding for a statement
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { eq, and } from "ponder";
import {
  delegatableNotes,
  delegationChains,
  noteEvents,
} from "../../ponder.schema";

const app = new Hono();

// Expose SQL client for direct queries
app.use("/sql/*", client({ db, schema }));

// GraphQL API (auto-generated from schema)
app.use("/graphql", graphql({ db, schema }));

/**
 * Custom API endpoint: Get full delegation chain for a note
 *
 * Returns the delegation chain from root to leaf:
 * [root owner, intermediate delegate(s), current owner]
 *
 * Example: GET /api/delegation-chain/123
 * Response: {
 *   noteId: "123",
 *   chain: ["0xAlice...", "0xBob...", "0xCharlie..."],
 *   rootOwner: "0xAlice...",
 *   currentOwner: "0xCharlie...",
 *   chainLength: 3
 * }
 */
app.get("/api/delegation-chain/:noteId", async (c) => {
  const noteId = BigInt(c.req.param("noteId"));

  // Get note details
  const note = await db.find(delegatableNotes, { id: noteId });

  if (!note) {
    return c.json({ error: "Note not found" }, 404);
  }

  // Get chain entries ordered by position
  const chainEntries = await db
    .select()
    .from(delegationChains)
    .where(eq(delegationChains.noteId, noteId))
    .orderBy(delegationChains.position);

  const chain = chainEntries.map((entry: any) => entry.address);

  return c.json({
    noteId: noteId.toString(),
    chain,
    rootOwner: note.rootOwner,
    currentOwner: note.owner,
    chainLength: chain.length,
    active: note.active,
    amount: note.amount.toString(),
    token: note.token,
    tokenType: note.tokenType,
    intendedStatementId: note.intendedStatementId,
  });
});

/**
 * Custom API endpoint: Get all active notes owned by an address
 *
 * Returns all notes where the address is the current owner (leaf of chain).
 * Includes delegation chain information for each note.
 *
 * Example: GET /api/active-notes/0x123...
 * Query params:
 *   - includeChains: boolean (default false) - include full delegation chains
 *
 * Response: {
 *   owner: "0x123...",
 *   notes: [
 *     {
 *       noteId: "1",
 *       amount: "1000000000000000000",
 *       token: "0x0000...",
 *       tokenType: 0,
 *       intendedStatementId: "0xabc...",
 *       rootOwner: "0xAlice...",
 *       chain: ["0xAlice...", "0xBob...", "0x123..."] // if includeChains=true
 *     },
 *     ...
 *   ],
 *   totalCount: 5
 * }
 */
app.get("/api/active-notes/:address", async (c) => {
  const address = c.req.param("address") as `0x${string}`;
  const includeChains = c.req.query("includeChains") === "true";

  // Get all active notes owned by this address
  const notes = await db
    .select()
    .from(delegatableNotes)
    .where(and(
      eq(delegatableNotes.owner, address),
      eq(delegatableNotes.active, true)
    ));

  const result = [];

  for (const note of notes) {
    const noteData: any = {
      noteId: note.id.toString(),
      amount: note.amount.toString(),
      token: note.token,
      tokenType: note.tokenType,
      tokenId: note.tokenId.toString(),
      intendedStatementId: note.intendedStatementId,
      rootOwner: note.rootOwner,
      createdAt: note.createdAt.toString(),
    };

    if (includeChains) {
      // Get full delegation chain
      const chainEntries = await db
        .select()
        .from(delegationChains)
        .where(eq(delegationChains.noteId, note.id))
        .orderBy(delegationChains.position);

      noteData.chain = chainEntries.map((entry: any) => entry.address);
      noteData.chainLength = chainEntries.length;
    }

    result.push(noteData);
  }

  return c.json({
    owner: address,
    notes: result,
    totalCount: result.length,
  });
});

/**
 * Custom API endpoint: Get total available funding for a statement
 *
 * Calculates the sum of all active note amounts intended for a given statement.
 * Useful for displaying "Available funding for this cause" on funding portal pages.
 *
 * Example: GET /api/available-funding/0xabc...
 * Query params:
 *   - tokenType: 0 (ERC20/ETH) or 1 (ERC1155) - filter by token type
 *   - token: 0x... - filter by specific token address (default: 0x0 for ETH)
 *
 * Response: {
 *   statementId: "0xabc...",
 *   totalAmount: "5000000000000000000",
 *   noteCount: 12,
 *   uniqueOwners: 8,
 *   byToken: {
 *     "0x0000...": "3000000000000000000",
 *     "0x1234...": "2000000000000000000"
 *   }
 * }
 */
app.get("/api/available-funding/:statementId", async (c) => {
  const statementId = c.req.param("statementId") as `0x${string}`;
  const tokenTypeFilter = c.req.query("tokenType");
  const tokenFilter = c.req.query("token");

  // Get all active notes for this statement
  let query = db
    .select()
    .from(delegatableNotes)
    .where(and(
      eq(delegatableNotes.intendedStatementId, statementId),
      eq(delegatableNotes.active, true)
    ));

  const notes = await query;

  // Filter by token type if specified
  let filteredNotes = notes;
  if (tokenTypeFilter !== undefined) {
    const tokenType = parseInt(tokenTypeFilter);
    filteredNotes = notes.filter((note: any) => note.tokenType === tokenType);
  }

  // Filter by token address if specified
  if (tokenFilter) {
    filteredNotes = filteredNotes.filter((note: any) =>
      note.token.toLowerCase() === tokenFilter.toLowerCase()
    );
  }

  // Calculate totals
  let totalAmount = 0n;
  const byToken: Record<string, bigint> = {};
  const uniqueOwners = new Set<string>();

  for (const note of filteredNotes) {
    totalAmount += note.amount;
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
    totalAmount: totalAmount.toString(),
    noteCount: filteredNotes.length,
    uniqueOwners: uniqueOwners.size,
    byToken: byTokenStr,
  });
});

/**
 * Custom API endpoint: Get notes by root owner
 *
 * Useful for finding all notes originally deposited by a user,
 * even if they've been delegated to others.
 *
 * Example: GET /api/notes-by-root-owner/0x123...
 * Query params:
 *   - activeOnly: boolean (default true)
 *
 * Response: {
 *   rootOwner: "0x123...",
 *   notes: [...],
 *   totalCount: 3
 * }
 */
app.get("/api/notes-by-root-owner/:address", async (c) => {
  const address = c.req.param("address") as `0x${string}`;
  const activeOnly = c.req.query("activeOnly") !== "false";

  let query = db
    .select()
    .from(delegatableNotes)
    .where(eq(delegatableNotes.rootOwner, address));

  if (activeOnly) {
    query = query.where(eq(delegatableNotes.active, true));
  }

  const notes = await query;

  const result = notes.map((note: any) => ({
    noteId: note.id.toString(),
    currentOwner: note.owner,
    amount: note.amount.toString(),
    token: note.token,
    tokenType: note.tokenType,
    tokenId: note.tokenId.toString(),
    intendedStatementId: note.intendedStatementId,
    active: note.active,
    createdAt: note.createdAt.toString(),
  }));

  return c.json({
    rootOwner: address,
    notes: result,
    totalCount: result.length,
  });
});

/**
 * Custom API endpoint: Get note event history
 *
 * Returns all events for a specific note, ordered by time.
 *
 * Example: GET /api/note-history/123
 *
 * Response: {
 *   noteId: "123",
 *   events: [
 *     {
 *       eventType: "created",
 *       actor: "0xAlice...",
 *       amount: "1000000000000000000",
 *       timestamp: "1234567890",
 *       transactionHash: "0xabc..."
 *     },
 *     ...
 *   ]
 * }
 */
app.get("/api/note-history/:noteId", async (c) => {
  const noteId = BigInt(c.req.param("noteId"));

  const events = await db
    .select()
    .from(noteEvents)
    .where(eq(noteEvents.noteId, noteId))
    .orderBy(noteEvents.createdAt);

  const result = events.map((event: any) => ({
    eventType: event.eventType,
    actor: event.actor,
    amount: event.amount ? event.amount.toString() : null,
    parentNoteId: event.parentNoteId ? event.parentNoteId.toString() : null,
    childNoteId: event.childNoteId ? event.childNoteId.toString() : null,
    data: event.data,
    timestamp: event.createdAt.toString(),
    blockNumber: event.blockNumber.toString(),
    transactionHash: event.transactionHash,
  }));

  return c.json({
    noteId: noteId.toString(),
    events: result,
  });
});

export default app;
