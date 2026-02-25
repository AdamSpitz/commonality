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
 *      Implications are unidirectional: fromStatementCid → toStatementCid
 */
contract Implications {
    /**
     * @notice Emitted when an attester declares that one statement implies another
     * @param attester The address making the attestation
     * @param fromStatementCid The IPFS CID of the source statement
     * @param toStatementCid The IPFS CID of the implied statement
     * @param explanationCid The IPFS CID of the explanation for this implication
     */
    event ImplicationAttestation(
        address indexed attester,
        bytes32 indexed fromStatementCid,
        bytes32 indexed toStatementCid,
        bytes32 explanationCid
    );

    /**
     * @notice Emitted when an attester retracts an implication attestation
     * @param attester The address retracting the attestation
     * @param fromStatementCid The IPFS CID of the source statement
     * @param toStatementCid The IPFS CID of the implied statement
     */
    event ImplicationRevoked(
        address indexed attester,
        bytes32 indexed fromStatementCid,
        bytes32 indexed toStatementCid
    );

    // Mapping to track if an implication has been attested by a specific attester
    // attester => fromStatementCid => toStatementCid => exists
    mapping(address => mapping(bytes32 => mapping(bytes32 => bool)))
        public attestations;

    // Mapping to store explanation CIDs for attestations
    // attester => fromStatementCid => toStatementCid => explanationCid
    mapping(address => mapping(bytes32 => mapping(bytes32 => bytes32)))
        public explanations;

    /**
     * @notice Attest that one statement implies another
     * @dev Can be called multiple times by the same attester for the same pair (idempotent)
     * @param fromStatementCid The IPFS CID of the statement that implies
     * @param toStatementCid The IPFS CID of the statement that is implied
     * @param explanationCid The IPFS CID of the explanation (can be zero for no explanation)
     */
    function attestImplication(
        bytes32 fromStatementCid,
        bytes32 toStatementCid,
        bytes32 explanationCid
    ) external {
        if (fromStatementCid == toStatementCid) revert StatementCannotImplyItself();
        if (fromStatementCid == bytes32(0) || toStatementCid == bytes32(0)) revert InvalidStatementID();

        attestations[msg.sender][fromStatementCid][toStatementCid] = true;
        explanations[msg.sender][fromStatementCid][toStatementCid] = explanationCid;

        emit ImplicationAttestation(
            msg.sender,
            fromStatementCid,
            toStatementCid,
            explanationCid
        );
    }

    /**
     * @notice Batch attest multiple implications
     * @param fromStatementCids Array of source statement IPFS CIDs
     * @param toStatementCids Array of implied statement IPFS CIDs
     * @param explanationCids Array of explanation IPFS CIDs (can contain zeros)
     */
    function attestImplicationsInBatch(
        bytes32[] calldata fromStatementCids,
        bytes32[] calldata toStatementCids,
        bytes32[] calldata explanationCids
    ) external {
        if (fromStatementCids.length != toStatementCids.length) revert ArrayLengthMismatch();
        if (fromStatementCids.length != explanationCids.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < fromStatementCids.length; i++) {
            bytes32 from = fromStatementCids[i];
            bytes32 to = toStatementCids[i];
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
     * @param fromStatementCid The source statement IPFS CID
     * @param toStatementCid The implied statement IPFS CID
     * @return Whether the attestation exists
     */
    function hasAttestation(
        address attester,
        bytes32 fromStatementCid,
        bytes32 toStatementCid
    ) external view returns (bool) {
        return attestations[attester][fromStatementCid][toStatementCid];
    }

    /**
     * @notice Retract a previously made implication attestation
     * @param fromStatementCid The IPFS CID of the source statement
     * @param toStatementCid The IPFS CID of the implied statement
     */
    function removeAttestation(
        bytes32 fromStatementCid,
        bytes32 toStatementCid
    ) external {
        attestations[msg.sender][fromStatementCid][toStatementCid] = false;
        explanations[msg.sender][fromStatementCid][toStatementCid] = bytes32(0);

        emit ImplicationRevoked(msg.sender, fromStatementCid, toStatementCid);
    }

    /**
     * @notice Get the explanation CID for an attestation
     * @param attester The address of the attester
     * @param fromStatementCid The source statement IPFS CID
     * @param toStatementCid The implied statement IPFS CID
     * @return The explanation CID (zero if no explanation or attestation doesn't exist)
     */
    function getExplanation(
        address attester,
        bytes32 fromStatementCid,
        bytes32 toStatementCid
    ) external view returns (bytes32) {
        return explanations[attester][fromStatementCid][toStatementCid];
    }
}
