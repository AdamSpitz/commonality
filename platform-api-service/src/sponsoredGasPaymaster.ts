import { concat, decodeAbiParameters, decodeFunctionData, getAddress, isAddress, slice, toFunctionSelector, type Address, type Hex } from 'viem';
import { HttpError } from './errors.js';

const KERNEL_V3_EXECUTE_SELECTOR = '0xe9ae5c53';
const SIMPLE_ACCOUNT_EXECUTE_SELECTOR = toFunctionSelector('execute(address,uint256,bytes)');
const SIMPLE_ACCOUNT_EXECUTE_BATCH_SELECTOR = toFunctionSelector('executeBatch(address[],uint256[],bytes[])');
const COINBASE_SMART_WALLET_EXECUTE_BATCH_SELECTOR = toFunctionSelector('executeBatch((address,uint256,bytes)[])');
const ERC7579_SINGLE_CALL_TYPE = 0;
const ERC7579_BATCH_CALL_TYPE = 1;
const ERC20_APPROVE_SELECTOR = '0x095ea7b3';
const ERC1155_SET_APPROVAL_FOR_ALL_SELECTOR = '0xa22cb465';
const BUY_ERC1155_SELECTOR = toFunctionSelector('buyERC1155(address,address,uint256[],uint256[],bytes)');
const REFUND_ERC1155_SELECTOR = toFunctionSelector('refundERC1155(address,address,uint256[],uint256[],bytes)');
const SET_BELIEF_SELECTOR = toFunctionSelector('setBelief(bytes32,uint8)');
const SET_BELIEFS_IN_BATCH_SELECTOR = toFunctionSelector('setBeliefsInBatch(bytes32[],uint8[])');
const BELIEVES = 1;
const PAYMASTER_VERIFICATION_GAS_LIMIT = 350_000n;
const PAYMASTER_POST_OP_GAS_LIMIT = 80_000n;
/** Canonical ERC-4337 EntryPoint v0.6 (Base / Base Sepolia). */
export const ENTRY_POINT_V06_ADDRESS = getAddress('0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789');

