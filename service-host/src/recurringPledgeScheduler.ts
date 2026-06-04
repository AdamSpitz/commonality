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

export interface RecurringPledgeSchedulerConfig {
  rpcUrl: string;
  chain?: 'hardhat' | 'base-sepolia' | 'mainnet';
  privateKey: `0x${string}`;
  eventCacheUrl: string;
  pollIntervalMs?: number;
  contracts: ContractAddresses;
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
    '',
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
