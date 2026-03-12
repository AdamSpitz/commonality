//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IOracle} from "../individual-projects/IOracle.sol";

/**
 * @title MockOracle
 * @notice Test-only mock oracle for OracleCondition tests
 * @dev Returns 0 (undecided), 1 (succeeded), or 2 (failed)
 */
contract MockOracle is IOracle {
    uint8 private _result;

    function result() external view returns (uint8) {
        return _result;
    }

    function setResult(uint8 value) external {
        _result = value;
    }
}
