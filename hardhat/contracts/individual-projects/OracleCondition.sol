//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IAssuranceCondition} from "./IAssuranceCondition.sol";

/**
 * @title IOracle
 * @notice Minimal oracle interface for assurance contract conditions
 * @dev Returns a tri-state: 0 = undecided, 1 = succeeded, 2 = failed
 */
interface IOracle {
    function result() external view returns (uint8);
}

/**
 * @title OracleCondition
 * @notice Assurance condition that delegates to an external oracle
 * @dev The oracle must implement IOracle and return 0 (undecided), 1 (succeeded), or 2 (failed).
 */
contract OracleCondition is IAssuranceCondition {
    address public immutable oracle;

    constructor(address _oracle) {
        oracle = _oracle;
    }

    function hasSucceeded() external view override returns (bool) {
        return IOracle(oracle).result() == 1;
    }

    function hasFailed() external view override returns (bool) {
        return IOracle(oracle).result() == 2;
    }
}
