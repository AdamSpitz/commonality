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
import {
  CHRISTIANITY_NATURAL_PLANKS,
  MEDIATOR_STATEMENTS,
  SECULAR_NATURAL_PLANKS,
} from './christianSecularBridge.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';

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
  'Practising Christians, in their own words: abortion, provision for the poor, sex and marriage, and making Scripture available. A mediator (Hardhat #8) publishes modified wordings toward secular conservatives; those modified texts are not these planks.';

/** Hardhat #8 — distinct from the CSM bridge-creator default (#7). */
export const CHRISTIAN_MEDIATOR_PRIVATE_KEY = FUNDED_HARDHAT_DEV_KEYS[8]!;
export const CHRISTIAN_MEDIATOR_ADDRESS = privateKeyToAccount(CHRISTIAN_MEDIATOR_PRIVATE_KEY).address;

export const CHRISTIAN_MEDIATOR_NAME = 'Christian / secular-conservative mediator';
export const CHRISTIAN_MEDIATOR_DESCRIPTION =
  'Finds statements practising Christians and non-religious conservatives can both sign, without either side adopting the other’s reasons.';

export function seedChristianMediatorServiceUrl(): string {
  return (process.env.SEED_CHRISTIAN_MEDIATOR_URL ?? 'http://127.0.0.1:3011').replace(/\/+$/, '');
}

export const CHRISTIANITY_PLANKS = CHRISTIANITY_NATURAL_PLANKS;

/** Hardhat #9 — a distinct founder so the other camp is not the Christianity owner. */
export const SECULAR_CONSERVATIVE_OWNER_KEY = FUNDED_HARDHAT_DEV_KEYS[9]!;
export const SECULAR_CONSERVATIVE_OWNER_ADDRESS = privateKeyToAccount(SECULAR_CONSERVATIVE_OWNER_KEY).address;
export const SECULAR_CONSERVATIVE_CAUSE_SLUG = 'secular-conservatism';
export const SECULAR_CONSERVATIVE_CAUSE_TITLE = 'Secular conservatism';
export const SECULAR_CONSERVATIVE_CAUSE_SUMMARY =
  'Secular conservatives, in their own words: abortion, markets, sex and marriage, and colorblind merit. Modified wordings live on the mediator cluster, not on this roster.';
export const SECULAR_CONSERVATIVE_PLANKS = SECULAR_NATURAL_PLANKS;

interface PersonaProject {
  id: string;
  name: string;
  description: string;
  kind: string;
  ownerIndex: number;
  alignments: string[];
}

interface Persona {
  id: string;
  hardhatIndex: number;
  camp: 'christian' | 'secular';
  takesModified: boolean;
  signsNaturals: string[];
  aligns: boolean;
}

function loadPersonaFile(): { projects: PersonaProject[]; personas: Persona[] } {
  const path = join(dirname(fileURLToPath(import.meta.url)), 'data', 'christian-secular-personas.json');
  return JSON.parse(readFileSync(path, 'utf8')) as { projects: PersonaProject[]; personas: Persona[] };
}

function loadPersonaProjects(): PersonaProject[] {
  return loadPersonaFile().projects;
}

export const CHRISTIANITY_PROJECTS = loadPersonaProjects();

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

async function publishStatementSet(
  statements: readonly { id: string; text: string }[],
  domain: string,
  publisherKey: `0x${string}`,
  cids: Map<string, IpfsCidV1>,
): Promise<void> {
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const owner = createClients(publisherKey);
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  for (const plank of statements) {
    const cid = await publishGeneratedStatement(
      ipfsConfig,
      { text: plank.text, domain, position: plank.id },
      domain,
      plank.id,
      'simple',
      { clients: owner as WriteClients, publishedDataAddress: publishedData },
    );
    cids.set(plank.id, cid);
    console.log(`  Published ${domain} ${plank.id} → ${cid}`);
  }
}

async function publishPlanks(): Promise<Map<string, IpfsCidV1>> {
  const cids = new Map<string, IpfsCidV1>();
  await publishStatementSet(CHRISTIANITY_PLANKS, 'christianity', HARDHAT_PRIVATE_KEYS[0]!, cids);
  await publishStatementSet(SECULAR_CONSERVATIVE_PLANKS, 'secular-conservatism', SECULAR_CONSERVATIVE_OWNER_KEY, cids);
  await publishStatementSet(MEDIATOR_STATEMENTS, 'christian-secular-bridge', CHRISTIAN_MEDIATOR_PRIVATE_KEY, cids);
  return cids;
}

function modifiedIdForNatural(naturalId: string, camp: 'christian' | 'secular'): string | null {
  const [group] = naturalId.split('/');
  if (!group || group === 'scripture' || group === 'colorblind-merit') return null;
  return `${group}/modified-${camp}`;
}

