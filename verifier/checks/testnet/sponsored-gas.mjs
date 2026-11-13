import { AbiCoder, id } from "ethers";
import { emit, fail, pass, uncertain } from "../lib/result.mjs";
import { envValue, readEnvFile, readTestnetConfig, requireOptIn, rpcCall, testnetOptInSkipped } from "./lib.mjs";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const coder = AbiCoder.defaultAbiCoder();
const PROJECT = "0x1111111111111111111111111111111111111111";
const STATEMENT_ID = `0x${"aa".repeat(32)}`;

function selector(signature) {
  return id(signature).slice(0, 10);
}

async function contractCall(rpcUrl, to, signature, outputTypes, inputTypes = [], args = []) {
  const encodedArgs = inputTypes.length === 0 ? "0x" : coder.encode(inputTypes, args);
  const data = `${selector(signature)}${encodedArgs.slice(2)}`;
  const result = await rpcCall(rpcUrl, "eth_call", [{ to, data }, "latest"]);
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

function kernelExecute(target, innerCallData) {
  const execMode = `0x${"00".repeat(32)}`;
  const executionCalldata = `0x${target.slice(2)}${"00".repeat(32)}${innerCallData.slice(2)}`;
  return `${selector("execute(bytes32,bytes)")}${coder.encode(["bytes32", "bytes"], [execMode, executionCalldata]).slice(2)}`;
}

function kernelSingleCallData(target) {
  return kernelExecute(target, selector("buyERC1155(address,address,uint256[],uint256[],bytes)"));
}

function kernelBeliefCallData(beliefs, statementId) {
  const inner = `${selector("setBelief(bytes32,uint8)")}${coder.encode(["bytes32", "uint8"], [statementId, 1]).slice(2)}`;
  return kernelExecute(beliefs, inner);
}

async function probePaymasterEndpoint(url, { entryPoint, paymaster, version, callData, paymasterData }) {
  if (!url) return { ok: false, error: "BASE_SEPOLIA_PAYMASTER_URL is missing" };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "pm_getPaymasterStubData",
        params: [{ callData }, entryPoint, "0x14a34"]
      }),
      signal: AbortSignal.timeout(30_000)
    });
    const body = await response.json();
    const result = body?.result;
    const errors = [];
    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (body?.jsonrpc !== "2.0" || body?.id !== 1) errors.push("invalid JSON-RPC response envelope");
    if (version === "v06") {
      const expected = `${paymaster}${paymasterData.slice(2)}`.toLowerCase();
      if (String(result?.paymasterAndData ?? "").toLowerCase() !== expected) {
        errors.push(`paymasterAndData mismatch (expected ${expected}, got ${result?.paymasterAndData ?? "missing"})`);
      }
    } else {
      if (!sameAddress(result?.paymaster, paymaster)) errors.push(`paymaster mismatch (expected ${paymaster}, got ${result?.paymaster ?? "missing"})`);
      if (!sameAddress(result?.paymasterData, paymasterData)) errors.push(`paymasterData mismatch (expected ${paymasterData}, got ${result?.paymasterData ?? "missing"})`);
      if (!/^0x[0-9a-f]+$/i.test(result?.paymasterVerificationGasLimit ?? "")) errors.push("missing paymasterVerificationGasLimit quantity");
      if (!/^0x[0-9a-f]+$/i.test(result?.paymasterPostOpGasLimit ?? "")) errors.push("missing paymasterPostOpGasLimit quantity");
    }
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

function codeOf(call) {
  return { ok: call.ok, codeBytes: call.ok ? Math.max(0, (call.result.length - 2) / 2) : null, error: call.error };
}

