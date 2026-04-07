import type { Project } from '../pubstarter/types.js';
import type { ContractVetoedEvent } from './events.js';
import type {
  ChannelEscrowState,
  ChannelInfo,
  ContentFundingState,
  ContentItem,
  CreatorContractInfo,
} from './folds.js';

export const DEFAULT_VETO_WINDOW_SECONDS = 7n * 24n * 60n * 60n;

export type ContentFundingContractStatus = 'active' | 'successful' | 'failed' | 'vetoed' | 'unknown';
export type ContentItemRegistrationStatus = 'unregistered' | 'active' | 'released';

export interface ContentFundingContractSummary extends CreatorContractInfo {
  project: Project | null;
  contentItems: ContentItem[];
  status: ContentFundingContractStatus;
  fundingProgress: number | null;
}

export interface ChannelOverview {
  channel: ChannelInfo;
  escrow: {
    balance: bigint;
    totalDeposited: bigint;
    totalWithdrawn: bigint;
  };
  contracts: ContentFundingContractSummary[];
  contentItems: ContentItem[];
}

export interface ContentItemStatus {
  contentId: bigint;
  registrationStatus: ContentItemRegistrationStatus;
  canonicalId: string | null;
  contractAddress: string | null;
  contract: ContentFundingContractSummary | null;
}

