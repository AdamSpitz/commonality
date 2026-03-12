//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title IOracle
 * @notice Minimal oracle interface for assurance contract conditions
 * @dev Returns a tri-state: 0 = undecided, 1 = succeeded, 2 = failed
 */
interface IOracle {
    function result() external view returns (uint8);
}
