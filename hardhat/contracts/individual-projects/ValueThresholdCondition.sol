//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IAssuranceCondition} from "./IAssuranceCondition.sol";

/**
 * @title IProgressSource
 * @notice Interface for contracts that report funding progress
 */
interface IProgressSource {
    /**
     * @notice Returns the current funding progress value
     * @return The progress amount (typically in wei)
     */
    function getAssuranceContractProgress() external view returns (uint256);
}

/**
 * @title ValueThresholdCondition
 * @notice Assurance condition: succeeds when progress >= threshold,
 *         fails when deadline passes without reaching threshold
 * @dev Reads progress from an external contract via IProgressSource.
 *      The progress value is denominated in the settlement token of the source contract
 *      (typically an assurance contract with a paymentToken).
 */
contract ValueThresholdCondition is IAssuranceCondition {
    error InvalidProgressSourceAddress();

    /// @notice The contract that reports funding progress
    address public immutable progressSource;
    /// @notice The funding threshold required for success (in wei)
    uint256 public immutable threshold;
    /// @notice The unix timestamp after which the condition can fail
    uint256 public immutable deadline;

    /**
     * @notice Initializes the condition with a progress source, threshold, and deadline
     * @param _progressSource The address of the contract that reports funding progress
     * @param _threshold The funding amount required for success
     * @param _deadline The unix timestamp after which the condition can fail
     */
    constructor(address _progressSource, uint256 _threshold, uint256 _deadline) {
        if (_progressSource == address(0)) revert InvalidProgressSourceAddress();
        progressSource = _progressSource;
        threshold = _threshold;
        deadline = _deadline;
    }

    /// @inheritdoc IAssuranceCondition
    function hasSucceeded() external view override returns (bool) {
        return IProgressSource(progressSource).getAssuranceContractProgress() >= threshold;
    }

    /// @inheritdoc IAssuranceCondition
    function hasFailed() external view override returns (bool) {
        uint256 progress = IProgressSource(progressSource).getAssuranceContractProgress();
        // slither-disable-next-line timestamp
        return progress < threshold && block.timestamp >= deadline;
    }
}
