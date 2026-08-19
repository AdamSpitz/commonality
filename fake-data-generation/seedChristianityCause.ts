/**
 * Seed a Christianity cause that exercises CauseStarter's mediator card:
 * published roster with a machine-readable mediator, several LazyGiving
 * projects, a mixed content contract, plank signers, and monthly pledges.
 *
 * Safe to run against an already-seeded local chain (does not wipe). Also
 * called from the main simulation so a fresh `--seed` includes the same story.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { fileURLToPath } from 'url';
import {
  AlignmentAttestationsAbi,
  AssuranceContractAbi,
  BeliefsAbi,
  MutableRefUpdaterAbi,
  ProjectFactoryAbi,
  PublishedDataAbi,
  RecurringPledgesAbi,
} from '@commonality/sdk/abis';
import {
  createDefaultDocumentStore,
  createDisplayableDocument,
} from '@commonality/sdk/displayable-documents';
import { approveRecurringPledgeToken, createStandingPledge } from '@commonality/sdk/delegation';
import { attestAlignment, PROJECT_ALIGNMENT_TOPIC, toSubjectId } from '@commonality/sdk/fundingportals';
import { buyProjectTokens, createProject as sdkCreateProject } from '@commonality/sdk/lazy-giving';
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { getRef, updateRef } from '@commonality/sdk/mutable-refs';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import { cidToBytes32, type IpfsCidV1, type WriteClients } from '@commonality/sdk/utils';
import { publishGeneratedStatement } from './generateStatements.js';
import { HARDHAT_PRIVATE_KEYS } from './generateUsers.js';
import { CONTRACT_ADDRESSES, loadEnv, RPC_URL } from './loadEnv.js';
import { createSeedClients } from './seedRpc.js';
import { parsePaymentTokenUnits } from './paymentTokenUnits.js';
import { generateChristianContentScenario } from './contentFundingActions.js';
import {
  buildSeedRosterDocument,
  CAUSE_BOOKMARKS_REF,
  FUNDED_HARDHAT_DEV_KEYS,
  SEED_CAUSE_OWNER_ADDRESS,
  SEED_CAUSE_SLUG,
  serializeSeedCauseBookmarkList,
  type SeedCauseRosterFields,
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

const BELIEVES = 1;
const MONTH_SECONDS = 30n * 24n * 60n * 60n;

export const CHRISTIANITY_CAUSE_SLUG = 'christianity';
export const CHRISTIANITY_CAUSE_TITLE = 'Christianity';
export const CHRISTIANITY_CAUSE_SUMMARY =
  'Shared works practising Christians can fund with neighbours who arrive at the same conclusions for different reasons. Seed includes a Christian / secular-conservative mediator, a winter warming centre, campus chaplaincy, a family-formation housing brief, and a Common Table essay fund.';

/** Hardhat #8 — distinct from the CSM bridge-creator default (#7). */
export const CHRISTIAN_MEDIATOR_PRIVATE_KEY = FUNDED_HARDHAT_DEV_KEYS[8]!;
export const CHRISTIAN_MEDIATOR_ADDRESS = privateKeyToAccount(CHRISTIAN_MEDIATOR_PRIVATE_KEY).address;

export const CHRISTIAN_MEDIATOR_NAME = 'Christian / secular-conservative mediator';
export const CHRISTIAN_MEDIATOR_DESCRIPTION =
  'Finds statements practising Christians and non-religious conservatives can both sign, without either side adopting the other’s reasons.';

export function seedChristianMediatorServiceUrl(): string {
  return (process.env.SEED_CHRISTIAN_MEDIATOR_URL ?? 'http://127.0.0.1:3011').replace(/\/+$/, '');
}

export const CHRISTIANITY_PLANKS = [
  {
    id: 'shared-local-works',
    text: 'Christians and their neighbours should be able to fund shared local works — warming centres, chaplaincy, disaster relief — without first resolving why they want the same thing.',
  },
  {
    id: 'family-formation',
    text: 'It should be easier than it currently is for people to marry and raise children — housing, cost, and working hours included.',
  },
  {
    id: 'kids-and-tech',
    text: 'Children should not have unrestricted access to pornography or to platforms engineered to be maximally addictive.',
  },
] as const;

