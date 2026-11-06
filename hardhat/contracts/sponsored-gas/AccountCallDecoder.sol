// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/**
 * @title AccountCallDecoder
 * @notice Shared decode of wallet execute calldata for gas-tank paymasters.
 * @dev SimpleAccount execute / executeBatch, Coinbase Smart Wallet executeBatch(tuple[]),
 *      and Kernel v3 ERC-7579 execute(bytes32,bytes). Policy (allowed targets/selectors)
 *      stays in each tank so v0.6 and v0.7 faces can share this without sharing EntryPoint ABI.
 */
library AccountCallDecoder {
  uint256 private constant ADDRESS_BYTES = 20;
  bytes4 private constant SIMPLE_ACCOUNT_EXECUTE_SELECTOR =
    bytes4(keccak256("execute(address,uint256,bytes)"));
  bytes4 private constant SIMPLE_ACCOUNT_EXECUTE_BATCH_SELECTOR =
    bytes4(keccak256("executeBatch(address[],uint256[],bytes[])"));
  bytes4 private constant COINBASE_SMART_WALLET_EXECUTE_BATCH_SELECTOR =
    bytes4(keccak256("executeBatch((address,uint256,bytes)[])"));
  bytes4 private constant KERNEL_V3_EXECUTE_SELECTOR =
    bytes4(keccak256("execute(bytes32,bytes)"));
  bytes1 private constant ERC7579_CALLTYPE_SINGLE = 0x00;
  bytes1 private constant ERC7579_CALLTYPE_BATCH = 0x01;
  uint256 private constant ERC7579_SINGLE_HEADER_LENGTH = 52;

  struct Execution {
    address target;
    uint256 value;
    bytes callData;
  }

  error UnsupportedAccountCall(bytes4 selector);
  error UnsupportedCallType(bytes1 callType);
  error InvalidExecutionCalldataLength(uint256 length);
  error InvalidAccountCallDataLength(uint256 length);
  error InvalidBatchLengths();

  function decodeExecutions(bytes calldata accountCallData) internal pure returns (Execution[] memory executions) {
    if (accountCallData.length < 4) revert InvalidAccountCallDataLength(accountCallData.length);
    bytes4 accountSelector = bytes4(accountCallData[:4]);

    if (accountSelector == SIMPLE_ACCOUNT_EXECUTE_SELECTOR) {
      (address target, uint256 value, bytes memory innerCallData) = abi.decode(
        accountCallData[4:],
        (address, uint256, bytes)
      );
      executions = new Execution[](1);
      executions[0] = Execution(target, value, innerCallData);
      return executions;
    }

    if (accountSelector == SIMPLE_ACCOUNT_EXECUTE_BATCH_SELECTOR) {
      (address[] memory targets, uint256[] memory values, bytes[] memory calls) = abi.decode(
        accountCallData[4:],
        (address[], uint256[], bytes[])
      );
      if (targets.length != calls.length || (values.length != 0 && values.length != calls.length)) {
        revert InvalidBatchLengths();
      }
      executions = new Execution[](targets.length);
      for (uint256 i = 0; i < targets.length; i++) {
        uint256 value = values.length == 0 ? 0 : values[i];
        executions[i] = Execution(targets[i], value, calls[i]);
      }
      return executions;
    }

    if (accountSelector == COINBASE_SMART_WALLET_EXECUTE_BATCH_SELECTOR) {
      return abi.decode(accountCallData[4:], (Execution[]));
    }

    if (accountSelector == KERNEL_V3_EXECUTE_SELECTOR) {
      (bytes32 mode, bytes memory executionCalldata) = abi.decode(accountCallData[4:], (bytes32, bytes));
      bytes1 callType = bytes1(mode);

      if (callType == ERC7579_CALLTYPE_SINGLE) {
        (address target, uint256 value, bytes memory innerCallData) = decodeErc7579Single(executionCalldata);
        executions = new Execution[](1);
        executions[0] = Execution(target, value, innerCallData);
        return executions;
      }

      if (callType == ERC7579_CALLTYPE_BATCH) {
        return abi.decode(executionCalldata, (Execution[]));
      }

      revert UnsupportedCallType(callType);
    }

    revert UnsupportedAccountCall(accountSelector);
  }

  function decodeErc7579Single(bytes memory executionCalldata)
    internal
    pure
    returns (address target, uint256 value, bytes memory innerCallData)
  {
    if (executionCalldata.length < ERC7579_SINGLE_HEADER_LENGTH) {
      revert InvalidExecutionCalldataLength(executionCalldata.length);
    }
    uint256 innerLength = executionCalldata.length - ERC7579_SINGLE_HEADER_LENGTH;
    innerCallData = new bytes(innerLength);
    assembly {
      let dataPtr := add(executionCalldata, 32)
      target := shr(96, mload(dataPtr))
      value := mload(add(dataPtr, ADDRESS_BYTES))
      let src := add(dataPtr, ERC7579_SINGLE_HEADER_LENGTH)
      let dst := add(innerCallData, 32)
      for { let i := 0 } lt(i, innerLength) { i := add(i, 32) } {
        mstore(add(dst, i), mload(add(src, i)))
      }
    }
  }
}
