// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title AlignmentAttestations
 * @notice Allows attesters to declare that a subject is aligned with a statement/cause
 * @dev Any address can be an attester. Subjects are identified by bytes32, which can represent:
 *      - An Ethereum address (left-padded: bytes32(uint256(uint160(addr))))
 *      - A content ID hash (keccak256 of a canonical content identifier)
 *      - Any other 32-byte identifier
 *
 *      Statements are IPFS CIDs (bytes32).
 *
 *      The topicStatementId field allows indexers to filter attestations by topic.
 *      Every attestation must explicitly declare its topic (topicStatementId cannot be zero).
 *      This enables the no-need-to-coordinate benefit: different topics can be linked via implication attestations.
 */
contract AlignmentAttestations {

    error InvalidSubjectId();
    error InvalidStatementId();
    error InvalidTopicStatementId();
    error ArrayLengthMismatch();

    /**
     * @notice Emitted when an attester declares that a subject is aligned with a statement
     * @param attester The address making the attestation
     * @param subjectId The identifier of the subject (address-derived, content hash, etc.)
     * @param statementId The IPFS CID of the statement this subject aligns with
     * @param topicStatementId The IPFS CID of the topic for indexer filtering (must be non-zero)
     */
    event AlignmentAttestation(
        address indexed attester,
        bytes32 indexed subjectId,
        bytes32 indexed statementId,
        bytes32 topicStatementId
    );

    /**
     * @notice Emitted when an attester retracts an alignment attestation
     * @param attester The address retracting the attestation
     * @param subjectId The identifier of the subject
     * @param statementId The IPFS CID of the statement
     * @param topicStatementId The IPFS CID of the topic used when attesting
     */
    event AlignmentRevoked(
        address indexed attester,
        bytes32 indexed subjectId,
        bytes32 indexed statementId,
        bytes32 topicStatementId
    );

    // attester => topicStatementId => subjectId => statementId => exists
    mapping(address => mapping(bytes32 => mapping(bytes32 => mapping(bytes32 => bool))))
        public attestations;

    /**
     * @notice Attest that a subject is aligned with a statement/cause
     * @dev Can be called multiple times by the same attester for the same pair (idempotent).
     *      For address-type subjects, pass bytes32(uint256(uint160(addr))).
     *      For content items, pass the content ID (keccak256 of the canonical ID).
     * @param subjectId The identifier of the subject
     * @param statementId The IPFS CID of the statement
     * @param topicStatementId The IPFS CID of the topic for indexer filtering (must be non-zero)
     */
    function attestAlignment(bytes32 subjectId, bytes32 statementId, bytes32 topicStatementId)
        external
    {
        if (subjectId == bytes32(0)) revert InvalidSubjectId();
        if (statementId == bytes32(0)) revert InvalidStatementId();
        if (topicStatementId == bytes32(0)) revert InvalidTopicStatementId();

        attestations[msg.sender][topicStatementId][subjectId][statementId] = true;

        emit AlignmentAttestation(msg.sender, subjectId, statementId, topicStatementId);
    }

    /**
     * @notice Batch attest multiple alignments
     * @param subjectIds Array of subject identifiers
     * @param statementIds Array of statement IPFS CIDs
     * @param topicStatementIds Array of topic IPFS CIDs for indexer filtering (must be non-zero)
     */
    function attestAlignmentsInBatch(
        bytes32[] calldata subjectIds,
        bytes32[] calldata statementIds,
        bytes32[] calldata topicStatementIds
    ) external {
        if (subjectIds.length != statementIds.length ||
            statementIds.length != topicStatementIds.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < subjectIds.length; i++) {
            bytes32 subjectId = subjectIds[i];
            bytes32 statementId = statementIds[i];
            bytes32 topicStatementId = topicStatementIds[i];

            if (subjectId == bytes32(0)) revert InvalidSubjectId();
            if (statementId == bytes32(0)) revert InvalidStatementId();
            if (topicStatementId == bytes32(0)) revert InvalidTopicStatementId();

            attestations[msg.sender][topicStatementId][subjectId][statementId] = true;

            emit AlignmentAttestation(msg.sender, subjectId, statementId, topicStatementId);
        }
    }

    /**
     * @notice Retract a previously made alignment attestation
     * @param subjectId The identifier of the subject
     * @param statementId The IPFS CID of the statement
     * @param topicStatementId The IPFS CID of the topic used when attesting
     */
    function removeAttestation(
        bytes32 subjectId,
        bytes32 statementId,
        bytes32 topicStatementId
    ) external {
        attestations[msg.sender][topicStatementId][subjectId][statementId] = false;

        emit AlignmentRevoked(msg.sender, subjectId, statementId, topicStatementId);
    }

    /**
     * @notice Check if an attester has attested an alignment
     * @param attester The address of the attester
     * @param topicStatementId The IPFS CID of the topic
     * @param subjectId The subject identifier
     * @param statementId The statement IPFS CID
     * @return Whether the attestation exists
     */
    function hasAttestation(
        address attester,
        bytes32 topicStatementId,
        bytes32 subjectId,
        bytes32 statementId
    ) external view returns (bool) {
        return attestations[attester][topicStatementId][subjectId][statementId];
    }
}
