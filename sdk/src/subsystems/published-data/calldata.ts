/**
 * Recover PublishedData content bytes from transaction calldata.
 *
 * `PublishedData` announces publications as pointers only — `DataPublished(publisher, dataId)`
 * carries no content — so the bytes have to be read back out of the transaction that published
 * them. That transaction may wrap the `publishData(bytes)` call in a smart-account execution, a
 * batch, or a bundled UserOperation, so recovery means walking the calldata tree rather than
 * decoding a single top-level call.
 *
 * Ported unchanged in behavior from the spike that validated this against every publication route
 * (direct EOA, Kernel single/batch, EntryPoint `handleOps`, three levels of nesting, 48 KB
 * documents): spikes/the-graph-nested-calldata/README.md.
 */

import {
  decodeAbiParameters,
  decodeFunctionData,
  getAddress,
  size,
  slice,
  type Address,
  type Hex,
} from 'viem';

/** `publishData(bytes)`. Asserted against the real ABI by the hardhat fixture runner. */
export const PUBLISH_DATA_SELECTOR = '0x8a82e7b6';
const KERNEL_EXECUTE_SELECTOR = '0xe9ae5c53'; // execute(bytes32,bytes)
const HANDLE_OPS_SELECTOR = '0x765e827f'; // handleOps((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes)[],address)
const AGGREGATE3_SELECTOR = '0x82ad56cb'; // aggregate3((address,bool,bytes)[])

const ERC7579_CALL_TYPE_SINGLE = 0x00;
const ERC7579_CALL_TYPE_BATCH = 0x01;

/** Kernel packs a single execution as target(20) ++ value(32) ++ callData. */
const KERNEL_SINGLE_EXECUTION_HEADER_BYTES = 52;

/** Guards against a maliciously or accidentally deep calldata tree. */
const MAX_NESTING_DEPTH = 8;

const publishDataAbi = [{
  type: 'function',
  name: 'publishData',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'content', type: 'bytes' }],
  outputs: [{ name: 'dataId', type: 'bytes32' }],
}] as const;

const kernelExecuteAbi = [{
  type: 'function',
  name: 'execute',
  stateMutability: 'payable',
  inputs: [{ name: 'execMode', type: 'bytes32' }, { name: 'executionCalldata', type: 'bytes' }],
  outputs: [],
}] as const;

const executionTupleArray = [{
  name: 'executions',
  type: 'tuple[]',
  components: [
    { name: 'target', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'callData', type: 'bytes' },
  ],
}] as const;

const handleOpsAbi = [{
  type: 'function',
  name: 'handleOps',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'ops',
      type: 'tuple[]',
      components: [
        { name: 'sender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'initCode', type: 'bytes' },
        { name: 'callData', type: 'bytes' },
        { name: 'accountGasLimits', type: 'bytes32' },
        { name: 'preVerificationGas', type: 'uint256' },
        { name: 'gasFees', type: 'bytes32' },
        { name: 'paymasterAndData', type: 'bytes' },
        { name: 'signature', type: 'bytes' },
      ],
    },
    { name: 'beneficiary', type: 'address' },
  ],
  outputs: [],
}] as const;

const aggregate3Abi = [{
  type: 'function',
  name: 'aggregate3',
  stateMutability: 'payable',
  inputs: [{
    name: 'calls',
    type: 'tuple[]',
    components: [
      { name: 'target', type: 'address' },
      { name: 'allowFailure', type: 'bool' },
      { name: 'callData', type: 'bytes' },
    ],
  }],
  outputs: [],
}] as const;

/** The minimum a caller must supply for recovery; matches viem's `getTransaction` result. */
export interface PublicationTransaction {
  from: Address;
  to: Address | null;
  input: Hex;
}

/** A recovered `publishData` call: the content, and the address that will appear as publisher. */
export interface RecoveredPublication {
  /** Human-readable position in the calldata tree, e.g. `tx.handleOps[0].execute[batch][2]`. */
  path: string;
  /** Whatever will be `msg.sender` for this call, which is what `DataPublished` reports. */
  publisher: Address;
  content: Hex;
}

/** A call the walker could not descend into. Diagnostic only — see `extractPublications`. */
export interface UnexploredCall {
  path: string;
  to?: Address;
  selector?: string;
  reason: string;
}

