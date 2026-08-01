import { strict as assert } from 'assert';
import { concat, encodeAbiParameters, encodeFunctionData, getAddress, pad, toBytes, toHex, type Address, type Hex } from 'viem';
import { createCalldataContentResolver } from './calldata-resolver.js';
import { ContentUnavailableError, resolvePublishedContent } from './content-resolver.js';
import { extractPublications, PUBLISH_DATA_SELECTOR } from './calldata.js';
import { dataIdOf } from './test-support.js';

const publishedData = getAddress('0x0000000000000000000000000000000000000c0d');
const eoa = getAddress('0x00000000000000000000000000000000000000a1');
const accountA = getAddress('0x00000000000000000000000000000000000000aa');
const accountB = getAddress('0x00000000000000000000000000000000000000bb');
const entryPoint = getAddress('0x0000000000000000000000000000000000000e77');
const beliefs = getAddress('0x00000000000000000000000000000000000000be');
const txHash = `0x${'ab'.repeat(32)}` as const;

const EXEC_MODE_SINGLE = pad('0x00', { size: 32 });
const EXEC_MODE_BATCH = concat(['0x01', pad('0x00', { size: 31 })]);

function publishCall(content: Uint8Array): Hex {
  return encodeFunctionData({
    abi: [{
      type: 'function',
      name: 'publishData',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'content', type: 'bytes' }],
      outputs: [{ name: 'dataId', type: 'bytes32' }],
    }],
    functionName: 'publishData',
    args: [toHex(content)],
  });
}

/** Kernel v3 `execute` with a single packed execution: target ++ value ++ callData. */
function kernelExecuteSingle(target: Address, callData: Hex): Hex {
  return encodeFunctionData({
    abi: kernelExecuteAbi,
    functionName: 'execute',
    args: [EXEC_MODE_SINGLE, concat([target, pad('0x00', { size: 32 }), callData])],
  });
}

function kernelExecuteBatch(calls: { target: Address; callData: Hex }[]): Hex {
  return encodeFunctionData({
    abi: kernelExecuteAbi,
    functionName: 'execute',
    args: [EXEC_MODE_BATCH, encodeAbiParameters(
      [{
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'callData', type: 'bytes' },
        ],
      }],
      [calls.map((call) => ({ target: call.target, value: 0n, callData: call.callData }))],
    )],
  });
}

