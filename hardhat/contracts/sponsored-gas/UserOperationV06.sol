// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/// @dev ERC-4337 EntryPoint v0.6 UserOperation (unpacked gas fields).
struct UserOperationV06 {
  address sender;
  uint256 nonce;
  bytes initCode;
  bytes callData;
  uint256 callGasLimit;
  uint256 verificationGasLimit;
  uint256 preVerificationGas;
  uint256 maxFeePerGas;
  uint256 maxPriorityFeePerGas;
  bytes paymasterAndData;
  bytes signature;
}
