import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, fetchText, readEnvFile, readTestnetConfig, requireOptIn, rpcCall } from "./lib.mjs";

const PUBLISHED_DATA_ABI = [{
  type: "function",
  name: "publishData",
  stateMutability: "nonpayable",
  inputs: [{ name: "content", type: "bytes" }],
  outputs: [{ name: "dataId", type: "bytes32" }]
}];

const DEFAULT_WAIT_TIMEOUT_MS = 120000;
const DEFAULT_POLL_MS = 5000;

async function loadViem() {
  try {
    const [viem, accounts] = await Promise.all([import("viem"), import("viem/accounts")]);
    return { ...viem, ...accounts };
  } catch (error) {
    throw new Error(`viem is required for the mutating PublishedData check: ${error.message}`);
  }
}

function publishedDataUrl(config, { dataId, chainId, contractAddress }) {
  const url = new URL(`/api/published-data/${dataId}`, config.eventCacheUrl ?? config.graphqlUrl.replace(/\/graphql\/?$/, ""));
  url.searchParams.set("chainId", String(chainId));
  url.searchParams.set("contractAddress", contractAddress);
  return url.toString();
}

async function fetchPublication(config, expected) {
  const probe = await fetchText(publishedDataUrl(config, expected), { maxBodyChars: 12000 });
  if (!probe.ok) return { ok: false, probe, payload: null };
  try {
    return { ok: true, probe, payload: JSON.parse(probe.body) };
  } catch (error) {
    return { ok: false, probe, payload: null, error: `Invalid PublishedData API JSON: ${error.message}` };
  }
}

async function waitForPublishedData(config, expected) {
  const timeoutMs = Number(process.env.COMMONALITY_VERIFIER_TESTNET_INDEXER_WAIT_MS ?? DEFAULT_WAIT_TIMEOUT_MS);
  const pollMs = Number(process.env.COMMONALITY_VERIFIER_TESTNET_INDEXER_POLL_MS ?? DEFAULT_POLL_MS);
  const deadline = Date.now() + timeoutMs;
  const attempts = [];
  while (Date.now() <= deadline) {
    const probe = await fetchPublication(config, expected);
    const publication = probe.payload?.publication;
    attempts.push({ ok: probe.ok, status: probe.probe?.status, apiStatus: probe.payload?.status, transactionHash: publication?.transactionHash, error: probe.error });
    if (
      probe.payload?.status === "active" &&
      probe.payload?.data?.toLowerCase() === expected.contentHex.toLowerCase() &&
      publication?.transactionHash?.toLowerCase() === expected.transactionHash.toLowerCase()
    ) {
      return { ok: true, payload: probe.payload, attempts };
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  return { ok: false, attempts };
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION !== "1") {
    return errorResult("Refusing to run PublishedData testnet journey without COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1.", {
      findings: { requiredEnv: ["COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION"], mutatesState: true }
    });
  }

  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv ?? "COMMONALITY_TESTNET_RPC_URL");
  const privateKey = envValue("COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY");
  const contractEnv = await readEnvFile(config.contractsEnvFile);
  const contractAddress = contractEnv.PUBLISHED_DATA_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("PUBLISHED_DATA_CONTRACT_ADDRESS is required in the configured testnet contracts env file.");

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

  const content = viem.toBytes(JSON.stringify({ kind: "commonality-verifier-published-data-smoke", at: new Date().toISOString(), publisher: account.address }));
  const contentHex = viem.bytesToHex(content);
  const dataId = viem.sha256(contentHex);
  const hash = await walletClient.writeContract({ address: contractAddress, abi: PUBLISHED_DATA_ABI, functionName: "publishData", args: [contentHex] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
  const indexed = await waitForPublishedData(config, { dataId, contentHex, contractAddress, chainId: config.chainId, transactionHash: hash });
  const findings = { transactionHash: hash, receipt: { blockNumber: receipt.blockNumber?.toString(), status: receipt.status }, contractAddress, publisher: account.address, dataId, indexed };
  if (!indexed.ok) return fail("PublishedData transaction was included, but the deployed indexer PublishedData API did not expose the active bytes before timeout.", { findings });
  return pass("Verifier-funded PublishedData publication was included and read back through the deployed indexer PublishedData API.", { findings });
});
