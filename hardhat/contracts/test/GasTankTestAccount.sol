// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";

/// @dev Deliberately signature-free account, ONLY for real EntryPoint integration tests.
contract GasTankTestAccount {
  function validateUserOp(PackedUserOperation calldata, bytes32, uint256) external pure returns (uint256) {
    return 0;
  }

  function execute(address target, uint256 value, bytes calldata data) external {
    (bool ok,) = target.call{value: value}(data);
    require(ok, "execution failed");
  }
}
