// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {StatementGasTank} from "./StatementGasTank.sol";
import {IPaymasterV06} from "./IPaymasterV06.sol";
import {UserOperationV06} from "./UserOperationV06.sol";
import {PaymasterV06Stake} from "./PaymasterV06Stake.sol";

contract StatementGasTankPaymasterV06 is IPaymasterV06, PaymasterV06Stake {
  uint256 private constant PAYMASTER_V06_HEADER_LENGTH = 20;

  StatementGasTank public immutable vault;

  error InvalidPaymasterDataLength(uint256 length);
  error InvalidVault();
  error NotFromEntryPoint();

  constructor(IEntryPoint entryPoint_, StatementGasTank vault_) PaymasterV06Stake(entryPoint_) {
    if (address(entryPoint_) == address(0) || address(vault_) == address(0)) revert InvalidVault();
    vault = vault_;
  }

  function releaseDeposit(uint256 amount) external {
    if (msg.sender != address(vault)) revert InvalidVault();
    entryPoint.withdrawTo(payable(address(vault)), amount);
  }

  function validatePaymasterUserOp(
    UserOperationV06 calldata userOp,
    bytes32,
    uint256 maxCost
  ) external override returns (bytes memory context, uint256 validationData) {
    if (msg.sender != address(entryPoint)) revert NotFromEntryPoint();
    vault.validateStatementUserOp(_decodeAnchor(userOp.paymasterAndData), userOp.sender, userOp.callData, maxCost);
    return ("", 0);
  }

  function postOp(PostOpMode, bytes calldata, uint256) external view override {
    if (msg.sender != address(entryPoint)) revert NotFromEntryPoint();
  }

  function _decodeAnchor(bytes calldata paymasterAndData) private pure returns (bytes32 anchor) {
    if (paymasterAndData.length != PAYMASTER_V06_HEADER_LENGTH + 32) {
      revert InvalidPaymasterDataLength(paymasterAndData.length);
    }
    anchor = bytes32(paymasterAndData[PAYMASTER_V06_HEADER_LENGTH:]);
  }
}
