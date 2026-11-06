// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {UserOperationV06} from "./UserOperationV06.sol";

interface IPaymasterV06 {
  enum PostOpMode {
    opSucceeded,
    opReverted,
    postOpReverted
  }

  function validatePaymasterUserOp(
    UserOperationV06 calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
  ) external returns (bytes memory context, uint256 validationData);

  function postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) external;
}
