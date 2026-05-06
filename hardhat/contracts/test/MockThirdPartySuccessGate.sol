//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IThirdPartySuccessGate} from "../individual-projects/CancellableCondition.sol";

contract MockThirdPartySuccessGate is IThirdPartySuccessGate {
    bool public canSucceed;

    function setCanSucceed(bool _canSucceed) external {
        canSucceed = _canSucceed;
    }

    function canThirdPartyContractSucceed(bytes32) external view returns (bool) {
        return canSucceed;
    }
}
