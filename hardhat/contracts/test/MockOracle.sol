//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title MockOracle
 * @notice Test-only mock oracle for OracleCondition tests
 * @dev Returns 0 (undecided), 1 (succeeded), or 2 (failed)
 */
contract MockOracle {
    uint8 private _result;

    function result() external view returns (uint8) {
        return _result;
    }

    function setResult(uint8 value) external {
        _result = value;
    }
}
