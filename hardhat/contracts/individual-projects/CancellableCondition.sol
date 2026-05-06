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

interface IThirdPartySuccessGate {
    function canThirdPartyContractSucceed(bytes32 channelId) external view returns (bool);
}

/**
 * @title CancellableCondition
 * @notice Wraps another assurance condition and allows an authorized canceller
 *         to force a terminal failed state before the wrapped condition can succeed.
 * @dev Third-party content-funding contracts are gated until creator control plus veto-window
 *      expiry, so the creator can cancel even if the funding threshold was reached earlier.
 *      Once cancelled, hasSucceeded() always returns false and hasFailed() always returns true.
 */
contract CancellableCondition is IAssuranceCondition, ICancellableCondition {
    error InvalidBaseConditionAddress();
    error InvalidCancellerAddress();
    error OnlyCancellerCanCancel();
    error ConditionAlreadyCancelled();
    error ConditionAlreadySucceeded();
    error InvalidSuccessGateAddress();
    error InvalidChannelId();

    /// @notice Emitted when the condition is cancelled
    /// @param canceller The address that cancelled the condition
    event ConditionCancelled(address indexed canceller);

    /// @notice The wrapped base condition
    IAssuranceCondition public immutable baseCondition;
    /// @notice The address authorized to cancel this condition
    address public immutable canceller;
    /// @notice Registry/gate that decides when a third-party contract may become successful
    IThirdPartySuccessGate public immutable successGate;
    /// @notice The channel this third-party condition belongs to
    bytes32 public immutable channelId;
    /// @notice Whether this condition has been cancelled
    bool public isCancelled;

    /**
     * @notice Initializes the cancellable wrapper around a base condition
     * @param _baseCondition The address of the base IAssuranceCondition to wrap
     * @param _canceller The address authorized to cancel this condition
     * @param _successGate The registry/gate that decides when success is no longer vetoable
     * @param _channelId The channel this third-party condition belongs to
     */
    constructor(address _baseCondition, address _canceller, address _successGate, bytes32 _channelId) {
        if (_baseCondition == address(0)) revert InvalidBaseConditionAddress();
        if (_canceller == address(0)) revert InvalidCancellerAddress();
        if (_successGate == address(0)) revert InvalidSuccessGateAddress();
        if (_channelId == bytes32(0)) revert InvalidChannelId();
        baseCondition = IAssuranceCondition(_baseCondition);
        canceller = _canceller;
        successGate = IThirdPartySuccessGate(_successGate);
        channelId = _channelId;
    }

    /// @inheritdoc ICancellableCondition
    function cancel() external {
        if (msg.sender != canceller) revert OnlyCancellerCanCancel();
        if (isCancelled) revert ConditionAlreadyCancelled();
        if (this.hasSucceeded()) revert ConditionAlreadySucceeded();
        isCancelled = true;
        emit ConditionCancelled(msg.sender);
    }

    /// @inheritdoc IAssuranceCondition
    function hasSucceeded() external view override(IAssuranceCondition, ICancellableCondition) returns (bool) {
        if (isCancelled) return false;
        if (!successGate.canThirdPartyContractSucceed(channelId)) return false;
        return baseCondition.hasSucceeded();
    }

    /// @inheritdoc IAssuranceCondition
    function hasFailed() external view override returns (bool) {
        return isCancelled || baseCondition.hasFailed();
    }
}