export const CHRISTIANITY_PROJECTS = [
  {
    name: 'Parish winter warming centre',
    description:
      'Keep a church hall open overnight through the cold months: cots, a kitchen, and a volunteer rota that neighbouring congregations can share without merging anything.',
    kind: 'local-ministry',
    plankId: 'shared-local-works',
    ownerIndex: 1,
  },
  {
    name: 'Campus chaplaincy at State U',
    description:
      'Fund a chaplain and a student hospitality budget at a large secular university — the kind of presence that has no denomination-wide treasury behind it.',
    kind: 'campus-ministry',
    plankId: 'shared-local-works',
    ownerIndex: 2,
  },
  {
    name: 'Family-formation housing brief',
    description:
      'Commission a short, public brief on what actually makes it possible for ordinary people to marry and raise children in this city — zoning, hours, and childcare costs, not a culture-war pamphlet.',
    kind: 'family-formation',
    plankId: 'family-formation',
    ownerIndex: 3,
  },
] as const;

/** Hardhat #9 — a distinct founder so the other camp is not the Christianity owner. */
export const SECULAR_CONSERVATIVE_OWNER_KEY = FUNDED_HARDHAT_DEV_KEYS[9]!;
export const SECULAR_CONSERVATIVE_OWNER_ADDRESS = privateKeyToAccount(SECULAR_CONSERVATIVE_OWNER_KEY).address;
export const SECULAR_CONSERVATIVE_CAUSE_SLUG = 'secular-conservatism';
export const SECULAR_CONSERVATIVE_CAUSE_TITLE = 'Secular conservatism';
export const SECULAR_CONSERVATIVE_CAUSE_SUMMARY =
  'Order, family formation, and measured outcomes without a theological premise. Seed roster so a mediator can point at a real other cause, not only invent a stand-in.';
export const SECULAR_CONSERVATIVE_PLANKS = [
  {
    id: 'two-parent-outcomes',
    text: 'Kids do better with two committed parents, and a country that has stopped forming families is storing up a problem it cannot buy its way out of.',
  },
  {
    id: 'family-formation-priority',
    text: 'Making family formation affordable and normal should be a public priority even if people disagree about why families matter.',
  },
] as const;

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

async function publishPlanks(): Promise<Map<string, IpfsCidV1>> {
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const owner = createClients(HARDHAT_PRIVATE_KEYS[0]!);
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const cids = new Map<string, IpfsCidV1>();
  for (const plank of CHRISTIANITY_PLANKS) {
    const cid = await publishGeneratedStatement(
      ipfsConfig,
      { text: plank.text, domain: 'christianity', position: plank.id },
      'christianity',
      plank.id,
      'simple',
      { clients: owner as WriteClients, publishedDataAddress: publishedData },
    );
    cids.set(plank.id, cid);
    console.log(`  Published plank ${plank.id} → ${cid}`);
  }
  return cids;
}

async function signPlanks(cids: Map<string, IpfsCidV1>): Promise<void> {
  const beliefs = CONTRACT_ADDRESSES.beliefs as `0x${string}` | undefined;
  if (!beliefs) {
    console.warn('Beliefs contract not configured — skipping plank signatures.');
    return;
  }
  const signerIndexes = [0, 1, 2, 4, 5, 6];
  for (const index of signerIndexes) {
    const key = FUNDED_HARDHAT_DEV_KEYS[index];
    if (!key) continue;
    const clients = createClients(key);
    for (const cid of cids.values()) {
      const hash = await clients.walletClient.writeContract({
        address: beliefs,
        abi: BeliefsAbi,
        functionName: 'setBelief',
        args: [cidToBytes32(cid), BELIEVES],
        chain: clients.walletClient.chain,
        account: clients.walletClient.account,
      });
      await clients.publicClient.waitForTransactionReceipt({ hash });
    }
    console.log(`  ✓ HH#${index} signed ${cids.size} Christianity planks`);
  }
}

interface CreatedChristianProject {
  name: string;
  plankId: string;
  assuranceContract: `0x${string}`;
  erc1155: `0x${string}`;
  tokenIds: number[];
  prices: string[];
}

