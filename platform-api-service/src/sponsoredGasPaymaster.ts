import { decodeAbiParameters, decodeFunctionData, getAddress, isAddress, slice, type Address, type Hex } from 'viem';
import { HttpError } from './errors.js';

const KERNEL_V3_EXECUTE_SELECTOR = '0xe9ae5c53';
const ERC20_APPROVE_SELECTOR = '0x095ea7b3';
const PAYMASTER_VERIFICATION_GAS_LIMIT = 350_000n;
const PAYMASTER_POST_OP_GAS_LIMIT = 80_000n;

export interface SponsoredGasPaymasterConfig {
  creatorGasTankAddress?: Address;
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: unknown;
  method?: string;
  params?: unknown[];
}

export function handleSponsoredGasPaymasterRpc(body: unknown, config: SponsoredGasPaymasterConfig) {
  const request = body as JsonRpcRequest;
  const id = request?.id ?? null;
  try {
    if (!config.creatorGasTankAddress) {
      throw new HttpError(503, 'sponsored_gas_not_configured', 'Sponsored gas paymaster is not configured.');
    }
    if (request?.jsonrpc !== '2.0' || typeof request.method !== 'string') {
      throw new HttpError(400, 'invalid_json_rpc_request', 'Expected a JSON-RPC 2.0 request.');
    }
    if (request.method !== 'pm_getPaymasterStubData' && request.method !== 'pm_getPaymasterData') {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
    }

    const userOperation = request.params?.[0] as { callData?: Hex } | undefined;
    if (!userOperation || typeof userOperation.callData !== 'string') {
      throw new HttpError(400, 'invalid_user_operation', 'Missing UserOperation callData.');
    }
    const project = inferSponsoredProject(userOperation.callData);
    return {
      jsonrpc: '2.0',
      id,
      result: {
        paymaster: config.creatorGasTankAddress,
        paymasterData: project,
        paymasterVerificationGasLimit: toQuantity(PAYMASTER_VERIFICATION_GAS_LIMIT),
        paymasterPostOpGasLimit: toQuantity(PAYMASTER_POST_OP_GAS_LIMIT),
      },
    };
  } catch (error) {
    if (error instanceof HttpError) {
      return { jsonrpc: '2.0', id, error: { code: -32000, message: error.message, data: { error: error.code } } };
    }
    return { jsonrpc: '2.0', id, error: { code: -32000, message: error instanceof Error ? error.message : 'Invalid sponsored-gas request' } };
  }
}

export function inferSponsoredProject(accountCallData: Hex): Address {
  if (!accountCallData.startsWith(KERNEL_V3_EXECUTE_SELECTOR)) {
    throw new HttpError(400, 'unsupported_account_call', 'Only Kernel v3 execute(bytes32,bytes) sponsored-gas calls are supported.');
  }
  const { args } = decodeFunctionData({
    abi: [{ type: 'function', name: 'execute', inputs: [{ type: 'bytes32', name: 'execMode' }, { type: 'bytes', name: 'executionCalldata' }], outputs: [], stateMutability: 'payable' }],
    data: accountCallData,
  });
  const [execMode, executionCalldata] = args as [Hex, Hex];
  const callType = Number(slice(execMode, 0, 1));
  if (callType !== 0) {
    throw new HttpError(400, 'unsupported_account_call', 'Sponsored gas currently expects a single Kernel execution.');
  }
  if (executionCalldata.length < 2 + 20 * 2 + 32 * 2 + 4 * 2) {
    throw new HttpError(400, 'malformed_account_call', 'Kernel executionCalldata is too short.');
  }
  const target = getAddress(slice(executionCalldata, 0, 20));
  const innerCallData = `0x${executionCalldata.slice(2 + 20 * 2 + 32 * 2)}` as Hex;
  if (innerCallData.startsWith(ERC20_APPROVE_SELECTOR)) {
    const [spender] = decodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], `0x${innerCallData.slice(10)}` as Hex);
    if (!isAddress(spender)) throw new HttpError(400, 'malformed_approve_call', 'Could not decode approve spender.');
    return getAddress(spender);
  }
  return target;
}

function toQuantity(value: bigint): Hex {
  return `0x${value.toString(16)}` as Hex;
}
