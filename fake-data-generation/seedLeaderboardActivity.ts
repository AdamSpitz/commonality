/**
 * Deterministic Hardhat-account purchases and monthly pledges so statement
 * and cause leaderboards have visible ranks after every seed.
 *
 * Hardhat #1–#5 buy receipt tokens on the first few seed projects (unioned
 * across their alignment statements). They also create standing pledges
 * keyed by statement CID — the same causeRef the CauseStarter pledge
 * summary and leaderboard monthly card read.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { fileURLToPath } from 'url';
import { RecurringPledgesAbi, AssuranceContractAbi, MutableRefUpdaterAbi } from '@commonality/sdk/abis';
import {
  approveRecurringPledgeToken,
  createStandingPledge,
} from '@commonality/sdk/delegation';
import { getAllAlignedProjectsForCause } from '@commonality/sdk/fundingportals';
import { buyProjectTokens, getProject, getProjectTokens } from '@commonality/sdk/lazy-giving';
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { getRef } from '@commonality/sdk/mutable-refs';
import { createDefaultDocumentReader } from '@commonality/sdk/displayable-documents';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import type { IpfsCidV1, WriteClients } from '@commonality/sdk/utils';
import { CONTRACT_ADDRESSES, loadEnv, RPC_URL } from './loadEnv.js';
import { createSeedClients } from './seedRpc.js';
import { parsePaymentTokenUnits } from './paymentTokenUnits.js';
import {
  FUNDED_HARDHAT_DEV_KEYS,
  SEED_CAUSE_OWNER_ADDRESS,
  SEED_CAUSE_SLUG,
} from './seedCauseRoster.js';

loadEnv();

const paymentTokenFundingAbi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'mintTo',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const MONTH_SECONDS = 30n * 24n * 60n * 60n;

export interface SeedLeaderboardProject {
  assuranceContract: `0x${string}`;
  erc1155: `0x${string}`;
  tokenIds: number[];
  prices: string[];
}

export interface SeedLeaderboardBuy {
  accountIndex: number;
  projectIndex: number;
  tokenIndex: number;
  count: number;
}

export interface SeedLeaderboardPledge {
  accountIndex: number;
  statementCidIndex: number;
  amount: string;
}

/** Cheap token-1 (index 0) buys so ranks differ across garden + other seed projects. */
const DEFAULT_BUYS: SeedLeaderboardBuy[] = [
  { accountIndex: 1, projectIndex: 0, tokenIndex: 0, count: 8 },
  { accountIndex: 2, projectIndex: 0, tokenIndex: 0, count: 5 },
  { accountIndex: 3, projectIndex: 0, tokenIndex: 0, count: 2 },
  { accountIndex: 2, projectIndex: 1, tokenIndex: 0, count: 4 },
  { accountIndex: 4, projectIndex: 1, tokenIndex: 0, count: 6 },
  { accountIndex: 5, projectIndex: 1, tokenIndex: 0, count: 1 },
  { accountIndex: 1, projectIndex: 2, tokenIndex: 0, count: 3 },
  { accountIndex: 5, projectIndex: 2, tokenIndex: 0, count: 4 },
  { accountIndex: 3, projectIndex: 3, tokenIndex: 0, count: 3 },
];

const DEFAULT_PLEDGES: SeedLeaderboardPledge[] = [
  { accountIndex: 1, statementCidIndex: 0, amount: '25' },
  { accountIndex: 2, statementCidIndex: 0, amount: '10' },
  { accountIndex: 4, statementCidIndex: 0, amount: '5' },
  { accountIndex: 3, statementCidIndex: 1, amount: '8' },
];

function createClients(privateKey: `0x${string}`) {
  return createSeedClients(privateKey, RPC_URL);
}

