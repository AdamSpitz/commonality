import { AbiCoder, id } from "ethers";
import { emit, errorResult, fail, pass, uncertain } from "../lib/result.mjs";
import { envValue, readEnvFile, readTestnetConfig, requireOptIn, rpcCall } from "./lib.mjs";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const coder = AbiCoder.defaultAbiCoder();

function selector(signature) {
  return id(signature).slice(0, 10);
}

async function contractCall(rpcUrl, to, signature, outputTypes) {
  const result = await rpcCall(rpcUrl, "eth_call", [{ to, data: selector(signature) }, "latest"]);
  if (!result.ok) return { ok: false, error: result.error ?? result.probe?.body ?? "eth_call failed" };
  try {
    return { ok: true, value: coder.decode(outputTypes, result.result) };
  } catch (error) {
    return { ok: false, error: `Unable to decode ${signature}: ${error.message}`, raw: result.result };
  }
}

function sameAddress(a, b) {
  return typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();
}

function kernelSingleCallData(target) {
  const execMode = `0x${"00".repeat(32)}`;
  const executionCalldata = `0x${target.slice(2)}${"00".repeat(32)}12345678`;
  return `${selector("execute(bytes32,bytes)")}${coder.encode(["bytes32", "bytes"], [execMode, executionCalldata]).slice(2)}`;
}

async function probePaymasterEndpoint(url, paymaster) {
  if (!url) return { ok: false, error: "BASE_SEPOLIA_PAYMASTER_URL is missing" };
  const project = "0x1111111111111111111111111111111111111111";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "pm_getPaymasterStubData",
        params: [{ callData: kernelSingleCallData(project) }, null, null]
      }),
      signal: AbortSignal.timeout(30_000)
    });
    const body = await response.json();
    const result = body?.result;
    const errors = [];
    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (body?.jsonrpc !== "2.0" || body?.id !== 1) errors.push("invalid JSON-RPC response envelope");
    if (!sameAddress(result?.paymaster, paymaster)) errors.push(`paymaster mismatch (expected ${paymaster}, got ${result?.paymaster ?? "missing"})`);
    if (!sameAddress(result?.paymasterData, project)) errors.push(`paymasterData mismatch (expected ${project}, got ${result?.paymasterData ?? "missing"})`);
    if (!/^0x[0-9a-f]+$/i.test(result?.paymasterVerificationGasLimit ?? "")) errors.push("missing paymasterVerificationGasLimit quantity");
    if (!/^0x[0-9a-f]+$/i.test(result?.paymasterPostOpGasLimit ?? "")) errors.push("missing paymasterPostOpGasLimit quantity");
    return { ok: errors.length === 0, status: response.status, errors, result, rpcError: body?.error };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

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
  const paymasterUrl = env.BASE_SEPOLIA_PAYMASTER_URL;
  const configChecks = [
    parseNonNegativeInteger(env.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW, "SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW"),
    parseNonNegativeInteger(env.SPONSORED_GAS_WALLET_WINDOW_SECONDS, "SPONSORED_GAS_WALLET_WINDOW_SECONDS"),
    parseNonNegativeInteger(env.MIN_SPONSORED_CONTRIBUTION_AMOUNT, "MIN_SPONSORED_CONTRIBUTION_AMOUNT")
  ];
  const malformedConfig = configChecks.filter((check) => !check.ok).map((check) => check.error);

  const findings = {
    envFile: config.contractsEnvFile,
    addresses: { CREATOR_GAS_TANK_ADDRESS: paymaster, SPONSORED_GAS_ENTRY_POINT_ADDRESS: entryPoint },
    paymasterUrl,
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

  const [settlementToken, onchainEntryPoint, sponsorshipConfig, minContribution] = await Promise.all([
    contractCall(rpcUrl, paymaster, "settlementToken()", ["address"]),
    contractCall(rpcUrl, paymaster, "entryPoint()", ["address"]),
    contractCall(rpcUrl, paymaster, "sponsorshipConfig()", ["uint192", "uint32"]),
    contractCall(rpcUrl, paymaster, "minSponsoredContributionAmount()", ["uint256"])
  ]);

  const behavioralFindings = {
    ...codeFindings,
    contractReads: {
      settlementToken: settlementToken.ok ? settlementToken.value[0] : { error: settlementToken.error },
      entryPoint: onchainEntryPoint.ok ? onchainEntryPoint.value[0] : { error: onchainEntryPoint.error },
      sponsorshipConfig: sponsorshipConfig.ok ? {
        maxSponsoredWeiPerWalletPerWindow: sponsorshipConfig.value[0].toString(),
        walletWindowSeconds: sponsorshipConfig.value[1].toString()
      } : { error: sponsorshipConfig.error },
      minSponsoredContributionAmount: minContribution.ok ? minContribution.value[0].toString() : { error: minContribution.error }
    }
  };

  const readFailures = [
    ["settlementToken()", settlementToken],
    ["entryPoint()", onchainEntryPoint],
    ["sponsorshipConfig()", sponsorshipConfig],
    ["minSponsoredContributionAmount()", minContribution]
  ].filter(([, call]) => !call.ok).map(([name, call]) => ({ name, error: call.error }));
  if (readFailures.length > 0) {
    return fail("Sponsored-gas paymaster bytecode is present but required read-only contract calls failed.", { findings: { ...behavioralFindings, readFailures } });
  }

  const mismatches = [];
  if (!sameAddress(onchainEntryPoint.value[0], entryPoint)) {
    mismatches.push({ key: "SPONSORED_GAS_ENTRY_POINT_ADDRESS", env: entryPoint, onchain: onchainEntryPoint.value[0] });
  }
  if (env.PAYMENT_TOKEN_ADDRESS && !sameAddress(settlementToken.value[0], env.PAYMENT_TOKEN_ADDRESS)) {
    mismatches.push({ key: "PAYMENT_TOKEN_ADDRESS", env: env.PAYMENT_TOKEN_ADDRESS, onchain: settlementToken.value[0] });
  }
  if (sponsorshipConfig.value[0].toString() !== env.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW) {
    mismatches.push({ key: "SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW", env: env.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW, onchain: sponsorshipConfig.value[0].toString() });
  }
  if (sponsorshipConfig.value[1].toString() !== env.SPONSORED_GAS_WALLET_WINDOW_SECONDS) {
    mismatches.push({ key: "SPONSORED_GAS_WALLET_WINDOW_SECONDS", env: env.SPONSORED_GAS_WALLET_WINDOW_SECONDS, onchain: sponsorshipConfig.value[1].toString() });
  }
  if (minContribution.value[0].toString() !== env.MIN_SPONSORED_CONTRIBUTION_AMOUNT) {
    mismatches.push({ key: "MIN_SPONSORED_CONTRIBUTION_AMOUNT", env: env.MIN_SPONSORED_CONTRIBUTION_AMOUNT, onchain: minContribution.value[0].toString() });
  }
  if (mismatches.length > 0) {
    return fail("Sponsored-gas paymaster deployed config does not match the testnet env file.", { findings: { ...behavioralFindings, mismatches } });
  }

  const endpointProbe = await probePaymasterEndpoint(paymasterUrl, paymaster);
  const endpointFindings = { ...behavioralFindings, endpointProbe };
  if (!endpointProbe.ok) {
    return fail("Sponsored-gas contracts are configured, but the deployed ERC-7677 paymaster endpoint failed its live probe.", { findings: endpointFindings });
  }

  return pass("Sponsored-gas testnet contracts and the deployed ERC-7677 endpoint match configured paymaster settings.", { findings: endpointFindings });
});
