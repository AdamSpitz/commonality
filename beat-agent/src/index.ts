import { pathToFileURL } from 'node:url';
import type { IpfsCidV1 } from '@commonality/sdk';
import { createBeatAgentServiceApp, defaultUploadExplanation, appendEvaluationLogToJsonl, findExistingAttestationFromJsonl } from './app.js';
import { createLlmMemoryCompactor, createLlmObservationExtractor } from './extractor.js';
import { runBeatFinderOnce } from './finder.js';
import { loadBeatIngestionState, runBeatIngestionOnce, type BeatIngestionRunSummary, type BeatSourceAdapter, type BeatSourceType } from './ingestion.js';
import { compactBeatMemory, extractObservationsFromItems, loadBeatContextMemoryState, type ExtractObservationsSummary, type CompactBeatMemorySummary } from './memory.js';
import { createTwitterBeatSourceAdapters } from './twitterAdapter.js';
import { checkBeatAgentBalance, publishBeatAgentAttestation, getBeatAgentBlockchainClients, findExistingBeatAgentAttestationOnChain } from './blockchain.js';
import { loadConfig, getIpfsConfig, getPaymentConfig, type BeatAgentConfig } from './config.js';
import { resolveBeatAgentContentForRequest } from './content.js';
import { buildBeatAgentEvaluationContext } from './context.js';
import { evaluateBeatContentWithLLM } from './evaluator.js';

export type {
  BeatAgentAppConfig,
  BeatAgentAppDependencies,
} from './app.js';

export type {
  BeatAgentAttesterModeConfig,
  BeatAgentContentSource,
  BeatAgentExistingAttestation,
  ProcessBeatAgentEvaluationDependencies,
  ProcessBeatAgentEvaluationResult,
} from './attester.js';

export type {
  BeatAgentBlockchainConfig,
  HasBeatAgentAttestationParams,
} from './blockchain.js';

export type {
  BeatAgentConfig,
} from './config.js';

export type {
  BuildBeatAgentEvaluationContextParams,
} from './context.js';

export type {
  BeatAgentContentResolutionOptions,
  PlatformLocalContextResponse,
} from './content.js';

export type {
  EvaluateBeatContentWithLlmParams,
} from './evaluator.js';

export type {
  BeatFinderCandidate,
  BeatFinderCandidateSelector,
  BeatFinderCandidateSelectorParams,
  BeatFinderItemScore,
  BeatFinderProcessedItem,
  BeatFinderProcessedStatus,
  BeatFinderRunSummary,
  BeatFinderScoringConfig,
  BeatFinderState,
  RunBeatFinderOnceParams,
} from './finder.js';

export type {
  BeatDefinition,
  BeatIngestedItem,
  BeatIngestionRunSummary,
  BeatIngestionSkippedSource,
  BeatIngestionState,
  BeatSource,
  BeatSourceAdapter,
  BeatSourceCursor,
  BeatSourceFetchResult,
  BeatSourceType,
  RunBeatIngestionOnceParams,
} from './ingestion.js';

export type {
  BeatContextMemoryState,
  BeatMemoryCompactor,
  BeatMemoryObservation,
  BeatMemoryObservationKind,
  BeatObservationExtractor,
  CompactBeatMemoryParams,
  CompactBeatMemorySummary,
  ExtractObservationsFromItemsParams,
  ExtractObservationsFailedItem,
  ExtractObservationsSummary,
  ExtractedBeatObservation,
  ObservationDiversityOptions,
  RetrieveRelevantObservationsParams,
} from './memory.js';

export type {
  TwitterBeatSourceAdapterConfig,
} from './twitterAdapter.js';

export type {
  BeatAgentAbstainReason,
  BeatAgentAmbientContextCitation,
  BeatAgentConfidence,
  BeatAgentDecision,
  BeatAgentEvaluateResponse,
  BeatAgentEvaluationContext,
  BeatAgentEvaluationLogEntry,
  BeatAgentEvaluationRequest,
  BeatAgentEvaluationResult,
  BeatAgentExplanationDocument,
  BeatAgentLocalContextCitation,
  CreateBeatAgentEvaluationLogEntryParams,
  CreateBeatAgentExplanationDocumentParams,
} from './types.js';

export {
  appendEvaluationLogToJsonl,
  createBeatAgentServiceApp,
  defaultUploadExplanation,
  findExistingAttestationFromJsonl,
} from './app.js';

export {
  processBeatAgentEvaluation,
  validateBeatAgentEvaluationRequest,
} from './attester.js';

export {
  checkBeatAgentBalance,
  findExistingBeatAgentAttestationOnChain,
  getBeatAgentBlockchainClients,
  getSubjectIdForContentCanonicalId,
  hasBeatAgentAttestation,
  publishBeatAgentAttestation,
} from './blockchain.js';

export {
  getIpfsConfig,
  getPaymentConfig,
  loadConfig,
  loadConfigFromEnv,
} from './config.js';

