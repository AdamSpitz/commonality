import assert from 'node:assert/strict';
import { encodeFunctionData, encodePacked, padHex, type Hex } from 'viem';
import { handleSponsoredGasPaymasterRpc, inferSponsoredProject } from './sponsoredGasPaymaster.js';

const project = '0x1111111111111111111111111111111111111111';
const gasTank = '0x2222222222222222222222222222222222222222';
const buyer = '0x3333333333333333333333333333333333333333';

function kernelExecute(target: Hex, innerCallData: Hex): Hex {
  const executionCalldata = encodePacked(
    ['address', 'uint256', 'bytes'],
    [target, 0n, innerCallData],
  );
  return encodeFunctionData({
    abi: [{ type: 'function', name: 'execute', inputs: [{ type: 'bytes32', name: 'execMode' }, { type: 'bytes', name: 'executionCalldata' }], outputs: [], stateMutability: 'payable' }],
    functionName: 'execute',
    args: [padHex('0x', { size: 32 }), executionCalldata],
  });
}

describe('sponsored gas paymaster RPC', () => {
  it('infers the sponsored project from a Kernel v3 project call', () => {
    const buyCall = '0x2eb2c2d60000000000000000000000003333333333333333333333333333333333333333' as Hex;
    assert.equal(inferSponsoredProject(kernelExecute(project, buyCall)), project);
  });

  it('infers the sponsored project from an ERC-20 approval spender', () => {
    const token = '0x4444444444444444444444444444444444444444';
    const approveCall = encodeFunctionData({
      abi: [{ type: 'function', name: 'approve', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' }],
      functionName: 'approve',
      args: [project, 1_000_000n],
    });
    assert.equal(inferSponsoredProject(kernelExecute(token, approveCall)), project);
  });

  it('returns ERC-7677 paymaster fields with the project address as paymasterData', () => {
    const result = handleSponsoredGasPaymasterRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_getPaymasterData',
      params: [{ sender: buyer, callData: kernelExecute(project, '0x12345678') }, '0x0000000071727De22E5E9d8BAf0edAc6f37da032', '0x14a34'],
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