async function fundPaymentToken(to: `0x${string}`, amount: bigint): Promise<void> {
  const token = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined;
  if (!token) throw new Error('PAYMENT_TOKEN_ADDRESS not configured');
  const funder = createClients(FUNDED_HARDHAT_DEV_KEYS[0]!);
  try {
    const hash = await funder.walletClient.writeContract({
      address: token,
      abi: paymentTokenFundingAbi,
      functionName: 'transfer',
      args: [to, amount],
      chain: funder.walletClient.chain,
      account: funder.walletClient.account!,
    });
    await funder.publicClient.waitForTransactionReceipt({ hash });
  } catch {
    const hash = await funder.walletClient.writeContract({
      address: token,
      abi: paymentTokenFundingAbi,
      functionName: 'mintTo',
      args: [to, amount],
      chain: funder.walletClient.chain,
      account: funder.walletClient.account!,
    });
    await funder.publicClient.waitForTransactionReceipt({ hash });
  }
}

export async function publishSeedLeaderboardActivity(params: {
  projects: SeedLeaderboardProject[];
  statementCids: string[];
}): Promise<{ purchases: number; pledges: number }> {
  const { projects, statementCids } = params;
  console.log('\n=== Seeding Hardhat leaderboard purchases and monthly pledges ===\n');

  if (projects.length === 0) {
    console.warn('No seed projects available — skipping leaderboard activity.');
    return { purchases: 0, pledges: 0 };
  }

  const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined;
  if (!paymentToken) {
    console.warn('PAYMENT_TOKEN_ADDRESS not configured — skipping leaderboard activity.');
    return { purchases: 0, pledges: 0 };
  }

  const accountIndexes = [...new Set([
    ...DEFAULT_BUYS.map((buy) => buy.accountIndex),
    ...DEFAULT_PLEDGES.map((pledge) => pledge.accountIndex),
  ])];
  for (const index of accountIndexes) {
    const key = FUNDED_HARDHAT_DEV_KEYS[index];
    if (!key) continue;
    await fundPaymentToken(privateKeyToAccount(key).address, parsePaymentTokenUnits('5000'));
  }

  let purchases = 0;
  for (const buy of DEFAULT_BUYS) {
    const project = projects[buy.projectIndex] ?? projects[0];
    const key = FUNDED_HARDHAT_DEV_KEYS[buy.accountIndex];
    if (!project || !key) continue;
    const tokenId = project.tokenIds[buy.tokenIndex];
    const price = project.prices[buy.tokenIndex];
    if (tokenId === undefined || price === undefined) continue;

    const clients = createClients(key);
    const totalCost = BigInt(price) * BigInt(buy.count);
    try {
      await buyProjectTokens(
        clients as WriteClients,
        { address: project.assuranceContract, abi: AssuranceContractAbi },
        {
          buyer: clients.account,
          tokenAddress: project.erc1155,
          tokenIds: [BigInt(tokenId)],
          tokenCounts: [BigInt(buy.count)],
          totalCost,
        },
      );
      purchases++;
      console.log(
        `  ✓ HH#${buy.accountIndex} bought ${buy.count}× token ${tokenId} on ${project.assuranceContract}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `  Failed HH#${buy.accountIndex} buy on project ${buy.projectIndex}: ${message}`,
      );
    }
  }

  const recurringPledges = CONTRACT_ADDRESSES.recurringPledges as `0x${string}` | undefined;
  const notes = CONTRACT_ADDRESSES.delegatableNotes as `0x${string}` | undefined;
  let pledges = 0;
  if (!recurringPledges || !notes) {
    console.warn('Recurring pledges or DelegatableNotes not configured — skipping monthly pledges.');
  } else if (statementCids.length === 0) {
    console.warn('No statement CIDs — skipping monthly pledges.');
  } else {
    for (const pledge of DEFAULT_PLEDGES) {
      const key = FUNDED_HARDHAT_DEV_KEYS[pledge.accountIndex];
      const cid = statementCids[pledge.statementCidIndex] ?? statementCids[0];
      if (!key || !cid) continue;
      const clients = createClients(key);
      const delegateKey = FUNDED_HARDHAT_DEV_KEYS[0]!;
      const delegateTo = privateKeyToAccount(delegateKey).address;
      const amount = parsePaymentTokenUnits(pledge.amount);
      try {
        await approveRecurringPledgeToken(clients as WriteClients, {
          token: paymentToken,
          delegatableNotes: notes,
          amount: amount * 12n,
        });
        await createStandingPledge(
          clients as WriteClients,
          { address: recurringPledges, abi: RecurringPledgesAbi },
          {
            delegateTo,
            token: paymentToken,
            amountPerPeriod: amount,
            period: MONTH_SECONDS,
            causeRef: cid,
          },
        );
        pledges++;
        console.log(
          `  ✓ HH#${pledge.accountIndex} pledged ${pledge.amount}/month on ${cid.slice(0, 18)}…`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`  Failed HH#${pledge.accountIndex} monthly pledge: ${message}`);
      }
    }
  }

  console.log(`Seeded ${purchases} purchases and ${pledges} monthly pledges from Hardhat accounts.`);
  return { purchases, pledges };
}

