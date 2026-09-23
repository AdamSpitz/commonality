import { http } from "viem";
import { installEthGetLogsRangeGuard } from "../rpc/ethGetLogsRangeGuard";
import { installMonthlyCapacityGuard } from "../rpc/monthlyCapacity";
import { INDEXER_CHAIN_IDS, type IndexerChainName } from "../utils/chain";

export const SUPPORTED_CHAINS = Object.keys(INDEXER_CHAIN_IDS) as IndexerChainName[];
export type SupportedChain = IndexerChainName;

export type ContractDeployment = {
  address: `0x${string}`;
  startBlock: number;
};

type DeploymentManifest = {
  chains?: Partial<Record<SupportedChain, Record<string, ContractDeployment[]>>>;
} & Partial<Record<SupportedChain, Record<string, ContractDeployment[]>>>;

function parseDeploymentManifest(): DeploymentManifest {
  const rawManifest = process.env.INDEXER_DEPLOYMENT_MANIFEST;
  if (!rawManifest) return {};

  try {
    return JSON.parse(rawManifest) as DeploymentManifest;
  } catch (error) {
    throw new Error(
      `Invalid INDEXER_DEPLOYMENT_MANIFEST JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function parseStartBlock(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid start block "${value}". Expected a non-negative integer.`);
  }
  return parsed;
}

function contractStartBlock(specificEnvVar: string, fallback: number): number {
  return parseStartBlock(process.env[specificEnvVar], fallback);
}

function parseLegacyDeployment(addressEnvVar: string, startBlock: number): ContractDeployment[] {
  const address = process.env[addressEnvVar];
  return address && address !== "" ? [{ address: address as `0x${string}`, startBlock }] : [];
}

export function getIndexerChain(): SupportedChain {
  const chain = process.env.PONDER_CHAIN ?? "hardhat";
  if ((SUPPORTED_CHAINS as readonly string[]).includes(chain)) {
    return chain as SupportedChain;
  }
  throw new Error(
    `Unsupported PONDER_CHAIN "${chain}". Expected one of: ${SUPPORTED_CHAINS.join(", ")}`,
  );
}

