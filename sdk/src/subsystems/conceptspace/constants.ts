import { IpfsCidV1 } from '../../utils/cid-types.js';
import { createStatement, DisplayableDocument, type DocumentStore } from '../displayable-documents/displayable-document.js';

// ============================================================================
// Well-Known Statement Constants
// ============================================================================

export const CSM_MISSION_STATEMENT_TEXT = 'I think most people who currently identify as left-wing or right-wing are basically normal sane people with common-sense views who have more in common with each other than our extremely-polarized political/cultural environment implies, and I want to see this quiet middle majority recognize itself as a majority and gain more influence.';

export const CSM_MISSION_STATEMENT_SEED_REF = Object.freeze({
  collectionId: 'csm',
  groupId: 'mission',
  statementId: 'mission-statement',
});

export const CSM_MISSION_STATEMENT_CREATED_DATE = '2026-05-28T00:00:00.000Z';

/**
 * The canonical DisplayableDocument for the Common Sense Majority mission statement.
 *
 * This document intentionally matches fake-data-generation/seed-content/csm.json so
 * its well-known PublishedData CID has the same sha2-256 digest as the legacy IPFS CID.
 */
export const CSM_MISSION_STATEMENT_DOCUMENT: DisplayableDocument = createStatement({
  content: CSM_MISSION_STATEMENT_TEXT,
  topic: 'csm',
  createdDate: CSM_MISSION_STATEMENT_CREATED_DATE,
  extras: {
    seedCollectionId: 'csm',
    seedCollectionTitle: 'Common Sense Majority',
    seedGroupId: 'mission',
    seedGroupTitle: 'Mission statement',
    seedStatementId: 'mission-statement',
    seedRole: 'mission-statement',
    seedNotes: [],
  },
});

/**
 * Well-known PublishedData CID for CSM_MISSION_STATEMENT_DOCUMENT.
 *
 * To make this document fetchable, publish it through the deployment's default document store.
 */
export const CSM_MISSION_STATEMENT_CID: IpfsCidV1 = 'bafkreihjlhptg6m37bhnrfzf3b5rj32mricws3gfwrhifbipb7pb264vw4';

export async function ensureCsmMissionStatementPublished(documentStore: DocumentStore): Promise<IpfsCidV1> {
  const result = await documentStore.publish(CSM_MISSION_STATEMENT_DOCUMENT);
  return result.cid;
}