async function createProjects(plankCids: Map<string, IpfsCidV1>): Promise<CreatedChristianProject[]> {
  const factory = CONTRACT_ADDRESSES.projectFactory as `0x${string}` | undefined;
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined;
  if (!factory || !paymentToken) {
    console.warn('ProjectFactory or payment token missing — skipping Christianity projects.');
    return [];
  }

  const created: CreatedChristianProject[] = [];
  const latest = await createClients(FUNDED_HARDHAT_DEV_KEYS[0]!).publicClient.getBlock();
  const deadline = latest.timestamp + 30n * 24n * 60n * 60n;
  const threshold = parsePaymentTokenUnits('2');
  const tokenIds = [1n, 2n, 3n];
  const maxSupplies = [100n, 500n, 1000n];
  const prices = [
    parsePaymentTokenUnits('0.1'),
    parsePaymentTokenUnits('0.05'),
    parsePaymentTokenUnits('0.01'),
  ];

  for (const template of CHRISTIANITY_PROJECTS) {
    const key = FUNDED_HARDHAT_DEV_KEYS[template.ownerIndex];
    if (!key) continue;
    const clients = createClients(key);
    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
    const store = createDefaultDocumentStore(createSDKMachinery({ ipfsConfig }), {
      clients: clients as WriteClients,
      ...(publishedData
        ? { publishedDataContract: { address: publishedData, abi: PublishedDataAbi } }
        : {}),
    });
    const publication = await store.publish(createDisplayableDocument({
      format: 'markdown-restricted',
      content: template.description,
      extras: {
        statementType: 'lazy-giving-project-metadata',
        name: template.name,
        description: template.description,
        seedProjectKind: template.kind,
        alignedStatementRefs: [{ collectionId: 'christianity', groupId: 'planks', statementId: template.plankId }],
      },
    }));
    const { projectDetails } = await sdkCreateProject(
      clients as WriteClients,
      { address: factory, abi: ProjectFactoryAbi },
      {
        metadataURI: `ipfs://${publication.cid}/`,
        contractURI: `ipfs://${publication.cid}`,
        owner: clients.account,
        recipient: clients.account,
        paymentToken,
        threshold,
        deadline,
        projectMetadataCid: publication.cid,
        tokenIds,
        tokenCounts: maxSupplies,
        tokenPrices: prices,
      },
    );
    created.push({
      name: template.name,
      plankId: template.plankId,
      assuranceContract: projectDetails.assuranceContractAddress,
      erc1155: projectDetails.tokenAddress,
      tokenIds: tokenIds.map(Number),
      prices: prices.map((price) => price.toString()),
    });
    console.log(`  ✓ Project ${template.name} → ${projectDetails.assuranceContractAddress}`);

    const alignment = CONTRACT_ADDRESSES.alignmentAttestations as `0x${string}` | undefined;
    const plankCid = plankCids.get(template.plankId);
    if (alignment && plankCid) {
      const attester = createClients(FUNDED_HARDHAT_DEV_KEYS[0]!);
      const hash = await attestAlignment(
        attester as WriteClients,
        { address: alignment, abi: AlignmentAttestationsAbi },
        toSubjectId(projectDetails.assuranceContractAddress),
        plankCid,
        PROJECT_ALIGNMENT_TOPIC,
      );
      await attester.publicClient.waitForTransactionReceipt({ hash });
    }
  }
  return created;
}