/** Populate the current local chain from the published seed cause (no full re-seed). */
export async function publishSeedLeaderboardActivityFromLiveCause(): Promise<void> {
  const mutableRef = CONTRACT_ADDRESSES.mutableRefUpdater as `0x${string}` | undefined;
  if (!mutableRef) {
    throw new Error('MutableRefUpdater not configured');
  }
  const readers = createClients(FUNDED_HARDHAT_DEV_KEYS[0]!);
  const rosterCid = await getRef(
    readers as WriteClients,
    { address: mutableRef, abi: MutableRefUpdaterAbi },
    SEED_CAUSE_OWNER_ADDRESS,
    SEED_CAUSE_SLUG,
  );
  if (!rosterCid) {
    throw new Error('No published seed cause roster — run a full seed first.');
  }

  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const machinery = createSDKMachinery({
    ipfsConfig,
    publicClient: readers.publicClient,
    eventCacheUrl: process.env.EVENT_CACHE_URL,
    contractAddresses: {
      beliefs: CONTRACT_ADDRESSES.beliefs as `0x${string}`,
      implications: CONTRACT_ADDRESSES.implications as `0x${string}`,
      assuranceContractFactory: CONTRACT_ADDRESSES.assuranceContractFactory as `0x${string}`,
      erc1155Factory: CONTRACT_ADDRESSES.erc1155Factory as `0x${string}`,
      delegatableNotes: CONTRACT_ADDRESSES.delegatableNotes as `0x${string}`,
      recurringPledges: CONTRACT_ADDRESSES.recurringPledges as `0x${string}` | undefined,
      noteIntent: process.env.NOTE_INTENT_ADDRESS as `0x${string}`,
      alignmentAttestations: CONTRACT_ADDRESSES.alignmentAttestations as `0x${string}`,
      mutableRefUpdater: mutableRef,
      trustRegistry: process.env.TRUST_REGISTRY_ADDRESS as `0x${string}`,
      publishedData: CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined,
    },
  });
  const reader = createDefaultDocumentReader(machinery);
  const roster = await reader.read(rosterCid as IpfsCidV1);
  const extras = (roster.status === 'active' ? roster.document.extras : undefined) ?? {};
  const statementCids = Array.isArray(extras.plankCids)
    ? extras.plankCids.filter((cid): cid is string => typeof cid === 'string' && cid.length > 0)
    : [];
  if (statementCids.length === 0) {
    throw new Error('Seed cause roster has no plank CIDs.');
  }

  const aligned = await getAllAlignedProjectsForCause(
    machinery,
    statementCids[0] as IpfsCidV1,
  );
  const projects: SeedLeaderboardProject[] = [];
  for (const alignedProject of aligned) {
    const project = await getProject(machinery, alignedProject.projectAddress);
    const tokens = await getProjectTokens(machinery, alignedProject.projectAddress);
    if (!project || tokens.length === 0) continue;
    projects.push({
      assuranceContract: project.id as `0x${string}`,
      erc1155: project.erc1155Address as `0x${string}`,
      tokenIds: tokens.map((token) => Number(token.tokenId)),
      prices: tokens.map((token) => token.price),
    });
  }

  await publishSeedLeaderboardActivity({ projects, statementCids });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  publishSeedLeaderboardActivityFromLiveCause()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