function readValue(call, format = (value) => value[0]) {
  return call.ok ? format(call.value) : { error: call.error };
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return testnetOptInSkipped(error); }

  const config = await readTestnetConfig();
  const rpcUrl = envValue(config.rpcUrlEnv);
  const env = await readEnvFile(config.contractsEnvFile);

  const tank = env.CREATOR_GAS_TANK_ADDRESS;
  const paymaster = env.CREATOR_GAS_TANK_PAYMASTER_ADDRESS;
  const paymasterV06 = env.CREATOR_GAS_TANK_PAYMASTER_V06_ADDRESS;
  const statementTank = env.STATEMENT_GAS_TANK_ADDRESS;
  const statementPaymaster = env.STATEMENT_GAS_TANK_PAYMASTER_ADDRESS;
  const statementPaymasterV06 = env.STATEMENT_GAS_TANK_PAYMASTER_V06_ADDRESS;
  const beliefs = env.BELIEFS_CONTRACT_ADDRESS;
  const entryPoint = env.SPONSORED_GAS_ENTRY_POINT_ADDRESS;
  const entryPointV06 = env.SPONSORED_GAS_ENTRY_POINT_V06_ADDRESS;
  const paymasterUrl = env.BASE_SEPOLIA_PAYMASTER_URL;
  const configChecks = [
    parseNonNegativeInteger(env.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW, "SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW"),
    parseNonNegativeInteger(env.SPONSORED_GAS_WALLET_WINDOW_SECONDS, "SPONSORED_GAS_WALLET_WINDOW_SECONDS"),
    parseNonNegativeInteger(env.MIN_SPONSORED_CONTRIBUTION_AMOUNT, "MIN_SPONSORED_CONTRIBUTION_AMOUNT")
  ];
  const malformedConfig = configChecks.filter((check) => !check.ok).map((check) => check.error);

  const required = [
    ["CREATOR_GAS_TANK_ADDRESS", tank],
    ["CREATOR_GAS_TANK_PAYMASTER_ADDRESS", paymaster],
    ["CREATOR_GAS_TANK_PAYMASTER_V06_ADDRESS", paymasterV06],
    ["STATEMENT_GAS_TANK_ADDRESS", statementTank],
    ["STATEMENT_GAS_TANK_PAYMASTER_ADDRESS", statementPaymaster],
    ["STATEMENT_GAS_TANK_PAYMASTER_V06_ADDRESS", statementPaymasterV06],
    ["BELIEFS_CONTRACT_ADDRESS", beliefs],
    ["SPONSORED_GAS_ENTRY_POINT_ADDRESS", entryPoint],
    ["SPONSORED_GAS_ENTRY_POINT_V06_ADDRESS", entryPointV06]
  ];
  const findings = {
    envFile: config.contractsEnvFile,
    addresses: Object.fromEntries(required),
    paymasterUrl,
    configuredCaps: {
      SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW: env.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW,
      SPONSORED_GAS_WALLET_WINDOW_SECONDS: env.SPONSORED_GAS_WALLET_WINDOW_SECONDS,
      MIN_SPONSORED_CONTRIBUTION_AMOUNT: env.MIN_SPONSORED_CONTRIBUTION_AMOUNT
    },
    malformedConfig
  };

  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    return uncertain(`Sponsored-gas contracts are not deployed/configured on testnet yet (${missing.join(", ")}).`, { findings: { ...findings, missing } });
  }

  const malformedAddresses = required.filter(([, value]) => !ADDRESS_RE.test(value)).map(([key, value]) => ({ key, value }));
  if (malformedAddresses.length > 0 || malformedConfig.length > 0) {
    return fail("Sponsored-gas testnet config is malformed.", { findings: { ...findings, malformedAddresses } });
  }

  const codeCalls = await Promise.all(required.map(([, address]) => rpcCall(rpcUrl, "eth_getCode", [address, "latest"])));
  const code = Object.fromEntries(required.map(([key], index) => [key, codeOf(codeCalls[index])]));
  const codeFindings = { ...findings, code };
  const noCode = required.filter(([key], index) => !codeCalls[index].ok || codeCalls[index].result === "0x").map(([key]) => key);
  if (noCode.length > 0) return fail(`Sponsored-gas configured contract(s) have no bytecode: ${noCode.join(", ")}.`, { findings: { ...codeFindings, noCode } });

  const [
    settlementToken, sponsorshipConfig, minContribution,
    onchainEntryPoint, vault, onchainEntryPointV06, vaultV06, faceV07, faceV06,
    statementBeliefs, statementConfig,
    statementEntryPoint, statementVault, statementEntryPointV06, statementVaultV06, statementFaceV07, statementFaceV06
  ] = await Promise.all([
    contractCall(rpcUrl, tank, "settlementToken()", ["address"]),
    contractCall(rpcUrl, tank, "sponsorshipConfig()", ["uint192", "uint32"]),
    contractCall(rpcUrl, tank, "minSponsoredContributionAmount()", ["uint256"]),
    contractCall(rpcUrl, paymaster, "entryPoint()", ["address"]),
    contractCall(rpcUrl, paymaster, "vault()", ["address"]),
    contractCall(rpcUrl, paymasterV06, "entryPoint()", ["address"]),
    contractCall(rpcUrl, paymasterV06, "vault()", ["address"]),
    contractCall(rpcUrl, tank, "isPaymaster(address)", ["bool"], ["address"], [paymaster]),
    contractCall(rpcUrl, tank, "isPaymaster(address)", ["bool"], ["address"], [paymasterV06]),
    contractCall(rpcUrl, statementTank, "beliefs()", ["address"]),
    contractCall(rpcUrl, statementTank, "sponsorshipConfig()", ["uint192", "uint32"]),
    contractCall(rpcUrl, statementPaymaster, "entryPoint()", ["address"]),
    contractCall(rpcUrl, statementPaymaster, "vault()", ["address"]),
    contractCall(rpcUrl, statementPaymasterV06, "entryPoint()", ["address"]),
    contractCall(rpcUrl, statementPaymasterV06, "vault()", ["address"]),
    contractCall(rpcUrl, statementTank, "isPaymaster(address)", ["bool"], ["address"], [statementPaymaster]),
    contractCall(rpcUrl, statementTank, "isPaymaster(address)", ["bool"], ["address"], [statementPaymasterV06])
  ]);

  const configOf = (call) => readValue(call, (value) => ({
    maxSponsoredWeiPerWalletPerWindow: value[0].toString(),
    walletWindowSeconds: value[1].toString()
  }));
  const behavioralFindings = {
    ...codeFindings,
    contractReads: {
      settlementToken: readValue(settlementToken),
      entryPoint: readValue(onchainEntryPoint),
      vault: readValue(vault),
      entryPointV06: readValue(onchainEntryPointV06),
      vaultV06: readValue(vaultV06),
      paymasterFaceRegistered: readValue(faceV07),
      paymasterV06FaceRegistered: readValue(faceV06),
      sponsorshipConfig: configOf(sponsorshipConfig),
      minSponsoredContributionAmount: readValue(minContribution, (value) => value[0].toString()),
      statementBeliefs: readValue(statementBeliefs),
      statementSponsorshipConfig: configOf(statementConfig),
      statementEntryPoint: readValue(statementEntryPoint),
      statementVault: readValue(statementVault),
      statementEntryPointV06: readValue(statementEntryPointV06),
      statementVaultV06: readValue(statementVaultV06),
      statementPaymasterFaceRegistered: readValue(statementFaceV07),
      statementPaymasterV06FaceRegistered: readValue(statementFaceV06)
    }
  };

  const readFailures = [
    ["CreatorGasTank.settlementToken()", settlementToken],
    ["CreatorGasTank.sponsorshipConfig()", sponsorshipConfig],
    ["CreatorGasTank.minSponsoredContributionAmount()", minContribution],
    ["CreatorGasTankPaymaster.entryPoint()", onchainEntryPoint],
    ["CreatorGasTankPaymaster.vault()", vault],
    ["CreatorGasTankPaymasterV06.entryPoint()", onchainEntryPointV06],
    ["CreatorGasTankPaymasterV06.vault()", vaultV06],
    ["CreatorGasTank.isPaymaster(v0.7)", faceV07],
    ["CreatorGasTank.isPaymaster(v0.6)", faceV06],
    ["StatementGasTank.beliefs()", statementBeliefs],
    ["StatementGasTank.sponsorshipConfig()", statementConfig],
    ["StatementGasTankPaymaster.entryPoint()", statementEntryPoint],
    ["StatementGasTankPaymaster.vault()", statementVault],
    ["StatementGasTankPaymasterV06.entryPoint()", statementEntryPointV06],
    ["StatementGasTankPaymasterV06.vault()", statementVaultV06],
    ["StatementGasTank.isPaymaster(v0.7)", statementFaceV07],
    ["StatementGasTank.isPaymaster(v0.6)", statementFaceV06]
  ].filter(([, call]) => !call.ok).map(([name, call]) => ({ name, error: call.error }));
  if (readFailures.length > 0) {
    return fail("Sponsored-gas bytecode is present but required read-only contract calls failed.", { findings: { ...behavioralFindings, readFailures } });
  }

  const mismatches = [];
  const expectAddress = (key, actual, expected) => {
    if (!sameAddress(actual, expected)) mismatches.push({ key, env: expected, onchain: actual });
  };
  const expectEqual = (key, actual, expected) => {
    if (actual !== expected) mismatches.push({ key, env: expected, onchain: actual });
  };
  expectAddress("CREATOR_GAS_TANK_PAYMASTER_ADDRESS.vault", vault.value[0], tank);
  expectAddress("CREATOR_GAS_TANK_PAYMASTER_V06_ADDRESS.vault", vaultV06.value[0], tank);
  expectAddress("SPONSORED_GAS_ENTRY_POINT_ADDRESS", onchainEntryPoint.value[0], entryPoint);
  expectAddress("SPONSORED_GAS_ENTRY_POINT_V06_ADDRESS", onchainEntryPointV06.value[0], entryPointV06);
  expectEqual("isPaymaster(v0.7)", faceV07.value[0], true);
  expectEqual("isPaymaster(v0.6)", faceV06.value[0], true);
  expectAddress("BELIEFS_CONTRACT_ADDRESS", statementBeliefs.value[0], beliefs);
  expectAddress("STATEMENT_GAS_TANK_PAYMASTER_ADDRESS.vault", statementVault.value[0], statementTank);
  expectAddress("STATEMENT_GAS_TANK_PAYMASTER_V06_ADDRESS.vault", statementVaultV06.value[0], statementTank);
  expectAddress("statement.SPONSORED_GAS_ENTRY_POINT_ADDRESS", statementEntryPoint.value[0], entryPoint);
  expectAddress("statement.SPONSORED_GAS_ENTRY_POINT_V06_ADDRESS", statementEntryPointV06.value[0], entryPointV06);
  expectEqual("statement.isPaymaster(v0.7)", statementFaceV07.value[0], true);
  expectEqual("statement.isPaymaster(v0.6)", statementFaceV06.value[0], true);
  if (env.PAYMENT_TOKEN_ADDRESS) expectAddress("PAYMENT_TOKEN_ADDRESS", settlementToken.value[0], env.PAYMENT_TOKEN_ADDRESS);
  expectEqual("SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW", sponsorshipConfig.value[0].toString(), env.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW);
  expectEqual("SPONSORED_GAS_WALLET_WINDOW_SECONDS", sponsorshipConfig.value[1].toString(), env.SPONSORED_GAS_WALLET_WINDOW_SECONDS);
  expectEqual("MIN_SPONSORED_CONTRIBUTION_AMOUNT", minContribution.value[0].toString(), env.MIN_SPONSORED_CONTRIBUTION_AMOUNT);
  expectEqual("statement.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW", statementConfig.value[0].toString(), env.SPONSORED_GAS_MAX_WEI_PER_WALLET_PER_WINDOW);
  expectEqual("statement.SPONSORED_GAS_WALLET_WINDOW_SECONDS", statementConfig.value[1].toString(), env.SPONSORED_GAS_WALLET_WINDOW_SECONDS);
  if (mismatches.length > 0) {
    return fail("Sponsored-gas paymaster deployed config does not match the testnet env file.", { findings: { ...behavioralFindings, mismatches } });
  }

  const probes = {
    endpointProbe: probePaymasterEndpoint(paymasterUrl, { entryPoint, paymaster, version: "v07", callData: kernelSingleCallData(PROJECT), paymasterData: PROJECT }),
    endpointProbeV06: probePaymasterEndpoint(paymasterUrl, { entryPoint: entryPointV06, paymaster: paymasterV06, version: "v06", callData: kernelSingleCallData(PROJECT), paymasterData: PROJECT }),
    statementEndpointProbe: probePaymasterEndpoint(paymasterUrl, { entryPoint, paymaster: statementPaymaster, version: "v07", callData: kernelBeliefCallData(beliefs, STATEMENT_ID), paymasterData: STATEMENT_ID }),
    statementEndpointProbeV06: probePaymasterEndpoint(paymasterUrl, { entryPoint: entryPointV06, paymaster: statementPaymasterV06, version: "v06", callData: kernelBeliefCallData(beliefs, STATEMENT_ID), paymasterData: STATEMENT_ID })
  };
  const endpointResults = Object.fromEntries(await Promise.all(Object.entries(probes).map(async ([key, probe]) => [key, await probe])));
  const endpointFindings = { ...behavioralFindings, ...endpointResults };
  if (Object.values(endpointResults).some((probe) => !probe.ok)) {
    return fail("Sponsored-gas contracts are configured, but the deployed ERC-7677 paymaster endpoint failed its live probe.", { findings: endpointFindings });
  }

  return pass("Sponsored-gas creator and statement tanks, both paymaster faces, and the ERC-7677 endpoint match configured settings.", { findings: endpointFindings });
});
