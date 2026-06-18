import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat, baseSepolia, mainnet } from 'viem/chains';
import {
  createSDKMachinery,
  getDueStandingPledges,
  isStandingPledgeFundable,
  executeDueStandingPledge,
  RecurringPledgesAbi,
  type ContractAddresses,
} from '@commonality/sdk';
import type { ServiceRunHandle } from './serviceRegistry.js';

function readOptionalStringFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  return undefined;
}

function requireStringFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
): string {
  const value = readOptionalStringFrom(env, names);
  if (!value) throw new Error(`Missing required environment variable: ${names[0]}`);
  return value;
}

function readNumberFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback: number,
): number {
  const raw = readOptionalStringFrom(env, names);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${names[0]}`);
  }
  return parsed;
}

export interface RecurringPledgeSchedulerConfig {
  rpcUrl: string;
  chain?: 'hardhat' | 'base-sepolia' | 'mainnet';
  privateKey: `0x${string}`;
  eventCacheUrl: string;
  pollIntervalMs?: number;
  contracts: ContractAddresses;
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): RecurringPledgeSchedulerConfig {
  return {
    rpcUrl: requireStringFrom(env, ['RECURRING_PLEDGE_SCHEDULER_RPC_URL', 'RPC_URL', 'PONDER_RPC_URL_31337']),
    chain: readOptionalStringFrom(env, ['RECURRING_PLEDGE_SCHEDULER_CHAIN', 'PONDER_CHAIN']) as RecurringPledgeSchedulerConfig['chain'],
    privateKey: requireStringFrom(env, ['RECURRING_PLEDGE_SCHEDULER_PRIVATE_KEY', 'PRIVATE_KEY']) as `0x${string}`,
    eventCacheUrl: requireStringFrom(env, ['RECURRING_PLEDGE_SCHEDULER_EVENT_CACHE_URL', 'EVENT_CACHE_URL']),
    pollIntervalMs: readNumberFrom(env, ['RECURRING_PLEDGE_SCHEDULER_POLL_INTERVAL_MS'], 60_000),
    contracts: {
      beliefs: requireStringFrom(env, ['BELIEFS_CONTRACT_ADDRESS']) as `0x${string}`,
      implications: requireStringFrom(env, ['IMPLICATIONS_CONTRACT_ADDRESS']) as `0x${string}`,
      assuranceContractFactory: requireStringFrom(env, ['ASSURANCE_CONTRACT_FACTORY_ADDRESS']) as `0x${string}`,
      erc1155Factory: requireStringFrom(env, ['ERC1155_FACTORY_ADDRESS']) as `0x${string}`,
      marketplaceFactory: requireStringFrom(env, ['MARKETPLACE_FACTORY_ADDRESS']) as `0x${string}`,
      delegatableNotes: requireStringFrom(env, ['DELEGATABLE_NOTES_ADDRESS', 'DELEGATABLE_NOTES_CONTRACT_ADDRESS']) as `0x${string}`,
      recurringPledges: requireStringFrom(env, ['RECURRING_PLEDGES_ADDRESS', 'RECURRING_PLEDGES_CONTRACT_ADDRESS']) as `0x${string}`,
      noteIntent: requireStringFrom(env, ['NOTE_INTENT_ADDRESS']) as `0x${string}`,
      alignmentAttestations: requireStringFrom(env, ['ALIGNMENT_ATTESTATIONS_ADDRESS', 'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS']) as `0x${string}`,
      mutableRefUpdater: requireStringFrom(env, ['MUTABLE_REF_UPDATER_ADDRESS', 'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS']) as `0x${string}`,
      trustRegistry: requireStringFrom(env, ['TRUST_REGISTRY_ADDRESS']) as `0x${string}`,
      nudgePublications: readOptionalStringFrom(env, ['NUDGE_PUBLICATIONS_CONTRACT_ADDRESS']) as `0x${string}` | undefined,
      contentRegistry: readOptionalStringFrom(env, ['CONTENT_REGISTRY_ADDRESS']) as `0x${string}` | undefined,
      channelRegistry: readOptionalStringFrom(env, ['CHANNEL_REGISTRY_ADDRESS']) as `0x${string}` | undefined,
      channelEscrow: readOptionalStringFrom(env, ['CHANNEL_ESCROW_ADDRESS']) as `0x${string}` | undefined,
      creatorContractFactory: readOptionalStringFrom(env, ['CREATOR_CONTRACT_FACTORY_ADDRESS']) as `0x${string}` | undefined,
    },
  };
}

function selectChain(name: RecurringPledgeSchedulerConfig['chain']) {
  switch (name ?? 'hardhat') {
    case 'hardhat': return hardhat;
    case 'base-sepolia': return baseSepolia;
    case 'mainnet': return mainnet;
  }
}

export function runRecurringPledgeScheduler(config: RecurringPledgeSchedulerConfig): ServiceRunHandle {
  const chain = selectChain(config.chain);
  const account = privateKeyToAccount(config.privateKey);
  const publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(config.rpcUrl) });
  const pollIntervalMs = config.pollIntervalMs ?? 60_000;
  let stopped = false;
  let running = false;

  const machinery = createSDKMachinery(
    {},
    {},
    {},
    // viem's inferred chain-specific client type is narrower than the SDK machinery needs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publicClient as any,
    config.eventCacheUrl,
    config.contracts,
  );

  const clients = { publicClient, walletClient };
  const recurringPledgesAddress = config.contracts.recurringPledges;
  if (!recurringPledgesAddress) throw new Error('recurring pledge scheduler requires contracts.recurringPledges');

  async function tick() {
    if (stopped || running) return;
    running = true;
    try {
      const duePledges = await getDueStandingPledges(machinery);
      for (const pledge of duePledges) {
        if (stopped) return;
        const pledgeId = BigInt(pledge.id);
        const fundable = await isStandingPledgeFundable(machinery, pledgeId);
        if (!fundable) continue;
        await executeDueStandingPledge(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          clients as any,
          { address: recurringPledgesAddress as Address, abi: RecurringPledgesAbi },
          pledgeId,
        );
      }
    } catch (error) {
      console.error('[recurring-pledge-scheduler] tick failed', error);
    } finally {
      running = false;
    }
  }

  void tick();
  const timer: NodeJS.Timeout = setInterval(() => void tick(), pollIntervalMs);

  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}
