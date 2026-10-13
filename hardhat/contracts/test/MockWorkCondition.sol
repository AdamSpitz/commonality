//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IAssuranceCondition} from "../individual-projects/IAssuranceCondition.sol";

contract MockWorkCondition is IAssuranceCondition {
    bool private _succeeded;
    bool private _failed;

    function setOutcome(bool succeeded, bool failed) external {
        _succeeded = succeeded;
        _failed = failed;
    }

    function hasSucceeded() external view returns (bool) {
        return _succeeded;
    }

    function hasFailed() external view returns (bool) {
        return _failed;
    }
}