async function buyAndPledge(projects: CreatedChristianProject[], plankCids: Map<string, IpfsCidV1>): Promise<void> {
  const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined;
  if (!paymentToken) return;

  const buys = [
    { accountIndex: 4, projectIndex: 0, count: 6 },
    { accountIndex: 5, projectIndex: 0, count: 3 },
    { accountIndex: 6, projectIndex: 1, count: 4 },
    { accountIndex: 4, projectIndex: 2, count: 2 },
    { accountIndex: 1, projectIndex: 1, count: 5 },
  ];
  for (const buy of buys) {
    const project = projects[buy.projectIndex];
    const key = FUNDED_HARDHAT_DEV_KEYS[buy.accountIndex];
    if (!project || !key) continue;
    await fundPaymentToken(privateKeyToAccount(key).address, parsePaymentTokenUnits('2000'));
    const clients = createClients(key);
    const price = BigInt(project.prices[0]!);
    try {
      await buyProjectTokens(
        clients as WriteClients,
        { address: project.assuranceContract, abi: AssuranceContractAbi },
        {
          buyer: clients.account,
          tokenAddress: project.erc1155,
          tokenIds: [BigInt(project.tokenIds[0]!)],
          tokenCounts: [BigInt(buy.count)],
          totalCost: price * BigInt(buy.count),
        },
      );
      console.log(`  ✓ HH#${buy.accountIndex} bought ${buy.count} on ${project.name}`);
    } catch (error) {
      console.warn(`  Failed buy on ${project.name}:`, error instanceof Error ? error.message : error);
    }
  }

  const recurringPledges = CONTRACT_ADDRESSES.recurringPledges as `0x${string}` | undefined;
  const notes = CONTRACT_ADDRESSES.delegatableNotes as `0x${string}` | undefined;
  const sharedWorks = plankCids.get('shared-local-works');
  const family = plankCids.get('family-formation');
  if (!recurringPledges || !notes || !sharedWorks) {
    console.warn('Recurring pledges not configured — skipping Christianity monthly pledges.');
    return;
  }

  const pledges = [
    { accountIndex: 4, cid: sharedWorks, amount: '20' },
    { accountIndex: 5, cid: sharedWorks, amount: '8' },
    { accountIndex: 6, cid: family ?? sharedWorks, amount: '12' },
  ];
  const delegateTo = privateKeyToAccount(FUNDED_HARDHAT_DEV_KEYS[0]!).address;
  for (const pledge of pledges) {
    const key = FUNDED_HARDHAT_DEV_KEYS[pledge.accountIndex];
    if (!key) continue;
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
    { owner: SEED_CAUSE_OWNER_ADDRESS, slug: CHRISTIANITY_CAUSE_SLUG },
    { owner: SECULAR_CONSERVATIVE_OWNER_ADDRESS, slug: SECULAR_CONSERVATIVE_CAUSE_SLUG },
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
  const mediator = {
    name: CHRISTIAN_MEDIATOR_NAME,
    description: CHRISTIAN_MEDIATOR_DESCRIPTION,
    address: CHRISTIAN_MEDIATOR_ADDRESS,
    serviceUrl: seedChristianMediatorServiceUrl(),
  };
  return {
    title: CHRISTIANITY_CAUSE_TITLE,
    summary: CHRISTIANITY_CAUSE_SUMMARY,
    plankCids,
    mediatorBlurb: `${mediator.name}: ${mediator.description}`,
    mediator,
  };
}

async function publishRoster(plankCids: string[]): Promise<string | null> {
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const mutableRef = CONTRACT_ADDRESSES.mutableRefUpdater as `0x${string}` | undefined;
  if (!publishedData || !mutableRef) {
    console.warn('PublishedData or MutableRefUpdater missing — skipping Christianity roster.');
    return null;
  }
  const owner = createClients(HARDHAT_PRIVATE_KEYS[0]!);
  const fields = christianityRosterFields(plankCids);
  const doc = buildSeedRosterDocument(fields);
  const store = createDefaultDocumentStore(
    createSDKMachinery({ ipfsConfig: createIPFSConfigInNodeJSFromTheUsualEnvVars() }),
    {
      clients: owner as WriteClients,
      publishedDataContract: { address: publishedData, abi: PublishedDataAbi },
    },
  );
  const publication = await store.publish(doc);
  await updateRef(
    owner as WriteClients,
    { address: mutableRef, abi: MutableRefUpdaterAbi },
    CHRISTIANITY_CAUSE_SLUG,
    publication.cid,
  );
  await mergeBookmarks();
  console.log(
    `  ✓ Cause ${CHRISTIANITY_CAUSE_SLUG} → ${publication.cid}\n  Open /cause/${owner.account}/${CHRISTIANITY_CAUSE_SLUG}`,
  );
  return publication.cid;
}

export async function publishSeedChristianityCause(): Promise<{
  slug: string;
  rosterCid: string | null;
  plankCids: string[];
} | null> {
  console.log('\n=== Publishing seed CauseStarter roster (Christianity + mediator) ===\n');
  const plankMap = await publishPlanks();
  await signPlanks(plankMap);
  const projects = await createProjects(plankMap);
  await buyAndPledge(projects, plankMap);

  const cfAddresses = {
    channelRegistry: CONTRACT_ADDRESSES.channelRegistry,
    channelVerifier: CONTRACT_ADDRESSES.channelVerifier,
    creatorContractFactory: CONTRACT_ADDRESSES.creatorContractFactory,
    publishedData: CONTRACT_ADDRESSES.publishedData,
    alignmentAttestations: CONTRACT_ADDRESSES.alignmentAttestations,
  };
  const sharedWorks = plankMap.get('shared-local-works');
  if (
    cfAddresses.channelRegistry
    && cfAddresses.channelVerifier
    && cfAddresses.creatorContractFactory
    && sharedWorks
  ) {
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
        { statementCid: sharedWorks },
      );
    } catch (error) {
      console.warn('Christianity content contract failed (channel may already exist):', error);
    }
  }

  const rosterCid = await publishRoster([...plankMap.values()]);
  await publishSeedSecularConservativeCause();
  return {
    slug: CHRISTIANITY_CAUSE_SLUG,
    rosterCid,
    plankCids: [...plankMap.values()],
  };
}

