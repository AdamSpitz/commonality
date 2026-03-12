//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title IAssuranceCondition
 * @notice Interface for pluggable assurance contract conditions
 * @dev Implementations define when an assurance contract has succeeded or failed.
 *      It is valid for both hasSucceeded() and hasFailed() to return false (undecided).
 *      It must never be the case that both return true simultaneously.
 */
interface IAssuranceCondition {
    /**
     * @notice Returns true if the assurance contract's condition has been met
     */
    function hasSucceeded() external view returns (bool);

    /**
     * @notice Returns true if the assurance contract's condition can no longer be met
     */
    function hasFailed() external view returns (bool);
}