export {
  extractTextFromStructuredContent,
  extractCanonicalIdFromStructuredContent,
  fetchPlatformLocalContextForBeatAgent,
  fetchUrlContentForBeatAgent,
  resolveBeatAgentContent,
  resolveBeatAgentContentForRequest,
  stripHtmlToText,
} from './content.js';

export {
  buildBeatAgentEvaluationContext,
} from './context.js';

export {
  buildBeatAgentPrompt,
  evaluateBeatContentWithLLM,
  normalizeBeatAgentEvaluationResult,
} from './evaluator.js';

export type {
  LlmMemoryCompactorConfig,
  LlmObservationExtractorConfig,
} from './extractor.js';

export {
  createLlmMemoryCompactor,
  createLlmObservationExtractor,
} from './extractor.js';

export {
  createScoredBeatFinderCandidateSelector,
  defaultBeatFinderCandidateSelector,
  loadBeatFinderState,
  runBeatFinderOnce,
  saveBeatFinderState,
  scoreBeatFinderItem,
} from './finder.js';

export {
  loadBeatIngestionState,
  runBeatIngestionOnce,
  saveBeatIngestionState,
} from './ingestion.js';

export {
  createTwitterBeatSourceAdapters,
  TwitterBeatSourceClient,
} from './twitterAdapter.js';

export {
  calculateObservationDiversityMultiplier,
  compactBeatMemory,
  extractObservationsFromItems,
  getObservationStaleDays,
  getObservationTimeSpanHours,
  loadBeatContextMemoryState,
  retrieveRelevantObservations,
  saveBeatContextMemoryState,
} from './memory.js';

export {
  sanitizeUntrustedKind,
  sanitizeUntrustedText,
  wrapUntrusted,
} from './promptSafety.js';

export {
  createBeatAgentEvaluationLogEntry,
  createBeatAgentExplanationDocument,
  shouldPublishBeatAgentAttestation,
  validateBeatAgentEvaluationResult,
} from './types.js';

export type {
  CoverageGapByReason,
  CoverageGapCount,
  CoverageGapSummary,
  MineCoverageGapsParams,
  PlatformGap,
} from './coverage.js';

export {
  mineCoverageGaps,
  mineCoverageGapsFromFile,
} from './coverage.js';

export interface BeatAgentRunHandle {
  stop: () => Promise<void>;
}

export interface BeatAgentWorkerRunSummary {
  ingestion?: BeatIngestionRunSummary;
  extraction?: ExtractObservationsSummary;
  compaction?: CompactBeatMemorySummary;
  finder?: Awaited<ReturnType<typeof runBeatFinderOnce>>;
}

export interface BeatAgentWorkerDependencies {
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
  ingestionAdapters?: Partial<Record<BeatSourceType, BeatSourceAdapter>>;
  log?: (message: string, metadata?: Record<string, unknown>) => void;
}

export function createBeatAgentApp(config: BeatAgentConfig = loadConfig()) {
  const findExistingAttestationInJsonl = config.evaluationLogFilePath
    ? findExistingAttestationFromJsonl(config.evaluationLogFilePath)
    : undefined;
  const findExistingAttestationOnChain = findExistingBeatAgentAttestationOnChain(config, config.alignmentTopicStatementCid);

  async function findExistingAttestation(contentCanonicalId: string, statementCid: IpfsCidV1) {
    const localMatch = await findExistingAttestationInJsonl?.(contentCanonicalId, statementCid);
    if (localMatch) {
      return localMatch;
    }
    return findExistingAttestationOnChain(contentCanonicalId, statementCid);
  }

  async function getCurrentGasPrice(): Promise<bigint> {
    try {
      const { testClients } = getBeatAgentBlockchainClients(config);
      const gasPrice = await testClients.publicClient.getGasPrice();
      return gasPrice * BigInt(Math.floor(config.gasPriceMultiplier * 100)) / 100n;
    } catch {
      return BigInt(20_000_000_000);
    }
  }

  return createBeatAgentServiceApp({
    getConfig: () => config,
    getCurrentGasPrice,
    getPaymentConfig: (serviceConfig) => getPaymentConfig(serviceConfig as BeatAgentConfig),
    getIpfsConfig: (serviceConfig) => getIpfsConfig(serviceConfig as BeatAgentConfig),
    checkAttesterBalance: () => checkBeatAgentBalance(config),
    resolveContent: (request, ipfsConfig) => resolveBeatAgentContentForRequest(request, ipfsConfig, {
      platformApiUrl: config.platformApiUrl,
    }),
    buildEvaluationContext: (request, content) => buildBeatAgentEvaluationContext({
      beatId: config.beatId,
      contentCanonicalId: request.contentCanonicalId,
      contentText: content,
      contentUrl: request.contentUrl,
      memoryFilePath: config.memoryFilePath,
      platformApiUrl: config.platformApiUrl,
      diversityOptions: {
        minAuthorsForFullWeight: config.minAuthorsForFullWeight,
        minHoursForFullWeight: config.minHoursForFullWeight,
        neutralFloor: config.diversityNeutralFloor,
      },
    }),
    evaluateContent: ({ request, content, context }) => evaluateBeatContentWithLLM({
      beatId: config.beatId,
      attesterName: config.attesterName,
      content,
      request,
      context,
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      promptTemplate: config.promptTemplate,
      maxUntrustedChars: config.maxUntrustedChars,
    }),
    uploadExplanation: defaultUploadExplanation,
    publishAttestation: (contentCanonicalId, statementCid, topicStatementCid) =>
      publishBeatAgentAttestation(config, contentCanonicalId, statementCid, topicStatementCid),
    appendEvaluationLog: config.evaluationLogFilePath
      ? appendEvaluationLogToJsonl(config.evaluationLogFilePath)
      : undefined,
    findExistingAttestation,
    version: '0.1.0',
  });
}

