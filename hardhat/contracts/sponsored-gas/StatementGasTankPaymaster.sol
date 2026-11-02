// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {BasePaymaster} from "@account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {StatementGasTank} from "./StatementGasTank.sol";

contract StatementGasTankPaymaster is BasePaymaster {
  uint256 private constant PAYMASTER_HEADER_LENGTH = 52;

  StatementGasTank public immutable vault;

  error InvalidPaymasterDataLength(uint256 length);
  error InvalidVault();

  constructor(IEntryPoint entryPoint_, StatementGasTank vault_) BasePaymaster(entryPoint_) {
    if (address(vault_) == address(0)) revert InvalidVault();
    vault = vault_;
  }

  function releaseDeposit(uint256 amount) external {
    if (msg.sender != address(vault)) revert InvalidVault();
    entryPoint.withdrawTo(payable(address(vault)), amount);
  }

  function _validatePaymasterUserOp(
    PackedUserOperation calldata userOp,
    bytes32,
    uint256 maxCost
  ) internal override returns (bytes memory context, uint256 validationData) {
    vault.validateStatementUserOp(_decodeAnchor(userOp.paymasterAndData), userOp.sender, userOp.callData, maxCost);
    return ("", 0);
  }

  function _decodeAnchor(bytes calldata paymasterAndData) private pure returns (bytes32 anchor) {
    if (paymasterAndData.length != PAYMASTER_HEADER_LENGTH + 32) {
      revert InvalidPaymasterDataLength(paymasterAndData.length);
    }
    anchor = bytes32(paymasterAndData[PAYMASTER_HEADER_LENGTH:]);
  }
}
