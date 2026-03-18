/**
 * Events Cache - Phase 3 of Indexer Redesign
 *
 * This module adds raw event capture to the indexer.
 * It populates:
 * - events table: raw event data for client-side folding
 * - registry tables: lightweight tracking of what entities exist
 *
 * This is a pure addition - existing handlers remain unchanged.
 */

import { ponder } from "ponder:registry";
import {
  events,
  statementsRegistry,
  projectsRegistry,
  alignmentAttestationsRegistry,
  implicationsRegistry,
} from "ponder:schema";
import { IpfsCidBytes32, bytes32ToCid } from "../utils/cid-types";

// ============================================================================
// RAW EVENT CAPTURE
// ============================================================================
// These handlers insert raw events into the events table.
// They run alongside the existing business-logic handlers.

// Helper to capture a raw event
function captureRawEvent(event: any) {
  const log = event.log;
  const block = event.block;

  const eventId = `${log.transactionHash}-${log.logIndex}`;

  return {
    id: eventId,
    contractAddress: log.address.toLowerCase() as `0x${string}`,
    eventName: event.name,
    blockNumber: BigInt(block.number),
    blockTimestamp: BigInt(block.timestamp),
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    topic0: log.topics[0] || null,
    topic1: log.topics[1] || null,
    topic2: log.topics[2] || null,
    topic3: log.topics[3] || null,
    data: log.data,
  };
}

// ============================================================================
// CONCEPTSPACE EVENT HANDLERS
// ============================================================================

ponder.on("Beliefs:DirectSupport", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));

  const { statementId } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const statementIdCidV1 = bytes32ToCid(statementId as IpfsCidBytes32);

  const existing = await context.db.find(statementsRegistry, { cidV1: statementIdCidV1 });
  if (!existing) {
    await context.db.insert(statementsRegistry).values({
      cidV1: statementIdCidV1,
      createdAtBlock: blockNumber,
      createdAtTimestamp: timestamp,
    });
  }
});

ponder.on("Implications:ImplicationAttestation", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));

  const { attester, fromStatementCid, toStatementCid } = event.args;
  const blockNumber = BigInt(event.block.number);
  const fromStatementCidV1 = bytes32ToCid(fromStatementCid as IpfsCidBytes32);
  const toStatementCidV1 = bytes32ToCid(toStatementCid as IpfsCidBytes32);

  const existing = await context.db.find(implicationsRegistry, {
    id: `${attester.toLowerCase()}-${fromStatementCidV1}-${toStatementCidV1}`,
  });
  if (!existing) {
    await context.db.insert(implicationsRegistry).values({
      id: `${attester.toLowerCase()}-${fromStatementCidV1}-${toStatementCidV1}`,
      attester: attester.toLowerCase() as `0x${string}`,
      fromStatementId: fromStatementCidV1,
      toStatementId: toStatementCidV1,
      createdAtBlock: blockNumber,
    });
  }
});

// ============================================================================
// PUBSTARTER EVENT HANDLERS
// ============================================================================

ponder.on("AssuranceContractFactory:PubstarterAssuranceContractCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));

  const { assuranceContract } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const factoryAddress = event.log.address;

  const existing = await context.db.find(projectsRegistry, { id: assuranceContract });
  if (!existing) {
    await context.db.insert(projectsRegistry).values({
      id: assuranceContract,
      factoryAddress: factoryAddress,
      createdAtBlock: blockNumber,
      createdAtTimestamp: timestamp,
    });
  }
});

ponder.on("AssuranceContract:AssuranceContractInitialized", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("AssuranceContract:ContractMetadataUpdated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("AssuranceContract:ERC1155Offered", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("AssuranceContract:ERC1155Bought", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("AssuranceContract:ERC1155Sold", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("AssuranceContract:AssuranceContractWithdrawal", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

// ============================================================================
// SECONDARY MARKET EVENT HANDLERS
// ============================================================================

ponder.on("SecondaryMarket:SaleListingCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("SecondaryMarket:SaleListingFulfilled", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("SecondaryMarket:SaleListingCancelled", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("SecondaryMarket:BuyOrderCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("SecondaryMarket:BuyOrderFulfilled", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("SecondaryMarket:BuyOrderCancelled", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("SecondaryMarket:ERC1155SecondaryMarketCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

// ============================================================================
// TOKEN BURN EVENT HANDLERS
// ============================================================================

ponder.on("PremintingERC1155:TransferSingle", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("PremintingERC1155:TransferBatch", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

// ============================================================================
// DELEGATION EVENT HANDLERS
// ============================================================================

ponder.on("DelegatableNotes:NoteCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("DelegatableNotes:NoteDelegated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("DelegatableNotes:ChainSplit", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("DelegatableNotes:NoteRevoked", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("DelegatableNotes:FundsReclaimed", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("DelegatableNotes:NoteConsumed", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("DelegatableNotes:ERC1155Purchased", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

ponder.on("NoteIntent:NoteIntentAttested", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});

// ============================================================================
// FUNDING PORTAL EVENT HANDLERS
// ============================================================================

ponder.on("AlignmentAttestations:AlignmentAttestation", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));

  const { attester, subjectAddress, statementId } = event.args;
  const blockNumber = BigInt(event.block.number);
  const statementIdCidV1 = bytes32ToCid(statementId as IpfsCidBytes32);

  const id = `${attester.toLowerCase()}-${subjectAddress.toLowerCase()}-${statementIdCidV1}`;
  const existing = await context.db.find(alignmentAttestationsRegistry, { id });
  if (!existing) {
    await context.db.insert(alignmentAttestationsRegistry).values({
      id,
      attester: attester.toLowerCase() as `0x${string}`,
      subjectAddress: subjectAddress.toLowerCase() as `0x${string}`,
      statementId: statementIdCidV1,
      createdAtBlock: blockNumber,
    });
  }
});

// ============================================================================
// MUTABLE REFS EVENT HANDLERS
// ============================================================================

ponder.on("MutableRefUpdater:RefUpdated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event));
});