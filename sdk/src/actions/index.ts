/**
 * Actions index - exports all action functions
 */

// Common utilities
export {
  createTestClients,
  PROJECT_ALIGNMENT_TOPIC,
  type TestClients,
} from './common.js';

// Conceptspace actions
export {
  believeStatement,
  disbelieveStatement,
  clearOpinion,
  attestImplication,
  attestImplicationsBatch,
  createAndSignStatement,
  NO_OPINION,
  BELIEVES,
  DISBELIEVES,
  type BeliefsContract,
  type ImplicationsContract,
  type CreateAndSignStatementOptions,
  type CreateAndSignStatementResult,
} from './conceptspace-actions.js';

// Pubstarter actions
export {
  createProject,
  buyProjectTokens,
  refundProjectTokens,
  withdrawProjectFunds,
  createSaleListing,
  fulfillSaleListing,
  cancelSaleListing,
  createBuyOrder,
  fulfillBuyOrder,
  cancelBuyOrder,
  approveERC1155ForMarketplace,
  burnTokens,
  type PubstarterContract,
  type AssuranceContract,
  type SecondaryMarketContract,
  type ProjectDetails,
} from './pubstarter-actions.js';

// Delegation actions
export {
  depositETH,
  delegateNote,
  revokeNote,
  reclaimFunds,
  purchaseFromPrimaryMarketWithNotes,
  TokenType,
  type DelegatableNotesContract,
} from './delegation-actions.js';

// Note intent actions
export {
  attestNoteIntent,
  attestNoteIntentsBatch,
  type NoteIntentContract,
} from './note-intent-actions.js';

// Funding portals actions
export {
  attestAlignment,
  attestAlignmentsBatch,
  type AlignmentAttestationsContract,
} from './funding-portals-actions.js';

// Mutable refs actions
export {
  updateRef,
  getRef,
  appendToUserList,
  addToCreatedStatements,
  type MutableRefUpdaterContract,
} from './mutable-refs-actions.js';

// CID utilities
export { cidToBytes32, bytes32ToCid } from '../utils/cid-types.js';
