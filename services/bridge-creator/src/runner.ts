import type { SDKMachinery } from '@commonality/sdk/machinery';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import type { NudgeMessage } from '@commonality/nudger-core';
import type { BridgeCreatorConfig } from './config.js';
import { getActiveAnchors, loadAnchorStoreFile } from './anchors.js';
import { allContextsReady, fetchBridgeContextSnapshots } from './contextSources.js';
import { publishBridgeStatement } from './statementPublisher.js';
import { publishBridgeNudgeBatch, type BridgePublicationResult } from './publication.js';
import { loadDefaultStrategyPrompt } from './strategyPrompt.js';
import { synthesizeBridgeTriples, type SynthesizedBridgeTriple } from './synthesizer.js';
import { getPendingProposals, loadProposalStoreFile, markProposalsConsumed } from './proposals.js';
import type { BridgeImplicationSubmitter } from './implicationPublisher.js';
import {
  computeBridgePublicationInputHash,
  loadBridgePublicationDedupState,
  saveBridgePublicationDedupState,
  summarizePublishedBridgeTriples,
} from './dedup.js';
import { planClusterFromTick, type TickClusterPlan } from './clusterFromTick.js';
import { createNudgerSigner } from '@commonality/nudger-core';

export type BridgeCreatorTickStatus = 'warming' | 'duplicate' | 'no_bridges' | 'published';

export interface BridgeCreatorTickResult {
  status: BridgeCreatorTickStatus;
  synthesizedBridgeCount: number;
  publishedNudgeCount: number;
  publication?: BridgePublicationResult;
  implicationTxHashes: string[];
  inputHash?: string;
  clusterSlug?: string;
}

export interface BridgeCreatorRunnerDependencies {
  fetchBridgeContextSnapshots: typeof fetchBridgeContextSnapshots;
  loadAnchorStoreFile: typeof loadAnchorStoreFile;
  loadStrategyPrompt: typeof loadDefaultStrategyPrompt;
  synthesizeBridgeTriples: typeof synthesizeBridgeTriples;
  publishBridgeStatement: typeof publishBridgeStatement;
  publishBridgeNudgeBatch: typeof publishBridgeNudgeBatch;
  loadDedupState: typeof loadBridgePublicationDedupState;
  saveDedupState: typeof saveBridgePublicationDedupState;
  loadProposalStore: typeof loadProposalStoreFile;
  markProposalsConsumed: typeof markProposalsConsumed;
  implicationSubmitter?: BridgeImplicationSubmitter;
  publishTickCluster?: (plan: TickClusterPlan) => Promise<void>;
}

const defaultDependencies: BridgeCreatorRunnerDependencies = {
  fetchBridgeContextSnapshots,
  loadAnchorStoreFile,
  loadStrategyPrompt: loadDefaultStrategyPrompt,
  synthesizeBridgeTriples,
  publishBridgeStatement,
  publishBridgeNudgeBatch,
  loadDedupState: loadBridgePublicationDedupState,
  saveDedupState: saveBridgePublicationDedupState,
  loadProposalStore: loadProposalStoreFile,
  markProposalsConsumed,
};

interface PublishedTriple {
  triple: SynthesizedBridgeTriple;
  sideACid: IpfsCidV1;
  sideBCid: IpfsCidV1;
  commonGroundCid: IpfsCidV1;
}

