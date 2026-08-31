/**
 * Generic tiny-seed bridge-cluster publisher.
 *
 * Issue-specific world-building lives in data/tiny-clusters/*.json (owners, slugs,
 * personas, projects). Statement text lives in seed-content/*.json. Adding a
 * cluster should not require a new TypeScript module.
 */

import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { privateKeyToAccount } from 'viem/accounts';
import {
  AlignmentAttestationsAbi,
  AssuranceContractAbi,
  BeliefsAbi,
  ImplicationsAbi,
  MutableRefUpdaterAbi,
  NudgePublicationsAbi,
  ProjectFactoryAbi,
  PublishedDataAbi,
} from '@commonality/sdk/abis';
import {
  createDefaultDocumentStore,
  createDisplayableDocument,
} from '@commonality/sdk/displayable-documents';
import { attestAlignment, PROJECT_ALIGNMENT_TOPIC, toSubjectId } from '@commonality/sdk/fundingportals';
import { buyProjectTokens, createProject as sdkCreateProject } from '@commonality/sdk/lazy-giving';
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { updateRef } from '@commonality/sdk/mutable-refs';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import { cidToBytes32, type IpfsCidV1, uploadToIPFS, type WriteClients } from '@commonality/sdk/utils';
import { publishGeneratedStatement } from './generateStatements.js';
import { CONTRACT_ADDRESSES, loadEnv, RPC_URL } from './loadEnv.js';
import { createSeedClients } from './seedRpc.js';
import { parsePaymentTokenUnits } from './paymentTokenUnits.js';
import {
  buildSeedClusterDocument,
  buildSeedRosterDocument,
  FUNDED_HARDHAT_DEV_KEYS,
  type SeedBridgeClusterFields,
  type SeedCauseRosterFields,
} from './seedCauseRoster.js';
import type { SeedCollection } from './seed-content-format.js';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
export const TINY_CLUSTERS_DIR = join(__dirname, 'data', 'tiny-clusters');
export const SEED_CONTENT_DIR = join(__dirname, 'seed-content');

const BELIEVES = 1;

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

export interface TinyClusterPersona {
  id: string;
  hardhatIndex: number;
  side: string;
  takesModified: boolean;
  signsNaturals: string[];
  aligns: boolean;
}

export interface TinyClusterProject {
  id: string;
  name: string;
  description: string;
  kind: string;
  ownerIndex: number;
  alignments: string[];
}

export interface TinyClusterParent {
  id: string;
  ownerHardhatIndex: number;
  slug: string;
  title: string;
  summary: string;
  naturals: string[];
  modifiedSlug: string;
  modifiedTitle: string;
  modifiedSummary: string;
  modifieds: string[];
  attachMediator?: boolean;
}

export interface TinyClusterDef {
  format: 'commonality-tiny-cluster-v1';
  id: string;
  collectionId: string;
  clusterSlug: string;
  mediatorHardhatIndex: number;
  mediatorName: string;
  mediatorDescription?: string;
  mediatorNote: string;
  nudgeReason: string;
  attachMediatorServiceUrlEnv?: string;
  attachMediatorDefaultUrl?: string;
  parents: TinyClusterParent[];
  bridge: { slug: string; title: string; summary: string; planks: string[] };
  personas: TinyClusterPersona[];
  projects: TinyClusterProject[];
  buys?: Array<{ accountIndex: number; projectId: string; count: number }>;
}

export interface SeedPlank {
  id: string;
  groupId: string;
  statementId: string;
  text: string;
}

function createClients(privateKey: `0x${string}`) {
  return createSeedClients(privateKey, RPC_URL);
}

export function fundedKey(index: number): `0x${string}` {
  const key = FUNDED_HARDHAT_DEV_KEYS[index];
  if (!key) throw new Error(`No FUNDED_HARDHAT_DEV_KEYS[${index}]`);
  return key;
}

export function fundedAddress(index: number): `0x${string}` {
  return privateKeyToAccount(fundedKey(index)).address;
}

export function parsePlankRef(ref: string): { groupId: string; statementId: string } {
  const slash = ref.lastIndexOf('/');
  if (slash <= 0 || slash === ref.length - 1) {
    throw new Error(`Plank ref must be groupId/statementId, got "${ref}"`);
  }
  return { groupId: ref.slice(0, slash), statementId: ref.slice(slash + 1) };
}