function parseMaxResponseBodySize(value: string | undefined): number | false | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "false" || value === "0") return false;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid PONDER_RPC_MAX_RESPONSE_BODY_SIZE "${value}". Expected a positive byte count, 0, or false.`);
  }
  return parsed;
}

/**
 * Prefer a raw RPC URL string so Ponder uses its own HTTP client and rate
 * limiter. A viem `http()` transport is tagged `custom_transport` and is
 * constructed with `retryCount: 0`, which turns Alchemy CUPS 429s into a
 * retry storm and stalls Base Sepolia backfill.
 *
 * Only wrap in viem `http()` when we need a non-default max response body size.
 */
function getRpcTransport(url: string | undefined) {
  if (!url) return undefined;
  const maxResponseBodySize = parseMaxResponseBodySize(process.env.PONDER_RPC_MAX_RESPONSE_BODY_SIZE);
  if (maxResponseBodySize === undefined || maxResponseBodySize === false) {
    return url;
  }
  return http(url, {
    timeout: 10_000,
    maxResponseBodySize,
  });
}

export function hostedPollingIntervalMs(): number {
  const raw = process.env.PONDER_POLL_INTERVAL_MS;
  if (raw !== undefined && raw !== "") {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 500) {
      throw new Error(`Invalid PONDER_POLL_INTERVAL_MS "${raw}". Expected a millisecond count >= 500.`);
    }
    return parsed;
  }
  return 4000;
}

export type IndexerDeploymentContext = {
  chain: SupportedChain;
  startBlock: number;
  lazyGivingStartBlock: number;
  delegationStartBlock: number;
  fundingPortalStartBlock: number;
  contentFundingStartBlock: number;
  publishedDataStartBlock: number;
  ethGetLogsBlockRange: number | undefined;
  getDeployments: (
    logicalName: string,
    legacyAddressEnvVar: string,
    legacyStartBlock: number,
  ) => ContractDeployment[];
  deploymentConfig: (deployments: ContractDeployment[], fallbackStartBlock: number) => {
    address: `0x${string}` | readonly `0x${string}`[] | undefined;
    startBlock: number;
  };
  deploymentStartBlock: (deployments: ContractDeployment[], fallback: number) => number;
  factoryAddress: (deployments: ContractDeployment[]) => { address: `0x${string}` | readonly `0x${string}`[]; startBlock: number } | undefined;
  contractStartBlock: (specificEnvVar: string, fallback: number) => number;
};

export function loadIndexerDeploymentContext(): IndexerDeploymentContext {
  const startBlock = parseStartBlock(process.env.START_BLOCK, 0);
  const chain = getIndexerChain();
  const manifest = parseDeploymentManifest();

  function manifestDeployments(logicalName: string): ContractDeployment[] | undefined {
    return manifest.chains?.[chain]?.[logicalName] ?? manifest[chain]?.[logicalName];
  }

  function getDeployments(
    logicalName: string,
    legacyAddressEnvVar: string,
    legacyStartBlock: number,
  ): ContractDeployment[] {
    const deployments = manifestDeployments(logicalName) ?? parseLegacyDeployment(legacyAddressEnvVar, legacyStartBlock);
    return deployments.map((deployment) => ({
      address: deployment.address,
      startBlock: parseStartBlock(String(deployment.startBlock), legacyStartBlock),
    }));
  }

  function deploymentAddresses(deployments: ContractDeployment[]): `0x${string}` | readonly `0x${string}`[] | undefined {
    if (deployments.length === 0) return undefined;
    if (deployments.length === 1) return deployments[0]!.address;
    return deployments.map((deployment) => deployment.address);
  }

  function deploymentStartBlock(deployments: ContractDeployment[], fallback: number): number {
    if (deployments.length === 0) return fallback;
    return Math.min(...deployments.map((deployment) => deployment.startBlock));
  }

  function factoryAddress(deployments: ContractDeployment[]) {
    const address = deploymentAddresses(deployments);
    return address ? { address, startBlock: deploymentStartBlock(deployments, startBlock) } : undefined;
  }

  return {
    chain,
    startBlock,
    lazyGivingStartBlock: parseStartBlock(process.env.LAZYGIVING_START_BLOCK, startBlock),
    delegationStartBlock: parseStartBlock(process.env.DELEGATION_START_BLOCK, startBlock),
    fundingPortalStartBlock: parseStartBlock(process.env.FUNDING_PORTAL_START_BLOCK, startBlock),
    contentFundingStartBlock: parseStartBlock(process.env.CONTENT_FUNDING_START_BLOCK, startBlock),
    publishedDataStartBlock: parseStartBlock(process.env.PUBLISHED_DATA_START_BLOCK, startBlock),
    ethGetLogsBlockRange: process.env.PONDER_ETH_GET_LOGS_BLOCK_RANGE
      ? Number(process.env.PONDER_ETH_GET_LOGS_BLOCK_RANGE)
      : undefined,
    getDeployments,
    deploymentConfig(deployments, fallbackStartBlock) {
      return {
        address: deploymentAddresses(deployments),
        startBlock: deploymentStartBlock(deployments, fallbackStartBlock),
      };
    },
    deploymentStartBlock,
    factoryAddress,
    contractStartBlock,
  };
}

export function getActiveChains(context: IndexerDeploymentContext) {
  switch (context.chain) {
    case "hardhat":
      return {
        hardhat: {
          id: INDEXER_CHAIN_IDS.hardhat,
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_31337 || "http://localhost:8545"),
          pollingInterval: 100,
        },
      } as const;
    case "base-sepolia":
      return {
        "base-sepolia": {
          id: INDEXER_CHAIN_IDS["base-sepolia"],
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_84532),
          ethGetLogsBlockRange: context.ethGetLogsBlockRange ?? 10000,
          pollingInterval: hostedPollingIntervalMs(),
        },
      } as const;
    case "mainnet":
      return {
        mainnet: {
          id: INDEXER_CHAIN_IDS.mainnet,
          rpc: getRpcTransport(process.env.PONDER_RPC_URL_1),
          ethGetLogsBlockRange: context.ethGetLogsBlockRange,
          pollingInterval: hostedPollingIntervalMs(),
        },
      } as const;
  }
}

/** Hosted chains get the log-range and monthly-capacity RPC guards. */
export function installHostedRpcGuards(context: IndexerDeploymentContext): void {
  if (context.chain === "hardhat") return;
  const configuredRange =
    context.chain === "base-sepolia"
      ? (context.ethGetLogsBlockRange ?? 10000)
      : context.ethGetLogsBlockRange;
  installEthGetLogsRangeGuard({ configuredRange });
  installMonthlyCapacityGuard();
}
