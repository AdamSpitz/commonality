// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";

/**
 * @dev Fixture-only wrappers that reproduce the *calldata shapes* of the publication routes
 *      Commonality supports, so a calldata-recovery decoder can be tested against every one of
 *      them without standing up a bundler. They deliberately perform no validation, no signature
 *      checking and no gas accounting: only the ABI encoding of the nesting is under test.
 *      Do not deploy in production.
 *
 *      See spikes/the-graph-nested-calldata/README.md.
 */

/**
 * @dev Reproduces Kernel v3's ERC-7579 `execute(bytes32,bytes)` entry point, including the packed
 *      single-execution layout and the ABI-encoded batch layout. `publishData` therefore sees
 *      `msg.sender == address(this)`, exactly as it would with a real smart account.
 */
contract FixtureKernelAccount {
    error UnsupportedCallType(uint8 callType);
    error ExecutionFailed(uint256 index);

    uint8 private constant CALL_TYPE_SINGLE = 0x00;
    uint8 private constant CALL_TYPE_BATCH = 0x01;

    struct Execution {
        address target;
        uint256 value;
        bytes callData;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    function execute(bytes32 execMode, bytes calldata executionCalldata) external payable {
        uint8 callType = uint8(bytes1(execMode));

        if (callType == CALL_TYPE_SINGLE) {
            address target = address(bytes20(executionCalldata[0:20]));
            uint256 value = uint256(bytes32(executionCalldata[20:52]));
            _call(target, value, executionCalldata[52:], 0);
            return;
        }

        if (callType == CALL_TYPE_BATCH) {
            Execution[] memory executions = abi.decode(executionCalldata, (Execution[]));
            for (uint256 i = 0; i < executions.length; i++) {
                _call(executions[i].target, executions[i].value, executions[i].callData, i);
            }
            return;
        }

        revert UnsupportedCallType(callType);
    }

    function _call(address target, uint256 value, bytes memory callData, uint256 index) private {
        (bool success, ) = target.call{value: value}(callData);
        if (!success) revert ExecutionFailed(index);
    }
}

/**
 * @dev Reproduces the ERC-4337 v0.7 EntryPoint `handleOps` calldata shape, using the real
 *      `PackedUserOperation` struct so the ABI encoding matches byte for byte. Each op's
 *      `callData` is delivered to its own `sender`, which is what makes a bundle contain
 *      publications attributable to several different accounts in one transaction.
 */
contract FixtureBundler {
    error OpFailed(uint256 index);

    function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external {
        beneficiary; // unused; present so the signature matches the real EntryPoint
        for (uint256 i = 0; i < ops.length; i++) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, ) = ops[i].sender.call(ops[i].callData);
            if (!success) revert OpFailed(i);
        }
    }
}

/**
 * @dev Reproduces the Multicall3 `aggregate3` calldata shape. Included as a *negative* fixture:
 *      because the aggregator is the caller, `PublishedData` attributes the publication to the
 *      aggregator rather than to the user, so this route is unusable for publishing regardless of
 *      whether its calldata can be decoded.
 */
contract FixtureAggregator {
    error CallFailed(uint256 index);

    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    function aggregate3(Call3[] calldata calls) external payable {
        for (uint256 i = 0; i < calls.length; i++) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, ) = calls[i].target.call(calls[i].callData);
            if (!success && !calls[i].allowFailure) revert CallFailed(i);
        }
    }
}
