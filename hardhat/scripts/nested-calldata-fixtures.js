/**
 * Spike: generate a publication through every supported route, then prove that content bytes can
 * be recovered from transaction calldata alone and associated with the pointer-only
 * `DataPublished(publisher, dataId)` log.
 *
 * Run: npx hardhat run scripts/nested-calldata-fixtures.js --network hardhat
 * See spikes/the-graph-nested-calldata/README.md.
 */

import hre from "hardhat";
import { encodeAbiParameters, encodeFunctionData, encodePacked, toFunctionSelector } from "viem";
import { extractPublications, associate, PUBLISH_DATA_SELECTOR } from "../../spikes/the-graph-nested-calldata/recover.mjs";

const { ethers } = hre;

const EXEC_MODE_SINGLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const EXEC_MODE_BATCH = "0x0100000000000000000000000000000000000000000000000000000000000000";

const publishDataAbi = [{
  type: "function",
  name: "publishData",
  stateMutability: "nonpayable",
  inputs: [{ name: "content", type: "bytes" }],
  outputs: [{ name: "dataId", type: "bytes32" }],
}];

const setBeliefAbi = [{
  type: "function",
  name: "setBelief",
  stateMutability: "nonpayable",
  inputs: [{ name: "statementId", type: "bytes32" }, { name: "beliefState", type: "uint8" }],
  outputs: [],
}];

function document(label, size) {
  // Realistic shape: a JSON displayable document padded to the requested size.
  const filler = "x".repeat(Math.max(0, size - 64));
  const json = JSON.stringify({ format: "commonality/displayable-document@1", content: `${label} ${filler}` });
  return `0x${Buffer.from(json, "utf8").toString("hex")}`;
}

function publishCall(content) {
  return encodeFunctionData({ abi: publishDataAbi, functionName: "publishData", args: [content] });
}

const kernelExecuteAbi = [{
  type: "function",
  name: "execute",
  stateMutability: "payable",
  inputs: [{ type: "bytes32" }, { type: "bytes" }],
  outputs: [],
}];

/** ERC-7579 single execution: target and value packed ahead of the inner calldata. */
function kernelSingle(target, callData) {
  return encodeFunctionData({
    abi: kernelExecuteAbi,
    functionName: "execute",
    args: [EXEC_MODE_SINGLE, encodePacked(["address", "uint256", "bytes"], [target, 0n, callData])],
  });
}

/** ERC-7579 batch execution: an ABI-encoded array of (target, value, callData). */
function kernelBatch(calls) {
  const executionCalldata = encodeAbiParameters(
    [{
      type: "tuple[]",
      components: [
        { name: "target", type: "address" },
        { name: "value", type: "uint256" },
        { name: "callData", type: "bytes" },
      ],
    }],
    [calls.map(({ target, callData }) => ({ target, value: 0n, callData }))],
  );
  return encodeFunctionData({ abi: kernelExecuteAbi, functionName: "execute", args: [EXEC_MODE_BATCH, executionCalldata] });
}

function userOp(sender, callData) {
  return {
    sender,
    nonce: 0n,
    initCode: "0x",
    callData,
    accountGasLimits: "0x0000000000000000000000000000000000000000000000000000000000000000",
    preVerificationGas: 0n,
    gasFees: "0x0000000000000000000000000000000000000000000000000000000000000000",
    paymasterAndData: "0x",
    signature: "0x",
  };
}

