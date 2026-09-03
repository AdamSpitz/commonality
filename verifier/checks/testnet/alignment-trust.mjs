import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, readEnvFile, readTestnetConfig, requireOptIn, rpcCall } from "./lib.mjs";

const ALIGNMENT_ABI = [{
  type: "function", name: "attestAlignment", stateMutability: "nonpayable",
  inputs: [{ name: "subjectId", type: "bytes32" }, { name: "statementId", type: "bytes32" }, { name: "topicStatementId", type: "bytes32" }], outputs: []
}];
const ALIGNMENT_EVENT_ABI = [{
  type: "event", name: "AlignmentAttestation", anonymous: false,
  inputs: [
    { indexed: true, name: "attester", type: "address" },
    { indexed: true, name: "subjectId", type: "bytes32" },
    { indexed: true, name: "statementId", type: "bytes32" },
    { indexed: false, name: "topicStatementId", type: "bytes32" }
  ]
}];
const TRUST_ABI = [{
  type: "function", name: "getTrust", stateMutability: "view",
  inputs: [{ name: "truster", type: "address" }, { name: "trustee", type: "address" }], outputs: [{ type: "uint8" }]
}];
const ONE = `0x${"01".padStart(64, "0")}`;
const TWO = `0x${"02".padStart(64, "0")}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION !== "1") {
    return errorResult("Refusing to run alignment-trust journey without COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1.", {
      findings: { requiredEnv: ["COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION"], mutatesState: true }
    });
  }

  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv ?? "COMMONALITY_TESTNET_RPC_URL");
  const privateKey = envValue("COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY");
  const env = await readEnvFile(config.contractsEnvFile);
  const generatedEnv = await readEnvFile("../.env");
  const root = process.env.VITE_DEFAULT_ALIGNMENT_TRUST_ROOT ?? generatedEnv.VITE_DEFAULT_ALIGNMENT_TRUST_ROOT;
  const denied = generatedEnv.ALIGNMENT_TRUST_DENYLISTED_ADDRESS;
  const alignmentAddress = env.ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS;
  const trustAddress = env.TRUST_REGISTRY_ADDRESS;
  if (!root || !denied || !alignmentAddress || !trustAddress) throw new Error("Run scripts/setup-env.sh base-sepolia and ensure the testnet deployment has alignment trust addresses.");

  const chainProbe = await rpcCall(rpcUrl, "eth_chainId");
  const observedChainId = chainProbe.ok ? Number.parseInt(chainProbe.result, 16) : null;
  if (observedChainId !== Number(config.chainId)) return fail(`RPC chain ${observedChainId} did not match ${config.chainId}; refusing mutation.`, { findings: { chainProbe } });

  const [{ createPublicClient, createWalletClient, http, keccak256, toBytes }, { privateKeyToAccount }] = await Promise.all([import("viem"), import("viem/accounts")]);
  const account = privateKeyToAccount(privateKey);
  const chain = { id: Number(config.chainId), name: config.chainName ?? "testnet", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } };
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const subjectId = keccak256(toBytes(`alignment-trust-verifier:${Date.now()}:${account.address}`));
  if (account.address.toLowerCase() !== denied.toLowerCase()) throw new Error("ALIGNMENT_TRUST_DENYLISTED_ADDRESS must match COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY.");
  const hash = await walletClient.writeContract({ address: alignmentAddress, abi: ALIGNMENT_ABI, functionName: "attestAlignment", args: [subjectId, ONE, TWO] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });

  const timeoutMs = Number(process.env.COMMONALITY_VERIFIER_ALIGNMENT_TRUST_WAIT_MS ?? 180000);
  const deadline = Date.now() + timeoutMs;
  let deniedScore = 0;
  while (Date.now() <= deadline) {
    const head = await publicClient.getBlockNumber();
    if (head >= receipt.blockNumber + 12n) {
      await sleep(15000);
      deniedScore = await publicClient.readContract({ address: trustAddress, abi: TRUST_ABI, functionName: "getTrust", args: [root, denied] });
      break;
    }
    await sleep(5000);
  }

  const head = await publicClient.getBlockNumber();
  const configuredFloor = BigInt(env.START_BLOCK ?? 0);
  const lookback = BigInt(process.env.COMMONALITY_VERIFIER_ALIGNMENT_TRUST_LOOKBACK_BLOCKS ?? 500000);
  const lookbackFloor = head > lookback ? head - lookback : 0n;
  const floor = configuredFloor > lookbackFloor ? configuredFloor : lookbackFloor;
  let observedAttester;
  let admittedScore = 0;
  for (let toBlock = head; toBlock >= floor && !observedAttester;) {
    const fromBlock = toBlock > 9999n ? toBlock - 9999n : 0n;
    const logs = await publicClient.getContractEvents({ address: alignmentAddress, abi: ALIGNMENT_EVENT_ABI, eventName: "AlignmentAttestation", fromBlock: fromBlock < floor ? floor : fromBlock, toBlock, strict: true });
    for (const log of logs.toReversed()) {
      const candidate = log.args.attester;
      if (!candidate || candidate.toLowerCase() === denied.toLowerCase()) continue;
      admittedScore = await publicClient.readContract({ address: trustAddress, abi: TRUST_ABI, functionName: "getTrust", args: [root, candidate] });
      if (Number(admittedScore) === 100) { observedAttester = candidate; break; }
    }
    if (fromBlock <= floor) break;
    toBlock = fromBlock - 1n;
  }
  const findings = { transactionHash: hash, root, observedAttester, admittedScore: Number(admittedScore), denylistedAddress: denied, deniedAttestationSubjectId: subjectId, deniedScore: Number(deniedScore) };
  if (!observedAttester || Number(admittedScore) !== 100 || Number(deniedScore) !== 0) return fail("Alignment trust bootstrap did not expose the expected admitted/denied direct trust scores.", { findings });
  return pass("Configured CauseStarter root directly trusts an observed attester at 100 and excludes an observed denylisted attester at 0.", { findings });
});
