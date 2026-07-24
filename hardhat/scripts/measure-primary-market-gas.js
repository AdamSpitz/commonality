import fs from "fs";
import path from "path";
import hardhat from "hardhat";

const { ethers, network } = hardhat;

function repoRoot() {
  return path.resolve(import.meta.dirname, "..", "..");
}

function readEnvFile(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) return values;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    values[trimmed.slice(0, index)] = trimmed.slice(index + 1).replace(/^"|"$/g, "");
  }
  return values;
}

function parseArgs(argv) {
  const args = {
    networkName: network.name,
    execute: process.env.MEASURE_EXECUTE === "1",
    waitForRefund: process.env.MEASURE_NO_WAIT !== "1",
    deadlineDelaySeconds: BigInt(process.env.MEASURE_DEADLINE_DELAY_SECONDS || "45"),
    priceUnits: BigInt(process.env.MEASURE_PRICE_UNITS || "10000000"),
    thresholdUnits: BigInt(process.env.MEASURE_THRESHOLD_UNITS || "1000000000"),
  };
  for (const arg of argv) {
    if (arg === "--execute") args.execute = true;
    else if (arg === "--estimate-only") args.execute = false;
    else if (arg === "--no-wait") args.waitForRefund = false;
    else if (arg.startsWith("--deadline-delay=")) args.deadlineDelaySeconds = BigInt(arg.split("=")[1]);
    else if (arg.startsWith("--price-units=")) args.priceUnits = BigInt(arg.split("=")[1]);
    else if (arg.startsWith("--threshold-units=")) args.thresholdUnits = BigInt(arg.split("=")[1]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function findProjectCreated(receipt, projectFactory) {
  for (const log of receipt.logs) {
    try {
      const parsed = projectFactory.interface.parseLog(log);
      if (parsed?.name === "ProjectCreated") return parsed.args;
    } catch {
      // ignore logs from other contracts
    }
  }
  throw new Error("ProjectCreated event not found in project creation receipt");
}

async function waitUntilTimestamp(targetTimestamp) {
  while (true) {
    const block = await ethers.provider.getBlock("latest");
    if (BigInt(block.timestamp) >= targetTimestamp) return block.timestamp;
    const waitMs = Math.min(Number(targetTimestamp - BigInt(block.timestamp)) * 1000 + 1500, 15_000);
    console.log(`Waiting for refund eligibility: latest=${block.timestamp}, target=${targetTimestamp}...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const deployments = readEnvFile(path.join(repoRoot(), "deployments", `${args.networkName}.env`));
  const projectFactoryAddress = deployments.PROJECT_FACTORY_ADDRESS;
  const paymentTokenAddress = deployments.PAYMENT_TOKEN_ADDRESS;
  if (!projectFactoryAddress) throw new Error(`PROJECT_FACTORY_ADDRESS missing from deployments/${args.networkName}.env`);
  if (!paymentTokenAddress) throw new Error(`PAYMENT_TOKEN_ADDRESS missing from deployments/${args.networkName}.env`);

  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error(`No signer configured for Hardhat network ${args.networkName}`);
  const signerAddress = await signer.getAddress();
  const chain = await ethers.provider.getNetwork();
  console.log(`Network: ${args.networkName} chainId=${chain.chainId}`);
  console.log(`Signer: ${signerAddress}`);
  console.log(`ProjectFactory: ${projectFactoryAddress}`);
  console.log(`Payment token: ${paymentTokenAddress}`);
  console.log(`Mode: ${args.execute ? "execute real testnet transactions" : "estimate only"}`);

  const projectFactory = await ethers.getContractAt("ProjectFactory", projectFactoryAddress, signer);
  const paymentToken = await ethers.getContractAt("FreeERC20", paymentTokenAddress, signer);

  const tokenId = 1n;
  const tokenCount = 1n;
  const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
  const deadline = now + args.deadlineDelaySeconds;
  const createParams = [
    "ipfs://gas-measurement-token/{id}.json",
    "ipfs://gas-measurement-contract.json",
    signerAddress,
    signerAddress,
    paymentTokenAddress,
    args.thresholdUnits,
    deadline,
    "gas-measurement-project",
    [tokenId],
    [tokenCount],
    [args.priceUnits],
  ];

  const createGas = await projectFactory.createERC1155AndAssuranceContract.estimateGas(...createParams);
  console.log(`estimate create project gas: ${createGas}`);

  if (!args.execute) {
    console.log("Estimate-only mode stops before state-changing setup; pass --execute to measure approve/buy/refund receipts on testnet.");
    return;
  }

  console.log("Creating measurement project...");
  const createTx = await projectFactory.createERC1155AndAssuranceContract(...createParams);
  const createReceipt = await createTx.wait();
  const created = findProjectCreated(createReceipt, projectFactory);
  const tokenAddress = created.token;
  const assuranceAddress = created.assuranceContract;
  console.log(`actual create project gasUsed: ${createReceipt.gasUsed}`);
  console.log(`Created token=${tokenAddress} assuranceContract=${assuranceAddress} condition=${created.condition}`);

  const market = await ethers.getContractAt("MultiERC1155AssuranceContract", assuranceAddress, signer);

  const mintAmount = args.priceUnits * 2n;
  const mintGas = await paymentToken.mint.estimateGas(mintAmount);
  const mintTx = await paymentToken.mint(mintAmount);
  const mintReceipt = await mintTx.wait();
  console.log(`estimate payment-token mint gas: ${mintGas}`);
  console.log(`actual payment-token mint gasUsed: ${mintReceipt.gasUsed}`);

  const approveGas = await paymentToken.approve.estimateGas(assuranceAddress, args.priceUnits);
  const approveTx = await paymentToken.approve(assuranceAddress, args.priceUnits);
  const approveReceipt = await approveTx.wait();
  console.log(`estimate approve gas: ${approveGas}`);
  console.log(`actual approve gasUsed: ${approveReceipt.gasUsed}`);

  const buyArgs = [signerAddress, tokenAddress, [tokenId], [tokenCount], "0x"];
  const buyGas = await market.buyERC1155.estimateGas(...buyArgs);
  const buyTx = await market.buyERC1155(...buyArgs);
  const buyReceipt = await buyTx.wait();
  console.log(`estimate buyERC1155 gas: ${buyGas}`);
  console.log(`actual buyERC1155 gasUsed: ${buyReceipt.gasUsed}`);

  const erc1155 = await ethers.getContractAt("PremintingERC1155", tokenAddress, signer);
  const setApprovalForAllGas = await erc1155.setApprovalForAll.estimateGas(assuranceAddress, true);
  const setApprovalForAllTx = await erc1155.setApprovalForAll(assuranceAddress, true);
  const setApprovalForAllReceipt = await setApprovalForAllTx.wait();
  console.log(`estimate ERC1155 setApprovalForAll gas: ${setApprovalForAllGas}`);
  console.log(`actual ERC1155 setApprovalForAll gasUsed: ${setApprovalForAllReceipt.gasUsed}`);

  if (!args.waitForRefund) {
    console.log(`Skipping refund measurement. Refund becomes available after timestamp ${deadline}.`);
    return;
  }

  await waitUntilTimestamp(deadline);
  const refundArgs = [signerAddress, tokenAddress, [tokenId], [tokenCount], "0x"];
  const refundGas = await market.refundERC1155.estimateGas(...refundArgs);
  const refundTx = await market.refundERC1155(...refundArgs);
  const refundReceipt = await refundTx.wait();
  console.log(`estimate refundERC1155 gas: ${refundGas}`);
  console.log(`actual refundERC1155 gasUsed: ${refundReceipt.gasUsed}`);

  const summary = {
    network: args.networkName,
    chainId: chain.chainId.toString(),
    signer: signerAddress,
    projectFactory: projectFactoryAddress,
    paymentToken: paymentTokenAddress,
    created: {
      token: tokenAddress,
      assuranceContract: assuranceAddress,
      condition: created.condition,
      deadline: deadline.toString(),
      priceUnits: args.priceUnits.toString(),
      thresholdUnits: args.thresholdUnits.toString(),
    },
    gas: {
      createProject: createReceipt.gasUsed.toString(),
      paymentTokenMint: mintReceipt.gasUsed.toString(),
      approve: approveReceipt.gasUsed.toString(),
      buyERC1155: buyReceipt.gasUsed.toString(),
      erc1155SetApprovalForAll: setApprovalForAllReceipt.gasUsed.toString(),
      refundERC1155: refundReceipt.gasUsed.toString(),
    },
    txs: {
      createProject: createReceipt.hash,
      paymentTokenMint: mintReceipt.hash,
      approve: approveReceipt.hash,
      buyERC1155: buyReceipt.hash,
      erc1155SetApprovalForAll: setApprovalForAllReceipt.hash,
      refundERC1155: refundReceipt.hash,
    },
  };
  console.log("SUMMARY", JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