export function sideOfAlignment(alignmentId: string): string {
  const statementId = alignmentId.split('/')[1] ?? alignmentId;
  const match = statementId.match(/^(?:natural|modified)-(.+)$/);
  return match?.[1] ?? statementId;
}

export function modifiedIdForNatural(naturalId: string, side: string): string | null {
  const { groupId, statementId } = parsePlankRef(naturalId);
  if (!statementId.startsWith('natural-')) return null;
  return `${groupId}/modified-${side}`;
}

export function deriveNudges(cluster: TinyClusterDef): Array<{ target: string; suggested: string }> {
  const nudges: Array<{ target: string; suggested: string }> = [];
  for (const parent of cluster.parents) {
    for (const natural of parent.naturals) {
      const suggested = natural.replace('/natural-', '/modified-');
      if (suggested !== natural && parent.modifieds.includes(suggested)) {
        nudges.push({ target: natural, suggested });
      }
    }
  }
  return nudges;
}

export function deriveImplications(cluster: TinyClusterDef): Array<{ from: string; to: string }> {
  const pairs: Array<{ from: string; to: string }> = [];
  for (const parent of cluster.parents) {
    for (const modified of parent.modifieds) {
      const { groupId } = parsePlankRef(modified);
      const to = `${groupId}/commonality`;
      if (cluster.bridge.planks.includes(to)) {
        pairs.push({ from: modified, to });
      }
    }
  }
  return pairs;
}

export function pickAlignmentAttester(
  personas: readonly TinyClusterPersona[],
  alignmentId: string,
  projectOwnerIndex: number,
): TinyClusterPersona | undefined {
  const side = sideOfAlignment(alignmentId);
  const aligners = personas.filter((persona) => persona.aligns);
  const sideAligners = aligners.filter((persona) => persona.side === side);
  return (
    sideAligners.find((persona) => persona.hardhatIndex === projectOwnerIndex)
    ?? sideAligners[0]
    ?? aligners[0]
  );
}

export function loadSeedCollectionFile(collectionId: string): SeedCollection {
  const raw = readFileSync(join(SEED_CONTENT_DIR, `${collectionId}.json`), 'utf8');
  return JSON.parse(raw) as SeedCollection;
}

export function plankFromCollection(collection: SeedCollection, ref: string): SeedPlank {
  const { groupId, statementId } = parsePlankRef(ref);
  const group = collection.groups.find((candidate) => candidate.id === groupId);
  const statement = group?.statements.find((candidate) => candidate.id === statementId);
  if (!group || !statement) {
    throw new Error(`Missing ${collection.id}/${ref}`);
  }
  return { id: ref, groupId, statementId, text: statement.text };
}

function assertSlug(slug: string): void {
  if (!slug || slug.length > 64) {
    throw new Error(`Cause slug must be 1–64 chars, got "${slug}"`);
  }
}

export function validateTinyCluster(cluster: TinyClusterDef, collection: SeedCollection): void {
  if (cluster.format !== 'commonality-tiny-cluster-v1') {
    throw new Error(`${cluster.id}: unsupported format`);
  }
  if (cluster.collectionId !== collection.id) {
    throw new Error(`${cluster.id}: collectionId ${cluster.collectionId} != ${collection.id}`);
  }
  assertSlug(cluster.clusterSlug);
  assertSlug(cluster.bridge.slug);
  const refs = [
    ...cluster.parents.flatMap((parent) => [...parent.naturals, ...parent.modifieds]),
    ...cluster.bridge.planks,
    ...cluster.personas.flatMap((persona) => persona.signsNaturals),
    ...cluster.projects.flatMap((project) => project.alignments),
  ];
  for (const ref of refs) {
    plankFromCollection(collection, ref);
  }
  for (const parent of cluster.parents) {
    assertSlug(parent.slug);
    assertSlug(parent.modifiedSlug);
    fundedKey(parent.ownerHardhatIndex);
  }
  fundedKey(cluster.mediatorHardhatIndex);
}

export function loadTinyClusterDefs(dir = TINY_CLUSTERS_DIR): TinyClusterDef[] {
  const files = readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
  const clusters = files.map((fileName) => {
    const raw = JSON.parse(readFileSync(join(dir, fileName), 'utf8')) as TinyClusterDef;
    const collection = loadSeedCollectionFile(raw.collectionId);
    validateTinyCluster(raw, collection);
    return raw;
  });
  const ids = new Set<string>();
  for (const cluster of clusters) {
    if (ids.has(cluster.id)) throw new Error(`Duplicate tiny cluster id ${cluster.id}`);
    ids.add(cluster.id);
  }
  return clusters;
}

