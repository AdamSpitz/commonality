import { getAddress, type Address } from 'viem';
import { loadConfigFromEnv, type CauseAssistConfig } from '@commonality/cause-assist';

export interface WorkerConfig {
  rpcUrl: string;
  chainId: number;
  mutableRefUpdaterAddress: Address;
  startBlock: bigint;
  confirmations: bigint;
  blockRange: bigint;
  pollIntervalMs: number;
  stateFile: string;
  contentRetryCount: number;
  contentRetryDelayMs: number;
  causeAssist: CauseAssistConfig;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const rpcUrl = env.RPC_URL?.trim() || env.CAUSE_ASSIST_ETHEREUM_RPC_URL?.trim()
    || env.ETHEREUM_RPC_URL?.trim();
  if (!rpcUrl) throw new Error('RPC_URL is required');
  const assistEnv = { ...env, CAUSE_ASSIST_ETHEREUM_RPC_URL: rpcUrl };
  return {
    rpcUrl,
    chainId: Number(required(env, 'CHAIN_ID')),
    mutableRefUpdaterAddress: getAddress(required(env, 'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS')),
    startBlock: BigInt(required(env, 'START_BLOCK')),
    confirmations: BigInt(env.CONFIRMATIONS ?? '12'),
    blockRange: BigInt(env.BLOCK_RANGE ?? '1000'),
    pollIntervalMs: Number(env.POLL_INTERVAL_MS ?? '10000'),
    stateFile: env.STATE_FILE ?? './data/coherence-badge-worker.json',
    contentRetryCount: Number(env.CONTENT_RETRY_COUNT ?? '3'),
    contentRetryDelayMs: Number(env.CONTENT_RETRY_DELAY_MS ?? '2000'),
    causeAssist: loadConfigFromEnv(assistEnv),
  };
}