export interface SponsoredGasPaymasterConfig {
  creatorGasTankAddress?: Address;
  statementGasTankAddress?: Address;
  beliefsAddress?: Address;
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
    if (!config.creatorGasTankAddress && !config.statementGasTankAddress) {
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
    const sponsored = inferSponsoredCall(userOperation.callData, config);
    const entryPoint = parseEntryPoint(request.params?.[1]);
    if (entryPoint === ENTRY_POINT_V06_ADDRESS) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          paymasterAndData: concat([sponsored.paymaster, sponsored.paymasterData]),
        },
      };
    }
    return {
      jsonrpc: '2.0',
      id,
      result: {
        paymaster: sponsored.paymaster,
        paymasterData: sponsored.paymasterData,
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

export function inferSponsoredCall(accountCallData: Hex, config: SponsoredGasPaymasterConfig): { paymaster: Address; paymasterData: Hex } {
  const executions = listAccountExecutions(accountCallData);
  const beliefExecutions = executions.filter((execution) => isBeliefSelector(slice(execution.callData, 0, 4)));
  if (beliefExecutions.length > 0) {
    if (!config.statementGasTankAddress || !config.beliefsAddress) {
      throw new HttpError(503, 'statement_gas_not_configured', 'Statement gas tank is not configured.');
    }
    if (beliefExecutions.length !== executions.length) {
      throw new HttpError(400, 'mixed_sponsored_actions', 'A sponsored batch cannot mix statement signatures with other calls.');
    }
    const statementIds = beliefExecutions.flatMap((execution) => statementIdsOf(execution, config.beliefsAddress!));
    if (statementIds.length === 0) {
      throw new HttpError(400, 'missing_sponsored_belief', 'Sponsored belief calls must name at least one statement.');
    }
    return { paymaster: config.statementGasTankAddress, paymasterData: statementIds[0] };
  }
  if (!config.creatorGasTankAddress) {
    throw new HttpError(503, 'sponsored_gas_not_configured', 'Sponsored gas paymaster is not configured.');
  }
  return { paymaster: config.creatorGasTankAddress, paymasterData: inferExecutionsProject(executions) };
}

function listAccountExecutions(accountCallData: Hex): KernelExecution[] {
  const selector = slice(accountCallData, 0, 4);
  if (selector === SIMPLE_ACCOUNT_EXECUTE_SELECTOR) {
    const { args } = decodeFunctionData({
      abi: [{ type: 'function', name: 'execute', inputs: [{ type: 'address' }, { type: 'uint256' }, { type: 'bytes' }], outputs: [], stateMutability: 'payable' }],
      data: accountCallData,
    });
    const [target, value, callData] = args as [Address, bigint, Hex];
    return [{ target: getAddress(target), value, callData }];
  }
  if (selector === SIMPLE_ACCOUNT_EXECUTE_BATCH_SELECTOR) {
    const { args } = decodeFunctionData({
      abi: [{ type: 'function', name: 'executeBatch', inputs: [{ type: 'address[]' }, { type: 'uint256[]' }, { type: 'bytes[]' }], outputs: [], stateMutability: 'payable' }],
      data: accountCallData,
    });
    const [targets, values, calls] = args as [Address[], bigint[], Hex[]];
    if (targets.length !== calls.length || (values.length !== 0 && values.length !== calls.length)) {
      throw new HttpError(400, 'malformed_account_call', 'SimpleAccount executeBatch lengths do not match.');
    }
    if (targets.length === 0) {
      throw new HttpError(400, 'malformed_account_call', 'SimpleAccount executeBatch is empty.');
    }
    return targets.map((target, i) => ({
      target: getAddress(target),
      value: values.length === 0 ? 0n : values[i],
      callData: calls[i],
    }));
  }
  if (selector === COINBASE_SMART_WALLET_EXECUTE_BATCH_SELECTOR) {
    const { args } = decodeFunctionData({
      abi: [{
        type: 'function',
        name: 'executeBatch',
        inputs: [{
          type: 'tuple[]',
          components: [
            { name: 'target', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'data', type: 'bytes' },
          ],
        }],
        outputs: [],
        stateMutability: 'payable',
      }],
      data: accountCallData,
    });
    const [calls] = args as [{ target: Address; value: bigint; data: Hex }[]];
    if (calls.length === 0) {
      throw new HttpError(400, 'malformed_account_call', 'Coinbase executeBatch is empty.');
    }
    return calls.map((execution) => ({
      target: getAddress(execution.target),
      value: execution.value,
      callData: execution.data,
    }));
  }
  if (selector !== KERNEL_V3_EXECUTE_SELECTOR) {
    throw new HttpError(400, 'unsupported_account_call', 'Unsupported account execute calldata for sponsored gas.');
  }
  const { args } = decodeFunctionData({
    abi: [{ type: 'function', name: 'execute', inputs: [{ type: 'bytes32', name: 'execMode' }, { type: 'bytes', name: 'executionCalldata' }], outputs: [], stateMutability: 'payable' }],
    data: accountCallData,
  });
  const [execMode, executionCalldata] = args as [Hex, Hex];
  const callType = Number(slice(execMode, 0, 1));
  if (callType === ERC7579_SINGLE_CALL_TYPE) return [decodeSingleExecution(executionCalldata)];
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
    return executions.map((execution) => ({
      target: getAddress(execution.target),
      value: execution.value,
      callData: execution.callData,
    }));
  }
  throw new HttpError(400, 'unsupported_account_call', `Unsupported Kernel call type ${callType}.`);
}

function isBeliefSelector(selector: Hex): boolean {
  return selector === SET_BELIEF_SELECTOR || selector === SET_BELIEFS_IN_BATCH_SELECTOR;
}

function statementIdsOf(execution: KernelExecution, beliefsAddress: Address): Hex[] {
  if (execution.value !== 0n) {
    throw new HttpError(400, 'sponsored_call_value_not_allowed', 'Sponsored calls cannot transfer native value.');
  }
  if (getAddress(execution.target) !== getAddress(beliefsAddress)) {
    throw new HttpError(400, 'unsupported_sponsored_call', 'Sponsored belief calls must target the Beliefs contract.');
  }
  const selector = slice(execution.callData, 0, 4);
  const args = `0x${execution.callData.slice(10)}` as Hex;
  if (selector === SET_BELIEF_SELECTOR) {
    const [statementId, beliefState] = decodeAbiParameters([{ type: 'bytes32' }, { type: 'uint8' }], args);
    if (Number(beliefState) !== BELIEVES) {
      throw new HttpError(400, 'sponsored_belief_must_be_support', 'Sponsored belief calls must set believes.');
    }
    return [statementId];
  }
  const [statementIds, beliefStates] = decodeAbiParameters(
    [{ type: 'bytes32[]' }, { type: 'uint8[]' }],
    args,
  );
  if (statementIds.length === 0 || statementIds.length !== beliefStates.length) {
    throw new HttpError(400, 'malformed_belief_batch', 'Sponsored belief batch is empty or mismatched.');
  }
  if (beliefStates.some((state) => Number(state) !== BELIEVES)) {
    throw new HttpError(400, 'sponsored_belief_must_be_support', 'Sponsored belief calls must set believes.');
  }
  return [...statementIds];
}

export function inferSponsoredProject(accountCallData: Hex): Address {
  return inferExecutionsProject(listAccountExecutions(accountCallData));
}

function inferExecutionsProject(executions: KernelExecution[]): Address {
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

function parseEntryPoint(value: unknown): Address | undefined {
  if (typeof value !== 'string' || !isAddress(value)) return undefined;
  return getAddress(value);
}