export function secularConservativeRosterFields(plankCids: string[]): SeedCauseRosterFields {
  return {
    title: SECULAR_CONSERVATIVE_CAUSE_TITLE,
    summary: SECULAR_CONSERVATIVE_CAUSE_SUMMARY,
    plankCids,
    mediatorBlurb: '',
  };
}

export async function publishSeedSecularConservativeCause(): Promise<{
  slug: string;
  rosterCid: string | null;
  plankCids: string[];
} | null> {
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const mutableRef = CONTRACT_ADDRESSES.mutableRefUpdater as `0x${string}` | undefined;
  if (!publishedData || !mutableRef) {
    console.warn('PublishedData or MutableRefUpdater missing — skipping secular-conservative roster.');
    return null;
  }
  console.log('\n=== Publishing seed CauseStarter roster (secular conservatism) ===\n');
  const owner = createClients(SECULAR_CONSERVATIVE_OWNER_KEY);
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const plankCids: string[] = [];
  for (const plank of SECULAR_CONSERVATIVE_PLANKS) {
    const cid = await publishGeneratedStatement(
      ipfsConfig,
      { text: plank.text, domain: 'secular-conservatism', position: plank.id },
      'secular-conservatism',
      plank.id,
      'simple',
      { clients: owner as WriteClients, publishedDataAddress: publishedData },
    );
    plankCids.push(cid);
    console.log(`  Published plank ${plank.id} → ${cid}`);
  }
  const fields = secularConservativeRosterFields(plankCids);
  const doc = buildSeedRosterDocument(fields);
  const store = createDefaultDocumentStore(
    createSDKMachinery({ ipfsConfig: createIPFSConfigInNodeJSFromTheUsualEnvVars() }),
    {
      clients: owner as WriteClients,
      publishedDataContract: { address: publishedData, abi: PublishedDataAbi },
    },
  );
  const publication = await store.publish(doc);
  await updateRef(
    owner as WriteClients,
    { address: mutableRef, abi: MutableRefUpdaterAbi },
    SECULAR_CONSERVATIVE_CAUSE_SLUG,
    publication.cid,
  );
  await mergeBookmarks();
  console.log(
    `  ✓ Cause ${SECULAR_CONSERVATIVE_CAUSE_SLUG} → ${publication.cid}\n  Open /cause/${owner.account}/${SECULAR_CONSERVATIVE_CAUSE_SLUG}`,
  );
  return {
    slug: SECULAR_CONSERVATIVE_CAUSE_SLUG,
    rosterCid: publication.cid,
    plankCids,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  publishSeedChristianityCause()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