export interface ExtractedPublications {
  publications: RecoveredPublication[];
  unexplored: UnexploredCall[];
}

function selectorOf(data: Hex | null | undefined): string | null {
  return data && data.length >= 10 ? data.slice(0, 10).toLowerCase() : null;
}

/**
 * Walk a transaction's calldata and return every `publishData(bytes)` call it contains.
 *
 * `unexplored` lists calls the walker did not descend into. It is a diagnostic, not a failure
 * signal: the caller already knows exactly which publication it is looking for, so a successful
 * match means nothing was missed. It exists so that an *unrecoverable* publication arrives with a
 * pointer to the call shape that would have to be taught to the walker.
 *
 * @param publishedDataAddress the PublishedData deployment whose calls should be treated as leaves
 */
export function extractPublications(
  tx: PublicationTransaction,
  publishedDataAddress: Address,
): ExtractedPublications {
  const target = publishedDataAddress.toLowerCase();
  const publications: RecoveredPublication[] = [];
  const unexplored: UnexploredCall[] = [];

  // `caller` is whatever will be msg.sender for `data`; `to` is the address being called.
  const walk = (
    { caller, to, data, path, depth }:
    { caller: Address; to: Address | null; data: Hex; path: string; depth: number },
  ): void => {
    if (depth > MAX_NESTING_DEPTH) {
      unexplored.push({ path, reason: 'nesting depth limit exceeded' });
      return;
    }
    const selector = selectorOf(data);
    if (!selector || !to) return;

    if (to.toLowerCase() === target) {
      if (selector !== PUBLISH_DATA_SELECTOR) return; // e.g. retractData; not a content carrier
      const [content] = decodeFunctionData({ abi: publishDataAbi, data }).args;
      publications.push({ path, publisher: getAddress(caller), content });
      return;
    }

    switch (selector) {
      case KERNEL_EXECUTE_SELECTOR: {
        const [execMode, executionCalldata] = decodeFunctionData({ abi: kernelExecuteAbi, data }).args;
        const callType = Number(slice(execMode, 0, 1));

        // The account itself is the caller of everything it executes.
        if (callType === ERC7579_CALL_TYPE_SINGLE) {
          if (size(executionCalldata) < KERNEL_SINGLE_EXECUTION_HEADER_BYTES) {
            unexplored.push({ path, reason: 'kernel single execution calldata too short' });
            return;
          }
          walk({
            caller: to,
            to: getAddress(slice(executionCalldata, 0, 20)),
            data: `0x${executionCalldata.slice(2 + KERNEL_SINGLE_EXECUTION_HEADER_BYTES * 2)}`,
            path: `${path}.execute[single]`,
            depth: depth + 1,
          });
          return;
        }

        if (callType === ERC7579_CALL_TYPE_BATCH) {
          const [executions] = decodeAbiParameters(executionTupleArray, executionCalldata);
          executions.forEach((execution, index) => walk({
            caller: to,
            to: execution.target,
            data: execution.callData,
            path: `${path}.execute[batch][${index}]`,
            depth: depth + 1,
          }));
          return;
        }

        unexplored.push({ path, reason: `unsupported ERC-7579 call type 0x${callType.toString(16)}` });
        return;
      }

      case HANDLE_OPS_SELECTOR: {
        const [ops] = decodeFunctionData({ abi: handleOpsAbi, data }).args;
        // The EntryPoint calls each op's own sender, so each op re-roots the caller chain.
        ops.forEach((op, index) => walk({
          caller: op.sender,
          to: op.sender,
          data: op.callData,
          path: `${path}.handleOps[${index}]`,
          depth: depth + 1,
        }));
        return;
      }

      case AGGREGATE3_SELECTOR: {
        const [calls] = decodeFunctionData({ abi: aggregate3Abi, data }).args;
        calls.forEach((call, index) => walk({
          caller: to,
          to: call.target,
          data: call.callData,
          path: `${path}.aggregate3[${index}]`,
          depth: depth + 1,
        }));
        return;
      }

      default:
        // Not a wrapper we know. Only worth reporting if it could plausibly hide a publication.
        unexplored.push({ path, to, selector, reason: 'unrecognised call shape' });
    }
  };

  walk({ caller: tx.from, to: tx.to, data: tx.input, path: 'tx', depth: 0 });
  return { publications, unexplored };
}
