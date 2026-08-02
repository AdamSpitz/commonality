/**
 * Recover PublishedData content bytes from transaction calldata, through every wrapper shape
 * Commonality's publication routes can produce, and associate each recovered call with the
 * `DataPublished(publisher, dataId)` log it caused.
 *
 * This is the candidate implementation for the pointer-only design in
 * specs/tech/indexer/the-graph.md. It is deliberately dependency-light (viem only) so it can move
 * into the SDK unchanged.
 */

import { decodeAbiParameters, decodeFunctionData, getAddress, sha256, size, slice, toBytes } from 'viem'

export const PUBLISH_DATA_SELECTOR = '0x8a82e7b6' // publishData(bytes) — asserted against the real ABI by the fixture runner
const KERNEL_EXECUTE_SELECTOR = '0xe9ae5c53' // execute(bytes32,bytes)
const HANDLE_OPS_SELECTOR = '0x765e827f' // handleOps((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes)[],address)
const AGGREGATE3_SELECTOR = '0x82ad56cb' // aggregate3((address,bool,bytes)[])

const ERC7579_CALL_TYPE_SINGLE = 0x00
const ERC7579_CALL_TYPE_BATCH = 0x01

const publishDataAbi = [{
  type: 'function',
  name: 'publishData',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'content', type: 'bytes' }],
  outputs: [{ name: 'dataId', type: 'bytes32' }],
}]

const kernelExecuteAbi = [{
  type: 'function',
  name: 'execute',
  stateMutability: 'payable',
  inputs: [{ name: 'execMode', type: 'bytes32' }, { name: 'executionCalldata', type: 'bytes' }],
  outputs: [],
}]

const executionTupleArray = [{
  type: 'tuple[]',
  components: [
    { name: 'target', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'callData', type: 'bytes' },
  ],
}]

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
}]

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
}]

function selectorOf(data) {
  return data && data.length >= 10 ? data.slice(0, 10).toLowerCase() : null
}

/**
 * Walk a transaction's calldata and return every `publishData(bytes)` call it contains.
 *
 * @param {{ from: string, to: string | null, input: string }} tx
 * @param {string} publishedDataAddress the PublishedData deployment to attribute leaves to
 * @returns {{ leaves: Array, unexplored: Array }} leaves carry the recovered content and the
 *   address that will appear as `publisher`. `unexplored` is a diagnostic listing calls the walker
 *   did not descend into; it is not a failure signal, because the caller already knows the exact
 *   set of logs it needs to satisfy. It exists so that a log which *cannot* be recovered comes with
 *   a pointer to the call shape that would have to be taught to the walker.
 */
