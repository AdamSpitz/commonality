//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IAssuranceCondition} from "./IAssuranceCondition.sol";

/**
 * @title ICancellableCondition
 * @notice Interface for conditions that can be cancelled by an authorized party
 */
interface ICancellableCondition {
    /**
     * @notice Cancel the condition, forcing it into a failed state
     */
    function cancel() external;

    /**
     * @notice Returns true if the underlying condition has succeeded and was not cancelled
     */
    function hasSucceeded() external view returns (bool);
}

/**
 * @title CancellableCondition
 * @notice Wraps another assurance condition and allows an authorized canceller
 *         to force a terminal failed state before the wrapped condition succeeds.
 * @dev Once cancelled, hasSucceeded() always returns false and hasFailed() always returns true.
 *      Cannot be cancelled after the base condition has already succeeded.
 */
contract CancellableCondition is IAssuranceCondition, ICancellableCondition {
    error InvalidBaseConditionAddress();
    error InvalidCancellerAddress();
    error OnlyCancellerCanCancel();
    error ConditionAlreadyCancelled();
    error ConditionAlreadySucceeded();

    /// @notice Emitted when the condition is cancelled
    /// @param canceller The address that cancelled the condition
    event ConditionCancelled(address indexed canceller);

    /// @notice The wrapped base condition
    IAssuranceCondition public immutable baseCondition;
    /// @notice The address authorized to cancel this condition
    address public immutable canceller;
    /// @notice Whether this condition has been cancelled
    bool public isCancelled;

    /**
     * @notice Initializes the cancellable wrapper around a base condition
     * @param _baseCondition The address of the base IAssuranceCondition to wrap
     * @param _canceller The address authorized to cancel this condition
     */
    constructor(address _baseCondition, address _canceller) {
        if (_baseCondition == address(0)) revert InvalidBaseConditionAddress();
        if (_canceller == address(0)) revert InvalidCancellerAddress();
        baseCondition = IAssuranceCondition(_baseCondition);
        canceller = _canceller;
    }

    /// @inheritdoc ICancellableCondition
    function cancel() external {
        if (msg.sender != canceller) revert OnlyCancellerCanCancel();
        if (isCancelled) revert ConditionAlreadyCancelled();
        if (baseCondition.hasSucceeded()) revert ConditionAlreadySucceeded();
        isCancelled = true;
        emit ConditionCancelled(msg.sender);
    }

    /// @inheritdoc IAssuranceCondition
    function hasSucceeded() external view override(IAssuranceCondition, ICancellableCondition) returns (bool) {
        if (isCancelled) return false;
        return baseCondition.hasSucceeded();
    }

    /// @inheritdoc IAssuranceCondition
    function hasFailed() external view override returns (bool) {
        return isCancelled || baseCondition.hasFailed();
    }
}
