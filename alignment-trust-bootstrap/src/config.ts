import { getAddress, type Address, type Hex } from 'viem';

export interface BootstrapConfig {
  rpcUrl: string;
  chainId: number;
  alignmentAttestationsAddress: Address;
  trustRegistryAddress: Address;
  privateKey: Hex;
  startBlock: bigint;
  confirmations: bigint;
  blockRange: bigint;
  pollIntervalMs: number;
  batchSize: number;
  maxAdmissionsPerPoll: number;
  stateFile: string;
  denylistFile: string;
  pauseFile?: string;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveInteger(env: NodeJS.ProcessEnv, name: string, fallback: string): number {
  const value = Number(env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function loadBootstrapConfig(env: NodeJS.ProcessEnv = process.env): BootstrapConfig {
  const privateKey = required(env, 'ALIGNMENT_TRUST_BOOTSTRAP_PRIVATE_KEY');
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error('ALIGNMENT_TRUST_BOOTSTRAP_PRIVATE_KEY must be a 32-byte hex private key');
  }
  return {
    rpcUrl: env.RPC_URL?.trim() || required(env, 'ETHEREUM_RPC_URL'),
    chainId: positiveInteger(env, 'CHAIN_ID', '31337'),
    alignmentAttestationsAddress: getAddress(required(env, 'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS')),
    trustRegistryAddress: getAddress(required(env, 'TRUST_REGISTRY_ADDRESS')),
    privateKey: privateKey as Hex,
    startBlock: BigInt(required(env, 'START_BLOCK')),
    confirmations: BigInt(env.CONFIRMATIONS ?? '12'),
    blockRange: BigInt(env.BLOCK_RANGE ?? '1000'),
    pollIntervalMs: positiveInteger(env, 'POLL_INTERVAL_MS', '10000'),
    batchSize: positiveInteger(env, 'BATCH_SIZE', '50'),
    maxAdmissionsPerPoll: positiveInteger(env, 'MAX_ADMISSIONS_PER_POLL', '100'),
    stateFile: env.STATE_FILE ?? './data/alignment-trust-bootstrap.json',
    denylistFile: env.DENYLIST_FILE ?? './data/alignment-trust-denylist.txt',
    pauseFile: env.PAUSE_FILE?.trim() || undefined,
  };
}
