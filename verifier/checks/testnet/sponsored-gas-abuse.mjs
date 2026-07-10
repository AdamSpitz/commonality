import { AbiCoder, id } from "ethers";
import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, readEnvFile, readTestnetConfig, requireOptIn, rpcCall } from "./lib.mjs";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const coder = AbiCoder.defaultAbiCoder();
const TANK_DEBITED_TOPIC = id("TankDebited(address,address,uint256)");
const TANK_FUNDED_TOPIC = id("TankFunded(address,address,uint256)");

function hexBlock(blockNumber) {
  return `0x${blockNumber.toString(16)}`;
}

function parsePositiveInteger(value, fallback, key) {
  const raw = value ?? String(fallback);
  if (!/^\d+$/.test(raw) || BigInt(raw) <= 0n) throw new Error(`${key} must be a positive integer`);
  return Number(raw);
}

function parseNonNegativeBigInt(value, fallback, key) {
  const raw = value ?? String(fallback);
  if (!/^\d+$/.test(raw)) throw new Error(`${key} must be a non-negative integer string`);
  return BigInt(raw);
}

function topicAddress(topic) {
  return `0x${topic.slice(-40)}`;
}

function decodeDebitLog(log) {
  return {
    blockNumber: Number.parseInt(log.blockNumber, 16),
    transactionHash: log.transactionHash,
    creator: topicAddress(log.topics[1]),
    wallet: topicAddress(log.topics[2]),
    amountWei: coder.decode(["uint256"], log.data)[0]
  };
}

function decodeFundedLog(log) {
  return {
    blockNumber: Number.parseInt(log.blockNumber, 16),
    transactionHash: log.transactionHash,
    funder: topicAddress(log.topics[1]),
    creator: topicAddress(log.topics[2]),
    amountWei: coder.decode(["uint256"], log.data)[0]
  };
}

function sumBy(rows, keyFn) {
  const totals = new Map();
  for (const row of rows) {
    const key = keyFn(row).toLowerCase();
    totals.set(key, (totals.get(key) ?? 0n) + row.amountWei);
  }
  return [...totals.entries()].map(([key, amountWei]) => ({ key, amountWei: amountWei.toString() }));
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }

  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv);
  const env = await readEnvFile(config.contractsEnvFile);
  const paymaster = env.CREATOR_GAS_TANK_ADDRESS;
  if (!paymaster) return pass("Sponsored-gas paymaster is not configured; no abuse surface to monitor yet.", { findings: { envFile: config.contractsEnvFile } });
  if (!ADDRESS_RE.test(paymaster)) return fail("Sponsored-gas abuse monitor cannot use malformed CREATOR_GAS_TANK_ADDRESS.", { findings: { paymaster } });

  const windowBlocks = parsePositiveInteger(process.env.SPONSORED_GAS_ABUSE_WINDOW_BLOCKS, 7200, "SPONSORED_GAS_ABUSE_WINDOW_BLOCKS");
  const maxDebitedWei = parseNonNegativeBigInt(process.env.SPONSORED_GAS_ABUSE_MAX_DEBITED_WEI, "100000000000000000", "SPONSORED_GAS_ABUSE_MAX_DEBITED_WEI");
  const maxDebitToFundingRatioBps = parsePositiveInteger(process.env.SPONSORED_GAS_ABUSE_MAX_DEBIT_TO_FUNDING_RATIO_BPS, 10000, "SPONSORED_GAS_ABUSE_MAX_DEBIT_TO_FUNDING_RATIO_BPS");
  const maxDebitsPerWallet = parsePositiveInteger(process.env.SPONSORED_GAS_ABUSE_MAX_DEBITS_PER_WALLET, 25, "SPONSORED_GAS_ABUSE_MAX_DEBITS_PER_WALLET");

  const blockNumberResult = await rpcCall(rpcUrl, "eth_blockNumber", []);
  if (!blockNumberResult.ok) throw new Error(`Unable to read latest block: ${blockNumberResult.error ?? blockNumberResult.probe?.body ?? "eth_blockNumber failed"}`);
  const latestBlock = Number.parseInt(blockNumberResult.result, 16);
  const fromBlock = Math.max(0, latestBlock - windowBlocks);

  const [debitLogsResult, fundingLogsResult] = await Promise.all([
    rpcCall(rpcUrl, "eth_getLogs", [{ address: paymaster, fromBlock: hexBlock(fromBlock), toBlock: "latest", topics: [TANK_DEBITED_TOPIC] }]),
    rpcCall(rpcUrl, "eth_getLogs", [{ address: paymaster, fromBlock: hexBlock(fromBlock), toBlock: "latest", topics: [TANK_FUNDED_TOPIC] }])
  ]);
  if (!debitLogsResult.ok) throw new Error(`Unable to read TankDebited logs: ${debitLogsResult.error ?? debitLogsResult.probe?.body ?? "eth_getLogs failed"}`);
  if (!fundingLogsResult.ok) throw new Error(`Unable to read TankFunded logs: ${fundingLogsResult.error ?? fundingLogsResult.probe?.body ?? "eth_getLogs failed"}`);

  const debits = debitLogsResult.result.map(decodeDebitLog);
  const fundings = fundingLogsResult.result.map(decodeFundedLog);
  const totalDebitedWei = debits.reduce((sum, row) => sum + row.amountWei, 0n);
  const totalFundedWei = fundings.reduce((sum, row) => sum + row.amountWei, 0n);
  const debitsByWallet = sumBy(debits, (row) => row.wallet);
  const debitsByCreator = sumBy(debits, (row) => row.creator);
  const noisyWallets = debitsByWallet.filter(({ key }) => debits.filter((row) => row.wallet.toLowerCase() === key).length > maxDebitsPerWallet)
    .map((row) => ({ ...row, debitCount: debits.filter((debit) => debit.wallet.toLowerCase() === row.key).length }));

  const findings = {
    paymaster,
    window: { fromBlock, latestBlock, windowBlocks },
    thresholds: {
      maxDebitedWei: maxDebitedWei.toString(),
      maxDebitToFundingRatioBps,
      maxDebitsPerWallet
    },
    totals: { debitCount: debits.length, fundingCount: fundings.length, totalDebitedWei: totalDebitedWei.toString(), totalFundedWei: totalFundedWei.toString() },
    debitsByCreator,
    debitsByWallet
  };

  const breaches = [];
  if (totalDebitedWei > maxDebitedWei) breaches.push({ kind: "total-debit", totalDebitedWei: totalDebitedWei.toString(), maxDebitedWei: maxDebitedWei.toString() });
  if (totalFundedWei > 0n && totalDebitedWei * 10000n > totalFundedWei * BigInt(maxDebitToFundingRatioBps)) {
    breaches.push({ kind: "debit-to-funding-ratio", totalDebitedWei: totalDebitedWei.toString(), totalFundedWei: totalFundedWei.toString(), maxDebitToFundingRatioBps });
  }
  if (noisyWallets.length > 0) breaches.push({ kind: "per-wallet-debit-count", noisyWallets });

  if (breaches.length > 0) return fail("Sponsored-gas abuse monitor found anomalous tank debit activity.", { findings: { ...findings, breaches } });
  return pass(`Sponsored-gas abuse monitor found ${debits.length} debits in the last ${latestBlock - fromBlock} blocks within thresholds.`, { findings });
});