export async function runBeatAgentWorkerOnce(
  config: BeatAgentConfig,
  dependencies: BeatAgentWorkerDependencies = {},
): Promise<BeatAgentWorkerRunSummary> {
  const log = dependencies.log ?? (() => undefined);
  const now = dependencies.now?.() ?? new Date();
  const env = dependencies.env ?? process.env;
  const summary: BeatAgentWorkerRunSummary = {};

  if (!config.beatDefinition || !config.ingestionStateFilePath) {
    log('Beat-agent worker skipped: no beat definition or ingestion state file configured.');
    return summary;
  }

  summary.ingestion = await runBeatIngestionOnce({
    definition: config.beatDefinition,
    stateFilePath: config.ingestionStateFilePath,
    adapters: dependencies.ingestionAdapters ?? createTwitterBeatSourceAdapters({ bearerToken: env.X_API_BEARER_TOKEN ?? '' }),
    now,
    env,
  });
  log('Beat-agent ingestion completed.', { summary: summary.ingestion });

  if (config.memoryFilePath) {
    const ingestionState = await loadBeatIngestionState(config.ingestionStateFilePath);
    const memoryState = await loadBeatContextMemoryState(config.memoryFilePath);
    const observedContentIds = new Set(
      memoryState.observations.flatMap((observation) => observation.supportingContentIds),
    );
    const itemsNeedingExtraction = ingestionState.items.filter(
      (item) => !observedContentIds.has(item.contentCanonicalId),
    );
    summary.extraction = await extractObservationsFromItems({
      beatId: config.beatDefinition.beatId,
      items: itemsNeedingExtraction,
      memoryFilePath: config.memoryFilePath,
      extractor: config.llmExtractionEnabled
        ? createLlmObservationExtractor({
          apiKey: config.openRouterApiKey,
          model: config.openRouterModel,
          beatId: config.beatDefinition.beatId,
          maxUntrustedChars: config.maxUntrustedChars,
        })
        : undefined,
      now,
    });
    log('Beat-agent observation extraction completed.', { summary: summary.extraction });

    summary.compaction = await compactBeatMemory({
      beatId: config.beatDefinition.beatId,
      memoryFilePath: config.memoryFilePath,
      olderThan: new Date(now.getTime() - config.memoryCompactionOlderThanMs),
      now,
      minObservationsToCompact: config.memoryCompactionMinObservations,
      compactor: config.llmExtractionEnabled
        ? createLlmMemoryCompactor({
          apiKey: config.openRouterApiKey,
          model: config.openRouterModel,
          beatId: config.beatDefinition.beatId,
          maxObservationChars: config.maxUntrustedChars,
        })
        : undefined,
    });
    log('Beat-agent memory compaction completed.', { summary: summary.compaction });
  }

  if (config.finderEnabled && config.finderStateFilePath && config.finderAttesterUrl) {
    summary.finder = await runBeatFinderOnce({
      ingestionStateFilePath: config.ingestionStateFilePath,
      finderStateFilePath: config.finderStateFilePath,
      attesterEndpoint: config.finderAttesterUrl,
      trustedFinderKey: config.trustedFinderKey,
      targetStatementCid: config.alignmentTopicStatementCid,
    });
    log('Beat-agent finder completed.', { summary: summary.finder });
  }

  return summary;
}

export function run(config: BeatAgentConfig = loadConfig()): BeatAgentRunHandle {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const schedule = (delayMs: number) => {
    if (!stopped) {
      timer = setTimeout(() => {
        void tick();
      }, delayMs);
    }
  };

  const tick = async () => {
    try {
      await runBeatAgentWorkerOnce(config, {
        log: (message, metadata) => console.log(message, metadata ?? ''),
      });
    } catch (error) {
      console.error('Beat-agent worker tick failed.', error);
    } finally {
      schedule(config.workerPollIntervalMs);
    }
  };

  schedule(0);

  return {
    stop: async () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig();
  const port = parseInt(process.env.PORT || '3000', 10);
  createBeatAgentApp(config).listen(port, () => {
    console.log(`Beat agent ${config.beatId} listening on port ${port}`);
  });
}
