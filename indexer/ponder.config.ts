import { createConfig } from "ponder";

type CreateConfigArgs = Parameters<typeof createConfig>[0];
import { conceptspaceContracts } from "./src/indexing/conceptspaceContracts";
import { fundingContracts } from "./src/indexing/fundingContracts";
import {
  readIndexerContractCapability,
  selectIndexerContracts,
} from "./src/indexing/contractCapabilities";
import {
  getActiveChains,
  installHostedRpcGuards,
  loadIndexerDeploymentContext,
} from "./src/indexing/ponderEnv";

/**
 * Shared production feed. `INDEXER_CONTRACTS=conceptspace` still loads this
 * file, including funding ABIs. A process that must not load them uses
 * `ponder.conceptspace.config.ts` instead.
 */
const context = loadIndexerDeploymentContext();
installHostedRpcGuards(context);

const contracts = selectIndexerContracts(
  {
    ...conceptspaceContracts(context),
    ...fundingContracts(context),
  },
  readIndexerContractCapability(process.env.INDEXER_CONTRACTS),
);

export default createConfig({
  database:
    process.env.PONDER_EPHEMERAL === "true"
      ? { kind: "pglite", directory: "/tmp/ponder-pglite" }
      : process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL
        ? { kind: "postgres" }
        : undefined,
  chains: getActiveChains(context) as unknown as CreateConfigArgs["chains"],
  contracts,
});
