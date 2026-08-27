/**
 * Content-funding queries. Implementation is split under `queries/`; this
 * module re-exports the previous public surface.
 */
export {
  getProspectiveRoundOnchainState,
  getMaterializedClaimStates,
  getMaterializedContentOnchain,
  foldProspectiveRounds,
  getProspectiveRounds,
  type ProspectiveRoundOnchainState,
  type MaterializedContentClaimState,
  type ProspectiveRoundSummary,
} from './queries/onchain.js';
export {
  DEFAULT_VETO_WINDOW_SECONDS,
  getContractsForChannel,
  getChannelOverview,
  getContentItemStatus,
  getVetoableContracts,
  buildChannelCanonicalIdMap,
  getOwnerForCanonicalChannelId,
  getAllChannelOverviews,
  type ContentFundingContractStatus,
  type ContentItemRegistrationStatus,
  type ContentFundingContractSummary,
  type ChannelOverview,
  type ContentItemStatus,
  type ContentFundingQueryOptions,
  type ContentAttestationRecord,
  type ChannelWithCanonicalId,
} from './queries/views.js';
export {
  fetchAndFoldContentFundingState,
  type ContentFundingStateWithVetoedEvents,
} from './queries/fetch-state.js';
export {
  getContentSubjectId,
  selectLatestContentAttestations,
  getContentAttestations,
  getContentAttestation,
  getStatementSupportingContent,
  type StatementSupportingContentRecord,
  type StatementSupportingContentOptions,
} from './queries/attestations.js';
