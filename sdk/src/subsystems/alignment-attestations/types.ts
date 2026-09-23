import { IpfsCidV1 } from "../../utils/cid-types.js";

/**
 * An attestation that an arbitrary bytes32 subject matches a statement.
 * Recorded by AlignmentAttestations. The subject need not be a funded project.
 */
export interface AlignmentAttestation {
  /** Address of the attester who created this alignment. */
  attester: string;
  /** Bytes32 subject identifier (left-padded address for address subjects). */
  subjectId: string;
  /** CID of the statement the subject is aligned with. */
  statementCid: IpfsCidV1;
  /** CID of the topic statement used for indexer filtering. */
  topicStatementCid?: IpfsCidV1;
  /** Block timestamp of the attestation. */
  createdAt: string;
  /** Block number of the attestation. */
  blockNumber: string;
}
