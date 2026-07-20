import hre from "hardhat";

const { ethers } = hre;

const CONTENT_SIZES = [1024, 4096, 10 * 1024];

function makeContent(size) {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) bytes[i] = (i * 31 + 17) % 256;
  return bytes;
}

function formatDelta(delta, base) {
  const pct = base === 0n ? "n/a" : `${(Number(delta * 10000n / base) / 100).toFixed(2)}%`;
  return `${delta.toString()} (${pct})`;
}

function bigintFromRpc(value) {
  if (value == null) return null;
  return BigInt(value);
}

function formatNullable(value) {
  return value == null ? "n/a" : value.toString();
}

function logReceiptDetails(label, details) {
  const rawFeeFields = Object.fromEntries(
    Object.entries(details.rawReceipt)
      .filter(([key]) => /fee|gas|price/i.test(key))
      .sort(([a], [b]) => a.localeCompare(b)),
  );

  console.log(`\n${label}`);
  console.log("  tx:", details.hash);
  console.log("  receipt gasUsed:", details.gasUsed.toString());
  console.log("  effectiveGasPrice:", formatNullable(details.effectiveGasPrice));
  console.log("  receipt execution fee (gasUsed * effectiveGasPrice):", formatNullable(details.receiptExecutionFee));
  console.log("  OP-stack l1Fee:", formatNullable(details.l1Fee));
  console.log("  receipt total fee (execution + l1Fee):", formatNullable(details.receiptTotalFee));
  console.log("  sender balance delta:", details.senderBalanceDelta.toString());
  console.log("  log data bytes:", details.logDataBytes);
  console.log("  raw RPC fee/gas fields:", JSON.stringify(rawFeeFields, null, 2));
}

async function deploy(name) {
  const Factory = await ethers.getContractFactory(name);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

async function measurePublish(contract, content, signer) {
  const sender = await signer.getAddress();
  const balanceBefore = await ethers.provider.getBalance(sender);
  const tx = await contract.publishData(content);
  const receipt = await tx.wait();
  const balanceAfter = await ethers.provider.getBalance(sender);
  const rawReceipt = await ethers.provider.send("eth_getTransactionReceipt", [tx.hash]);
  const logDataBytes = receipt.logs.reduce((sum, log) => sum + (log.data.length - 2) / 2, 0);
  const effectiveGasPrice = receipt.gasPrice ?? bigintFromRpc(rawReceipt.effectiveGasPrice);
  const receiptExecutionFee = effectiveGasPrice == null ? null : receipt.gasUsed * effectiveGasPrice;
  const l1Fee = bigintFromRpc(rawReceipt.l1Fee);
  const receiptTotalFee = receiptExecutionFee == null ? null : receiptExecutionFee + (l1Fee ?? 0n);

  return {
    hash: tx.hash,
    gasUsed: receipt.gasUsed,
    effectiveGasPrice,
    l1Fee,
    receiptExecutionFee,
    receiptTotalFee,
    senderBalanceDelta: balanceBefore - balanceAfter,
    logDataBytes,
    rawReceipt,
  };
}

async function main() {
  console.log("PublishedData publishData gas benchmark");
  console.log("Network:", hre.network.name);
  console.log("Data id rule: bytes32 dataId = sha256(content)");
  console.log("Rows compare the production calldata+event implementation against a benchmark-only calldata-only variant.");
  console.log("Event-byte floor is the EVM LOG data charge only (8 gas/byte), before any L2 fee scalar/compression.\n");
  console.log("| Content bytes | calldata-only gas | calldata+event gas | event gas delta | calldata-only receipt fee wei | calldata+event receipt fee wei | receipt fee delta | extra log data bytes | event-byte floor |");
  console.log("| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");

  const [signer] = await ethers.getSigners();
  const printDetails = process.env.PUBLISHED_DATA_BENCHMARK_DETAILS === "1";

  for (const size of CONTENT_SIZES) {
    const content = makeContent(size);
    const calldataOnly = await deploy("PublishedDataCalldataOnly");
    const calldataAndEvent = await deploy("PublishedData");

    const calldataOnlyResult = await measurePublish(calldataOnly, content, signer);
    const calldataAndEventResult = await measurePublish(calldataAndEvent, content, signer);
    const premium = calldataAndEventResult.gasUsed - calldataOnlyResult.gasUsed;
    const receiptFeeDelta = calldataAndEventResult.receiptTotalFee == null || calldataOnlyResult.receiptTotalFee == null
      ? null
      : calldataAndEventResult.receiptTotalFee - calldataOnlyResult.receiptTotalFee;

    const extraLogDataBytes = calldataAndEventResult.logDataBytes - calldataOnlyResult.logDataBytes;
    const eventByteFloor = BigInt(extraLogDataBytes) * 8n;

    console.log(
      `| ${size} | ${calldataOnlyResult.gasUsed.toString()} | ${calldataAndEventResult.gasUsed.toString()} | ${formatDelta(premium, calldataOnlyResult.gasUsed)} | ${formatNullable(calldataOnlyResult.receiptTotalFee)} | ${formatNullable(calldataAndEventResult.receiptTotalFee)} | ${receiptFeeDelta == null ? "n/a" : formatDelta(receiptFeeDelta, calldataOnlyResult.receiptTotalFee ?? 0n)} | ${extraLogDataBytes} | ${eventByteFloor.toString()} |`,
    );

    if (printDetails) {
      logReceiptDetails(`${size} bytes calldata-only`, calldataOnlyResult);
      logReceiptDetails(`${size} bytes calldata+event`, calldataAndEventResult);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