export function requireTinyCluster(id: string): TinyClusterDef {
  const cluster = loadTinyClusterDefs().find((candidate) => candidate.id === id);
  if (!cluster) throw new Error(`Unknown tiny cluster ${id}`);
  return cluster;
}

export function requireParent(cluster: TinyClusterDef, parentId: string): TinyClusterParent {
  const parent = cluster.parents.find((candidate) => candidate.id === parentId);
  if (!parent) throw new Error(`Cluster ${cluster.id} has no parent ${parentId}`);
  return parent;
}

export function parentPlanks(cluster: TinyClusterDef, parentId: string): SeedPlank[] {
  const collection = loadSeedCollectionFile(cluster.collectionId);
  return requireParent(cluster, parentId).naturals.map((ref) => plankFromCollection(collection, ref));
}

export function mediatorPlanks(cluster: TinyClusterDef): SeedPlank[] {
  const collection = loadSeedCollectionFile(cluster.collectionId);
  const refs = [...cluster.parents.flatMap((parent) => parent.modifieds), ...cluster.bridge.planks];
  return refs.map((ref) => plankFromCollection(collection, ref));
}

export function mediatorAddress(cluster: TinyClusterDef): `0x${string}` {
  return fundedAddress(cluster.mediatorHardhatIndex);
}

export function mediatorServiceUrl(cluster: TinyClusterDef): string {
  const fallback = cluster.attachMediatorDefaultUrl ?? 'http://127.0.0.1:3011';
  const envName = cluster.attachMediatorServiceUrlEnv;
  const raw = envName ? process.env[envName] : undefined;
  return (raw ?? fallback).replace(/\/+$/, '');
}

export function parentRosterFields(cluster: TinyClusterDef, parent: TinyClusterParent, plankCids: string[]): SeedCauseRosterFields {
  const mediator = {
    name: cluster.mediatorName,
    description: cluster.mediatorDescription ?? cluster.mediatorNote,
    address: mediatorAddress(cluster),
    serviceUrl: mediatorServiceUrl(cluster),
  };
  return {
    title: parent.title,
    summary: parent.summary,
    plankCids,
    mediatorBlurb: parent.attachMediator ? `${mediator.name}: ${mediator.description}` : '',
    ...(parent.attachMediator ? { mediator } : {}),
  };
}

export function modifiedRosterFields(cluster: TinyClusterDef, parent: TinyClusterParent, plankCids: string[]): SeedCauseRosterFields {
  return {
    title: parent.modifiedTitle,
    summary: parent.modifiedSummary,
    plankCids,
    mediatorBlurb: '',
    bridgeCluster: {
      clusterOwner: mediatorAddress(cluster),
      clusterSlug: cluster.clusterSlug,
      role: 'modified',
      parentOwner: fundedAddress(parent.ownerHardhatIndex),
      parentSlug: parent.slug,
    },
  };
}

export function bridgeRosterFields(cluster: TinyClusterDef, plankCids: string[]): SeedCauseRosterFields {
  return {
    title: cluster.bridge.title,
    summary: cluster.bridge.summary,
    plankCids,
    mediatorBlurb: '',
    bridgeCluster: {
      clusterOwner: mediatorAddress(cluster),
      clusterSlug: cluster.clusterSlug,
      role: 'bridge',
    },
  };
}

export function clusterDocumentFields(cluster: TinyClusterDef, cids: Map<string, IpfsCidV1>): SeedBridgeClusterFields {
  const owner = mediatorAddress(cluster).toLowerCase() as `0x${string}`;
  const pairs = deriveImplications(cluster).flatMap((pair) => {
    const fromCid = cids.get(pair.from);
    const toCid = cids.get(pair.to);
    if (!fromCid || !toCid) return [];
    return [{ fromCid, toCid, role: 'modified-to-bridge' as const }];
  });
  return {
    mediatorName: cluster.mediatorName,
    mediatorNote: cluster.mediatorNote,
    mediatorAddress: owner,
    parents: cluster.parents.map((parent) => ({
      owner: fundedAddress(parent.ownerHardhatIndex),
      slug: parent.slug,
    })),
    modified: cluster.parents.map((parent) => ({
      owner,
      slug: parent.modifiedSlug,
      parentOwner: fundedAddress(parent.ownerHardhatIndex),
      parentSlug: parent.slug,
    })),
    bridge: { owner, slug: cluster.bridge.slug },
    pairs,
  };
}