/** The publication routes under test, each returning the transaction that exercises it. */
function buildRoutes(ctx) {
  const { deployer, otherEoa, publishedAddress, beliefsAddress, accountAAddress, accountBAddress, bundler, aggregator, shared, duplicate } = ctx;
  const routes = [
    {
      name: "1. direct EOA call",
      note: "the only route spike 1 covered",
      send: () => deployer.sendTransaction({ to: publishedAddress, data: publishCall(document("direct", 200)) }),
    },
    {
      name: "2. Kernel execute, single",
      note: "smart account, one publication",
      send: () => deployer.sendTransaction({
        to: accountAAddress,
        data: kernelSingle(publishedAddress, publishCall(document("kernel-single", 200))),
      }),
    },
    {
      name: "3. Kernel execute, batch of 3 publications",
      note: "multiple DataPublished logs in one transaction",
      send: () => deployer.sendTransaction({
        to: accountAAddress,
        data: kernelBatch([
          { target: publishedAddress, callData: publishCall(document("batch-a", 200)) },
          { target: publishedAddress, callData: publishCall(document("batch-b", 4096)) },
          { target: publishedAddress, callData: publishCall(document("batch-c", 200)) },
        ]),
      }),
    },
    {
      name: "4. Kernel batch, publication mixed with a non-publication call",
      note: "publish a statement and set a belief atomically",
      send: () => deployer.sendTransaction({
        to: accountAAddress,
        data: kernelBatch([
          { target: publishedAddress, callData: publishCall(document("mixed-batch", 200)) },
          {
            target: beliefsAddress,
            callData: encodeFunctionData({ abi: setBeliefAbi, functionName: "setBelief", args: [`0x${"11".repeat(32)}`, 1] }),
          },
        ]),
      }),
    },
    {
      name: "5. Kernel batch, same content published twice",
      note: "the residual-tie case: two logs share both publisher and dataId",
      send: () => deployer.sendTransaction({
        to: accountAAddress,
        data: kernelBatch([
          { target: publishedAddress, callData: publishCall(duplicate) },
          { target: publishedAddress, callData: publishCall(duplicate) },
        ]),
      }),
    },
    {
      name: "6. EntryPoint handleOps, one op",
      note: "full 4337 nesting: handleOps -> execute -> publishData",
      send: () => deployer.sendTransaction({
        to: bundler.target,
        data: encodeFunctionData({
          abi: bundlerAbi,
          functionName: "handleOps",
          args: [
            [userOp(accountAAddress, kernelSingle(publishedAddress, publishCall(document("handleops-single", 200))))],
            deployer.address,
          ],
        }),
      }),
    },
    {
      name: "7. EntryPoint handleOps, two ops from different accounts, same bytes",
      note: "publisher attribution must differ even though the content hash is identical",
      send: () => deployer.sendTransaction({
        to: bundler.target,
        data: encodeFunctionData({
          abi: bundlerAbi,
          functionName: "handleOps",
          args: [[
            userOp(accountAAddress, kernelSingle(publishedAddress, publishCall(shared))),
            userOp(accountBAddress, kernelBatch([
              { target: publishedAddress, callData: publishCall(shared) },
              { target: publishedAddress, callData: publishCall(document("second-account-extra", 200)) },
            ])),
          ], deployer.address],
        }),
      }),
    },
    {
      name: "8. Multicall3 aggregate3 (negative fixture)",
      note: "decodable, but the aggregator becomes the publisher",
      send: () => otherEoa.sendTransaction({
        to: aggregator.target,
        data: encodeFunctionData({
          abi: aggregatorAbi,
          functionName: "aggregate3",
          args: [[{ target: publishedAddress, allowFailure: false, callData: publishCall(document("aggregate3", 200)) }]],
        }),
      }),
    },
    {
      name: "9. large document, 48 KB, through a Kernel batch",
      note: "realistic statement-page payload",
      send: () => deployer.sendTransaction({
        to: accountAAddress,
        data: kernelBatch([{ target: publishedAddress, callData: publishCall(document("large", 48 * 1024)) }]),
      }),
    },
  ];
  return routes;
}

