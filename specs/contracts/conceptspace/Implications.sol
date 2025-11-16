// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// AI-generated from specs/README.md and specs/integration.md
// Implications contract for Concept Space: Links related statements via implication attestations

/**
 * @title Implications
 * @notice Allows attesters to declare that belief in one statement implies belief in another
 * @dev Any address can be an attester. Statements are IPFS CIDs (bytes32).
 *      No validation that statements exist on IPFS - trust model.
 *      Implications are unidirectional: fromStatement → toStatement
 */
contract Implications {
    /**
     * @notice Emitted when an attester declares that one statement implies another
     * @param attester The address making the attestation
     * @param fromStatementId The IPFS CID of the source statement
     * @param toStatementId The IPFS CID of the implied statement
     */
    event ImplicationAttestation(
        address indexed attester,
        bytes32 indexed fromStatementId,
        bytes32 indexed toStatementId
    );

    // Mapping to track if an implication has been attested by a specific attester
    // attester => fromStatementId => toStatementId => exists
    mapping(address => mapping(bytes32 => mapping(bytes32 => bool)))
        public attestations;

    /**
     * @notice Attest that one statement implies another
     * @dev Can be called multiple times by the same attester for the same pair (idempotent)
     * @param fromStatementId The IPFS CID of the statement that implies
     * @param toStatementId The IPFS CID of the statement that is implied
     */
    function attestImplication(bytes32 fromStatementId, bytes32 toStatementId)
        external
    {
        require(
            fromStatementId != toStatementId,
            "Statement cannot imply itself"
        );
        require(
            fromStatementId != bytes32(0) && toStatementId != bytes32(0),
            "Invalid statement ID"
        );

        attestations[msg.sender][fromStatementId][toStatementId] = true;

        emit ImplicationAttestation(msg.sender, fromStatementId, toStatementId);
    }

    /**
     * @notice Batch attest multiple implications
     * @param fromStatementIds Array of source statement IPFS CIDs
     * @param toStatementIds Array of implied statement IPFS CIDs
     */
    function attestImplicationsInBatch(
        bytes32[] calldata fromStatementIds,
        bytes32[] calldata toStatementIds
    ) external {
        require(
            fromStatementIds.length == toStatementIds.length,
            "Arrays must have same length"
        );

        for (uint256 i = 0; i < fromStatementIds.length; i++) {
            bytes32 from = fromStatementIds[i];
            bytes32 to = toStatementIds[i];

            require(
                from != to,
                "Statement cannot imply itself"
            );
            require(
                from != bytes32(0) && to != bytes32(0),
                "Invalid statement ID"
            );

            attestations[msg.sender][from][to] = true;

            emit ImplicationAttestation(msg.sender, from, to);
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
}
