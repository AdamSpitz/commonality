# Decoupling intendedStatementId from DelegatableNotes

## Goal

Remove the `intendedStatementId` field from the DelegatableNotes contract to make it truly generic, and create a separate attestation contract for tracking note intents. This follows the same pattern as Beliefs, Implications, and ProjectAlignment - using attestations rather than baking application-specific data into core contracts.

## Benefits

**Decoupling:**
- DelegatableNotes becomes a generic delegatable wallet with no knowledge of statements or causes
- The "intent" layer is separated, allowing multiple competing systems for tracking note purposes
- Better composability - other applications can use DelegatableNotes with their own metadata systems

**Legal:**
- Clear separation between the financial primitive (DelegatableNotes) and the political/content layer (statements)
- Can honestly say: "DelegatableNotes is just a delegatable wallet. We built a separate optional attestation system for people who want to declare their intentions."

**Flexibility:**
- People could change their note's intended purpose over time
- Multiple attesters could provide metadata about notes
- Same trust model as other attestations - indexers choose which attesters they trust

## Changes Required

### 1. Create New Contract: NoteIntent.sol

Create a new contract at `hardhat/contracts/delegation/NoteIntent.sol`:

```solidity
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
```

### 2. Modify DelegatableNotes.sol

**Remove from the Note struct:**
```solidity
// DELETE THIS LINE:
bytes32 intendedStatementId;
```

**Remove from the NoteCreated event:**
```solidity
// BEFORE:
event NoteCreated(
    uint256 indexed noteId,
    address indexed owner,
    uint256 amount,
    address token,
    TokenType tokenType,
    uint256 tokenId,
    bytes32 intendedStatementId  // <- DELETE THIS
);

// AFTER:
event NoteCreated(
    uint256 indexed noteId,
    address indexed owner,
    uint256 amount,
    address token,
    TokenType tokenType,
    uint256 tokenId
);
```

**Remove from deposit() function:**
- Remove the `bytes32 intendedStatementId` parameter
- Remove the line that sets `intendedStatementId: intendedStatementId` in the Note struct
- Remove `intendedStatementId` from the emit NoteCreated call

**Remove from delegate() function:**
- Remove the line that copies `intendedStatementId: note.intendedStatementId` when creating delegated notes

**Remove from _createNotesForPurchasedTokens() helper:**
- Remove `bytes32[] memory statementIds` parameter
- Remove the line that sets `intendedStatementId: statementIds[c]` in the Note struct
- Remove `statementIds[c]` from the emit NoteCreated call

**Remove from _consumePaymentNotes() helper:**
- Remove the `bytes32[] memory statementIds` return value
- Remove the line `statementIds[i] = notes[noteIds[i]].intendedStatementId;`
- Remove `statementIds` from the return statement

**Remove from _executePurchase() helper:**
- Remove `bytes32[] memory statementIds` return value
- Update the return statement from `_consumePaymentNotes()`
- Update both purchase functions to not expect or pass statementIds

### 3. Update UI/Indexer Integration

**When creating a note in the UI:**
1. Call `DelegatableNotes.deposit()` (without intendedStatementId parameter)
2. Get the returned noteId
3. Immediately call `NoteIntent.attestNoteIntent(delegatableNotesAddress, noteId, statementId)`

**In the indexer:**
- Index both `NoteCreated` events (from DelegatableNotes) and `NoteIntentAttested` events (from NoteIntent)
- Join them on (noteContract, noteId) to know which notes are for which statements
- Respect the user's configured trusted attesters for note intents (same as for implications)

### 4. Testing

**Unit tests for NoteIntent.sol:**
- Test single attestation
- Test batch attestation
- Test updating an attestation (same attester, same note, different statement)
- Test multiple attesters attesting different intents for the same note
- Test validation (zero addresses, zero statement IDs)

**Integration tests:**
- Create note via DelegatableNotes
- Attest intent via NoteIntent
- Verify indexer correctly associates the note with the statement
- Test delegation with intent tracking
- Test purchase flows still work without embedded intendedStatementId

**Update existing tests:**
- Update all DelegatableNotes tests to remove intendedStatementId parameters
- Add NoteIntent calls where needed to maintain test scenarios

### 5. Deployment

Deploy NoteIntent.sol to the same networks as DelegatableNotes.

### 6. Documentation Updates

Update specs to reflect:
- DelegatableNotes is now a generic delegatable wallet
- NoteIntent is an optional attestation layer for tracking note purposes
- The pattern: core contracts are generic, attestation contracts add application-specific meaning

## Migration Notes

**For existing deployed contracts:**
- Old DelegatableNotes contract will still have the intendedStatementId field
- Could deploy a migration script that reads all existing notes and emits corresponding NoteIntentAttested events
- Or just accept that old notes have it baked in, new notes use the attestation pattern

**For new deployments:**
- Deploy both DelegatableNotes (without intendedStatementId) and NoteIntent
- Update frontend to use both contracts
- Update indexer to track both event types
