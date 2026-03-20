/**
 * Events Cache - Raw Event Capture
 *
 * This is the sole set of Ponder event handlers for the indexer.
 * Each handler inserts a raw event row into the `events` table for SDK client-side folding.
 *
 * All business logic (beliefs, projects, delegation chains, etc.) has been moved
 * to SDK fold functions that operate on the raw events client-side.
 */

import { ponder } from "ponder:registry";
import { events } from "ponder:schema";
import { captureRawEvent } from "../utils/rawEvents";

// ============================================================================
// CONCEPTSPACE: Beliefs + Implications
// ============================================================================

ponder.on("Beliefs:DirectSupport", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "DirectSupport"));
});

ponder.on("Implications:ImplicationAttestation", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "ImplicationAttestation"));
});

// ============================================================================
// PUBSTARTER: Factory + AssuranceContract + SecondaryMarket + ERC1155
// ============================================================================

ponder.on("AssuranceContractFactory:PubstarterAssuranceContractCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "PubstarterAssuranceContractCreated"));
});

ponder.on("ERC1155Factory:PubstarterERC1155ContractCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "PubstarterERC1155ContractCreated"));
});

ponder.on("MarketplaceFactory:PubstarterERC1155SecondaryMarketCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "PubstarterERC1155SecondaryMarketCreated"));
});

ponder.on("AssuranceContract:AssuranceContractInitialized", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "AssuranceContractInitialized"));
});

ponder.on("AssuranceContract:ContractMetadataUpdated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "ContractMetadataUpdated"));
});

ponder.on("AssuranceContract:ERC1155Offered", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "ERC1155Offered"));
});

ponder.on("AssuranceContract:ERC1155Bought", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "ERC1155Bought"));
});

ponder.on("AssuranceContract:ERC1155Sold", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "ERC1155Sold"));
});

ponder.on("AssuranceContract:AssuranceContractWithdrawal", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "AssuranceContractWithdrawal"));
});

ponder.on("SecondaryMarket:SaleListingCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "SaleListingCreated"));
});

ponder.on("SecondaryMarket:SaleListingFulfilled", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "SaleListingFulfilled"));
});

ponder.on("SecondaryMarket:SaleListingCancelled", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "SaleListingCancelled"));
});

ponder.on("SecondaryMarket:BuyOrderCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "BuyOrderCreated"));
});

ponder.on("SecondaryMarket:BuyOrderFulfilled", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "BuyOrderFulfilled"));
});

ponder.on("SecondaryMarket:BuyOrderCancelled", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "BuyOrderCancelled"));
});

ponder.on("SecondaryMarket:ERC1155SecondaryMarketCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "ERC1155SecondaryMarketCreated"));
});

ponder.on("PremintingERC1155:TransferSingle", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "TransferSingle"));
});

ponder.on("PremintingERC1155:TransferBatch", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "TransferBatch"));
});

// ============================================================================
// DELEGATION: DelegatableNotes + NoteIntent
// ============================================================================

ponder.on("DelegatableNotes:NoteCreated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "NoteCreated"));
});

ponder.on("DelegatableNotes:NoteDelegated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "NoteDelegated"));
});

ponder.on("DelegatableNotes:ChainSplit", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "ChainSplit"));
});

ponder.on("DelegatableNotes:NoteRevoked", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "NoteRevoked"));
});

ponder.on("DelegatableNotes:FundsReclaimed", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "FundsReclaimed"));
});

ponder.on("DelegatableNotes:NoteConsumed", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "NoteConsumed"));
});

ponder.on("DelegatableNotes:ERC1155Purchased", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "ERC1155Purchased"));
});

ponder.on("NoteIntent:NoteIntentAttested", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "NoteIntentAttested"));
});

// ============================================================================
// FUNDING PORTAL: AlignmentAttestations
// ============================================================================

ponder.on("AlignmentAttestations:AlignmentAttestation", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "AlignmentAttestation"));
});

// ============================================================================
// MUTABLE REFS
// ============================================================================

ponder.on("MutableRefUpdater:RefUpdated", async ({ event, context }) => {
  await context.db.insert(events).values(captureRawEvent(event, "RefUpdated"));
});
