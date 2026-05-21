import type { SDKMachinery, IpfsCidV1 } from '@commonality/sdk';
import type { NudgeMessage } from '@commonality/nudger-core';
import type { BridgeCreatorConfig } from './config.js';
import { getActiveAnchors, loadAnchorStoreFile } from './anchors.js';
import { allContextsReady, fetchBridgeContextSnapshots } from './contextSources.js';
import { publishBridgeStatement } from './statementPublisher.js';
import { publishBridgeNudgeBatch, type BridgePublicationResult } from './publication.js';
import { loadDefaultStrategyPrompt } from './strategyPrompt.js';
import { synthesizeBridgeTriples, type SynthesizedBridgeTriple } from './synthesizer.js';
import type { BridgeImplicationSubmitter } from './implicationPublisher.js';

export type BridgeCreatorTickStatus = 'warming' | 'no_bridges' | 'published';

export interface BridgeCreatorTickResult {
  status: BridgeCreatorTickStatus;
  synthesizedBridgeCount: number;
  publishedNudgeCount: number;
  publication?: BridgePublicationResult;
  implicationTxHashes: string[];
}

export interface BridgeCreatorRunnerDependencies {
  fetchBridgeContextSnapshots: typeof fetchBridgeContextSnapshots;
  loadAnchorStoreFile: typeof loadAnchorStoreFile;
  loadStrategyPrompt: typeof loadDefaultStrategyPrompt;
  synthesizeBridgeTriples: typeof synthesizeBridgeTriples;
  publishBridgeStatement: typeof publishBridgeStatement;
  publishBridgeNudgeBatch: typeof publishBridgeNudgeBatch;
  implicationSubmitter?: BridgeImplicationSubmitter;
}

const defaultDependencies: BridgeCreatorRunnerDependencies = {
  fetchBridgeContextSnapshots,
  loadAnchorStoreFile,
  loadStrategyPrompt: loadDefaultStrategyPrompt,
  synthesizeBridgeTriples,
  publishBridgeStatement,
  publishBridgeNudgeBatch,
};

interface PublishedTriple {
  triple: SynthesizedBridgeTriple;
  modifiedLeftCid: IpfsCidV1;
  modifiedRightCid: IpfsCidV1;
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
  const triples = await dependencies.synthesizeBridgeTriples(
    {
      strategyPrompt: dependencies.loadStrategyPrompt(),
      contextSnapshots,
      activeAnchors: anchors,
    },
    {
      openRouterApiKey: config.openRouterApiKey,
      openRouterModel: config.openRouterModel,
    },
  );

  if (triples.length === 0) {
    return emptyTickResult('no_bridges');
  }

  const publishedTriples: PublishedTriple[] = [];
  for (const triple of triples) {
    const [modifiedLeftCid, modifiedRightCid, commonGroundCid] = await Promise.all([
      dependencies.publishBridgeStatement(machinery, triple.modifiedLeft),
      dependencies.publishBridgeStatement(machinery, triple.modifiedRight),
      dependencies.publishBridgeStatement(machinery, triple.commonGround),
    ]);
    publishedTriples.push({ triple, modifiedLeftCid, modifiedRightCid, commonGroundCid });
  }

  const nudges = createNudgesForPublishedTriples(publishedTriples);
  const publication = await dependencies.publishBridgeNudgeBatch(nudges, config);
  const implicationTxHashes = dependencies.implicationSubmitter
    ? await dependencies.implicationSubmitter.submitImplications(
        publishedTriples.flatMap((published) => [
          { fromStatementCid: published.modifiedLeftCid, toStatementCid: published.commonGroundCid },
          { fromStatementCid: published.modifiedRightCid, toStatementCid: published.commonGroundCid },
        ]),
      )
    : [];

  return {
    status: 'published',
    synthesizedBridgeCount: triples.length,
    publishedNudgeCount: nudges.length,
    publication,
    implicationTxHashes,
  };
}

export function createNudgesForPublishedTriples(publishedTriples: PublishedTriple[]): NudgeMessage[] {
  return publishedTriples.flatMap((published) => [
    {
      targetStatementCid: published.modifiedLeftCid,
      suggestedStatementCid: published.commonGroundCid,
      reason: `This modified left-side bridge statement implies common ground: ${published.triple.rationale}`,
      confidence: 0.8,
    },
    {
      targetStatementCid: published.modifiedRightCid,
      suggestedStatementCid: published.commonGroundCid,
      reason: `This modified right-side bridge statement implies common ground: ${published.triple.rationale}`,
      confidence: 0.8,
    },
  ]);
}

function emptyTickResult(status: 'warming' | 'no_bridges'): BridgeCreatorTickResult {
  return {
    status,
    synthesizedBridgeCount: 0,
    publishedNudgeCount: 0,
    implicationTxHashes: [],
  };
}