export interface ContentFundingQueryOptions {
  projects?: Iterable<Project>;
  vetoedEvents?: Iterable<ContractVetoedEvent>;
  now?: bigint;
  vetoWindowSeconds?: bigint;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function buildProjectMap(projects: Iterable<Project>): Map<string, Project> {
  const projectMap = new Map<string, Project>();

  for (const project of projects) {
    projectMap.set(normalizeAddress(project.id), project);
  }

  return projectMap;
}

function buildVetoedContractSet(vetoedEvents: Iterable<ContractVetoedEvent>): Set<string> {
  const vetoedContracts = new Set<string>();

  for (const event of vetoedEvents) {
    vetoedContracts.add(normalizeAddress(event.contractAddress));
  }

  return vetoedContracts;
}

function indexContentItemsByContract(
  state: ContentFundingState,
  channelId?: string,
): Map<string, ContentItem[]> {
  const contractToItems = new Map<string, ContentItem[]>();
  const contractLookup = state.creatorContracts.contracts;

  for (const item of state.contentRegistry.items.values()) {
    const contract = contractLookup.get(normalizeAddress(item.contractAddress));
    if (channelId && contract?.channelId !== channelId) {
      continue;
    }

    const key = normalizeAddress(item.contractAddress);
    const items = contractToItems.get(key) ?? [];
    items.push(item);
    contractToItems.set(key, items);
  }

  for (const items of contractToItems.values()) {
    items.sort((a, b) => {
      if (a.contentId < b.contentId) return -1;
      if (a.contentId > b.contentId) return 1;
      return 0;
    });
  }

  return contractToItems;
}

function sortContracts(contracts: ContentFundingContractSummary[]): ContentFundingContractSummary[] {
  return contracts.sort((a, b) => {
    const aCreatedAt = a.project?.createdAt ? BigInt(a.project.createdAt) : null;
    const bCreatedAt = b.project?.createdAt ? BigInt(b.project.createdAt) : null;

    if (aCreatedAt !== null && bCreatedAt !== null && aCreatedAt !== bCreatedAt) {
      return aCreatedAt < bCreatedAt ? -1 : 1;
    }

    const aBlock = a.project?.blockNumber ? BigInt(a.project.blockNumber) : null;
    const bBlock = b.project?.blockNumber ? BigInt(b.project.blockNumber) : null;
    if (aBlock !== null && bBlock !== null && aBlock !== bBlock) {
      return aBlock < bBlock ? -1 : 1;
    }

    return normalizeAddress(a.contractAddress).localeCompare(normalizeAddress(b.contractAddress));
  });
}

function getFundingProgress(project: Project | null): number | null {
  if (!project) return null;

  const threshold = BigInt(project.threshold);
  if (threshold <= 0n) return null;

  return Number((BigInt(project.totalReceived) * 10000n) / threshold) / 10000;
}

function getContractStatus(
  project: Project | null,
  now: bigint | undefined,
  isVetoed: boolean,
): ContentFundingContractStatus {
  if (isVetoed) return 'vetoed';
  if (!project) return 'unknown';

  const threshold = BigInt(project.threshold);
  const totalReceived = BigInt(project.totalReceived);
  if (threshold > 0n && totalReceived >= threshold) {
    return 'successful';
  }

  const deadline = BigInt(project.deadline);
  if (now !== undefined && deadline > 0n && now > deadline) {
    return 'failed';
  }

  return 'active';
}

function buildContractSummary(
  contract: CreatorContractInfo,
  projectMap: Map<string, Project>,
  contentItemsByContract: Map<string, ContentItem[]>,
  vetoedContracts: Set<string>,
  now: bigint | undefined,
): ContentFundingContractSummary {
  const normalizedContractAddress = normalizeAddress(contract.contractAddress);
  const project = projectMap.get(normalizedContractAddress) ?? null;
  const contentItems = contentItemsByContract.get(normalizedContractAddress) ?? [];

  return {
    ...contract,
    project,
    contentItems,
    status: getContractStatus(project, now, vetoedContracts.has(normalizedContractAddress)),
    fundingProgress: getFundingProgress(project),
  };
}

function getDefaultChannelInfo(channelId: string): ChannelInfo {
  return {
    channelId,
    owner: null,
    state: 'unclaimed',
    controlTakenAt: null,
  };
}

function getEscrowEntry(
  channelEscrow: ChannelEscrowState,
  channelId: string,
): { balance: bigint; totalDeposited: bigint; totalWithdrawn: bigint } {
  return channelEscrow.balances.get(channelId) ?? {
    balance: 0n,
    totalDeposited: 0n,
    totalWithdrawn: 0n,
  };
}

export function getContractsForChannel(
  state: ContentFundingState,
  channelId: string,
  options: ContentFundingQueryOptions = {},
): ContentFundingContractSummary[] {
  const projectMap = buildProjectMap(options.projects ?? []);
  const vetoedContracts = buildVetoedContractSet(options.vetoedEvents ?? []);
  const contentItemsByContract = indexContentItemsByContract(state, channelId);

  const contracts = Array.from(state.creatorContracts.contracts.values())
    .filter((contract) => contract.channelId === channelId)
    .map((contract) => buildContractSummary(contract, projectMap, contentItemsByContract, vetoedContracts, options.now));

  return sortContracts(contracts);
}

export function getChannelOverview(
  state: ContentFundingState,
  channelId: string,
  options: ContentFundingQueryOptions = {},
): ChannelOverview {
  const contracts = getContractsForChannel(state, channelId, options);
  const contentItems = contracts.flatMap((contract) => contract.contentItems);

  return {
    channel: state.channelRegistry.channels.get(channelId) ?? getDefaultChannelInfo(channelId),
    escrow: getEscrowEntry(state.channelEscrow, channelId),
    contracts,
    contentItems,
  };
}

export function getContentItemStatus(
  state: ContentFundingState,
  contentId: bigint,
  options: ContentFundingQueryOptions = {},
): ContentItemStatus {
  const item = state.contentRegistry.items.get(contentId);
  if (!item) {
    return {
      contentId,
      registrationStatus: 'unregistered',
      canonicalId: null,
      contractAddress: null,
      contract: null,
    };
  }

  const contractInfo = state.creatorContracts.contracts.get(normalizeAddress(item.contractAddress));
  const contract = contractInfo
    ? buildContractSummary(
        contractInfo,
        buildProjectMap(options.projects ?? []),
        indexContentItemsByContract(state),
        buildVetoedContractSet(options.vetoedEvents ?? []),
        options.now,
      )
    : null;

  return {
    contentId,
    registrationStatus: item.status,
    canonicalId: item.canonicalId,
    contractAddress: item.contractAddress,
    contract,
  };
}

export function getVetoableContracts(
  state: ContentFundingState,
  channelId: string,
  options: ContentFundingQueryOptions = {},
): ContentFundingContractSummary[] {
  const channel = state.channelRegistry.channels.get(channelId);
  if (!channel || channel.state !== 'creator-controlled' || channel.controlTakenAt === null) {
    return [];
  }

  const now = options.now;
  if (now === undefined) {
    return [];
  }

  const vetoWindowSeconds = options.vetoWindowSeconds ?? DEFAULT_VETO_WINDOW_SECONDS;
  if (now > channel.controlTakenAt + vetoWindowSeconds) {
    return [];
  }

  return getContractsForChannel(state, channelId, options).filter((contract) => (
    contract.isThirdParty && contract.status === 'active'
  ));
}
