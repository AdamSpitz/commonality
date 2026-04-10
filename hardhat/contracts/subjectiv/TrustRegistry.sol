// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title TrustRegistry
 * @notice Stores per-user trust scores used by the Subjectiv trust graph.
 * @dev Trust scores are integers from 0-100 where 0 means revoke / no trust.
 */
contract TrustRegistry {
    error InvalidScore();
    error CannotTrustSelf();
    error ArrayLengthMismatch();

    /// @notice Mapping of truster => trustee => trust score (0-100)
    mapping(address => mapping(address => uint8)) public trustScores;

    /**
     * @notice Emitted when a user sets or updates their trust score for another user
     * @param truster The address assigning the trust score
     * @param trustee The address being trusted
     * @param score The trust score (0-100, where 0 means revoke/no trust)
     */
    event TrustSet(
        address indexed truster,
        address indexed trustee,
        uint8 score
    );

    /**
     * @notice Set your trust score for another address
     * @param trustee The address to assign a trust score to
     * @param score The trust score (0-100, where 0 means revoke/no trust)
     */
    function setTrust(address trustee, uint8 score) external {
        if (score > 100) revert InvalidScore();
        if (trustee == msg.sender) revert CannotTrustSelf();

        trustScores[msg.sender][trustee] = score;
        emit TrustSet(msg.sender, trustee, score);
    }

    /**
     * @notice Set trust scores for multiple addresses at once
     * @param trustees Array of addresses to assign trust scores to
     * @param scores Array of trust scores corresponding to each trustee
     */
    function setTrustBatch(address[] calldata trustees, uint8[] calldata scores) external {
        if (trustees.length != scores.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < trustees.length; i++) {
            if (scores[i] > 100) revert InvalidScore();
            if (trustees[i] == msg.sender) revert CannotTrustSelf();

            trustScores[msg.sender][trustees[i]] = scores[i];
            emit TrustSet(msg.sender, trustees[i], scores[i]);
        }
    }

    /**
     * @notice Get the trust score one address has assigned to another
     * @param truster The address that assigned the trust score
     * @param trustee The address being trusted
     * @return The trust score (0-100)
     */
    function getTrust(address truster, address trustee) external view returns (uint8) {
        return trustScores[truster][trustee];
    }
}
