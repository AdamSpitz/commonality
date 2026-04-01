//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IAssuranceCondition} from "./IAssuranceCondition.sol";

/**
 * @title CancellableCondition
 * @notice Wraps another assurance condition and allows an authorized canceller
 *         to force a terminal failed state before the wrapped condition succeeds.
 */
contract CancellableCondition is IAssuranceCondition {
    error InvalidBaseConditionAddress();
    error InvalidCancellerAddress();
    error OnlyCancellerCanCancel();
    error ConditionAlreadyCancelled();
    error ConditionAlreadySucceeded();

    event ConditionCancelled(address indexed canceller);

    IAssuranceCondition public immutable baseCondition;
    address public immutable canceller;
    bool public isCancelled;

    constructor(address _baseCondition, address _canceller) {
        if (_baseCondition == address(0)) revert InvalidBaseConditionAddress();
        if (_canceller == address(0)) revert InvalidCancellerAddress();
        baseCondition = IAssuranceCondition(_baseCondition);
        canceller = _canceller;
    }

    function cancel() external {
        if (msg.sender != canceller) revert OnlyCancellerCanCancel();
        if (isCancelled) revert ConditionAlreadyCancelled();
        if (baseCondition.hasSucceeded()) revert ConditionAlreadySucceeded();
        isCancelled = true;
        emit ConditionCancelled(msg.sender);
    }

    function hasSucceeded() external view override returns (bool) {
        if (isCancelled) return false;
        return baseCondition.hasSucceeded();
    }

    function hasFailed() external view override returns (bool) {
        return isCancelled || baseCondition.hasFailed();
    }
}
