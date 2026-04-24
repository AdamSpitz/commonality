import type { NudgerConfig } from '@commonality/nudger-core';

function requireEnv(name: string, value: string | undefined = process.env[name]): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function readStringEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}


export function loadConfig(): NudgerConfig {
  return {
    nudgerPrivateKey: requireEnv('NUDGER_PRIVATE_KEY', process.env.NUDGER_PRIVATE_KEY) as `0x${string}`,
    ethereumRpcUrl: requireEnv('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL),
    indexerUrl: readStringEnv('INDEXER_URL', 'http://localhost:3001'),
    ipfsApiUrl: readStringEnv('IPFS_API', 'http://localhost:5001'),
    ipfsGatewayUrl: readStringEnv('IPFS_GATEWAY', 'http://localhost:8080'),
    name: readStringEnv('NUDGER_NAME', 'Implication Graph Nudger'),
    description: readStringEnv('NUDGER_DESCRIPTION', 'Suggests statements based on the implication graph'),
    sourceType: readStringEnv('NUDGER_SOURCE_TYPE', 'implication-graph'),
    version: readStringEnv('NUDGER_VERSION', '0.1.0'),
    nudgePublicationsContractAddress: requireEnv('NUDGE_PUBLICATIONS_CONTRACT_ADDRESS', process.env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS),
  };
}
