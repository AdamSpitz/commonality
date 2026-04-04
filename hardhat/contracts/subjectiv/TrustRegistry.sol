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

    // truster => trustee => trust score (0-100)
    mapping(address => mapping(address => uint8)) public trustScores;

    event TrustSet(
        address indexed truster,
        address indexed trustee,
        uint8 score
    );

    function setTrust(address trustee, uint8 score) external {
        if (score > 100) revert InvalidScore();
        if (trustee == msg.sender) revert CannotTrustSelf();

        trustScores[msg.sender][trustee] = score;
        emit TrustSet(msg.sender, trustee, score);
    }

    function setTrustBatch(address[] calldata trustees, uint8[] calldata scores) external {
        if (trustees.length != scores.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < trustees.length; i++) {
            if (scores[i] > 100) revert InvalidScore();
            if (trustees[i] == msg.sender) revert CannotTrustSelf();

            trustScores[msg.sender][trustees[i]] = scores[i];
            emit TrustSet(msg.sender, trustees[i], scores[i]);
        }
    }

    function getTrust(address truster, address trustee) external view returns (uint8) {
        return trustScores[truster][trustee];
    }
}
