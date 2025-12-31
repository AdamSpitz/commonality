// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title NoteIntent
 * @notice Allows attesters to declare the intended purpose of delegatable notes
 * @dev Follows the same pattern as Implications and ProjectAlignment.
 *      Any address can be an attester. The noteContract field allows this to work
 *      with any delegatable notes implementation, not just a specific deployment.
 */
contract NoteIntent {
    /**
     * @notice Emitted when an attester declares a note's intended purpose
     * @param attester The address making the attestation
     * @param noteContract The address of the delegatable notes contract
     * @param noteId The ID of the note within that contract
     * @param intendedStatementId The IPFS CID of the statement this note is intended for
     */
    event NoteIntentAttested(
        address indexed attester,
        address indexed noteContract,
        uint256 indexed noteId,
        bytes32 intendedStatementId
    );

    // Mapping to track if an intent has been attested by a specific attester
    // attester => noteContract => noteId => intendedStatementId
    mapping(address => mapping(address => mapping(uint256 => bytes32)))
        public attestations;

    /**
     * @notice Attest that a note is intended for a specific statement/cause
     * @dev Can be called multiple times by the same attester to change intent
     * @param noteContract The address of the delegatable notes contract
     * @param noteId The ID of the note
     * @param intendedStatementId The IPFS CID of the intended statement
     */
    function attestNoteIntent(
        address noteContract,
        uint256 noteId,
        bytes32 intendedStatementId
    ) external {
        require(
            noteContract != address(0),
            "Invalid note contract address"
        );
        require(
            intendedStatementId != bytes32(0),
            "Invalid statement ID"
        );

        attestations[msg.sender][noteContract][noteId] = intendedStatementId;

        emit NoteIntentAttested(
            msg.sender,
            noteContract,
            noteId,
            intendedStatementId
        );
    }

    /**
     * @notice Batch attest multiple note intents
     * @param noteContract The address of the delegatable notes contract
     * @param noteIds Array of note IDs
     * @param intendedStatementIds Array of intended statement IDs
     */
    function attestNoteIntentsInBatch(
        address noteContract,
        uint256[] calldata noteIds,
        bytes32[] calldata intendedStatementIds
    ) external {
        require(
            noteIds.length == intendedStatementIds.length,
            "Arrays must have same length"
        );
        require(
            noteContract != address(0),
            "Invalid note contract address"
        );

        for (uint256 i = 0; i < noteIds.length; i++) {
            bytes32 statementId = intendedStatementIds[i];
            require(
                statementId != bytes32(0),
                "Invalid statement ID"
            );

            attestations[msg.sender][noteContract][noteIds[i]] = statementId;

            emit NoteIntentAttested(
                msg.sender,
                noteContract,
                noteIds[i],
                statementId
            );
        }
    }

    /**
     * @notice Get the attested intent for a note from a specific attester
     * @param attester The address of the attester
     * @param noteContract The note contract address
     * @param noteId The note ID
     * @return The intended statement ID (zero if no attestation exists)
     */
    function getAttestation(
        address attester,
        address noteContract,
        uint256 noteId
    ) external view returns (bytes32) {
        return attestations[attester][noteContract][noteId];
    }
}