async function main() {
  const [deployer, otherEoa] = await ethers.getSigners();

  const computedSelector = toFunctionSelector("publishData(bytes)");
  if (computedSelector !== PUBLISH_DATA_SELECTOR) {
    throw new Error(`publishData selector mismatch: recover.mjs has ${PUBLISH_DATA_SELECTOR}, actual ${computedSelector}`);
  }

  const published = await (await ethers.getContractFactory("PublishedDataCalldataOnly")).deploy();
  const beliefs = await (await ethers.getContractFactory("Beliefs")).deploy();
  const accountA = await (await ethers.getContractFactory("FixtureKernelAccount")).deploy();
  const accountB = await (await ethers.getContractFactory("FixtureKernelAccount")).deploy();
  const bundler = await (await ethers.getContractFactory("FixtureBundler")).deploy();
  const aggregator = await (await ethers.getContractFactory("FixtureAggregator")).deploy();
  await Promise.all([published, beliefs, accountA, accountB, bundler, aggregator].map((c) => c.waitForDeployment()));

  const publishedAddress = await published.getAddress();
  const beliefsAddress = await beliefs.getAddress();
  const accountAAddress = await accountA.getAddress();
  const accountBAddress = await accountB.getAddress();

  const shared = document("shared-across-accounts", 200);
  const duplicate = document("published-twice-in-one-transaction", 200);

  const routes = buildRoutes({
    deployer, otherEoa, publishedAddress, beliefsAddress,
    accountAAddress, accountBAddress, bundler, aggregator, shared, duplicate,
  });

  const dataPublishedTopic = ethers.id("DataPublished(address,bytes32)");
  const results = [];

  for (const route of routes) {
    const receipt = await (await route.send()).wait();
    const tx = await ethers.provider.getTransaction(receipt.hash);

    const logs = receipt.logs
      .filter((log) => log.address.toLowerCase() === publishedAddress.toLowerCase() && log.topics[0] === dataPublishedTopic)
      .map((log) => ({
        publisher: ethers.getAddress(`0x${log.topics[1].slice(26)}`),
        dataId: log.topics[2],
        logIndex: log.index,
      }));

    const { leaves, unexplored } = extractPublications(
      { from: tx.from, to: tx.to, input: tx.data },
      publishedAddress,
    );
    const associations = associate(logs, leaves);

    // Independent check: the recovered bytes must hash to the dataId the log actually carries.
    const verified = associations.filter(
      (a) => a.content !== null && ethers.sha256(a.content).toLowerCase() === a.log.dataId.toLowerCase(),
    ).length;

    results.push({
      route: route.name,
      note: route.note,
      txCalldataBytes: (tx.data.length - 2) / 2,
      logs: logs.length,
      leavesFound: leaves.length,
      recovered: associations.filter((a) => a.recovered).length,
      hashVerified: verified,
      resolvedToSingleCall: associations.filter((a) => a.resolvedToSingleCall).length,
      residualTieIsHarmless: associations.filter((a) => a.residualTieIsHarmless).length,
      hashAloneWouldBeAmbiguous: associations.filter((a) => a.hashAloneWouldBeAmbiguous).length,
      unexplored,
      publishers: [...new Set(associations.map((a) => a.log.publisher))],
      paths: associations.map((a) => a.path),
      recoveredBytes: associations.reduce((sum, a) => sum + a.bytes, 0),
    });
  }

  console.log(JSON.stringify({
    publishedData: publishedAddress,
    accountA: accountAAddress,
    accountB: accountBAddress,
    aggregator: aggregator.target,
    results,
  }, null, 2));

  const totalLogs = results.reduce((sum, r) => sum + r.logs, 0);
  const totalRecovered = results.reduce((sum, r) => sum + r.recovered, 0);
  const totalVerified = results.reduce((sum, r) => sum + r.hashVerified, 0);
  const totalSingle = results.reduce((sum, r) => sum + r.resolvedToSingleCall, 0);
  const totalHarmless = results.reduce((sum, r) => sum + r.residualTieIsHarmless, 0);
  const hashOnlyFailures = results.filter((r) => r.hashAloneWouldBeAmbiguous > 0).map((r) => r.route);
  const totalBytes = results.reduce((sum, r) => sum + r.recoveredBytes, 0);

  console.log(`\nSUMMARY across ${results.length} routes:`);
  console.log(`  DataPublished logs:          ${totalLogs}`);
  console.log(`  Recovered from calldata:     ${totalRecovered}`);
  console.log(`  Hash-verified against topic: ${totalVerified}`);
  console.log(`  Resolved to a single call:   ${totalSingle}`);
  console.log(`  Residual ties, all harmless: ${totalHarmless}`);
  console.log(`  Content bytes recovered:     ${totalBytes}`);
  console.log(`  Routes where hash-only matching would have been ambiguous: ${hashOnlyFailures.length === 0 ? "none" : hashOnlyFailures.join("; ")}`);

  if (totalRecovered !== totalLogs) throw new Error("Some DataPublished logs could not be recovered from calldata.");
  if (totalVerified !== totalLogs) throw new Error("Some recovered content failed hash verification.");
  if (totalSingle + totalHarmless !== totalLogs) throw new Error("Some logs could not be resolved unambiguously.");
}

const bundlerAbi = [{
  type: "function",
  name: "handleOps",
  stateMutability: "nonpayable",
  inputs: [
    {
      name: "ops",
      type: "tuple[]",
      components: [
        { name: "sender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "initCode", type: "bytes" },
        { name: "callData", type: "bytes" },
        { name: "accountGasLimits", type: "bytes32" },
        { name: "preVerificationGas", type: "uint256" },
        { name: "gasFees", type: "bytes32" },
        { name: "paymasterAndData", type: "bytes" },
        { name: "signature", type: "bytes" },
      ],
    },
    { name: "beneficiary", type: "address" },
  ],
  outputs: [],
}];

const aggregatorAbi = [{
  type: "function",
  name: "aggregate3",
  stateMutability: "payable",
  inputs: [{
    name: "calls",
    type: "tuple[]",
    components: [
      { name: "target", type: "address" },
      { name: "allowFailure", type: "bool" },
      { name: "callData", type: "bytes" },
    ],
  }],
  outputs: [],
}];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
