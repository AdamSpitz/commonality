//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IAssuranceCondition} from "./IAssuranceCondition.sol";

interface IProgressSource {
    function getAssuranceContractProgress() external view returns (uint256);
}

/**
 * @title EthThresholdCondition
 * @notice Assurance condition: succeeds when progress >= threshold, fails when deadline passes without reaching threshold
 * @dev Reads progress from an external contract via IProgressSource.
 */
contract EthThresholdCondition is IAssuranceCondition {
    address public immutable progressSource;
    uint256 public immutable threshold;
    uint256 public immutable deadline;

    constructor(address _progressSource, uint256 _threshold, uint256 _deadline) {
        progressSource = _progressSource;
        threshold = _threshold;
        deadline = _deadline;
    }

    function hasSucceeded() external view override returns (bool) {
        return IProgressSource(progressSource).getAssuranceContractProgress() >= threshold;
    }

    function hasFailed() external view override returns (bool) {
        uint256 progress = IProgressSource(progressSource).getAssuranceContractProgress();
        // slither-disable-next-line timestamp
        return progress < threshold && block.timestamp >= deadline;
    }
}
