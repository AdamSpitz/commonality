import { getAddress, isAddress } from "viem";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HITS = 10_000;

export interface ProjectLogMiss {
  address: string;
  at: number;
}

export interface HotProject {
  address: string;
  requests: number;
  lastRequestAt: number;
  factory?: string;
}

export interface HotFactory {
  factory: string;
  requests: number;
  projects: string[];
}

export interface ProjectReadDemandReport {
  windowMs: number;
  projects: HotProject[];
  factories: HotFactory[];
}

const hits: ProjectLogMiss[] = [];

export function resetProjectReadDemand(): void {
  hits.length = 0;
}

/** A whole-contract history probe. Filters and cursors are not demand for an unindexed project. */
export function isBareContractLogQuery(query: {
  contractAddress?: string;
  eventName?: string;
  topic1?: string;
  topic2?: string;
  topic3?: string;
  blockNumber_gte?: string;
  blockNumber_lte?: string;
}): boolean {
  return Boolean(query.contractAddress)
    && !query.eventName
    && !query.topic1
    && !query.topic2
    && !query.topic3
    && !query.blockNumber_gte
    && !query.blockNumber_lte;
}

export function recordUnindexedProjectLogRequest(address: string, now = Date.now()): void {
  if (!isAddress(address)) return;
  hits.push({ address: getAddress(address).toLowerCase(), at: now });
  if (hits.length > MAX_HITS) hits.splice(0, hits.length - MAX_HITS);
}

export function projectReadDemandReport(
  factoryByProject: ReadonlyMap<string, string>,
  now = Date.now(),
  windowMs = DAY_MS,
): ProjectReadDemandReport {
  const since = now - windowMs;
  const byAddress = new Map<string, HotProject>();
  for (const hit of hits) {
    if (hit.at < since) continue;
    const existing = byAddress.get(hit.address);
    if (existing) {
      existing.requests += 1;
      existing.lastRequestAt = Math.max(existing.lastRequestAt, hit.at);
    } else {
      const factory = factoryByProject.get(hit.address);
      byAddress.set(hit.address, {
        address: hit.address,
        requests: 1,
        lastRequestAt: hit.at,
        ...(factory ? { factory } : {}),
      });
    }
  }

  const projects = [...byAddress.values()].sort((a, b) =>
    b.requests - a.requests || b.lastRequestAt - a.lastRequestAt,
  );

  const byFactory = new Map<string, HotFactory>();
  for (const project of projects) {
    if (!project.factory) continue;
    const group = byFactory.get(project.factory) ?? {
      factory: project.factory,
      requests: 0,
      projects: [],
    };
    group.requests += project.requests;
    group.projects.push(project.address);
    byFactory.set(project.factory, group);
  }

  const factories = [...byFactory.values()]
    .filter((group) => group.projects.length >= 2)
    .sort((a, b) => b.requests - a.requests);

  return { windowMs, projects, factories };
}
