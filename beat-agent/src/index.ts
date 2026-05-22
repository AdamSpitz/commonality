import { pathToFileURL } from 'node:url';
import type { IpfsCidV1 } from '@commonality/sdk';
import { createBeatAgentServiceApp, defaultUploadExplanation, appendEvaluationLogToJsonl, findExistingAttestationFromJsonl } from './app.js';
import { createLlmMemoryCompactor, createLlmObservationExtractor, createLlmPurposeSummarySnapshotGenerator, createLlmSourceManagementReportGenerator } from './extractor.js';
import { createScoredBeatFinderCandidateSelector, runBeatFinderOnce } from './finder.js';
import { loadBeatIngestionState, runBeatIngestionOnce, type BeatIngestionRunSummary, type BeatSourceAdapter, type BeatSourceType } from './ingestion.js';
import { compactBeatMemory, extractObservationsFromItems, generatePurposeSummarySnapshots, generateSourceManagementObservations, generateSourceManagementReport, loadBeatContextMemoryState, type ExtractObservationsSummary, type CompactBeatMemorySummary, type GeneratePurposeSummarySnapshotsSummary, type GenerateSourceManagementObservationsSummary, type GenerateSourceManagementReportSummary } from './memory.js';
import { generateBeatAgentWorkerMetrics, formatBeatAgentWorkerMetricsReport, appendMetricsToJsonl } from './metrics.js';
import { mineCoverageGaps } from './coverage.js';
import { readFile } from 'node:fs/promises';
import { createTwitterBeatSourceAdapters } from './twitterAdapter.js';
import { createTallyIndexerBeatSourceAdapter } from './tallyIndexerAdapter.js';
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
  BeatIngestionAnomaly,
  BeatIngestionAnomalyOptions,
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
export { detectIngestionAnomalies } from './ingestion.js';

export type {
  BeatContextMemoryState,
  BeatMemoryCompactor,
  BeatMemoryObservation,
  BeatMemoryObservationKind,
  BeatObservationExtractor,
  BeatPurposeSummarySnapshot,
  BeatPurposeSummarySnapshotDraft,
  BeatPurposeSummarySnapshotGenerator,
  BeatPurposeSummarySnapshotGeneratorParams,
  CompactBeatMemoryParams,
  CompactBeatMemorySummary,
  ContestedObservationGroup,
  ExtractionRetryOptions,
  ExtractObservationsFromItemsParams,
  ExtractObservationsFailedItem,
  ExtractObservationsSummary,
  ExtractedBeatObservation,
  GeneratePurposeSummarySnapshotsParams,
  GeneratePurposeSummarySnapshotsSummary,
  BeatSourceManagementActionType,
  BeatSourceManagementHealthFlags,
  BeatSourceManagementProposedUpdate,
  BeatSourceManagementReport,
  BeatSourceManagementReportDraft,
  BeatSourceManagementReportGenerator,
  BeatSourceManagementReportGeneratorParams,
  GenerateSourceManagementObservationsParams,
  GenerateSourceManagementObservationsSummary,
  GenerateSourceManagementReportParams,
  GenerateSourceManagementReportSummary,
  ObservationDiversityOptions,
  RetrieveRelevantObservationsParams,
} from './memory.js';
export { detectContestedObservations } from './memory.js';

export type {
  TwitterBeatSourceAdapterConfig,
} from './twitterAdapter.js';

export type {
  TallyIndexerBeatSourceAdapterConfig,
} from './tallyIndexerAdapter.js';

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
  BeatAgentPurpose,
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
  LlmPurposeSummarySnapshotGeneratorConfig,
  LlmSourceManagementReportGeneratorConfig,
} from './extractor.js';

export {
  createLlmMemoryCompactor,
  createLlmObservationExtractor,
  createLlmPurposeSummarySnapshotGenerator,
  createLlmSourceManagementReportGenerator,
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
  createTallyIndexerBeatSourceAdapter,
  TallyIndexerBeatSourceAdapter,
} from './tallyIndexerAdapter.js';

