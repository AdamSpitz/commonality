/**
 * Delegation Indexer API
 *
 * This module provides the GraphQL API for the Delegation subsystem.
 * It is logically separate from the Concept Space and Pubstarter APIs.
 *
 * The GraphQL API is auto-generated from the schema tables:
 * - schema.delegatableNotes
 * - schema.delegationChains
 * - schema.noteEvents
 *
 * All queries support filtering, sorting, and pagination through the
 * auto-generated GraphQL schema.
 *
 * Custom endpoints:
 * - /api/delegation-chain/:noteId - Get full delegation chain for a note
 * - /api/active-notes/:address - Get all active notes owned by an address
 * - /api/available-funding/:statementId - Get total available funding for a statement
 */

import { Hono } from "hono";
import { client, graphql } from "ponder";
import { eq, and, asc } from "ponder";
import {
  parseBigIntSafe,
  isValidAddress,
  parseBoolean,
  parsePositiveInt,
  invalidInputError,
} from "../utils/validation";
import { isValidCidV1 } from "../utils/cid-types";

export function createDelegationApi(db: any, schema: any) {
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
  try {
    const noteIdParam = c.req.param("noteId");
    const noteId = parseBigIntSafe(noteIdParam);

    if (noteId === null) {
      return c.json(invalidInputError("noteId", "Must be a valid integer"), 400);
    }

    // Get note details
    const noteResults = await db
      .select()
      .from(schema.delegatableNotes)
      .where(eq(schema.delegatableNotes.id, noteId))
      .limit(1);

    if (noteResults.length === 0) {
      return c.json({ error: "Note not found" }, 404);
    }

    const note = noteResults[0];
    if (!note) {
      return c.json({ error: "Note not found" }, 404);
    }

    // Get chain entries ordered by position
    const chainEntries = await db
      .select()
      .from(schema.delegationChains)
      .where(eq(schema.delegationChains.noteId, noteId))
      .orderBy(asc(schema.delegationChains.position));

    const chain = chainEntries.map((entry) => entry.address);

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
    });
  } catch (error) {
    console.error("Error fetching delegation chain:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
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
 *   - limit: number (default 100, max 1000) - maximum number of notes to return
 *   - offset: number (default 0) - number of notes to skip
 *
 * Response: {
 *   owner: "0x123...",
 *   notes: [
 *     {
 *       noteId: "1",
 *       amount: "1000000000000000000",
 *       token: "0x0000...",
 *       tokenType: 0,
 *       rootOwner: "0xAlice...",
 *       chain: ["0xAlice...", "0xBob...", "0x123..."] // if includeChains=true
 *     },
 *     ...
 *   ],
 *   totalCount: 5,
 *   limit: 100,
 *   offset: 0
 * }
 */
app.get("/api/active-notes/:address", async (c) => {
  try {
    const address = c.req.param("address");

    if (!isValidAddress(address)) {
      return c.json(invalidInputError("address", "Must be a valid Ethereum address"), 400);
    }

    const includeChains = parseBoolean(c.req.query("includeChains"), false);
    const limit = Math.min(parsePositiveInt(c.req.query("limit"), 100), 1000);
    const offset = parsePositiveInt(c.req.query("offset"), 0);

    // Get total count
    const allNotes = await db
      .select()
      .from(schema.delegatableNotes)
      .where(and(
        eq(schema.delegatableNotes.owner, address),
        eq(schema.delegatableNotes.active, true)
      ));

    const totalCount = allNotes.length;

    // Apply pagination
    const notes = allNotes.slice(offset, offset + limit);

    const result = [];

    for (const note of notes) {
      const noteData: any = {
        noteId: note.id.toString(),
        amount: note.amount.toString(),
        token: note.token,
        tokenType: note.tokenType,
        tokenId: note.tokenId.toString(),
        rootOwner: note.rootOwner,
        createdAt: note.createdAt.toString(),
      };

      if (includeChains) {
        // Get full delegation chain
        const chainEntries = await db
          .select()
          .from(schema.delegationChains)
          .where(eq(schema.delegationChains.noteId, note.id))
          .orderBy(asc(schema.delegationChains.position));

        noteData.chain = chainEntries.map((entry) => entry.address);
        noteData.chainLength = chainEntries.length;
      }

      result.push(noteData);
    }

    return c.json({
      owner: address,
      notes: result,
      totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching active notes:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
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
  try {
    const statementId = c.req.param("statementId");

    if (!isValidCidV1(statementId)) {
      return c.json(invalidInputError("statementId", "Must be a valid IPFS CIDv1 (bafy...)"), 400);
    }

    const tokenTypeFilter = c.req.query("tokenType");
    const tokenFilter = c.req.query("token");

    // Validate token filter if provided
    if (tokenFilter && !isValidAddress(tokenFilter)) {
      return c.json(invalidInputError("token", "Must be a valid Ethereum address"), 400);
    }

    // TODO: Re-implement using NoteIntent attestations
    // intendedStatementId has been removed from DelegatableNotes and moved to NoteIntent contract
    // For now, we return empty results until NoteIntent indexing is implemented
    const notes: any[] = [];

    // Filter by token type if specified
    let filteredNotes = notes;
    if (tokenTypeFilter !== undefined) {
      const tokenType = parsePositiveInt(tokenTypeFilter, -1);
      if (tokenType !== 0 && tokenType !== 1) {
        return c.json(invalidInputError("tokenType", "Must be 0 (ERC20/ETH) or 1 (ERC1155)"), 400);
      }
      filteredNotes = notes.filter((note) => note.tokenType === tokenType);
    }

    // Filter by token address if specified
    if (tokenFilter) {
      filteredNotes = filteredNotes.filter((note) =>
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
  } catch (error) {
    console.error("Error fetching available funding:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
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
 *   - limit: number (default 100, max 1000) - maximum number of notes to return
 *   - offset: number (default 0) - number of notes to skip
 *
 * Response: {
 *   rootOwner: "0x123...",
 *   notes: [...],
 *   totalCount: 3,
 *   limit: 100,
 *   offset: 0
 * }
 */
app.get("/api/notes-by-root-owner/:address", async (c) => {
  try {
    const address = c.req.param("address");

    if (!isValidAddress(address)) {
      return c.json(invalidInputError("address", "Must be a valid Ethereum address"), 400);
    }

    const activeOnly = parseBoolean(c.req.query("activeOnly"), true);
    const limit = Math.min(parsePositiveInt(c.req.query("limit"), 100), 1000);
    const offset = parsePositiveInt(c.req.query("offset"), 0);

    // Build query with proper condition chaining
    const conditions = [eq(schema.delegatableNotes.rootOwner, address)];
    if (activeOnly) {
      conditions.push(eq(schema.delegatableNotes.active, true));
    }

    const allNotes = await db
      .select()
      .from(schema.delegatableNotes)
      .where(and(...conditions));

    const totalCount = allNotes.length;

    // Apply pagination
    const notes = allNotes.slice(offset, offset + limit);

    const result = notes.map((note) => ({
      noteId: note.id.toString(),
      currentOwner: note.owner,
      amount: note.amount.toString(),
      token: note.token,
      tokenType: note.tokenType,
      tokenId: note.tokenId.toString(),
      active: note.active,
      createdAt: note.createdAt.toString(),
    }));

    return c.json({
      rootOwner: address,
      notes: result,
      totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching notes by root owner:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Custom API endpoint: Get note event history
 *
 * Returns all events for a specific note, ordered by time.
 *
 * Example: GET /api/note-history/123
 * Query params:
 *   - limit: number (default 100, max 1000) - maximum number of events to return
 *   - offset: number (default 0) - number of events to skip
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
 *   ],
 *   totalCount: 5,
 *   limit: 100,
 *   offset: 0
 * }
 */
app.get("/api/note-history/:noteId", async (c) => {
  try {
    const noteIdParam = c.req.param("noteId");
    const noteId = parseBigIntSafe(noteIdParam);

    if (noteId === null) {
      return c.json(invalidInputError("noteId", "Must be a valid integer"), 400);
    }

    const limit = Math.min(parsePositiveInt(c.req.query("limit"), 100), 1000);
    const offset = parsePositiveInt(c.req.query("offset"), 0);

    const allEvents = await db
      .select()
      .from(schema.noteEvents)
      .where(eq(schema.noteEvents.noteId, noteId))
      .orderBy(asc(schema.noteEvents.createdAt));

    const totalCount = allEvents.length;

    // Apply pagination
    const events = allEvents.slice(offset, offset + limit);

    const result = events.map((event) => ({
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
      totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching note history:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

  return app;
}
