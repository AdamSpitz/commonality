/* Shared event selection for Ponder and the bounded raw-log prototype. */
export function registerRawEvents(register: (name: string) => void): void {
  // CONCEPTSPACE: Beliefs + Implications
  register("Beliefs:DirectSupport");
  register("Implications:ImplicationAttestation");
  register("Implications:ImplicationRevoked");

  // LAZYGIVING: Factory + AssuranceContract + non-transferable ERC1155 receipts
  register("AssuranceContractFactory:LazyGivingAssuranceContractCreated");
  register("FixedControllerFactory:FixedControllerAssuranceCreated");
  register("ProjectFactory:ProjectCreated");
  register("ERC1155Factory:LazyGivingERC1155ContractCreated");
  const assuranceContractEvents = [
    "AssuranceContractInitialized",
    "ContractMetadataUpdated",
    "ERC1155Offered",
    "ERC1155Bought",
    "ERC1155Sold",
    "AssuranceContractWithdrawal",
    "RetroactiveDonationReceived",
    "ReimbursementWithdrawn",
    "ReimbursementForgone",
  ] as const;

  for (const contractName of [
    "AssuranceContract",
    "FixedControllerAssuranceContract",
    "CreatorAssuranceContract",
    "ProspectiveContentAssuranceContract",
  ] as const) {
    for (const eventName of assuranceContractEvents) {
      register(`${contractName}:${eventName}`);
    }
  }
  register("PremintingERC1155:TransferSingle");
  register("PremintingERC1155:TransferBatch");

  // DELEGATION: DelegatableNotes + NoteIntent
  register("DelegatableNotes:NoteCreated");
  register("DelegatableNotes:NoteDelegated");
  register("DelegatableNotes:ChainSplit");
  register("DelegatableNotes:NoteRevoked");
  register("DelegatableNotes:NotePartiallyTakenBack");
  register("DelegatableNotes:NoteDelegateReplaced");
  register("DelegatableNotes:FundsReclaimed");
  register("DelegatableNotes:NoteConsumed");
  register("DelegatableNotes:ERC1155Purchased");
  register("DelegatableNotes:RefundedIntoNote");
  register("DelegatableNotes:ReimbursementClaimedIntoNote");
  register("DelegatableNotes:SpendDelaySet");
  register("DelegatableNotes:UnsuspiciousDelaySet");
  register("DelegatableNotes:FineListSet");
  register("DelegatableNotes:SpendClassResolved");
  register("DelegatableNotes:SpendDeadlineRevised");
  register("RecurringPledges:PledgeUnsuspiciousDelaySet");
  register("RecurringPledges:PledgeFineListSet");
  register("DelegatableNotes:StrictModeSet");
  register("DelegatableNotes:SpendFlaggerSet");
  register("DelegatableNotes:NoteSplitSameChain");
  register("DelegatableNotes:SpendScheduled");
  register("DelegatableNotes:SpendFlagged");
  register("DelegatableNotes:SpendCancelled");
  register("DelegatableNotes:SpendScheduleCleared");
  register("DelegatableNotes:SpendExecuted");
  register("RecurringPledges:PledgeSpendPolicyUpdated");
  register("NoteIntent:NoteIntentAttested");
  register("RecurringPledges:StandingPledgeCreated");
  register("RecurringPledges:StandingPledgeExecuted");
  register("RecurringPledges:StandingPledgeCancelled");

  // FUNDING PORTAL: AlignmentAttestations
  register("AlignmentAttestations:AlignmentAttestation");
  register("AlignmentAttestations:AlignmentRevoked");
  register("AlignmentAttestations:SuccessAttestation");
  register("AlignmentAttestations:SuccessRevoked");

  // SUBJECTIV IDENTITY: AccountAssertions + TrustRegistry
  register("AccountAssertions:AccountAssertionSet");
  register("SuggestedNames:NameSuggested");
  register("TrustRegistry:TrustSet");

  // MUTABLE REFS
  register("MutableRefUpdater:RefUpdated");

  // NUDGER PUBLICATIONS
  register("NudgePublications:NudgesPublished");

  // PUBLISHED DATA
  register("PublishedData:DataPublished");
  register("PublishedData:DataRetracted");

  // IDENTITY: proved beneficiary, separate from the funding payout registry
  register("BeneficiaryIdentity:BeneficiaryClaimed");
  register("BeneficiaryIdentity:BeneficiaryProofAnchored");

  // CONTENT FUNDING
  register("ContentRegistry:ContentItemRegistered");
  register("ContentRegistry:ContentItemReleased");
  register("ContentRegistry:WorkItemRegistered");
  register("ContentRegistry:WorkItemReleased");
  register("BeneficiaryRegistry:BeneficiaryVerified");
  register("BeneficiaryRegistry:BeneficiaryControlTaken");
  register("BeneficiaryRegistry:BeneficiaryControlReleased");
  register("BeneficiaryRegistry:ProjectDisavowed");
  register("BeneficiaryRegistry:ProjectDisavowalWithdrawn");
  register("BeneficiaryRegistry:PayoutAddressRotated");
  register("CreatorAssuranceVeto:ContractVetoed");
  register("BeneficiaryEscrow:Deposited");
  register("BeneficiaryEscrow:Withdrawn");
  register("CreatorAssuranceContractFactory:CreatorContractCreated");
  register("ProspectiveContentRoundFactory:ProspectiveRoundCreated");
  register("ProspectiveContentRoundFactory:ProspectiveRoundMaterialized");
  register("MaterializedContentTokens:ContentMaterialized");
  register("MaterializedContentTokens:ContentTokenClaimed");
}
