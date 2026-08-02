import { getAddress, type Address } from 'viem';

export interface MirrorConfig {
  rpcUrl: string;
  publishedDataAddress: Address;
  ipfsApiUrl: string;
  chainId: number;
  startBlock: bigint;
  confirmations: bigint;
  blockRange: bigint;
  pollIntervalMs: number;
  stateFile: string;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): MirrorConfig {
  return {
    rpcUrl: required(env, 'RPC_URL'),
    publishedDataAddress: getAddress(required(env, 'PUBLISHED_DATA_CONTRACT_ADDRESS')),
    ipfsApiUrl: required(env, 'IPFS_API_URL'),
    chainId: Number(required(env, 'CHAIN_ID')),
    startBlock: BigInt(required(env, 'START_BLOCK')),
    confirmations: BigInt(env.CONFIRMATIONS ?? '12'),
    blockRange: BigInt(env.BLOCK_RANGE ?? '1000'),
    pollIntervalMs: Number(env.POLL_INTERVAL_MS ?? '10000'),
    stateFile: env.STATE_FILE ?? './data/published-data-ipfs-mirror.json',
  };
}
