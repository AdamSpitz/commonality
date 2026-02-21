// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

// AI-generated from specs/README.md and specs/integration.md
// Implications contract for Concept Space: Links related statements via implication attestations

error StatementCannotImplyItself();
error InvalidStatementID();
error ArrayLengthMismatch();

/**
 * @title Implications
 * @notice Allows attesters to declare that belief in one statement implies belief in another
 * @dev Any address can be an attester. Statements are IPFS CIDs (bytes32).
 *      No validation that statements exist on IPFS - trust model.
 *      Implications are unidirectional: fromStatementId → toStatementId
 */
contract Implications {
    /**
     * @notice Emitted when an attester declares that one statement implies another
     * @param attester The address making the attestation
     * @param fromStatementId The IPFS CID of the source statement
     * @param toStatementId The IPFS CID of the implied statement
     * @param explanationCid The IPFS CID of the explanation for this implication
     */
    event ImplicationAttestation(
        address indexed attester,
        bytes32 indexed fromStatementId,
        bytes32 indexed toStatementId,
        bytes32 explanationCid
    );

    // Mapping to track if an implication has been attested by a specific attester
    // attester => fromStatementId => toStatementId => exists
    mapping(address => mapping(bytes32 => mapping(bytes32 => bool)))
        public attestations;

    // Mapping to store explanation CIDs for attestations
    // attester => fromStatementId => toStatementId => explanationCid
    mapping(address => mapping(bytes32 => mapping(bytes32 => bytes32)))
        public explanations;

    /**
     * @notice Attest that one statement implies another
     * @dev Can be called multiple times by the same attester for the same pair (idempotent)
     * @param fromStatementId The IPFS CID of the statement that implies
     * @param toStatementId The IPFS CID of the statement that is implied
     * @param explanationCid The IPFS CID of the explanation (can be zero for no explanation)
     */
    function attestImplication(
        bytes32 fromStatementId,
        bytes32 toStatementId,
        bytes32 explanationCid
    ) external {
        if (fromStatementId == toStatementId) revert StatementCannotImplyItself();
        if (fromStatementId == bytes32(0) || toStatementId == bytes32(0)) revert InvalidStatementID();

        attestations[msg.sender][fromStatementId][toStatementId] = true;
        explanations[msg.sender][fromStatementId][toStatementId] = explanationCid;

        emit ImplicationAttestation(
            msg.sender,
            fromStatementId,
            toStatementId,
            explanationCid
        );
    }

    /**
     * @notice Batch attest multiple implications
     * @param fromStatementIds Array of source statement IPFS CIDs
     * @param toStatementIds Array of implied statement IPFS CIDs
     * @param explanationCids Array of explanation IPFS CIDs (can contain zeros)
     */
    function attestImplicationsInBatch(
        bytes32[] calldata fromStatementIds,
        bytes32[] calldata toStatementIds,
        bytes32[] calldata explanationCids
    ) external {
        if (fromStatementIds.length != toStatementIds.length) revert ArrayLengthMismatch();
        if (fromStatementIds.length != explanationCids.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < fromStatementIds.length; i++) {
            bytes32 from = fromStatementIds[i];
            bytes32 to = toStatementIds[i];
            bytes32 explanation = explanationCids[i];

            if (from == to) revert StatementCannotImplyItself();
            if (from == bytes32(0) || to == bytes32(0)) revert InvalidStatementID();

            attestations[msg.sender][from][to] = true;
            explanations[msg.sender][from][to] = explanation;

            emit ImplicationAttestation(msg.sender, from, to, explanation);
        }
    }

    /**
     * @notice Check if an attester has attested an implication
     * @param attester The address of the attester
     * @param fromStatementId The source statement IPFS CID
     * @param toStatementId The implied statement IPFS CID
     * @return Whether the attestation exists
     */
    function hasAttestation(
        address attester,
        bytes32 fromStatementId,
        bytes32 toStatementId
    ) external view returns (bool) {
        return attestations[attester][fromStatementId][toStatementId];
    }

    /**
     * @notice Get the explanation CID for an attestation
     * @param attester The address of the attester
     * @param fromStatementId The source statement IPFS CID
     * @param toStatementId The implied statement IPFS CID
     * @return The explanation CID (zero if no explanation or attestation doesn't exist)
     */
    function getExplanation(
        address attester,
        bytes32 fromStatementId,
        bytes32 toStatementId
    ) external view returns (bytes32) {
        return explanations[attester][fromStatementId][toStatementId];
    }
}
