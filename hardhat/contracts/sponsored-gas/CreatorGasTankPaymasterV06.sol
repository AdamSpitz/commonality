// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {CreatorGasTank} from "./CreatorGasTank.sol";
import {IPaymasterV06} from "./IPaymasterV06.sol";
import {UserOperationV06} from "./UserOperationV06.sol";
import {PaymasterV06Stake} from "./PaymasterV06Stake.sol";

/// @title CreatorGasTankPaymasterV06
/// @notice EntryPoint v0.6 adapter. Same vault as the v0.7 face.
contract CreatorGasTankPaymasterV06 is IPaymasterV06, PaymasterV06Stake {
  uint256 private constant PAYMASTER_V06_HEADER_LENGTH = 20;
  uint256 private constant ADDRESS_BYTES = 20;

  CreatorGasTank public immutable vault;

  error InvalidPaymasterDataLength(uint256 length);
  error InvalidVault();
  error NotFromEntryPoint();

  constructor(IEntryPoint entryPoint_, CreatorGasTank vault_) PaymasterV06Stake(entryPoint_) {
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
    return (vault.validateCreatorUserOp(_decodeProject(userOp.paymasterAndData), userOp.sender, userOp.callData, maxCost), 0);
  }

  function postOp(PostOpMode, bytes calldata context, uint256 actualGasCost) external override {
    if (msg.sender != address(entryPoint)) revert NotFromEntryPoint();
    vault.debitCreator(context, actualGasCost);
  }

  function _decodeProject(bytes calldata paymasterAndData) private pure returns (address project) {
    if (paymasterAndData.length != PAYMASTER_V06_HEADER_LENGTH + ADDRESS_BYTES) {
      revert InvalidPaymasterDataLength(paymasterAndData.length);
    }
    project = address(bytes20(paymasterAndData[PAYMASTER_V06_HEADER_LENGTH:PAYMASTER_V06_HEADER_LENGTH + ADDRESS_BYTES]));
  }
}
