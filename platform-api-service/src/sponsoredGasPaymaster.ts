import { decodeAbiParameters, decodeFunctionData, getAddress, isAddress, slice, toFunctionSelector, type Address, type Hex } from 'viem';
import { HttpError } from './errors.js';

const KERNEL_V3_EXECUTE_SELECTOR = '0xe9ae5c53';
const ERC7579_SINGLE_CALL_TYPE = 0;
const ERC7579_BATCH_CALL_TYPE = 1;
const ERC20_APPROVE_SELECTOR = '0x095ea7b3';
const ERC1155_SET_APPROVAL_FOR_ALL_SELECTOR = '0xa22cb465';
const BUY_ERC1155_SELECTOR = toFunctionSelector('buyERC1155(address,address,uint256[],uint256[],bytes)');
const REFUND_ERC1155_SELECTOR = toFunctionSelector('refundERC1155(address,address,uint256[],uint256[],bytes)');
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

  if (callType === ERC7579_SINGLE_CALL_TYPE) {
    const execution = decodeSingleExecution(executionCalldata);
    const inferred = inferExecutionProject(execution);
    if (!inferred.isPrimaryAction) {
      throw new HttpError(400, 'missing_sponsored_primary_action', 'Approval calls must be batched with a sponsored contribution or refund.');
    }
    return inferred.project;
  }

  if (callType === ERC7579_BATCH_CALL_TYPE) {
    const [executions] = decodeAbiParameters([{
      type: 'tuple[]',
      components: [
        { name: 'target', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'callData', type: 'bytes' },
      ],
    }], executionCalldata);
    if (executions.length === 0) {
      throw new HttpError(400, 'malformed_account_call', 'Kernel batch execution is empty.');
    }

    const inferred = executions.map(inferExecutionProject);
    const project = inferred[0].project;
    if (inferred.some((execution) => execution.project !== project)) {
      throw new HttpError(400, 'mixed_sponsored_projects', 'All calls in a sponsored batch must belong to the same project.');
    }
    if (!inferred.some((execution) => execution.isPrimaryAction)) {
      throw new HttpError(400, 'missing_sponsored_primary_action', 'Approval calls must be batched with a sponsored contribution or refund.');
    }
    return project;
  }

  throw new HttpError(400, 'unsupported_account_call', `Unsupported Kernel call type ${callType}.`);
}

interface KernelExecution {
  target: Address;
  value: bigint;
  callData: Hex;
}

function decodeSingleExecution(executionCalldata: Hex): KernelExecution {
  if (executionCalldata.length < 2 + 20 * 2 + 32 * 2 + 4 * 2) {
    throw new HttpError(400, 'malformed_account_call', 'Kernel executionCalldata is too short.');
  }
  return {
    target: getAddress(slice(executionCalldata, 0, 20)),
    value: BigInt(slice(executionCalldata, 20, 52)),
    callData: `0x${executionCalldata.slice(2 + 20 * 2 + 32 * 2)}` as Hex,
  };
}

function inferExecutionProject(execution: KernelExecution): { project: Address; isPrimaryAction: boolean } {
  if (execution.value !== 0n) {
    throw new HttpError(400, 'sponsored_call_value_not_allowed', 'Sponsored calls cannot transfer native value.');
  }

  const selector = slice(execution.callData, 0, 4);
  if (selector === BUY_ERC1155_SELECTOR || selector === REFUND_ERC1155_SELECTOR) {
    return { project: getAddress(execution.target), isPrimaryAction: true };
  }
  if (selector === ERC20_APPROVE_SELECTOR) {
    const [spender] = decodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], `0x${execution.callData.slice(10)}` as Hex);
    if (!isAddress(spender)) throw new HttpError(400, 'malformed_approve_call', 'Could not decode approve spender.');
    return { project: getAddress(spender), isPrimaryAction: false };
  }
  if (selector === ERC1155_SET_APPROVAL_FOR_ALL_SELECTOR) {
    const [operator, approved] = decodeAbiParameters([{ type: 'address' }, { type: 'bool' }], `0x${execution.callData.slice(10)}` as Hex);
    if (!isAddress(operator) || !approved) {
      throw new HttpError(400, 'malformed_approval_call', 'Sponsored ERC-1155 approval must enable the project as operator.');
    }
    return { project: getAddress(operator), isPrimaryAction: false };
  }
  throw new HttpError(400, 'unsupported_sponsored_call', `Unsupported sponsored call selector ${selector}.`);
}

function toQuantity(value: bigint): Hex {
  return `0x${value.toString(16)}` as Hex;
}
