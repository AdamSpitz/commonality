// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// AI-generated from specs/README.md and specs/integration.md
// Beliefs contract for Concept Space: Tracks user beliefs about statements

/**
 * @title Beliefs
 * @notice Tracks user beliefs about statements in the Concept Space
 * @dev Statements are represented as IPFS CIDs (bytes32).
 *      Belief states: 0=noOpinion (default), 1=believes, 2=disbelieves
 *      Stores beliefs onchain so other contracts can query them.
 */
contract Beliefs {
    // Belief states
    uint8 public constant NO_OPINION = 0;
    uint8 public constant BELIEVES = 1;
    uint8 public constant DISBELIEVES = 2;

    // Mapping: user address => statementId => beliefState
    mapping(address => mapping(bytes32 => uint8)) public beliefs;

    /**
     * @notice Emitted when a user changes their belief about a statement
     * @param user The address of the user
     * @param statementId The IPFS CID of the statement
     * @param beliefState The new belief state (0=noOpinion, 1=believes, 2=disbelieves)
     */
    event DirectSupport(
        address indexed user,
        bytes32 indexed statementId,
        uint8 beliefState
    );

    /**
     * @notice Set your belief about a statement
     * @param statementId The IPFS CID of the statement
     * @param beliefState The belief state (0=noOpinion, 1=believes, 2=disbelieves)
     */
    function setBelief(bytes32 statementId, uint8 beliefState) external {
        require(
            beliefState <= DISBELIEVES,
            "Invalid belief state"
        );

        beliefs[msg.sender][statementId] = beliefState;

        emit DirectSupport(msg.sender, statementId, beliefState);
    }

    /**
     * @notice Get a user's belief about a statement
     * @param user The address of the user
     * @param statementId The IPFS CID of the statement
     * @return The belief state (0=noOpinion, 1=believes, 2=disbelieves)
     */
    function getBelief(address user, bytes32 statementId)
        external
        view
        returns (uint8)
    {
        return beliefs[user][statementId];
    }

    /**
     * @notice Batch set beliefs for multiple statements
     * @param statementIds Array of IPFS CIDs
     * @param beliefStates Array of belief states
     */
    function setBeliefsInBatch(
        bytes32[] calldata statementIds,
        uint8[] calldata beliefStates
    ) external {
        require(
            statementIds.length == beliefStates.length,
            "Arrays must have same length"
        );

        for (uint256 i = 0; i < statementIds.length; i++) {
            require(
                beliefStates[i] <= DISBELIEVES,
                "Invalid belief state"
            );

            beliefs[msg.sender][statementIds[i]] = beliefStates[i];

            emit DirectSupport(msg.sender, statementIds[i], beliefStates[i]);
        }
    }
}
