import { IpfsCidV1 } from '../../utils/cid-types.js';
import { IPFSConfig } from '../../utils/ipfs.js';
import {
  createDisplayableDocument,
  DisplayableDocument,
  publishDocument,
} from '../displayable-documents/displayable-document.js';

// ============================================================================
// Well-Known Topic Constants
// ============================================================================

/**
 * The canonical DisplayableDocument that defines the project alignment topic.
 *
 * This is the content whose CID is PROJECT_ALIGNMENT_TOPIC. It's exported
 * so that callers can publish it to IPFS when needed.
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
 *   sha256(JSON.stringify(canonicalJson(document))) with CIDv1 + dag-pb codec.
 *
 * To make this document fetchable from IPFS, call ensureProjectAlignmentTopicPublished().
 */
export const PROJECT_ALIGNMENT_TOPIC: IpfsCidV1 = 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy';

/**
 * Publish the project alignment topic document to IPFS so it can be fetched
 * by anyone who has the CID. Returns the CID (which should match
 * PROJECT_ALIGNMENT_TOPIC).
 */
export async function ensureProjectAlignmentTopicPublished(ipfsConfig: IPFSConfig): Promise<IpfsCidV1> {
  return publishDocument(ipfsConfig, PROJECT_ALIGNMENT_TOPIC_DOCUMENT);
}
