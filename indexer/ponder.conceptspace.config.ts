import { createConfig } from "ponder";

type CreateConfigArgs = Parameters<typeof createConfig>[0];
import { conceptspaceContracts } from "./src/indexing/conceptspaceContracts";
import {
  getActiveChains,
  installHostedRpcGuards,
  loadIndexerDeploymentContext,
} from "./src/indexing/ponderEnv";

/**
 * Conceptspace-only Ponder entry. Does not import funding contract modules,
 * so assurance, delegation, and content-funding ABIs stay out of the process.
 * The API reads INDEXER_CONTRACTS and omits funding routes when it is conceptspace.
 */
process.env.INDEXER_CONTRACTS = "conceptspace";
const context = loadIndexerDeploymentContext();
installHostedRpcGuards(context);

export default createConfig({
  database:
    process.env.PONDER_EPHEMERAL === "true"
      ? { kind: "pglite", directory: "/tmp/ponder-pglite" }
      : process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL
        ? { kind: "postgres" }
        : undefined,
  chains: getActiveChains(context) as unknown as CreateConfigArgs["chains"],
  contracts: conceptspaceContracts(context),
});
