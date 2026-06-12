import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, readEnvFile, readTestnetConfig, requireOptIn, rpcCall } from "../testnet/lib.mjs";

const AGENT_KEYS = [
  "IMPLICATION_ATTESTER_ADDRESS",
  "CONTENT_ATTESTER_ADDRESS",
  "BEAT_AGENT_ADDRESS",
  "IMPLICATION_GRAPH_NUDGER_ADDRESS",
  "BRIDGE_CREATOR_ADDRESS",
  "EXPLORER_CURATOR_ADDRESS",
  "VERIFIER_ADDRESS"
];

function weiToEthString(hexWei) {
  const wei = BigInt(hexWei ?? "0x0");
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 6);
  return `${whole}.${frac}`;
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv);
  const env = await readEnvFile(config.contractsEnvFile);
  const wallets = [];
  for (const key of AGENT_KEYS) {
    const address = env[key];
    if (!address) continue;
    const [balance, nonce] = await Promise.all([
      rpcCall(rpcUrl, "eth_getBalance", [address, "latest"]),
      rpcCall(rpcUrl, "eth_getTransactionCount", [address, "latest"])
    ]);
    wallets.push({
      key,
      address,
      balanceWei: balance.ok ? balance.result : null,
      balanceEth: balance.ok ? weiToEthString(balance.result) : null,
      nonce: nonce.ok ? Number.parseInt(nonce.result, 16) : null,
      errors: [balance.ok ? null : { method: "eth_getBalance", result: balance }, nonce.ok ? null : { method: "eth_getTransactionCount", result: nonce }].filter(Boolean)
    });
  }
  const errored = wallets.filter((wallet) => wallet.errors.length > 0);
  const active = wallets.filter((wallet) => typeof wallet.nonce === "number" && wallet.nonce > 0);
  const findings = { wallets, active };
  if (errored.length > 0) return errorResult(`Could not read ${errored.length} agent wallet(s).`, { findings });
  if (active.length > 0) return fail(`${active.length} agent wallet(s) have nonzero nonce; review for expected activity.`, { findings });
  return pass(`Read balances/nonces for ${wallets.length} agent wallet(s); no nonzero nonces observed.`, { findings });
});
