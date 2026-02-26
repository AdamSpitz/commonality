// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title AlignmentAttestations
 * @notice Allows attesters to declare that a subject (project, user, etc.) is aligned with a statement/cause
 * @dev Any address can be an attester. Subjects are identified by address.
 *      Statements are IPFS CIDs (bytes32).
 *      Similar pattern to Implications.sol but for subject-statement relationships.
 *
 *      The topicStatementId field allows indexers to filter attestations by topic.
 *      Every attestation must explicitly declare its topic (topicStatementId cannot be zero).
 *      This enables the no-need-to-coordinate benefit: different topics can be linked via implication attestations.
 */
contract AlignmentAttestations {

    error InvalidSubjectAddress();
    error InvalidStatementId();
    error InvalidTopicStatementId();
    error ArrayLengthMismatch();

    /**
     * @notice Emitted when an attester declares that a subject is aligned with a statement
     * @param attester The address making the attestation
     * @param subjectAddress The address of the subject (project, user, etc.)
     * @param statementId The IPFS CID of the statement this subject aligns with
     * @param topicStatementId The IPFS CID of the topic for indexer filtering (must be non-zero)
     */
    event AlignmentAttestation(
        address indexed attester,
        address indexed subjectAddress,
        bytes32 indexed statementId,
        bytes32 topicStatementId
    );

    /**
     * @notice Emitted when an attester retracts an alignment attestation
     * @param attester The address retracting the attestation
     * @param subjectAddress The address of the subject
     * @param statementId The IPFS CID of the statement
     */
    event AlignmentRevoked(
        address indexed attester,
        address indexed subjectAddress,
        bytes32 indexed statementId
    );

    // Mapping to track if an alignment has been attested by a specific attester
    // attester => topicStatementId => subjectAddress => statementId => exists
    mapping(address => mapping(bytes32 => mapping(address => mapping(bytes32 => bool))))
        public attestations;

    /**
     * @notice Attest that a subject is aligned with a statement/cause
     * @dev Can be called multiple times by the same attester for the same pair (idempotent)
     * @param subjectAddress The address of the subject (project, user, etc.)
     * @param statementId The IPFS CID of the statement
     * @param topicStatementId The IPFS CID of the topic for indexer filtering (must be non-zero)
     */
    function attestAlignment(address subjectAddress, bytes32 statementId, bytes32 topicStatementId)
        external
    {
        if (subjectAddress == address(0)) revert InvalidSubjectAddress();
        if (statementId == bytes32(0)) revert InvalidStatementId();
        if (topicStatementId == bytes32(0)) revert InvalidTopicStatementId();

        attestations[msg.sender][topicStatementId][subjectAddress][statementId] = true;

        emit AlignmentAttestation(msg.sender, subjectAddress, statementId, topicStatementId);
    }

    /**
     * @notice Batch attest multiple alignments
     * @param subjectAddresses Array of subject addresses
     * @param statementIds Array of statement IPFS CIDs
     * @param topicStatementIds Array of topic IPFS CIDs for indexer filtering (must be non-zero)
     */
    function attestAlignmentsInBatch(
        address[] calldata subjectAddresses,
        bytes32[] calldata statementIds,
        bytes32[] calldata topicStatementIds
    ) external {
        if (subjectAddresses.length != statementIds.length ||
            statementIds.length != topicStatementIds.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < subjectAddresses.length; i++) {
            address subjectAddress = subjectAddresses[i];
            bytes32 statementId = statementIds[i];
            bytes32 topicStatementId = topicStatementIds[i];

            if (subjectAddress == address(0)) revert InvalidSubjectAddress();
            if (statementId == bytes32(0)) revert InvalidStatementId();
            if (topicStatementId == bytes32(0)) revert InvalidTopicStatementId();

            attestations[msg.sender][topicStatementId][subjectAddress][statementId] = true;

            emit AlignmentAttestation(msg.sender, subjectAddress, statementId, topicStatementId);
        }
    }

    /**
     * @notice Retract a previously made alignment attestation
     * @param subjectAddress The address of the subject
     * @param statementId The IPFS CID of the statement
     * @param topicStatementId The IPFS CID of the topic used when attesting
     */
    function removeAttestation(
        address subjectAddress,
        bytes32 statementId,
        bytes32 topicStatementId
    ) external {
        attestations[msg.sender][topicStatementId][subjectAddress][statementId] = false;

        emit AlignmentRevoked(msg.sender, subjectAddress, statementId);
    }

    /**
     * @notice Check if an attester has attested an alignment
     * @param attester The address of the attester
     * @param topicStatementId The IPFS CID of the topic
     * @param subjectAddress The subject address
     * @param statementId The statement IPFS CID
     * @return Whether the attestation exists
     */
    function hasAttestation(
        address attester,
        bytes32 topicStatementId,
        address subjectAddress,
        bytes32 statementId
    ) external view returns (bool) {
        return attestations[attester][topicStatementId][subjectAddress][statementId];
    }
}
