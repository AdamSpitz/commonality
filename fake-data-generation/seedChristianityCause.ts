/**
 * Tiny CauseStarter story orchestrator: local-food bookmarks, Christianity
 * content-funding extras, recurring pledges, and every tiny-cluster JSON file.
 *
 * Cluster world-building is data/tiny-clusters/*.json + seedTinyCluster.ts.
 * Do not add issue-specific publishers here.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { fileURLToPath } from 'url';
import {
  MutableRefUpdaterAbi,
  RecurringPledgesAbi,
} from '@commonality/sdk/abis';
import { approveRecurringPledgeToken, createStandingPledge } from '@commonality/sdk/delegation';
import { getRef, updateRef } from '@commonality/sdk/mutable-refs';
import { type IpfsCidV1, type WriteClients } from '@commonality/sdk/utils';
import { CONTRACT_ADDRESSES, loadEnv, RPC_URL } from './loadEnv.js';
import { createSeedClients } from './seedRpc.js';
import { parsePaymentTokenUnits } from './paymentTokenUnits.js';
import { generateChristianContentScenario } from './contentFundingActions.js';
import {
  CAUSE_BOOKMARKS_REF,
  FUNDED_HARDHAT_DEV_KEYS,
  SEED_CAUSE_OWNER_ADDRESS,
  SEED_CAUSE_SLUG,
  serializeSeedCauseBookmarkList,
  type SeedCauseRosterFields,
} from './seedCauseRoster.js';
import {
  bridgeRosterFields,
  clusterBookmarkEntries,
  clusterDocumentFields,
  deriveImplications,
  deriveNudges,
  loadTinyClusterDefs,
  mediatorAddress,
  mediatorServiceUrl,
  modifiedRosterFields,
  parentPlanks,
  parentRosterFields,
  pickAlignmentAttester,
  publishAllTinyClusters,
  publishClusterStatements,
  publishTinyClusterDocuments,
  requireParent,
  requireTinyCluster,
  sideOfAlignment,
} from './seedTinyCluster.js';

loadEnv();

const MONTH_SECONDS = 30n * 24n * 60n * 60n;

const christianSecular = requireTinyCluster('christian-secular');
const christianityParent = requireParent(christianSecular, 'christianity');
const secularParent = requireParent(christianSecular, 'secular-conservatism');

export const CHRISTIANITY_CAUSE_SLUG = christianityParent.slug;
export const CHRISTIANITY_CAUSE_TITLE = christianityParent.title;
export const CHRISTIANITY_CAUSE_SUMMARY = christianityParent.summary;
export const CHRISTIAN_MEDIATOR_PRIVATE_KEY = FUNDED_HARDHAT_DEV_KEYS[christianSecular.mediatorHardhatIndex]!;
export const CHRISTIAN_MEDIATOR_ADDRESS = mediatorAddress(christianSecular);
export const CHRISTIAN_MEDIATOR_NAME = christianSecular.mediatorName;
export const CHRISTIAN_MEDIATOR_DESCRIPTION =
  christianSecular.mediatorDescription ?? christianSecular.mediatorNote;

export function seedChristianMediatorServiceUrl(): string {
  return mediatorServiceUrl(christianSecular);
}

export const CHRISTIANITY_PLANKS = parentPlanks(christianSecular, 'christianity');
export const SECULAR_CONSERVATIVE_OWNER_KEY = FUNDED_HARDHAT_DEV_KEYS[secularParent.ownerHardhatIndex]!;
export const SECULAR_CONSERVATIVE_OWNER_ADDRESS = privateKeyToAccount(SECULAR_CONSERVATIVE_OWNER_KEY).address;
export const SECULAR_CONSERVATIVE_CAUSE_SLUG = secularParent.slug;
export const SECULAR_CONSERVATIVE_CAUSE_TITLE = secularParent.title;
export const SECULAR_CONSERVATIVE_CAUSE_SUMMARY = secularParent.summary;
export const SECULAR_CONSERVATIVE_PLANKS = parentPlanks(christianSecular, 'secular-conservatism');
export const CHRISTIAN_SECULAR_CLUSTER_SLUG = christianSecular.clusterSlug;
export const CHRISTIAN_MODIFIED_CAUSE_SLUG = christianityParent.modifiedSlug;
export const SECULAR_MODIFIED_CAUSE_SLUG = secularParent.modifiedSlug;
export const CHRISTIAN_SECULAR_BRIDGE_CAUSE_SLUG = christianSecular.bridge.slug;
export const CHRISTIAN_SECULAR_CLUSTER_NOTE = christianSecular.mediatorNote;
export const CHRISTIANITY_PROJECTS = christianSecular.projects;
export const NATURAL_TO_MODIFIED_NUDGES = deriveNudges(christianSecular);
export const BLESSED_MODIFIED_TO_COMMONALITY = deriveImplications(christianSecular);

function createClients(privateKey: `0x${string}`) {
  return createSeedClients(privateKey, RPC_URL);
}

export function campOfAlignment(alignmentId: string): 'christian' | 'secular' {
  return sideOfAlignment(alignmentId) === 'secular' ? 'secular' : 'christian';
}

export { pickAlignmentAttester };

async function mergeBookmarks(): Promise<void> {
  const mutableRef = CONTRACT_ADDRESSES.mutableRefUpdater as `0x${string}` | undefined;
  if (!mutableRef) return;
  const refContract = { address: mutableRef, abi: MutableRefUpdaterAbi };
  const reader = createClients(FUNDED_HARDHAT_DEV_KEYS[0]!);
  let existing: { owner: string; slug: string }[] = [];
  try {
    const raw = await getRef(
      reader as WriteClients,
      refContract,
      reader.account,
      CAUSE_BOOKMARKS_REF,
    );
    if (raw) {
      const parsed = JSON.parse(raw) as { causes?: { owner: string; slug: string }[] };
      existing = parsed.causes ?? [];
    }
  } catch {
    existing = [];
  }
  const wanted = [
    { owner: SEED_CAUSE_OWNER_ADDRESS, slug: SEED_CAUSE_SLUG },
    ...loadTinyClusterDefs().flatMap(clusterBookmarkEntries),
  ];
  const seen = new Set(existing.map((item) => `${item.owner.toLowerCase()}/${item.slug}`));
  const merged = [...existing];
  for (const item of wanted) {
    const key = `${item.owner.toLowerCase()}/${item.slug}`;
    if (!seen.has(key)) merged.push(item);
  }
  const value = serializeSeedCauseBookmarkList(merged);
  for (const key of FUNDED_HARDHAT_DEV_KEYS) {
    const clients = createClients(key);
    await updateRef(clients as WriteClients, refContract, CAUSE_BOOKMARKS_REF, value);
  }
}

export function christianityRosterFields(plankCids: string[]): SeedCauseRosterFields {
  return parentRosterFields(christianSecular, christianityParent, plankCids);
}

export function secularConservativeRosterFields(plankCids: string[]): SeedCauseRosterFields {
  return parentRosterFields(christianSecular, secularParent, plankCids);
}

export function christianModifiedRosterFields(plankCids: string[]): SeedCauseRosterFields {
  return modifiedRosterFields(christianSecular, christianityParent, plankCids);
}

export function secularModifiedRosterFields(plankCids: string[]): SeedCauseRosterFields {
  return modifiedRosterFields(christianSecular, secularParent, plankCids);
}

export function christianSecularBridgeRosterFields(plankCids: string[]): SeedCauseRosterFields {
  return bridgeRosterFields(christianSecular, plankCids);
}

export function christianSecularClusterFields(cids: Map<string, IpfsCidV1>) {
  return clusterDocumentFields(christianSecular, cids);
}

async function resolvePlankCids(publishOnChain: boolean): Promise<Map<string, IpfsCidV1>> {
  const cids = new Map<string, IpfsCidV1>();
  for (const cluster of loadTinyClusterDefs()) {
    await publishClusterStatements(cluster, cids, publishOnChain);
  }
  return cids;
}

async function seedChristianPledges(plankCids: Map<string, IpfsCidV1>): Promise<void> {
  const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined;
  const recurringPledges = CONTRACT_ADDRESSES.recurringPledges as `0x${string}` | undefined;
  const notes = CONTRACT_ADDRESSES.delegatableNotes as `0x${string}` | undefined;
  const scripture = plankCids.get('scripture/natural-christian');
  if (!paymentToken || !recurringPledges || !notes || !scripture) {
    console.warn('Recurring pledges not configured — skipping Christianity monthly pledges.');
    return;
  }
  const colorblind = plankCids.get('colorblind-merit/natural-secular');
  const marketsModifiedSecular = plankCids.get('markets/modified-secular');
  const pledges = [
    { accountIndex: 4, cid: scripture, amount: '20' },
    { accountIndex: 5, cid: marketsModifiedSecular ?? colorblind, amount: '8' },
    { accountIndex: 6, cid: colorblind, amount: '12' },
  ];
  const delegateTo = privateKeyToAccount(FUNDED_HARDHAT_DEV_KEYS[0]!).address;
  for (const pledge of pledges) {
    const key = FUNDED_HARDHAT_DEV_KEYS[pledge.accountIndex];
    if (!key || !pledge.cid) continue;
    const clients = createClients(key);
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
          causeRef: pledge.cid,
        },
      );
      console.log(`  ✓ HH#${pledge.accountIndex} pledged ${pledge.amount}/month`);
    } catch (error) {
      console.warn(`  Failed pledge:`, error instanceof Error ? error.message : error);
    }
  }
}

async function seedChristianContent(plankMap: Map<string, IpfsCidV1>): Promise<void> {
  const scripture = plankMap.get('scripture/natural-christian');
  const cfAddresses = {
    channelRegistry: CONTRACT_ADDRESSES.channelRegistry,
    channelVerifier: CONTRACT_ADDRESSES.channelVerifier,
    creatorContractFactory: CONTRACT_ADDRESSES.creatorContractFactory,
    publishedData: CONTRACT_ADDRESSES.publishedData,
    alignmentAttestations: CONTRACT_ADDRESSES.alignmentAttestations,
  };
  if (
    !cfAddresses.channelRegistry
    || !cfAddresses.channelVerifier
    || !cfAddresses.creatorContractFactory
    || !scripture
  ) {
    return;
  }
  try {
    await generateChristianContentScenario(
      {
        channelRegistry: cfAddresses.channelRegistry as `0x${string}`,
        channelVerifier: cfAddresses.channelVerifier as `0x${string}`,
        creatorContractFactory: cfAddresses.creatorContractFactory as `0x${string}`,
        publishedData: cfAddresses.publishedData as `0x${string}` | undefined,
        alignmentAttestations: cfAddresses.alignmentAttestations as `0x${string}` | undefined,
      },
      FUNDED_HARDHAT_DEV_KEYS.map((privateKey) => ({
        privateKey,
        address: privateKeyToAccount(privateKey).address,
      })),
      { statementCid: scripture },
    );
  } catch (error) {
    console.warn('Christianity content contract failed (channel may already exist):', error);
  }
}

export async function publishChristianSecularBridgeCluster(cids: Map<string, IpfsCidV1>) {
  return publishTinyClusterDocuments(christianSecular, cids);
}

export async function publishSeedChristianityCause(): Promise<{
  slug: string;
  rosterCid: string | null;
  plankCids: string[];
} | null> {
  console.log('\n=== Publishing tiny CauseStarter clusters ===\n');
  const plankMap = new Map<string, IpfsCidV1>();
  await publishAllTinyClusters(plankMap, { publishStatements: true, activity: true });
  await seedChristianPledges(plankMap);
  await seedChristianContent(plankMap);
  await mergeBookmarks();
  const christianPlankCids = CHRISTIANITY_PLANKS.map((plank) => plankMap.get(plank.id)).filter(
    (cid): cid is IpfsCidV1 => Boolean(cid),
  );
  return {
    slug: CHRISTIANITY_CAUSE_SLUG,
    rosterCid: christianPlankCids[0] ?? null,
    plankCids: [...plankMap.values()],
  };
}

export async function publishSeedSecularConservativeCause(
  existingCids?: Map<string, IpfsCidV1>,
): Promise<{
  slug: string;
  rosterCid: string | null;
  plankCids: string[];
} | null> {
  const cids = existingCids ?? await resolvePlankCids(true);
  const result = await publishTinyClusterDocuments(christianSecular, cids);
  await mergeBookmarks();
  return {
    slug: SECULAR_CONSERVATIVE_CAUSE_SLUG,
    rosterCid: result.rosterCids[1] ?? result.rosterCids[0] ?? null,
    plankCids: SECULAR_CONSERVATIVE_PLANKS.map((plank) => cids.get(plank.id)).filter(
      (cid): cid is IpfsCidV1 => Boolean(cid),
    ),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const clusterOnly = process.argv.includes('--cluster-only');
  const run = clusterOnly
    ? resolvePlankCids(false).then(async (cids) => {
        for (const cluster of loadTinyClusterDefs()) {
          await publishTinyClusterDocuments(cluster, cids);
        }
        await mergeBookmarks();
      })
    : publishSeedChristianityCause();
  run
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
