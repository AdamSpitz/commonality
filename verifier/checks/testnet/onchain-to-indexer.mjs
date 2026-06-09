import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, fetchText, readEnvFile, readTestnetConfig, requireOptIn, rpcCall } from "./lib.mjs";

const ALIGNMENT_ATTESTATIONS_ABI = [{
  type: "function",
  name: "attestAlignment",
  stateMutability: "nonpayable",
  inputs: [
    { name: "subjectId", type: "bytes32" },
    { name: "statementId", type: "bytes32" },
    { name: "topicStatementId", type: "bytes32" }
  ],
  outputs: []
}];

const EVENT_NAME = "AlignmentAttestation";
const DEFAULT_WAIT_TIMEOUT_MS = 120000;
const DEFAULT_POLL_MS = 5000;
const VERIFIER_STATEMENT_ID = "0x0000000000000000000000000000000000000000000000000000000000000001";
const VERIFIER_TOPIC_ID = "0x0000000000000000000000000000000000000000000000000000000000000002";

async function loadViem() {
  try {
    const [viem, accounts] = await Promise.all([import("viem"), import("viem/accounts")]);
    return { ...viem, ...accounts };
  } catch (error) {
    throw new Error(`viem is required for the mutating on-chain check: ${error.message}`);
  }
}

function leftPadAddressTopic(address) {
  return `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
}

function eventCacheUrl(config, params) {
  const base = new URL("/api/events", config.eventCacheUrl ?? config.graphqlUrl.replace(/\/graphql\/?$/, ""));
  for (const [key, value] of Object.entries(params)) base.searchParams.set(key, String(value));
  return base.toString();
}

async function fetchIndexedEvent(config, { contractAddress, chainId, attester, subjectId, statementId }) {
  const probe = await fetchText(eventCacheUrl(config, {
    chainId,
    contractAddress,
    eventName: EVENT_NAME,
    topic1: leftPadAddressTopic(attester),
    topic2: subjectId,
    topic3: statementId,
    limit: 10
  }), { maxBodyChars: 8000 });
  if (!probe.ok) return { ok: false, probe, items: [] };
  try {
    const payload = JSON.parse(probe.body);
    return { ok: true, probe, items: Array.isArray(payload.items) ? payload.items : [] };
  } catch (error) {
    return { ok: false, probe, items: [], error: `Invalid event-cache JSON: ${error.message}` };
  }
}

async function waitForIndexer(config, expected) {
  const timeoutMs = Number(process.env.COMMONALITY_VERIFIER_TESTNET_INDEXER_WAIT_MS ?? DEFAULT_WAIT_TIMEOUT_MS);
  const pollMs = Number(process.env.COMMONALITY_VERIFIER_TESTNET_INDEXER_POLL_MS ?? DEFAULT_POLL_MS);
  const deadline = Date.now() + timeoutMs;
  const attempts = [];
  while (Date.now() <= deadline) {
    const probe = await fetchIndexedEvent(config, expected);
    attempts.push({ ok: probe.ok, itemCount: probe.items.length, status: probe.probe?.status, error: probe.error });
    const match = probe.items.find((item) => item.transactionHash?.toLowerCase() === expected.transactionHash.toLowerCase());
    if (match) return { ok: true, match, attempts };
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  return { ok: false, attempts };
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION !== "1") {
    return errorResult("Refusing to run on-chain-to-indexer journey without COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1.", {
      findings: { requiredEnv: ["COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION"], mutatesState: true }
    });
  }

  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv ?? "COMMONALITY_TESTNET_RPC_URL");
  const privateKey = envValue("COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY");
  const contractEnv = await readEnvFile(config.contractsEnvFile);
  const contractAddress = contractEnv.ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS is required in the configured testnet contracts env file.");

  const viem = await loadViem();
  const account = viem.privateKeyToAccount(privateKey);
  const chain = { id: Number(config.chainId), name: config.chainName ?? "testnet", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } };
  const publicClient = viem.createPublicClient({ chain, transport: viem.http(rpcUrl) });
  const walletClient = viem.createWalletClient({ account, chain, transport: viem.http(rpcUrl) });

  const chainProbe = await rpcCall(rpcUrl, "eth_chainId");
  const observedChainId = chainProbe.ok ? Number.parseInt(chainProbe.result, 16) : null;
  if (observedChainId !== Number(config.chainId)) {
    return fail(`Configured RPC chain id ${observedChainId} did not match expected ${config.chainId}; refusing mutation.`, { findings: { chainProbe } });
  }

  const subjectId = viem.keccak256(viem.toBytes(`commonality-verifier:${new Date().toISOString()}:${account.address}`));
  const hash = await walletClient.writeContract({ address: contractAddress, abi: ALIGNMENT_ATTESTATIONS_ABI, functionName: "attestAlignment", args: [subjectId, VERIFIER_STATEMENT_ID, VERIFIER_TOPIC_ID] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
  const indexed = await waitForIndexer(config, { contractAddress, chainId: config.chainId, attester: account.address, subjectId, statementId: VERIFIER_STATEMENT_ID, transactionHash: hash });
  const findings = { transactionHash: hash, receipt: { blockNumber: receipt.blockNumber?.toString(), status: receipt.status }, contractAddress, attester: account.address, subjectId, statementId: VERIFIER_STATEMENT_ID, topicStatementId: VERIFIER_TOPIC_ID, indexed };
  if (!indexed.ok) return fail("Verifier transaction was included, but the deployed event cache did not expose the AlignmentAttestation before timeout.", { findings });
  return pass("Verifier-funded AlignmentAttestation transaction was included and observed through the deployed indexer event cache.", { findings });
});
