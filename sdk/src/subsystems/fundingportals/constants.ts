import { IpfsCidV1 } from '../../utils/cid-types';
import { fakeIpfsCidV1 } from '../../utils/test-helpers';

// ============================================================================
// Well-Known Topic Constants
// ============================================================================

/**
 * Well-known topic ID for project alignment attestations.
 *
 * TODO: Replace this with an actual IPFS CID of a statement that says
 * "This is the topic for project alignment attestations". (Not just that
 * raw text, but a Statement in the sense that we use the term in this
 * project.)
 */
export const PROJECT_ALIGNMENT_TOPIC: IpfsCidV1 = fakeIpfsCidV1('ProjectAlignmentTopic');
