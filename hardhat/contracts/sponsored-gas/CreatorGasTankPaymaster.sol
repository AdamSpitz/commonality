// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {BasePaymaster} from "@account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {CreatorGasTank} from "./CreatorGasTank.sol";

/// @title CreatorGasTankPaymaster
/// @notice EntryPoint v0.7 adapter. Policy and ETH live on the vault.
contract CreatorGasTankPaymaster is BasePaymaster {
  uint256 private constant PAYMASTER_HEADER_LENGTH = 52;
  uint256 private constant ADDRESS_BYTES = 20;

  CreatorGasTank public immutable vault;

  error InvalidPaymasterDataLength(uint256 length);
  error InvalidVault();

  constructor(IEntryPoint entryPoint_, CreatorGasTank vault_) BasePaymaster(entryPoint_) {
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
    return (vault.validateCreatorUserOp(_decodeProject(userOp.paymasterAndData), userOp.sender, userOp.callData, maxCost), 0);
  }

  function _postOp(PostOpMode, bytes calldata context, uint256 actualGasCost, uint256) internal override {
    vault.debitCreator(context, actualGasCost);
  }

  function _decodeProject(bytes calldata paymasterAndData) private pure returns (address project) {
    if (paymasterAndData.length != PAYMASTER_HEADER_LENGTH + ADDRESS_BYTES) {
      revert InvalidPaymasterDataLength(paymasterAndData.length);
    }
    project = address(bytes20(paymasterAndData[PAYMASTER_HEADER_LENGTH:PAYMASTER_HEADER_LENGTH + ADDRESS_BYTES]));
  }
}
