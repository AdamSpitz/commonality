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
import { getIndexerChainId } from "../utils/chain";

const chainId = getIndexerChainId();

// All handlers are identical: insert a raw event row keyed by the ponder event name.
// The event name (after the colon) is derived from the registration string.
function register(ponderEventName: string) {
  const eventName = ponderEventName.split(":")[1]!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ponder.on(ponderEventName as any, async ({ event, context }: any) => {
    await context.db.insert(events).values(captureRawEvent(event, eventName, chainId));
  });
}

// CONCEPTSPACE: Beliefs + Implications
register("Beliefs:DirectSupport");
register("Implications:ImplicationAttestation");

// LAZYGIVING: Factory + AssuranceContract + SecondaryMarket + ERC1155
register("AssuranceContractFactory:LazyGivingAssuranceContractCreated");
register("ERC1155Factory:LazyGivingERC1155ContractCreated");
register("MarketplaceFactory:LazyGivingERC1155SecondaryMarketCreated");
register("AssuranceContract:AssuranceContractInitialized");
register("AssuranceContract:ContractMetadataUpdated");
register("AssuranceContract:ERC1155Offered");
register("AssuranceContract:ERC1155Bought");
register("AssuranceContract:ERC1155Sold");
register("AssuranceContract:AssuranceContractWithdrawal");
register("SecondaryMarket:SaleListingCreated");
register("SecondaryMarket:SaleListingFulfilled");
register("SecondaryMarket:SaleListingCancelled");
register("SecondaryMarket:BuyOrderCreated");
register("SecondaryMarket:BuyOrderFulfilled");
register("SecondaryMarket:BuyOrderCancelled");
register("SecondaryMarket:ERC1155SecondaryMarketCreated");
register("PremintingERC1155:TransferSingle");
register("PremintingERC1155:TransferBatch");

// DELEGATION: DelegatableNotes + NoteIntent
register("DelegatableNotes:NoteCreated");
register("DelegatableNotes:NoteDelegated");
register("DelegatableNotes:ChainSplit");
register("DelegatableNotes:NoteRevoked");
register("DelegatableNotes:FundsReclaimed");
register("DelegatableNotes:NoteConsumed");
register("DelegatableNotes:ERC1155Purchased");
register("DelegatableNotes:RefundedIntoNote");
register("NoteIntent:NoteIntentAttested");
register("RecurringPledges:StandingPledgeCreated");
register("RecurringPledges:StandingPledgeExecuted");
register("RecurringPledges:StandingPledgeCancelled");

// FUNDING PORTAL: AlignmentAttestations
register("AlignmentAttestations:AlignmentAttestation");
register("AlignmentAttestations:SuccessAttestation");

// SUBJECTIV IDENTITY: AccountAssertions (tier-0/1 proof-of-personhood self-declarations)
register("AccountAssertions:AccountAssertionSet");

// MUTABLE REFS
register("MutableRefUpdater:RefUpdated");

// NUDGER PUBLICATIONS
register("NudgePublications:NudgesPublished");

// CONTENT FUNDING
register("ContentRegistry:ContentItemRegistered");
register("ContentRegistry:ContentItemReleased");
register("ChannelRegistry:ChannelVerified");
register("ChannelRegistry:ChannelControlTaken");
register("ChannelRegistry:ContractVetoed");
register("ChannelEscrow:Deposited");
register("ChannelEscrow:Withdrawn");
register("CreatorAssuranceContractFactory:CreatorContractCreated");
register("CreatorAssuranceContract:AssuranceContractInitialized");
register("CreatorAssuranceContract:ContractMetadataUpdated");
register("CreatorAssuranceContract:ERC1155Offered");
register("CreatorAssuranceContract:ERC1155Bought");
register("CreatorAssuranceContract:ERC1155Sold");
register("CreatorAssuranceContract:AssuranceContractWithdrawal");
