/**
 * Statement-level bridge triples. Draft format lives in the SDK; this file
 * re-exports it so existing UI imports keep working.
 */

export {
  applyPublishedCids,
  emptyTripleDraft,
  emptyTripleSide,
  modifiedToCommonFromTriple,
  parentCidOrEmpty,
  parentToModifiedFromTriple,
  textsToPublish,
  validateTripleForPublish,
} from '@commonality/sdk/displayable-documents'
export type { TripleDraft, TripleSide } from '@commonality/sdk/displayable-documents'