export async function runBridgeCreatorTick(
  machinery: SDKMachinery,
  config: BridgeCreatorConfig,
  dependencies: BridgeCreatorRunnerDependencies = defaultDependencies,
): Promise<BridgeCreatorTickResult> {
  const contextSnapshots = await dependencies.fetchBridgeContextSnapshots(config.trustedContextSources);
  if (!allContextsReady(contextSnapshots)) {
    return emptyTickResult('warming');
  }

  const anchors = getActiveAnchors(dependencies.loadAnchorStoreFile(config.anchorStorePath));
  const pendingProposals = config.proposalStorePath
    ? getPendingProposals(dependencies.loadProposalStore(config.proposalStorePath))
    : [];
  const strategyPrompt = dependencies.loadStrategyPrompt();
  const inputHash = computeBridgePublicationInputHash({
    contextSnapshots,
    activeAnchors: anchors,
    pendingProposals,
    strategyPrompt,
    labels: config.labels,
  });
  const dedupState = dependencies.loadDedupState(config.publicationDedupStatePath);
  const triples = await dependencies.synthesizeBridgeTriples(
    {
      strategyPrompt,
      contextSnapshots,
      activeAnchors: anchors,
      previousPublicationSummary: dedupState.lastPublicationSummary,
      externalProposals: pendingProposals,
      labels: config.labels,
    },
    {
      openRouterApiKey: config.openRouterApiKey,
      openRouterModel: config.openRouterModel,
    },
  );

  // The synthesizer has now seen these proposals (whether or not it published a
  // bridge from them); mark them consumed so future ticks don't reconsider them.
  if (config.proposalStorePath && pendingProposals.length > 0) {
    dependencies.markProposalsConsumed(
      config.proposalStorePath,
      pendingProposals.map((proposal) => proposal.id),
    );
  }

  if (triples.length === 0) {
    return { ...emptyTickResult('no_bridges'), inputHash };
  }

  if (dedupState.lastInputHash === inputHash) {
    return { ...emptyTickResult('duplicate'), synthesizedBridgeCount: triples.length, inputHash };
  }

  const publishedTriples: PublishedTriple[] = [];
  for (const triple of triples) {
    const [sideACid, sideBCid, commonGroundCid] = await Promise.all([
      dependencies.publishBridgeStatement(machinery, triple.sideA),
      dependencies.publishBridgeStatement(machinery, triple.sideB),
      dependencies.publishBridgeStatement(machinery, triple.commonGround),
    ]);
    publishedTriples.push({ triple, sideACid, sideBCid, commonGroundCid });
  }

  const nudges = createNudgesForPublishedTriples(publishedTriples);
  const publication = await dependencies.publishBridgeNudgeBatch(nudges, config);
  const implicationTxHashes = dependencies.implicationSubmitter
    ? await dependencies.implicationSubmitter.submitImplications(
        publishedTriples.flatMap((published) => [
          { fromStatementCid: published.sideACid, toStatementCid: published.commonGroundCid },
          { fromStatementCid: published.sideBCid, toStatementCid: published.commonGroundCid },
        ]),
      )
    : [];

  dependencies.saveDedupState(config.publicationDedupStatePath, {
    lastInputHash: inputHash,
    lastPublicationSummary: summarizePublishedBridgeTriples(triples),
  });

  let clusterSlug: string | undefined;
  if (config.parentCauses.length > 0 && dependencies.publishTickCluster) {
    const mediatorAddress = createNudgerSigner(config).address as `0x${string}`;
    const clusterPlan = planClusterFromTick({
      mediatorName: config.name,
      mediatorNote: config.description,
      mediatorAddress,
      clusterSlug: config.clusterSlug,
      parentCauses: config.parentCauses,
      triples: publishedTriples.map((published) => ({
        sideACid: published.sideACid,
        sideBCid: published.sideBCid,
        commonGroundCid: published.commonGroundCid,
      })),
    });
    if (clusterPlan) {
      await dependencies.publishTickCluster(clusterPlan);
      clusterSlug = clusterPlan.clusterSlug;
    }
  }

  return {
    status: 'published',
    synthesizedBridgeCount: triples.length,
    publishedNudgeCount: nudges.length,
    publication,
    implicationTxHashes,
    inputHash,
    clusterSlug,
  };
}

export function createNudgesForPublishedTriples(publishedTriples: PublishedTriple[]): NudgeMessage[] {
  return publishedTriples.flatMap((published) => [
    {
      targetStatementCid: published.sideACid,
      suggestedStatementCid: published.commonGroundCid,
      reason: `This side A bridge statement implies common ground: ${published.triple.rationale}`,
      confidence: 0.8,
    },
    {
      targetStatementCid: published.sideBCid,
      suggestedStatementCid: published.commonGroundCid,
      reason: `This side B bridge statement implies common ground: ${published.triple.rationale}`,
      confidence: 0.8,
    },
  ]);
}

function emptyTickResult(status: 'warming' | 'duplicate' | 'no_bridges'): BridgeCreatorTickResult {
  return {
    status,
    synthesizedBridgeCount: 0,
    publishedNudgeCount: 0,
    implicationTxHashes: [],
  };
}