export function clusterBookmarkEntries(cluster: TinyClusterDef): Array<{ owner: string; slug: string }> {
  const mediator = mediatorAddress(cluster);
  return [
    ...cluster.parents.map((parent) => ({
      owner: fundedAddress(parent.ownerHardhatIndex),
      slug: parent.slug,
    })),
    ...cluster.parents.map((parent) => ({
      owner: mediator,
      slug: parent.modifiedSlug,
    })),
    { owner: mediator, slug: cluster.bridge.slug },
  ];
}

export async function publishClusterStatements(
  cluster: TinyClusterDef,
  cids: Map<string, IpfsCidV1>,
  publishOnChain: boolean,
): Promise<void> {
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const collection = loadSeedCollectionFile(cluster.collectionId);

  const sets: Array<{ planks: SeedPlank[]; domain: string; key: `0x${string}` }> = cluster.parents.map((parent) => ({
    planks: parent.naturals.map((ref) => plankFromCollection(collection, ref)),
    domain: parent.slug,
    key: fundedKey(parent.ownerHardhatIndex),
  }));
  sets.push({
    planks: mediatorPlanks(cluster),
    domain: cluster.collectionId,
    key: fundedKey(cluster.mediatorHardhatIndex),
  });

  for (const set of sets) {
    const owner = createClients(set.key);
    for (const plank of set.planks) {
      if (cids.has(plank.id)) continue;
      const cid = await publishGeneratedStatement(
        ipfsConfig,
        { text: plank.text, domain: set.domain, position: plank.id },
        set.domain,
        plank.id,
        'simple',
        publishOnChain && publishedData
          ? { clients: owner as WriteClients, publishedDataAddress: publishedData }
          : {},
      );
      cids.set(plank.id, cid);
      console.log(`  ${publishOnChain ? 'Published' : 'Resolved'} ${set.domain} ${plank.id} → ${cid}`);
    }
  }
}

async function publishDocumentAs(
  publisherKey: `0x${string}`,
  slug: string,
  doc: ReturnType<typeof createDisplayableDocument>,
): Promise<string | null> {
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const mutableRef = CONTRACT_ADDRESSES.mutableRefUpdater as `0x${string}` | undefined;
  if (!publishedData || !mutableRef) {
    console.warn('PublishedData or MutableRefUpdater missing — skipping', slug);
    return null;
  }
  const owner = createClients(publisherKey);
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
    slug,
    publication.cid,
  );
  return publication.cid;
}

function cidsFor(ids: readonly string[], cids: Map<string, IpfsCidV1>): IpfsCidV1[] {
  return ids.map((id) => cids.get(id)).filter((cid): cid is IpfsCidV1 => Boolean(cid));
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

async function publishNudges(cluster: TinyClusterDef, cids: Map<string, IpfsCidV1>): Promise<void> {
  const nudgePublications = process.env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS as `0x${string}` | undefined;
  if (!nudgePublications) {
    console.warn('NUDGE_PUBLICATIONS_CONTRACT_ADDRESS not configured — skipping nudges.');
    return;
  }
  const nudges = [];
  for (const pair of deriveNudges(cluster)) {
    const target = cids.get(pair.target);
    const suggested = cids.get(pair.suggested);
    if (!target || !suggested) {
      console.warn(`  Missing CID for nudge ${pair.target} → ${pair.suggested}`);
      continue;
    }
    nudges.push({
      targetStatementCid: target,
      suggestedStatementCid: suggested,
      reason: cluster.nudgeReason,
      confidence: 0.9,
    });
  }
  if (nudges.length === 0) return;

  const mediator = createClients(fundedKey(cluster.mediatorHardhatIndex));
  const batchCid = await uploadToIPFS(createIPFSConfigInNodeJSFromTheUsualEnvVars(), {
    kind: 'nudge-batch',
    schemaVersion: 1,
    nudger: mediator.account,
    publishedAt: Math.floor(Date.now() / 1000),
    nudges,
    revocations: [],
  });
  const hash = await mediator.walletClient.writeContract({
    address: nudgePublications,
    abi: NudgePublicationsAbi,
    functionName: 'publishNudgeBatch',
    args: [cidToBytes32(batchCid)],
    chain: mediator.walletClient.chain,
    account: mediator.walletClient.account,
  });
  await mediator.publicClient.waitForTransactionReceipt({ hash });
  console.log(`  ✓ ${cluster.id} nudge batch (${nudges.length} parent→modified): ${batchCid}`);
}

async function attestImplications(cluster: TinyClusterDef, cids: Map<string, IpfsCidV1>): Promise<void> {
  const implications = CONTRACT_ADDRESSES.implications as `0x${string}` | undefined;
  const attesterKey = process.env.IMPLICATION_ATTESTER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!implications || !attesterKey) {
    console.warn('Implications contract or IMPLICATION_ATTESTER_PRIVATE_KEY missing — skipping arrows.');
    return;
  }
  const clients = createClients(attesterKey);
  let attested = 0;
  for (const pair of deriveImplications(cluster)) {
    const from = cids.get(pair.from);
    const to = cids.get(pair.to);
    if (!from || !to) {
      console.warn(`  Missing CID for implication ${pair.from} → ${pair.to}`);
      continue;
    }
    const hash = await clients.walletClient.writeContract({
      address: implications,
      abi: ImplicationsAbi,
      functionName: 'attestImplication',
      args: [
        cidToBytes32(from),
        cidToBytes32(to),
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      ],
      chain: clients.walletClient.chain,
      account: clients.walletClient.account,
    });
    await clients.publicClient.waitForTransactionReceipt({ hash });
    attested += 1;
  }
  console.log(`  ✓ ${cluster.id} replayed ${attested} modified→commonality implications`);
}