async function signPlanks(cids: Map<string, IpfsCidV1>): Promise<void> {
  const beliefs = CONTRACT_ADDRESSES.beliefs as `0x${string}` | undefined;
  if (!beliefs) {
    console.warn('Beliefs contract not configured — skipping plank signatures.');
    return;
  }
  for (const persona of loadPersonaFile().personas) {
    const key = FUNDED_HARDHAT_DEV_KEYS[persona.hardhatIndex];
    if (!key) continue;
    const toSign = [...persona.signsNaturals];
    if (persona.takesModified) {
      for (const naturalId of persona.signsNaturals) {
        const modifiedId = modifiedIdForNatural(naturalId, persona.camp);
        if (modifiedId) toSign.push(modifiedId);
      }
    }
    const clients = createClients(key);
    let signed = 0;
    for (const statementId of toSign) {
      const cid = cids.get(statementId);
      if (!cid) {
        console.warn(`  Missing CID for ${statementId} (persona ${persona.id})`);
        continue;
      }
      const hash = await clients.walletClient.writeContract({
        address: beliefs,
        abi: BeliefsAbi,
        functionName: 'setBelief',
        args: [cidToBytes32(cid), BELIEVES],
        chain: clients.walletClient.chain,
        account: clients.walletClient.account,
      });
      await clients.publicClient.waitForTransactionReceipt({ hash });
      signed += 1;
    }
    console.log(`  ✓ HH#${persona.hardhatIndex} (${persona.id}) signed ${signed} statements`);
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

async function createProjects(statementCids: Map<string, IpfsCidV1>): Promise<CreatedChristianProject[]> {
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

  for (const template of loadPersonaProjects()) {
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
    const alignedStatementRefs = template.alignments.map((alignment) => {
      const [groupId, statementId] = alignment.split('/');
      return { collectionId: 'christian-secular-bridge', groupId, statementId };
    });
    const publication = await store.publish(createDisplayableDocument({
      format: 'markdown-restricted',
      content: template.description,
      extras: {
        statementType: 'lazy-giving-project-metadata',
        name: template.name,
        description: template.description,
        seedProjectKind: template.kind,
        alignedStatementRefs,
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
      plankId: template.alignments[0] ?? template.id,
      assuranceContract: projectDetails.assuranceContractAddress,
      erc1155: projectDetails.tokenAddress,
      tokenIds: tokenIds.map(Number),
      prices: prices.map((price) => price.toString()),
    });
    console.log(`  ✓ Project ${template.name} → ${projectDetails.assuranceContractAddress}`);

    const alignment = CONTRACT_ADDRESSES.alignmentAttestations as `0x${string}` | undefined;
    const aligners = loadPersonaFile().personas.filter((persona) => persona.aligns);
    if (alignment) {
      for (const alignmentId of template.alignments) {
        const statementCid = statementCids.get(alignmentId);
        if (!statementCid) {
          console.warn(`  Missing CID for alignment ${alignmentId}`);
          continue;
        }
        const attesterPersona = aligners[0];
        const attesterKey = attesterPersona
          ? FUNDED_HARDHAT_DEV_KEYS[attesterPersona.hardhatIndex]
          : FUNDED_HARDHAT_DEV_KEYS[0];
        if (!attesterKey) continue;
        const attester = createClients(attesterKey);
        const hash = await attestAlignment(
          attester as WriteClients,
          { address: alignment, abi: AlignmentAttestationsAbi },
          toSubjectId(projectDetails.assuranceContractAddress),
          statementCid,
          PROJECT_ALIGNMENT_TOPIC,
        );
        await attester.publicClient.waitForTransactionReceipt({ hash });
      }
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
  const scripture = plankCids.get('scripture/natural-christian');
  const marketsModified = plankCids.get('markets/modified-christian');
  if (!recurringPledges || !notes || !scripture) {
    console.warn('Recurring pledges not configured — skipping Christianity monthly pledges.');
    return;
  }

  const pledges = [
    { accountIndex: 4, cid: scripture, amount: '20' },
    { accountIndex: 5, cid: marketsModified ?? scripture, amount: '8' },
    { accountIndex: 6, cid: scripture, amount: '12' },
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
  const scripture = plankMap.get('scripture/natural-christian');
  if (
    cfAddresses.channelRegistry
    && cfAddresses.channelVerifier
    && cfAddresses.creatorContractFactory
    && scripture
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
        { statementCid: scripture },
      );
    } catch (error) {
      console.warn('Christianity content contract failed (channel may already exist):', error);
    }
  }

  const christianPlankCids = CHRISTIANITY_PLANKS.map((plank) => plankMap.get(plank.id)).filter(
    (cid): cid is IpfsCidV1 => Boolean(cid),
  );
  const rosterCid = await publishRoster(christianPlankCids);
  await publishSeedSecularConservativeCause(plankMap);
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

export async function publishSeedSecularConservativeCause(
  existingCids?: Map<string, IpfsCidV1>,
): Promise<{
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
  const plankCids: string[] = [];
  if (existingCids) {
    for (const plank of SECULAR_CONSERVATIVE_PLANKS) {
      const cid = existingCids.get(plank.id);
      if (cid) plankCids.push(cid);
    }
  } else {
    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
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
