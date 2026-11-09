/**
 * Events Cache - Raw Event Capture
 *
 * This is the sole set of Ponder event handlers for the indexer.
 * Each handler inserts a raw event row into the `events` table for SDK client-side folding.
 *
 * All business logic (beliefs, projects, delegation chains, etc.) has been moved
 * to SDK fold functions that operate on the raw events client-side.
 */

import { registerRawEvents } from "../indexing/rawEventRegistrations";
import { ponder } from "ponder:registry";
import { events } from "ponder:schema";
import { captureRawEvent } from "../utils/rawEvents";
import { getIndexerChainId } from "../utils/chain";
import {
  indexerContractEnabled,
  readIndexerContractCapability,
} from "../indexing/contractCapabilities";

const chainId = getIndexerChainId();
const contractCapability = readIndexerContractCapability(process.env.INDEXER_CONTRACTS);

// All handlers are identical: insert a raw event row keyed by the ponder event name.
// The event name (after the colon) is derived from the registration string.
// A Conceptspace config omits funding contracts; registering those handlers makes Ponder refuse to start.
function register(ponderEventName: string) {
  const contractName = ponderEventName.split(":")[0]!;
  if (!indexerContractEnabled(contractName, contractCapability)) return;
  const eventName = ponderEventName.split(":")[1]!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ponder.on(ponderEventName as any, async ({ event, context }: any) => {
    await context.db.insert(events).values(captureRawEvent(event, eventName, chainId));
  });
}

registerRawEvents(register);
