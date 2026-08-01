import assert from 'node:assert/strict';
import { encodeAbiParameters, encodeFunctionData, encodePacked, padHex, type Address, type Hex } from 'viem';
import { handleSponsoredGasPaymasterRpc, inferSponsoredProject } from './sponsoredGasPaymaster.js';

const project = '0x1111111111111111111111111111111111111111';
const otherProject = '0x5555555555555555555555555555555555555555';
const gasTank = '0x2222222222222222222222222222222222222222';
const buyer = '0x3333333333333333333333333333333333333333';
const token = '0x4444444444444444444444444444444444444444';

const kernelExecuteAbi = [{
  type: 'function',
  name: 'execute',
  inputs: [{ type: 'bytes32', name: 'execMode' }, { type: 'bytes', name: 'executionCalldata' }],
  outputs: [],
  stateMutability: 'payable',
}] as const;

function kernelExecute(target: Address, innerCallData: Hex): Hex {
  const executionCalldata = encodePacked(
    ['address', 'uint256', 'bytes'],
    [target, 0n, innerCallData],
  );
  return encodeFunctionData({
    abi: kernelExecuteAbi,
    functionName: 'execute',
    args: [padHex('0x', { size: 32 }), executionCalldata],
  });
}

function kernelExecuteBatch(executions: { target: Address; value?: bigint; callData: Hex }[]): Hex {
  const executionCalldata = encodeAbiParameters([{
    type: 'tuple[]',
    components: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'callData', type: 'bytes' },
    ],
  }], [executions.map(({ target, value = 0n, callData }) => ({ target, value, callData }))]);
  return encodeFunctionData({
    abi: kernelExecuteAbi,
    functionName: 'execute',
    args: [`0x01${'00'.repeat(31)}`, executionCalldata],
  });
}

function buyCall(): Hex {
  return encodeFunctionData({
    abi: [{
      type: 'function',
      name: 'buyERC1155',
      inputs: [
        { type: 'address', name: 'buyer' },
        { type: 'address', name: 'erc1155Addr' },
        { type: 'uint256[]', name: 'ids' },
        { type: 'uint256[]', name: 'counts' },
        { type: 'bytes', name: 'data' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    }],
    functionName: 'buyERC1155',
    args: [buyer, token, [1n], [1n], '0x'],
  });
}

function approveCall(spender: Address): Hex {
  return encodeFunctionData({
    abi: [{ type: 'function', name: 'approve', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' }],
    functionName: 'approve',
    args: [spender, 1_000_000n],
  });
}

function setApprovalForAllCall(operator: Address): Hex {
  return encodeFunctionData({
    abi: [{ type: 'function', name: 'setApprovalForAll', inputs: [{ type: 'address' }, { type: 'bool' }], outputs: [], stateMutability: 'nonpayable' }],
    functionName: 'setApprovalForAll',
    args: [operator, true],
  });
}

function refundCall(): Hex {
  return encodeFunctionData({
    abi: [{
      type: 'function',
      name: 'refundERC1155',
      inputs: [
        { type: 'address', name: 'holder' },
        { type: 'address', name: 'erc1155Addr' },
        { type: 'uint256[]', name: 'ids' },
        { type: 'uint256[]', name: 'counts' },
        { type: 'bytes', name: 'data' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    }],
    functionName: 'refundERC1155',
    args: [buyer, token, [1n], [1n], '0x'],
  });
}

describe('sponsored gas paymaster RPC', () => {
  it('infers the sponsored project from a Kernel v3 project call', () => {
    assert.equal(inferSponsoredProject(kernelExecute(project, buyCall())), project);
  });

  it('infers one project from an atomic approval and contribution batch', () => {
    assert.equal(inferSponsoredProject(kernelExecuteBatch([
      { target: token, callData: approveCall(project) },
      { target: project, callData: buyCall() },
    ])), project);
  });

  it('infers one project from an atomic ERC-1155 approval and refund batch', () => {
    assert.equal(inferSponsoredProject(kernelExecuteBatch([
      { target: token, callData: setApprovalForAllCall(project) },
      { target: project, callData: refundCall() },
    ])), project);
  });

  it('rejects approval-only and mixed-project batches that the onchain paymaster would reject', () => {
    assert.throws(
      () => inferSponsoredProject(kernelExecute(token, approveCall(project))),
      /Approval calls must be batched/,
    );
    assert.throws(
      () => inferSponsoredProject(kernelExecuteBatch([
        { target: token, callData: approveCall(otherProject) },
        { target: project, callData: buyCall() },
      ])),
      /same project/,
    );
  });

  it('returns ERC-7677 paymaster fields with the project address as paymasterData', () => {
    const result = handleSponsoredGasPaymasterRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_getPaymasterData',
      params: [{ sender: buyer, callData: kernelExecute(project, buyCall()) }, '0x0000000071727De22E5E9d8BAf0edAc6f37da032', '0x14a34'],
    }, { creatorGasTankAddress: gasTank });

    assert.deepEqual(result, {
      jsonrpc: '2.0',
      id: 1,
      result: {
        paymaster: gasTank,
        paymasterData: project,
        paymasterVerificationGasLimit: '0x55730',
        paymasterPostOpGasLimit: '0x13880',
      },
    });
  });
});
