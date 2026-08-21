/**
 * Lift this tick's statement triples into a CauseStarter-compatible bridge cluster
 * when the mediator named parent causes. Same extras kinds as causestarter/src/lib/bridgeCluster.ts
 * and causeRoster.ts so /bridge/:owner/:slug can load them.
 */

export const BRIDGE_CLUSTER_KIND = 'causestarter.bridge-cluster' as const;
export const BRIDGE_CLUSTER_SCHEMA_VERSION = 1 as const;
export const ROSTER_KIND = 'causestarter.roster' as const;
export const ROSTER_SCHEMA_VERSION = 1 as const;

export interface ParentCauseRef {
  owner: `0x${string}`;
  slug: string;
  side: 'side_a' | 'side_b';
}

export interface TickTripleCids {
  sideACid: string;
  sideBCid: string;
  commonGroundCid: string;
}

export interface ClusterRosterPlan {
  slug: string;
  title: string;
  summary: string;
  plankCids: string[];
  parentOwner?: `0x${string}`;
  parentSlug?: string;
  role: 'modified' | 'bridge';
}

export interface ClusterDocumentPlan {
  mediatorName: string;
  mediatorNote: string;
  mediatorAddress: `0x${string}`;
  clusterSlug: string;
  parents: Array<{ owner: `0x${string}`; slug: string }>;
  modified: Array<{
    owner: `0x${string}`;
    slug: string;
    parentOwner: `0x${string}`;
    parentSlug: string;
  }>;
  bridge: { owner: `0x${string}`; slug: string };
  pairs: Array<{ fromCid: string; toCid: string; role: 'modified-to-bridge' }>;
}

export interface TickClusterPlan {
  clusterSlug: string;
  rosters: ClusterRosterPlan[];
  cluster: ClusterDocumentPlan;
}

export function slugifyCluster(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'bridge-cluster';
}

export function planClusterFromTick(args: {
  mediatorName: string;
  mediatorNote: string;
  mediatorAddress: `0x${string}`;
  clusterSlug?: string;
  parentCauses: ParentCauseRef[];
  triples: TickTripleCids[];
}): TickClusterPlan | null {
  if (args.parentCauses.length === 0 || args.triples.length === 0) return null;
  const clusterSlug = slugifyCluster(args.clusterSlug || args.mediatorName);
  const owner = args.mediatorAddress.toLowerCase() as `0x${string}`;
  const sideAParents = args.parentCauses.filter((parent) => parent.side === 'side_a');
  const sideBParents = args.parentCauses.filter((parent) => parent.side === 'side_b');
  if (sideAParents.length === 0 || sideBParents.length === 0) return null;

  const sideAPlanks = [...new Set(args.triples.map((triple) => triple.sideACid))];
  const sideBPlanks = [...new Set(args.triples.map((triple) => triple.sideBCid))];
  const bridgePlanks = [...new Set(args.triples.map((triple) => triple.commonGroundCid))];

  const rosters: ClusterRosterPlan[] = [];
  const modified: ClusterDocumentPlan['modified'] = [];

  for (const parent of sideAParents) {
    const slug = slugifyCluster(`${clusterSlug}-${parent.slug}-modified`);
    rosters.push({
      slug,
      title: `${args.mediatorName}: ${parent.slug} (modified)`,
      summary: `Mediator wording of ${parent.slug}. Not an official revision.`,
      plankCids: sideAPlanks,
      parentOwner: parent.owner.toLowerCase() as `0x${string}`,
      parentSlug: parent.slug,
      role: 'modified',
    });
    modified.push({
      owner,
      slug,
      parentOwner: parent.owner.toLowerCase() as `0x${string}`,
      parentSlug: parent.slug,
    });
  }
  for (const parent of sideBParents) {
    const slug = slugifyCluster(`${clusterSlug}-${parent.slug}-modified`);
    rosters.push({
      slug,
      title: `${args.mediatorName}: ${parent.slug} (modified)`,
      summary: `Mediator wording of ${parent.slug}. Not an official revision.`,
      plankCids: sideBPlanks,
      parentOwner: parent.owner.toLowerCase() as `0x${string}`,
      parentSlug: parent.slug,
      role: 'modified',
    });
    modified.push({
      owner,
      slug,
      parentOwner: parent.owner.toLowerCase() as `0x${string}`,
      parentSlug: parent.slug,
    });
  }

  const bridgeSlug = slugifyCluster(`${clusterSlug}-bridge`);
  rosters.push({
    slug: bridgeSlug,
    title: `${args.mediatorName}: shared ground`,
    summary: 'Bridge cause implied by each modified wording.',
    plankCids: bridgePlanks,
    role: 'bridge',
  });

  const pairs: ClusterDocumentPlan['pairs'] = args.triples.flatMap((triple) => [
    { fromCid: triple.sideACid, toCid: triple.commonGroundCid, role: 'modified-to-bridge' as const },
    { fromCid: triple.sideBCid, toCid: triple.commonGroundCid, role: 'modified-to-bridge' as const },
  ]);

  return {
    clusterSlug,
    rosters,
    cluster: {
      mediatorName: args.mediatorName,
      mediatorNote: args.mediatorNote,
      mediatorAddress: owner,
      clusterSlug,
      parents: args.parentCauses.map((parent) => ({
        owner: parent.owner.toLowerCase() as `0x${string}`,
        slug: parent.slug,
      })),
      modified,
      bridge: { owner, slug: bridgeSlug },
      pairs,
    },
  };
}

export function rosterDocumentFromPlan(plan: ClusterRosterPlan): Record<string, unknown> {
  return {
    format: 'markdown-restricted',
    content: `# ${plan.title}\n\n${plan.summary}`,
    assets: {},
    references: plan.plankCids.map((cid) => ({ cid, label: 'plank' })),
    extras: {
      kind: ROSTER_KIND,
      version: ROSTER_SCHEMA_VERSION,
      title: plan.title,
      summary: plan.summary,
      plankCids: plan.plankCids,
      mediatorBlurb: '',
    },
  };
}

export function clusterDocumentFromPlan(plan: ClusterDocumentPlan): Record<string, unknown> {
  return {
    format: 'markdown-restricted',
    content: `# Bridge cluster\n\nMediator: ${plan.mediatorName}`,
    assets: {},
    references: [],
    extras: {
      kind: BRIDGE_CLUSTER_KIND,
      version: BRIDGE_CLUSTER_SCHEMA_VERSION,
      mediatorName: plan.mediatorName,
      mediatorNote: plan.mediatorNote,
      mediatorAddress: plan.mediatorAddress,
      parents: plan.parents,
      modified: plan.modified,
      bridge: plan.bridge,
      pairs: plan.pairs,
    },
  };
}