export function extractPublications(tx, publishedDataAddress) {
  const target = publishedDataAddress.toLowerCase()
  const leaves = []
  const unexplored = []

  // caller is whatever will be msg.sender for `data`; to is the address being called.
  const walk = ({ caller, to, data, path, depth }) => {
    if (depth > 8) {
      unexplored.push({ path, reason: 'nesting depth limit exceeded' })
      return
    }
    const selector = selectorOf(data)
    if (!selector || !to) return

    if (to.toLowerCase() === target) {
      if (selector !== PUBLISH_DATA_SELECTOR) return // e.g. retractData; not a content carrier
      const [content] = decodeFunctionData({ abi: publishDataAbi, data }).args
      leaves.push({
        path,
        publisher: getAddress(caller),
        content,
        dataId: sha256(content),
        bytes: size(content),
      })
      return
    }

    switch (selector) {
      case KERNEL_EXECUTE_SELECTOR: {
        const [execMode, executionCalldata] = decodeFunctionData({ abi: kernelExecuteAbi, data }).args
        const callType = Number(slice(execMode, 0, 1))
        // The account itself is the caller of everything it executes.
        if (callType === ERC7579_CALL_TYPE_SINGLE) {
          if (size(executionCalldata) < 52) {
            unexplored.push({ path, reason: 'kernel single execution calldata too short' })
            return
          }
          walk({
            caller: to,
            to: getAddress(slice(executionCalldata, 0, 20)),
            data: `0x${executionCalldata.slice(2 + 52 * 2)}`,
            path: `${path}.execute[single]`,
            depth: depth + 1,
          })
          return
        }
        if (callType === ERC7579_CALL_TYPE_BATCH) {
          const [executions] = decodeAbiParameters(executionTupleArray, executionCalldata)
          executions.forEach((execution, index) => walk({
            caller: to,
            to: execution.target,
            data: execution.callData,
            path: `${path}.execute[batch][${index}]`,
            depth: depth + 1,
          }))
          return
        }
        unexplored.push({ path, reason: `unsupported ERC-7579 call type 0x${callType.toString(16)}` })
        return
      }

      case HANDLE_OPS_SELECTOR: {
        const [ops] = decodeFunctionData({ abi: handleOpsAbi, data }).args
        // The EntryPoint calls each op's own sender, so each op re-roots the caller chain.
        ops.forEach((op, index) => walk({
          caller: op.sender,
          to: op.sender,
          data: op.callData,
          path: `${path}.handleOps[${index}]`,
          depth: depth + 1,
        }))
        return
      }

      case AGGREGATE3_SELECTOR: {
        const [calls] = decodeFunctionData({ abi: aggregate3Abi, data }).args
        calls.forEach((call, index) => walk({
          caller: to,
          to: call.target,
          data: call.callData,
          path: `${path}.aggregate3[${index}]`,
          depth: depth + 1,
        }))
        return
      }

      default:
        // Not a wrapper we know. Only worth reporting if it could plausibly hide a publication.
        unexplored.push({ path, to, selector, reason: 'unrecognised call shape' })
    }
  }

  walk({ caller: tx.from, to: tx.to, data: tx.input, path: 'tx', depth: 0 })
  return { leaves, unexplored }
}

/**
 * Associate `DataPublished` logs with the recovered calls that produced them.
 *
 * The association is by content, not by position. The key is the log's full `(publisher, dataId)`
 * pair, both of which are indexed topics:
 *
 *  - `dataId` *is* `sha256(content)`, so any leaf whose content hashes to it holds, by definition,
 *    the right bytes. This is what makes the association safe without tracking call order.
 *  - `publisher` is needed as well. Hash alone is not sufficient: one transaction can carry
 *    publications of byte-identical content by two different accounts (a bundled UserOperation
 *    batch), and those produce distinct logs that hash-only matching cannot tell apart.
 *
 * Any leaves still tied after both topics are applied are necessarily byte-identical, so which one
 * is chosen cannot change the recovered content.
 *
 * @param {Array<{ publisher: string, dataId: string }>} logs
 * @param {Array} leaves output of extractPublications
 */
export function associate(logs, leaves) {
  return logs.map((log) => {
    const byHash = leaves.filter((leaf) => leaf.dataId.toLowerCase() === log.dataId.toLowerCase())
    const matches = byHash.filter((leaf) => leaf.publisher.toLowerCase() === log.publisher.toLowerCase())
    const identical = matches.every((leaf) => leaf.content === matches[0]?.content)
    return {
      log,
      recovered: matches.length > 0,
      candidates: matches.length,
      // True when the two topics together picked out exactly one call.
      resolvedToSingleCall: matches.length === 1,
      // True when the remaining tie is between byte-identical calls, so the choice cannot matter.
      residualTieIsHarmless: matches.length > 1 && identical,
      // Diagnostic: would matching on the content hash alone have been ambiguous here?
      hashAloneWouldBeAmbiguous: byHash.length > matches.length,
      content: matches[0]?.content ?? null,
      bytes: matches[0] ? toBytes(matches[0].content).length : 0,
      path: matches[0]?.path ?? null,
    }
  })
}
