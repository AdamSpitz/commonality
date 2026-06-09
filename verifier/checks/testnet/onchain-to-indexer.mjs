import { emit, errorResult, uncertain } from "../lib/result.mjs";
import { readTestnetConfig, requireOptIn } from "./lib.mjs";

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION !== "1") {
    return errorResult("Refusing to run on-chain-to-indexer journey without COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1.", {
      findings: {
        requiredEnv: ["COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION"],
        mutatesState: true,
        plannedScope: "Submit a harmless testnet transaction, wait for indexer catch-up, and assert the deployed GraphQL/UI surface reflects it.",
        config: { chainId: config.chainId, graphqlUrl: config.graphqlUrl }
      }
    });
  }
  return uncertain("Mutating testnet on-chain-to-indexer check is wired into the dashboard but its transaction script is not implemented yet.", {
    findings: { severity: "medium", recommendation: "Implement a tiny verifier-funded transaction plus GraphQL assertion for a canonical deployed contract event." }
  });
});
