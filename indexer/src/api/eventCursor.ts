/**
 * Follower cursors for GET /api/events?follow=1.
 *
 * A cursor is exclusive (blockNumber, logIndex) and is bound to the filter
 * scope and the checkpoint the caller is paging through. Reusing it with a
 * different filter or checkpoint is rejected so concurrent ingestion cannot
 * be papered over by mixing pages.
 */

export type EventFeedPosition = {
  blockNumber: string;
  logIndex: number;
};

export type EventFeedCursor = EventFeedPosition & {
  checkpoint: string;
  scope: string;
};

export type EventFeedScopeInput = {
  chainId?: string;
  contractAddress?: string;
  eventName?: string;
  topic1?: string;
  topic2?: string;
  topic3?: string;
  topic1_in?: string;
  topic2_in?: string;
  topic3_in?: string;
  blockNumber_gte?: string;
};

export class EventCursorError extends Error {}

export function eventFeedScope(input: EventFeedScopeInput): string {
  return [
    input.chainId ?? "",
    (input.contractAddress ?? "").toLowerCase(),
    input.eventName ?? "",
    input.topic1 ?? "",
    input.topic2 ?? "",
    input.topic3 ?? "",
    input.topic1_in ?? "",
    input.topic2_in ?? "",
    input.topic3_in ?? "",
    input.blockNumber_gte ?? "",
  ].join("\n");
}

export function encodeEventFeedCursor(cursor: EventFeedCursor): string {
  return Buffer.from(JSON.stringify({
    v: 1,
    blockNumber: cursor.blockNumber,
    logIndex: cursor.logIndex,
    checkpoint: cursor.checkpoint,
    scope: cursor.scope,
  }), "utf8").toString("base64url");
}

export function decodeEventFeedCursor(value: string): EventFeedCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new EventCursorError("cursor is not a follower cursor");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new EventCursorError("cursor is not a follower cursor");
  }
  const record = parsed as Record<string, unknown>;
  if (record.v !== 1) throw new EventCursorError("unsupported cursor version");
  if (typeof record.blockNumber !== "string" || !/^\d+$/.test(record.blockNumber)) {
    throw new EventCursorError("cursor blockNumber is invalid");
  }
  if (typeof record.logIndex !== "number" || !Number.isInteger(record.logIndex) || record.logIndex < 0) {
    throw new EventCursorError("cursor logIndex is invalid");
  }
  if (typeof record.checkpoint !== "string" || !/^\d+$/.test(record.checkpoint)) {
    throw new EventCursorError("cursor checkpoint is invalid");
  }
  if (typeof record.scope !== "string") throw new EventCursorError("cursor scope is invalid");
  return {
    blockNumber: record.blockNumber,
    logIndex: record.logIndex,
    checkpoint: record.checkpoint,
    scope: record.scope,
  };
}

/** Exclusive chain-order predicate: after this log, still at or before checkpoint. */
export function isAfterCursor(event: EventFeedPosition, cursor: EventFeedPosition): boolean {
  if (BigInt(event.blockNumber) !== BigInt(cursor.blockNumber)) {
    return BigInt(event.blockNumber) > BigInt(cursor.blockNumber);
  }
  return event.logIndex > cursor.logIndex;
}

export function assertCursorMatchesRequest(
  cursor: EventFeedCursor,
  scope: string,
  checkpoint: string,
): void {
  if (cursor.scope !== scope) {
    throw new EventCursorError("cursor was issued for a different event query");
  }
  if (cursor.checkpoint !== checkpoint) {
    throw new EventCursorError("cursor is bound to a different checkpoint");
  }
}