const kernelExecuteAbi = [{
  type: 'function',
  name: 'execute',
  stateMutability: 'payable',
  inputs: [{ name: 'execMode', type: 'bytes32' }, { name: 'executionCalldata', type: 'bytes' }],
  outputs: [],
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

function handleOps(ops: { sender: Address; callData: Hex }[]): Hex {
  return encodeFunctionData({
    abi: handleOpsAbi,
    functionName: 'handleOps',
    args: [
      ops.map((op) => ({
        sender: op.sender,
        nonce: 0n,
        initCode: '0x' as Hex,
        callData: op.callData,
        accountGasLimits: pad('0x00', { size: 32 }),
        preVerificationGas: 0n,
        gasFees: pad('0x00', { size: 32 }),
        paymasterAndData: '0x' as Hex,
        signature: '0x' as Hex,
      })),
      eoa,
    ],
  });
}

function tx(from: Address, to: Address, input: Hex) {
  return { from, to, input };
}

describe('publishData calldata recovery', () => {
  const content = toBytes('a statement worth recovering');

  it('agrees with the deployed publishData selector', () => {
    assert.equal(publishCall(content).slice(0, 10), PUBLISH_DATA_SELECTOR);
  });

  it('recovers a direct EOA publication', () => {
    const { publications } = extractPublications(tx(eoa, publishedData, publishCall(content)), publishedData);

    assert.equal(publications.length, 1);
    assert.equal(publications[0]?.publisher, eoa);
    assert.equal(publications[0]?.content, toHex(content));
  });

  it('descends through a smart-account single execution', () => {
    const input = kernelExecuteSingle(publishedData, publishCall(content));
    const { publications } = extractPublications(tx(eoa, accountA, input), publishedData);

    // The account, not the EOA that poked it, is msg.sender at PublishedData.
    assert.equal(publications.length, 1);
    assert.equal(publications[0]?.publisher, accountA);
    assert.equal(publications[0]?.content, toHex(content));
  });

  it('finds every publication in a batch, ignoring unrelated calls', () => {
    const second = toBytes('a second statement');
    const input = kernelExecuteBatch([
      { target: publishedData, callData: publishCall(content) },
      { target: beliefs, callData: '0xdeadbeef' },
      { target: publishedData, callData: publishCall(second) },
    ]);
    const { publications } = extractPublications(tx(eoa, accountA, input), publishedData);

    assert.deepEqual(publications.map((p) => p.content), [toHex(content), toHex(second)]);
    assert.ok(publications.every((p) => p.publisher === accountA));
  });

  it('re-roots the caller chain at each bundled UserOperation', () => {
    // The finding that makes (publisher, dataId) the required match key: one bundle carrying
    // byte-identical content from two different accounts. Matching on the hash alone would
    // attribute both to whichever account happened to come first.
    const input = handleOps([
      { sender: accountA, callData: kernelExecuteSingle(publishedData, publishCall(content)) },
      { sender: accountB, callData: kernelExecuteSingle(publishedData, publishCall(content)) },
    ]);
    const { publications } = extractPublications(tx(eoa, entryPoint, input), publishedData);

    assert.equal(publications.length, 2);
    assert.deepEqual(publications.map((p) => p.publisher), [accountA, accountB]);
    assert.ok(publications.every((p) => p.content === toHex(content)));
  });

  it('reports unrecognised wrappers as unexplored rather than failing silently', () => {
    const { publications, unexplored } = extractPublications(tx(eoa, beliefs, '0x12345678'), publishedData);

    assert.equal(publications.length, 0);
    assert.equal(unexplored.length, 1);
    assert.equal(unexplored[0]?.selector, '0x12345678');
  });

  it('ignores retractData, which carries no content', () => {
    const retract = `0xbfd4fdcd${'11'.repeat(32)}` as Hex; // retractData(bytes32)
    const { publications } = extractPublications(tx(eoa, publishedData, retract), publishedData);

    assert.equal(publications.length, 0);
  });
});

describe('calldata ContentResolver', () => {
  const content = toBytes('resolved from the transaction that published it');
  const dataId = dataIdOf(content);

  function resolverFor(input: Hex, from: Address = eoa, to: Address = publishedData) {
    return createCalldataContentResolver({
      publishedDataAddress: publishedData,
      getTransaction: async () => tx(from, to, input),
    });
  }

  it('returns the bytes named by the pointer', async () => {
    const resolver = resolverFor(publishCall(content));
    const bytes = await resolvePublishedContent(resolver, dataId, [{ publisher: eoa, dataId, transactionHash: txHash }]);

    assert.deepEqual(bytes, content);
  });

  it('picks the publication belonging to the pointer, not merely the first one', async () => {
    const other = toBytes('a different account published this in the same bundle');
    const input = handleOps([
      { sender: accountA, callData: kernelExecuteSingle(publishedData, publishCall(other)) },
      { sender: accountB, callData: kernelExecuteSingle(publishedData, publishCall(content)) },
    ]);
    const resolver = resolverFor(input, eoa, entryPoint);

    const bytes = await resolvePublishedContent(resolver, dataId, [{ publisher: accountB, dataId, transactionHash: txHash }]);
    assert.deepEqual(bytes, content);
  });

  it('distinguishes two publications by the same account in one transaction', async () => {
    const other = toBytes('same account, different content');
    const input = kernelExecuteBatch([
      { target: publishedData, callData: publishCall(other) },
      { target: publishedData, callData: publishCall(content) },
    ]);
    const resolver = resolverFor(input, eoa, accountA);

    const bytes = await resolvePublishedContent(resolver, dataId, [{ publisher: accountA, dataId, transactionHash: txHash }]);
    assert.deepEqual(bytes, content);
  });

  it('raises ContentUnavailableError when the transaction holds no matching publication', async () => {
    const resolver = resolverFor(publishCall(toBytes('unrelated content')));

    await assert.rejects(
      () => resolvePublishedContent(resolver, dataId, [{ publisher: eoa, dataId, transactionHash: txHash }]),
      (error: unknown) => error instanceof ContentUnavailableError,
    );
  });

  it('needs a transaction hash to have anything to work with', async () => {
    const resolver = resolverFor(publishCall(content));

    await assert.rejects(
      () => resolvePublishedContent(resolver, dataId, [{ publisher: eoa, dataId }]),
      (error: unknown) => error instanceof ContentUnavailableError,
    );
  });
});
