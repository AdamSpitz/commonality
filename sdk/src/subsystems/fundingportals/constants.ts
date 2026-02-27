import { IpfsCidV1 } from '../../utils/cid-types';
import { fakeIpfsCidV1 } from '../../utils/test-helpers';

// ============================================================================
// Well-Known Topic Constants
// ============================================================================

/**
 * Well-known topic ID for project alignment attestations.
 *
 * TODO: Replace this with an actual IPFS CID of a PROJECT_ALIGNMENT_TOPIC_STATEMENT that says
 * "This is the topic for project alignment attestations". (Not just that
 * raw text, but a Statement in the sense that we use the term in this
 * project.)
 * 
 * It's probably a good idea to make this be a whole thing
 * that knows how to actually upload that statement to IPFS
 * and get the CID, rather than hardcoding a CID. See whether
 * it's possible to update all the places that use this
 * constant to get the CID from that function instead.
 * But if we need a hard-coded CID for some purposes, fine,
 * as long as it's the CID of the right content.
 */
export const PROJECT_ALIGNMENT_TOPIC: IpfsCidV1 = fakeIpfsCidV1('ProjectAlignmentTopic');
