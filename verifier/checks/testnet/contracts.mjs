import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { envValue, readEnvFile, readTestnetConfig, requireOptIn, rpcCall } from "./lib.mjs";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv);
  const env = await readEnvFile(config.contractsEnvFile);
  const contracts = config.contractAddressKeys.map((key) => ({ key, address: env[key] })).filter((item) => item.address);
  const malformed = contracts.filter((item) => !ADDRESS_RE.test(item.address));
  const missing = config.contractAddressKeys.filter((key) => !env[key]);
  const codeResults = await Promise.all(contracts.filter((item) => ADDRESS_RE.test(item.address)).map(async (item) => ({ ...item, code: await rpcCall(rpcUrl, "eth_getCode", [item.address, "latest"]) })));
  const noCode = codeResults.filter((item) => !item.code.ok || item.code.result === "0x").map((item) => ({ key: item.key, address: item.address, code: item.code }));
  const findings = { envFile: config.contractsEnvFile, checked: codeResults.map((item) => ({ key: item.key, address: item.address, codeBytes: item.code.ok && typeof item.code.result === "string" ? Math.max(0, (item.code.result.length - 2) / 2) : null })), missing, malformed, noCode };
  if (missing.length > 0 || malformed.length > 0 || noCode.length > 0) return fail(`Testnet deployed contracts failed: ${missing.length} missing, ${malformed.length} malformed, ${noCode.length} without bytecode.`, { findings });
  return pass(`Verified bytecode exists for ${codeResults.length} configured testnet contract(s).`, { findings });
});
