// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {IPaymaster} from "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IPaymasterV06} from "../sponsored-gas/IPaymasterV06.sol";
import {UserOperationV06} from "../sponsored-gas/UserOperationV06.sol";

contract MockEntryPoint is IERC165 {
  mapping(address account => uint256 balance) public balances;

  function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
    return interfaceId == type(IEntryPoint).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function depositTo(address account) external payable {
    balances[account] += msg.value;
  }

  function balanceOf(address account) external view returns (uint256) {
    return balances[account];
  }

  function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external {
    balances[msg.sender] -= withdrawAmount;
    (bool ok,) = withdrawAddress.call{value: withdrawAmount}("");
    require(ok, "withdraw failed");
  }

  function validatePaymasterUserOp(
    IPaymaster paymaster,
    PackedUserOperation calldata userOp,
    uint256 maxCost
  ) external returns (bytes memory context, uint256 validationData) {
    return paymaster.validatePaymasterUserOp(userOp, bytes32(0), maxCost);
  }

  function postOp(
    IPaymaster paymaster,
    IPaymaster.PostOpMode mode,
    bytes calldata context,
    uint256 actualGasCost
  ) external {
    paymaster.postOp(mode, context, actualGasCost, 0);
  }

  function validatePaymasterUserOpV06(
    IPaymasterV06 paymaster,
    UserOperationV06 calldata userOp,
    uint256 maxCost
  ) external returns (bytes memory context, uint256 validationData) {
    return paymaster.validatePaymasterUserOp(userOp, bytes32(0), maxCost);
  }
}
