import { IpfsCidV1 } from '../../utils/cid-types.js';
import {
  createDisplayableDocument,
  DisplayableDocument,
  type DocumentStore,
} from '../displayable-documents/displayable-document.js';

// ============================================================================
// Well-Known Topic Constants
// ============================================================================

/**
 * The canonical DisplayableDocument that defines the project alignment topic.
 *
 * This is the content whose CID is PROJECT_ALIGNMENT_TOPIC. It's exported
 * so that callers can publish it through the default document store when needed.
 */
export const PROJECT_ALIGNMENT_TOPIC_DOCUMENT: DisplayableDocument = createDisplayableDocument({
  format: 'text/plain',
  content: 'This is the well-known topic for project alignment attestations in Commonality.',
  extras: {
    statementType: 'topic',
  },
});

/**
 * Well-known topic CID for project alignment attestations.
 *
 * This is the CID of PROJECT_ALIGNMENT_TOPIC_DOCUMENT, computed as:
 *   sha256(canonicalJson(document)) with CIDv1 + raw codec.
 *
 * To make this document fetchable, call ensureProjectAlignmentTopicPublished().
 */
export const PROJECT_ALIGNMENT_TOPIC: IpfsCidV1 = 'bafkreidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy';

/**
 * Publish the project alignment topic document through the supplied default
 * document store so it can be fetched by anyone who has the CID. Returns the
 * CID (which should match PROJECT_ALIGNMENT_TOPIC).
 */
export async function ensureProjectAlignmentTopicPublished(documentStore: DocumentStore): Promise<IpfsCidV1> {
  const result = await documentStore.publish(PROJECT_ALIGNMENT_TOPIC_DOCUMENT);
  return result.cid;
}
