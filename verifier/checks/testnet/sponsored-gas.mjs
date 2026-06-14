import { emit, errorResult, fail, pass, uncertain } from "../lib/result.mjs";
import { envValue, readEnvFile, readTestnetConfig, requireOptIn, rpcCall } from "./lib.mjs";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function parseNonNegativeInteger(value, key) {
  if (value === undefined || value === "") return { ok: false, error: `${key} is missing` };
  if (!/^\d+$/.test(value)) return { ok: false, error: `${key} must be a non-negative integer string` };
  return { ok: true, value };
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }

  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv);
  const env = await readEnvFile(config.contractsEnvFile);

  const paymaster = env.CREATOR_GAS_TANK_ADDRESS;
  const entryPoint = env.SPONSORED_GAS_ENTRY_POINT_ADDRESS;
  const configChecks = [
    parseNonNegativeInteger(env.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW, "SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW"),
    parseNonNegativeInteger(env.SPONSORED_GAS_WALLET_WINDOW_SECONDS, "SPONSORED_GAS_WALLET_WINDOW_SECONDS"),
    parseNonNegativeInteger(env.MIN_SPONSORED_CONTRIBUTION_AMOUNT, "MIN_SPONSORED_CONTRIBUTION_AMOUNT")
  ];
  const malformedConfig = configChecks.filter((check) => !check.ok).map((check) => check.error);

  const findings = {
    envFile: config.contractsEnvFile,
    addresses: { CREATOR_GAS_TANK_ADDRESS: paymaster, SPONSORED_GAS_ENTRY_POINT_ADDRESS: entryPoint },
    configuredCaps: {
      SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW: env.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW,
      SPONSORED_GAS_WALLET_WINDOW_SECONDS: env.SPONSORED_GAS_WALLET_WINDOW_SECONDS,
      MIN_SPONSORED_CONTRIBUTION_AMOUNT: env.MIN_SPONSORED_CONTRIBUTION_AMOUNT
    },
    malformedConfig
  };

  const missing = [
    ["CREATOR_GAS_TANK_ADDRESS", paymaster],
    ["SPONSORED_GAS_ENTRY_POINT_ADDRESS", entryPoint]
  ].filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    return uncertain(`Sponsored-gas paymaster is not deployed/configured on testnet yet (${missing.join(", ")}).`, { findings: { ...findings, missing } });
  }

  const malformedAddresses = [
    ["CREATOR_GAS_TANK_ADDRESS", paymaster],
    ["SPONSORED_GAS_ENTRY_POINT_ADDRESS", entryPoint]
  ].filter(([, value]) => !ADDRESS_RE.test(value)).map(([key, value]) => ({ key, value }));
  if (malformedAddresses.length > 0 || malformedConfig.length > 0) {
    return fail("Sponsored-gas testnet config is malformed.", { findings: { ...findings, malformedAddresses } });
  }

  const [paymasterCode, entryPointCode] = await Promise.all([
    rpcCall(rpcUrl, "eth_getCode", [paymaster, "latest"]),
    rpcCall(rpcUrl, "eth_getCode", [entryPoint, "latest"])
  ]);
  const codeFindings = {
    ...findings,
    code: {
      CREATOR_GAS_TANK_ADDRESS: { ok: paymasterCode.ok, codeBytes: paymasterCode.ok ? Math.max(0, (paymasterCode.result.length - 2) / 2) : null, error: paymasterCode.error },
      SPONSORED_GAS_ENTRY_POINT_ADDRESS: { ok: entryPointCode.ok, codeBytes: entryPointCode.ok ? Math.max(0, (entryPointCode.result.length - 2) / 2) : null, error: entryPointCode.error }
    }
  };

  const noCode = [];
  if (!paymasterCode.ok || paymasterCode.result === "0x") noCode.push("CREATOR_GAS_TANK_ADDRESS");
  if (!entryPointCode.ok || entryPointCode.result === "0x") noCode.push("SPONSORED_GAS_ENTRY_POINT_ADDRESS");
  if (noCode.length > 0) return fail(`Sponsored-gas configured contract(s) have no bytecode: ${noCode.join(", ")}.`, { findings: { ...codeFindings, noCode } });

  return pass("Sponsored-gas testnet paymaster config is present and both paymaster/EntryPoint addresses have bytecode.", { findings: codeFindings });
});
