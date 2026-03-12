//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IAssuranceCondition} from "./IAssuranceCondition.sol";
import {IOracle} from "./IOracle.sol";

/**
 * @title OracleCondition
 * @notice Assurance condition that delegates to an external oracle
 * @dev The oracle must implement IOracle and return 0 (undecided), 1 (succeeded), or 2 (failed).
 */
contract OracleCondition is IAssuranceCondition {
    error InvalidOracleAddress();

    address public immutable oracle;

    constructor(address _oracle) {
        if (_oracle == address(0)) revert InvalidOracleAddress();
        oracle = _oracle;
    }

    function hasSucceeded() external view override returns (bool) {
        return IOracle(oracle).result() == 1;
    }

    function hasFailed() external view override returns (bool) {
        return IOracle(oracle).result() == 2;
    }
}