async function signPlanks(cluster: TinyClusterDef, cids: Map<string, IpfsCidV1>): Promise<void> {
  const beliefs = CONTRACT_ADDRESSES.beliefs as `0x${string}` | undefined;
  if (!beliefs) {
    console.warn('Beliefs contract not configured — skipping signatures.');
    return;
  }
  for (const persona of cluster.personas) {
    const key = fundedKey(persona.hardhatIndex);
    const toSign = [...persona.signsNaturals];
    if (persona.takesModified) {
      for (const naturalId of persona.signsNaturals) {
        const modifiedId = modifiedIdForNatural(naturalId, persona.side);
        if (modifiedId && cluster.parents.some((parent) => parent.modifieds.includes(modifiedId))) {
          toSign.push(modifiedId);
        }
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
    console.log(`  ✓ HH#${persona.hardhatIndex} (${persona.id}) signed ${signed} ${cluster.id} statements`);
  }
}

interface CreatedProject {
  id: string;
  name: string;
  assuranceContract: `0x${string}`;
  erc1155: `0x${string}`;
  tokenIds: number[];
  prices: string[];
  alignments: string[];
}

async function createProjects(cluster: TinyClusterDef, statementCids: Map<string, IpfsCidV1>): Promise<CreatedProject[]> {
  const factory = CONTRACT_ADDRESSES.projectFactory as `0x${string}` | undefined;
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined;
  if (!factory || !paymentToken) {
    console.warn('ProjectFactory or payment token missing — skipping projects.');
    return [];
  }

  const created: CreatedProject[] = [];
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

  for (const template of cluster.projects) {
    const key = fundedKey(template.ownerIndex);
    const clients = createClients(key);
    const store = createDefaultDocumentStore(
      createSDKMachinery({ ipfsConfig: createIPFSConfigInNodeJSFromTheUsualEnvVars() }),
      {
        clients: clients as WriteClients,
        ...(publishedData
          ? { publishedDataContract: { address: publishedData, abi: PublishedDataAbi } }
          : {}),
      },
    );
    const alignedStatementRefs = template.alignments.map((alignment) => {
      const { groupId, statementId } = parsePlankRef(alignment);
      return { collectionId: cluster.collectionId, groupId, statementId };
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
      id: template.id,
      name: template.name,
      assuranceContract: projectDetails.assuranceContractAddress,
      erc1155: projectDetails.tokenAddress,
      tokenIds: tokenIds.map(Number),
      prices: prices.map((price) => price.toString()),
      alignments: template.alignments,
    });
    console.log(`  ✓ Project ${template.name} → ${projectDetails.assuranceContractAddress}`);

    const alignment = CONTRACT_ADDRESSES.alignmentAttestations as `0x${string}` | undefined;
    if (alignment) {
      for (const alignmentId of template.alignments) {
        const statementCid = statementCids.get(alignmentId);
        if (!statementCid) {
          console.warn(`  Missing CID for alignment ${alignmentId}`);
          continue;
        }
        const attesterPersona = pickAlignmentAttester(cluster.personas, alignmentId, template.ownerIndex);
        const attesterKey = attesterPersona
          ? fundedKey(attesterPersona.hardhatIndex)
          : fundedKey(template.ownerIndex);
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

async function buyProjects(cluster: TinyClusterDef, projects: CreatedProject[]): Promise<void> {
  const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined;
  if (!paymentToken || !cluster.buys) return;

  for (const buy of cluster.buys) {
    const project = projects.find((candidate) => candidate.id === buy.projectId);
    const buyer = cluster.personas.find((persona) => persona.hardhatIndex === buy.accountIndex);
    const key = FUNDED_HARDHAT_DEV_KEYS[buy.accountIndex];
    if (!project || !key || !buyer) continue;
    const sides = new Set(project.alignments.map(sideOfAlignment));
    if (!sides.has(buyer.side) && sides.size === 1) {
      console.warn(`  Skipping buy: HH#${buy.accountIndex} (${buyer.side}) on unique ${project.name}`);
      continue;
    }
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
}

export async function publishTinyClusterDocuments(
  cluster: TinyClusterDef,
  cids: Map<string, IpfsCidV1>,
): Promise<{ clusterCid: string | null; rosterCids: string[] }> {
  console.log(`\n=== Publishing tiny cluster ${cluster.id} ===\n`);
  const rosterCids: string[] = [];
  const mediatorKey = fundedKey(cluster.mediatorHardhatIndex);

  for (const parent of cluster.parents) {
    const parentCid = await publishDocumentAs(
      fundedKey(parent.ownerHardhatIndex),
      parent.slug,
      buildSeedRosterDocument(parentRosterFields(cluster, parent, cidsFor(parent.naturals, cids))),
    );
    if (parentCid) {
      rosterCids.push(parentCid);
      console.log(`  ✓ Parent ${parent.slug} → ${parentCid}`);
    }
    const modifiedCid = await publishDocumentAs(
      mediatorKey,
      parent.modifiedSlug,
      buildSeedRosterDocument(modifiedRosterFields(cluster, parent, cidsFor(parent.modifieds, cids))),
    );
    if (modifiedCid) {
      rosterCids.push(modifiedCid);
      console.log(`  ✓ Modified ${parent.modifiedSlug} → ${modifiedCid}`);
    }
  }

  const bridgeCid = await publishDocumentAs(
    mediatorKey,
    cluster.bridge.slug,
    buildSeedRosterDocument(bridgeRosterFields(cluster, cidsFor(cluster.bridge.planks, cids))),
  );
  if (bridgeCid) {
    rosterCids.push(bridgeCid);
    console.log(`  ✓ Bridge ${cluster.bridge.slug} → ${bridgeCid}`);
  }

  const fields = clusterDocumentFields(cluster, cids);
  const expectedPairs = deriveImplications(cluster).length;
  if (fields.pairs.length !== expectedPairs) {
    console.warn(`  Cluster has ${fields.pairs.length}/${expectedPairs} modified→CG pairs (missing CIDs).`);
  }
  const clusterCid = await publishDocumentAs(
    mediatorKey,
    cluster.clusterSlug,
    buildSeedClusterDocument(fields),
  );
  if (clusterCid) {
    console.log(
      `  ✓ Cluster ${cluster.clusterSlug} → ${clusterCid}\n  Open /bridge/${mediatorAddress(cluster)}/${cluster.clusterSlug}`,
    );
  }
  return { clusterCid, rosterCids };
}

export async function publishTinyCluster(
  cluster: TinyClusterDef,
  cids: Map<string, IpfsCidV1>,
  options: { activity?: boolean } = {},
): Promise<void> {
  const activity = options.activity !== false;
  if (activity) {
    await publishNudges(cluster, cids);
    await attestImplications(cluster, cids);
    await signPlanks(cluster, cids);
    const projects = await createProjects(cluster, cids);
    await buyProjects(cluster, projects);
  }
  await publishTinyClusterDocuments(cluster, cids);
}

export async function publishAllTinyClusters(
  cids: Map<string, IpfsCidV1>,
  options: { publishStatements?: boolean; activity?: boolean } = {},
): Promise<TinyClusterDef[]> {
  const clusters = loadTinyClusterDefs();
  const publishStatements = options.publishStatements !== false;
  for (const cluster of clusters) {
    if (publishStatements) {
      await publishClusterStatements(cluster, cids, true);
    }
    await publishTinyCluster(cluster, cids, { activity: options.activity });
  }
  return clusters;
}
