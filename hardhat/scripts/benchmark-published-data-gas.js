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

async function deploy(name) {
  const Factory = await ethers.getContractFactory(name);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

async function measurePublish(contract, content) {
  const tx = await contract.publishData(content);
  const receipt = await tx.wait();
  const logDataBytes = receipt.logs.reduce((sum, log) => sum + (log.data.length - 2) / 2, 0);
  return { gasUsed: receipt.gasUsed, logDataBytes };
}

async function main() {
  console.log("PublishedData publishData gas benchmark");
  console.log("Network:", hre.network.name);
  console.log("Data id rule: bytes32 dataId = sha256(content)");
  console.log("Rows compare the production calldata+event implementation against a benchmark-only calldata-only variant.");
  console.log("Event-byte floor is the EVM LOG data charge only (8 gas/byte), before any L2 fee scalar/compression.\n");
  console.log("| Content bytes | calldata-only gas | calldata+event gas | event gas delta | extra log data bytes | event-byte floor |");
  console.log("| ---: | ---: | ---: | ---: | ---: | ---: |");

  for (const size of CONTENT_SIZES) {
    const content = makeContent(size);
    const calldataOnly = await deploy("PublishedDataCalldataOnly");
    const calldataAndEvent = await deploy("PublishedData");

    const calldataOnlyResult = await measurePublish(calldataOnly, content);
    const calldataAndEventResult = await measurePublish(calldataAndEvent, content);
    const premium = calldataAndEventResult.gasUsed - calldataOnlyResult.gasUsed;

    const extraLogDataBytes = calldataAndEventResult.logDataBytes - calldataOnlyResult.logDataBytes;
    const eventByteFloor = BigInt(extraLogDataBytes) * 8n;

    console.log(
      `| ${size} | ${calldataOnlyResult.gasUsed.toString()} | ${calldataAndEventResult.gasUsed.toString()} | ${formatDelta(premium, calldataOnlyResult.gasUsed)} | ${extraLogDataBytes} | ${eventByteFloor.toString()} |`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