export {
  calculateObservationDiversityMultiplier,
  compactBeatMemory,
  extractObservationsFromItems,
  generatePurposeSummarySnapshots,
  generateSourceManagementObservations,
  generateSourceManagementReport,
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
  defaultBeatAgentPurposes,
  isBeatAgentPurpose,
  normalizeBeatAgentPurposes,
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

export type {
  BeatAgentCompactionMetrics,
  BeatAgentEvaluationMetrics,
  BeatAgentExtractionMetrics,
  BeatAgentFinderMetrics,
  BeatAgentIngestionMetrics,
  BeatAgentMemoryMetrics,
  BeatAgentWorkerMetrics,
  GenerateBeatAgentWorkerMetricsParams,
} from './metrics.js';


export {
  appendMetricsToJsonl,
  formatBeatAgentWorkerMetricsReport,
  generateBeatAgentWorkerMetrics,
  loadMetricsHistory,
} from './metrics.js';

export interface BeatAgentRunHandle {
  stop: () => Promise<void>;
}

export interface BeatAgentWorkerRunSummary {
  ingestion?: BeatIngestionRunSummary;
  extraction?: ExtractObservationsSummary;
  compaction?: CompactBeatMemorySummary;
  purposeSummarySnapshots?: GeneratePurposeSummarySnapshotsSummary;
  sourceManagementObservations?: GenerateSourceManagementObservationsSummary;
  sourceManagementReport?: GenerateSourceManagementReportSummary;
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
      purposes: ['civility_attestation', 'beat_context_provider'],
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
    queryBeatContext: config.memoryFilePath
      ? async ({ topic, purposes }) => {
        const context = await buildBeatAgentEvaluationContext({
          beatId: config.beatId,
          contentCanonicalId: `context-query:${topic}`,
          contentText: topic,
          memoryFilePath: config.memoryFilePath,
          diversityOptions: {
            minAuthorsForFullWeight: config.minAuthorsForFullWeight,
            minHoursForFullWeight: config.minHoursForFullWeight,
            neutralFloor: config.diversityNeutralFloor,
          },
          purposes,
        });
        return context.ambientContextUsed;
      }
      : undefined,
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
    adapters: dependencies.ingestionAdapters ?? {
      ...createTwitterBeatSourceAdapters({ bearerToken: env.X_API_BEARER_TOKEN ?? '' }),
      tally_indexer: createTallyIndexerBeatSourceAdapter({
        indexerBaseUrl: env.BEAT_AGENT_TALLY_INDEXER_URL ?? env.INDEXER_URL,
        ipfsGatewayUrl: config.ipfsGatewayUrl,
      }),
    },
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
      purposes: config.beatDefinition.purposes,
      memoryFilePath: config.memoryFilePath,
      extractor: config.llmExtractionEnabled
        ? createLlmObservationExtractor({
          apiKey: config.openRouterApiKey,
          model: config.openRouterModel,
          beatId: config.beatDefinition.beatId,
          purposes: config.beatDefinition.purposes,
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

    summary.purposeSummarySnapshots = await generatePurposeSummarySnapshots({
      beatId: config.beatDefinition.beatId,
      memoryFilePath: config.memoryFilePath,
      purposes: config.beatDefinition.purposes,
      now,
      recentMetrics: {
        ingestion: summary.ingestion,
        extraction: summary.extraction,
        compaction: summary.compaction,
      },
      snapshotGenerator: config.llmExtractionEnabled
        ? createLlmPurposeSummarySnapshotGenerator({
          apiKey: config.openRouterApiKey,
          model: config.openRouterModel,
          maxObservationChars: config.maxUntrustedChars,
        })
        : undefined,
    });
    log('Beat-agent purpose summary snapshots updated.', { summary: summary.purposeSummarySnapshots });

    if (config.beatDefinition.purposes.includes('source_management')) {
      const currentSources = config.beatDefinition.sources.map((source) => `${source.id} (${source.type}${source.platform ? `/${source.platform}` : ''}): ${source.locator}`);
      summary.sourceManagementObservations = await generateSourceManagementObservations({
        beatId: config.beatDefinition.beatId,
        memoryFilePath: config.memoryFilePath,
        now,
        currentSources,
      });
      log('Beat-agent source-management observations updated.', { summary: summary.sourceManagementObservations });

      summary.sourceManagementReport = await generateSourceManagementReport({
        beatDefinition: config.beatDefinition,
        memoryFilePath: config.memoryFilePath,
        now,
        recentMetrics: {
          ingestion: summary.ingestion,
          extraction: summary.extraction,
          compaction: summary.compaction,
        },
        reportGenerator: config.llmExtractionEnabled
          ? createLlmSourceManagementReportGenerator({
            apiKey: config.openRouterApiKey,
            model: config.openRouterModel,
            maxObservationChars: config.maxUntrustedChars,
          })
          : undefined,
      });
      log('Beat-agent source-management report updated.', { summary: summary.sourceManagementReport });
    }
  }

  if (config.finderEnabled && config.finderStateFilePath && config.finderAttesterUrl) {
    summary.finder = await runBeatFinderOnce({
      ingestionStateFilePath: config.ingestionStateFilePath,
      finderStateFilePath: config.finderStateFilePath,
      attesterEndpoint: config.finderAttesterUrl,
      trustedFinderKey: config.trustedFinderKey,
      targetStatementCid: config.alignmentTopicStatementCid,
      selectCandidate: createScoredBeatFinderCandidateSelector({
        beatKeywords: config.beatKeywords,
      }),
    });
    log('Beat-agent finder completed.', { summary: summary.finder });
  }

  // Generate and log a structured metrics report after each worker tick.
  try {
    let coverageSummary;
    if (config.evaluationLogFilePath) {
      try {
        const raw = await readFile(config.evaluationLogFilePath, 'utf-8');
        coverageSummary = mineCoverageGaps({ logLines: raw.split('\n') });
      } catch {
        // No log yet — skip evaluation metrics.
      }
    }

    let memoryObservations;
    if (config.memoryFilePath) {
      try {
        const memState = await loadBeatContextMemoryState(config.memoryFilePath);
        memoryObservations = memState.observations;
      } catch {
        // Memory not yet initialized — skip memory metrics.
      }
    }

    const metrics = generateBeatAgentWorkerMetrics({
      beatId: config.beatId,
      now,
      ingestionSummary: summary.ingestion,
      memoryObservations,
      extractionSummary: summary.extraction,
      compactionSummary: summary.compaction,
      coverageSummary,
      finderSummary: summary.finder,
    });
    log(formatBeatAgentWorkerMetricsReport(metrics));
    if (config.metricsLogFilePath) {
      await appendMetricsToJsonl(config.metricsLogFilePath)(metrics);
    }
  } catch {
    // Metrics generation is best-effort; never fail the worker.
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
