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
import { privateKeyToAccount } from 'viem/accounts';
import { HARDHAT_PRIVATE_KEYS } from './generateUsers.js';
import { CONTRACT_ADDRESSES, RPC_URL } from './loadEnv.js';
import { createSeedClients } from './seedRpc.js';

export const ROSTER_KIND = 'causestarter.roster' as const;
export const ROSTER_SCHEMA_VERSION = 1 as const;
export const BRIDGE_CLUSTER_KIND = 'causestarter.bridge-cluster' as const;
export const BRIDGE_CLUSTER_SCHEMA_VERSION = 1 as const;
export const CAUSE_BOOKMARKS_REF = 'bookmarked-causes';
export const CAUSE_BOOKMARKS_SCHEMA_VERSION = 1 as const;

export const SEED_CAUSE_SLUG = 'local-food-systems';
export const SEED_CAUSE_TITLE = 'Local food systems';
export const SEED_CAUSE_SUMMARY =
  'Neighborhood growing, markets, and writing that helps people eat closer to home. Seed includes the Riverside Community Garden project and a mixed @civicbuilder content contract (1 of 2 posts attested).';
export const SEED_CAUSE_MEDIATOR_BLURB = '';

/** Hardhat #0 — connect as this account to see the bookmarked seed cause. */
export const SEED_CAUSE_OWNER_ADDRESS = privateKeyToAccount(HARDHAT_PRIVATE_KEYS[0]!).address;

/** Canonical Hardhat #0–#9 keys (funded on the local chain). */
export const FUNDED_HARDHAT_DEV_KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
] as const;

export interface SeedCauseMediator {
  name: string;
  description: string;
  address: string;
  serviceUrl: string;
}

export interface SeedRosterBridgeLink {
  clusterOwner: string;
  clusterSlug: string;
  role: 'modified' | 'bridge';
  parentOwner?: string;
  parentSlug?: string;
}

export interface SeedCauseRosterFields {
  title: string;
  summary: string;
  plankCids: string[];
  mediatorBlurb: string;
  mediator?: SeedCauseMediator;
  /** Present on mediator-owned modified/bridge rosters, never on natural camp boards. */
  bridgeCluster?: SeedRosterBridgeLink;
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
      ...(fields.mediator ? { mediator: fields.mediator } : {}),
      ...(fields.bridgeCluster ? { bridgeCluster: normalizeSeedBridgeCluster(fields.bridgeCluster) } : {}),
    },
  });
}

function normalizeSeedBridgeCluster(link: SeedRosterBridgeLink): SeedRosterBridgeLink {
  return {
    clusterOwner: link.clusterOwner.toLowerCase(),
    clusterSlug: link.clusterSlug,
    role: link.role,
    ...(link.parentOwner && link.parentSlug
      ? { parentOwner: link.parentOwner.toLowerCase(), parentSlug: link.parentSlug }
      : {}),
  };
}

export interface SeedClusterPair {
  fromCid: string;
  toCid: string;
  role: 'modified-to-bridge' | 'modified-to-parent' | 'parent-to-bridge';
}

export interface SeedBridgeClusterFields {
  mediatorName: string;
  mediatorNote: string;
  mediatorAddress: string;
  parents: Array<{ owner: string; slug: string }>;
  modified: Array<{ owner: string; slug: string; parentOwner: string; parentSlug: string }>;
  bridge: { owner: string; slug: string };
  pairs: SeedClusterPair[];
}

export function renderSeedClusterContent(fields: SeedBridgeClusterFields): string {
  const lines = [
    '# Bridge cluster',
    '',
    `Mediator: ${fields.mediatorName.trim()}`,
  ];
  if (fields.mediatorNote.trim()) {
    lines.push('', fields.mediatorNote.trim());
  }
  lines.push('', '## Natural parents');
  for (const parent of fields.parents) {
    lines.push(`- ${parent.owner.toLowerCase()}/${parent.slug}`);
  }
  lines.push('', '## Modified causes');
  for (const modified of fields.modified) {
    lines.push(
      `- ${modified.owner.toLowerCase()}/${modified.slug} (from ${modified.parentOwner.toLowerCase()}/${modified.parentSlug})`,
    );
  }
  lines.push('', '## Bridge cause', `- ${fields.bridge.owner.toLowerCase()}/${fields.bridge.slug}`);
  lines.push('', '## Intended plank pairs');
  for (const pair of fields.pairs) {
    lines.push(`- ${pair.fromCid} → ${pair.toCid} (${pair.role})`);
  }
  return lines.join('\n');
}

export function buildSeedClusterDocument(fields: SeedBridgeClusterFields) {
  const mediatorAddress = fields.mediatorAddress.toLowerCase();
  return createDisplayableDocument({
    format: 'markdown-restricted',
    content: renderSeedClusterContent(fields),
    extras: {
      kind: BRIDGE_CLUSTER_KIND,
      version: BRIDGE_CLUSTER_SCHEMA_VERSION,
      mediatorName: fields.mediatorName.trim(),
      mediatorNote: fields.mediatorNote.trim(),
      mediatorAddress,
      parents: fields.parents.map((parent) => ({
        owner: parent.owner.toLowerCase(),
        slug: parent.slug,
      })),
      modified: fields.modified.map((modified) => ({
        owner: modified.owner.toLowerCase(),
        slug: modified.slug,
        parentOwner: modified.parentOwner.toLowerCase(),
        parentSlug: modified.parentSlug,
      })),
      bridge: {
        owner: fields.bridge.owner.toLowerCase(),
        slug: fields.bridge.slug,
      },
      pairs: fields.pairs.map((pair) => ({ ...pair })),
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
  return createSeedClients(privateKey, RPC_URL);
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
  for (const key of FUNDED_HARDHAT_DEV_KEYS) {
    const clients = createClients(key);
    await updateRef(clients as WriteClients, refContract, CAUSE_BOOKMARKS_REF, bookmarkValue);
  }

  console.log(
    `  ✓ Cause ${SEED_CAUSE_SLUG} published by ${ownerClients.account} → ${rosterCid}`,
  );
  console.log(`  ✓ Bookmarked for Hardhat #0–#${FUNDED_HARDHAT_DEV_KEYS.length - 1}`);
  console.log(`  Open /cause/${ownerClients.account}/${SEED_CAUSE_SLUG} as any Hardhat account.\n`);

  return { owner: ownerClients.account, slug: SEED_CAUSE_SLUG, rosterCid };
}
