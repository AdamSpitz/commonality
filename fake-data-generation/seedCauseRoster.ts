/**
 * Publish a deterministic CauseStarter roster during seed so a live local
 * cause already includes the local-food-systems plank (garden project + mixed
 * content contract).
 *
 * The roster document extras must stay isomorphic with
 * `causestarter/src/lib/causeRoster.ts` (`kind: causestarter.roster`, version 1).
 * Bookmarks use the same JSON as `causestarter/src/lib/causeBookmarks.ts`.
 */

import { PublishedDataAbi, MutableRefUpdaterAbi } from '@commonality/sdk/abis';
import {
  createDefaultDocumentStore,
  createDisplayableDocument,
} from '@commonality/sdk/displayable-documents';
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { updateRef } from '@commonality/sdk/mutable-refs';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import type { IpfsCidV1, WriteClients } from '@commonality/sdk/utils';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { HARDHAT_PRIVATE_KEYS } from './generateUsers.js';
import { CONTRACT_ADDRESSES, RPC_URL } from './loadEnv.js';

export const ROSTER_KIND = 'causestarter.roster' as const;
export const ROSTER_SCHEMA_VERSION = 1 as const;
export const CAUSE_BOOKMARKS_REF = 'bookmarked-causes';
export const CAUSE_BOOKMARKS_SCHEMA_VERSION = 1 as const;

export const SEED_CAUSE_SLUG = 'local-food-systems';
export const SEED_CAUSE_TITLE = 'Local food systems';
export const SEED_CAUSE_SUMMARY =
  'Neighborhood growing, markets, and writing that helps people eat closer to home. Seed includes the Riverside Community Garden project and a mixed @civicbuilder content contract (1 of 2 posts attested).';
export const SEED_CAUSE_MEDIATOR_BLURB = '';

/** Hardhat #0 — connect as this account to see the bookmarked seed cause. */
export const SEED_CAUSE_OWNER_ADDRESS = privateKeyToAccount(HARDHAT_PRIVATE_KEYS[0]!).address;

const hardhat = {
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
} as const;

export interface SeedCauseRosterFields {
  title: string;
  summary: string;
  plankCids: string[];
  mediatorBlurb: string;
}

export function seedCauseRosterFields(plankCid: string): SeedCauseRosterFields {
  return {
    title: SEED_CAUSE_TITLE,
    summary: SEED_CAUSE_SUMMARY,
    plankCids: [plankCid],
    mediatorBlurb: SEED_CAUSE_MEDIATOR_BLURB,
  };
}

export function renderSeedRosterContent(fields: SeedCauseRosterFields): string {
  const lines: string[] = [`# ${fields.title}`];
  if (fields.summary.trim()) {
    lines.push('', fields.summary.trim());
  }
  if (fields.plankCids.length > 0) {
    lines.push('', '## Issues');
    for (const cid of fields.plankCids) {
      lines.push(`- ${cid}`);
    }
  }
  if (fields.mediatorBlurb.trim()) {
    lines.push('', '## Mediator', fields.mediatorBlurb.trim());
  }
  return lines.join('\n');
}

export function buildSeedRosterDocument(fields: SeedCauseRosterFields) {
  return createDisplayableDocument({
    format: 'markdown-restricted',
    content: renderSeedRosterContent(fields),
    references: fields.plankCids.map((cid) => ({ cid, label: 'plank' })),
    extras: {
      kind: ROSTER_KIND,
      version: ROSTER_SCHEMA_VERSION,
      title: fields.title,
      summary: fields.summary,
      plankCids: [...fields.plankCids],
      mediatorBlurb: fields.mediatorBlurb,
    },
  });
}

export function serializeSeedCauseBookmarkList(
  ids: { owner: string; slug: string }[],
): string {
  return JSON.stringify({
    version: CAUSE_BOOKMARKS_SCHEMA_VERSION,
    causes: ids.map((id) => ({
      owner: id.owner.toLowerCase(),
      slug: id.slug,
    })),
  });
}

function createClients(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(RPC_URL),
  });
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
  });
  return { walletClient, publicClient, account: account.address };
}

export async function publishSeedLocalFoodCause(plankCid: IpfsCidV1): Promise<{
  owner: `0x${string}`;
  slug: string;
  rosterCid: string;
} | null> {
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const mutableRefUpdater = CONTRACT_ADDRESSES.mutableRefUpdater as `0x${string}` | undefined;
  if (!publishedData || !mutableRefUpdater) {
    console.warn(
      'PublishedData or MutableRefUpdater not configured — skipping seed CauseStarter roster.',
    );
    return null;
  }

  console.log('\n=== Publishing seed CauseStarter roster (local food systems) ===\n');

  const ownerKey = HARDHAT_PRIVATE_KEYS[0]!;
  const ownerClients = createClients(ownerKey);
  const fields = seedCauseRosterFields(plankCid);
  const doc = buildSeedRosterDocument(fields);
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const store = createDefaultDocumentStore(createSDKMachinery({ ipfsConfig }), {
    clients: ownerClients as WriteClients,
    publishedDataContract: { address: publishedData, abi: PublishedDataAbi },
  });
  const publication = await store.publish(doc);
  const rosterCid = publication.cid;

  const refContract = { address: mutableRefUpdater, abi: MutableRefUpdaterAbi };
  await updateRef(ownerClients as WriteClients, refContract, SEED_CAUSE_SLUG, rosterCid);

  const bookmarkValue = serializeSeedCauseBookmarkList([
    { owner: ownerClients.account, slug: SEED_CAUSE_SLUG },
  ]);
  for (const key of HARDHAT_PRIVATE_KEYS) {
    const clients = createClients(key);
    await updateRef(clients as WriteClients, refContract, CAUSE_BOOKMARKS_REF, bookmarkValue);
  }

  console.log(
    `  ✓ Cause ${SEED_CAUSE_SLUG} published by ${ownerClients.account} → ${rosterCid}`,
  );
  console.log(`  ✓ Bookmarked for Hardhat #0–#${HARDHAT_PRIVATE_KEYS.length - 1}`);
  console.log(`  Open /cause/${ownerClients.account}/${SEED_CAUSE_SLUG} as any Hardhat account.\n`);

  return { owner: ownerClients.account, slug: SEED_CAUSE_SLUG, rosterCid };
}
