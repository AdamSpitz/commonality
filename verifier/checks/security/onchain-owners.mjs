import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, readEnvFile, readTestnetConfig, requireOptIn, rpcCall } from "../testnet/lib.mjs";

const OWNER_SELECTOR = "0x8da5cb5b";
const OWNER_KEYS = [
  ["ChannelVerifier", "CHANNEL_VERIFIER_ADDRESS"],
  ["ChannelRegistry", "CHANNEL_REGISTRY_ADDRESS"],
  ["DelegatableNotes", "DELEGATABLE_NOTES_CONTRACT_ADDRESS"]
];

function normalize(address) {
  return typeof address === "string" ? address.toLowerCase() : address;
}

function decodeAddress(hex) {
  if (typeof hex !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hex)) return null;
  return `0x${hex.slice(-40)}`;
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv);
  const deploymentEnv = await readEnvFile(config.contractsEnvFile);
  const operatorEnv = await readEnvFile("../deployments/operator-addresses.env");
  const expectedAdmin = operatorEnv.CONTRACT_ADMIN_ADDRESS ?? deploymentEnv.CONTRACT_ADMIN_ADDRESS;
  if (!expectedAdmin) return errorResult("CONTRACT_ADMIN_ADDRESS is not configured in deployments/operator-addresses.env or deployment env.");

  const checked = [];
  for (const [name, key] of OWNER_KEYS) {
    const contract = deploymentEnv[key];
    if (!contract) {
      checked.push({ name, key, contract: null, ok: false, error: "missing contract address" });
      continue;
    }
    const call = await rpcCall(rpcUrl, "eth_call", [{ to: contract, data: OWNER_SELECTOR }, "latest"]);
    const owner = call.ok ? decodeAddress(call.result) : null;
    checked.push({ name, key, contract, owner, expectedAdmin, ok: normalize(owner) === normalize(expectedAdmin), call: call.ok ? undefined : call });
  }

  const mismatches = checked.filter((item) => !item.ok);
  const findings = { expectedAdmin, checked, mismatches };
  if (mismatches.length > 0) return fail(`${mismatches.length} admin-controlled contract owner(s) do not match expected admin.`, { findings });
  return pass(`Admin ownership matches expected admin for ${checked.length} contract(s).`, { findings });
});
