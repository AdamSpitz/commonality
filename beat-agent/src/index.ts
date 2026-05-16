import { pathToFileURL } from 'node:url';
import type { BeatAgentContentSource } from './attester.js';
import { createBeatAgentServiceApp, defaultUploadExplanation, appendEvaluationLogToJsonl, findExistingAttestationFromJsonl } from './app.js';
import { checkBeatAgentBalance, publishBeatAgentAttestation, getBeatAgentBlockchainClients } from './blockchain.js';
import { loadConfig, getIpfsConfig, getPaymentConfig, type BeatAgentConfig } from './config.js';
import { resolveBeatAgentContent } from './content.js';
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
} from './blockchain.js';

export type {
  BeatAgentConfig,
} from './config.js';

export type {
  BuildBeatAgentEvaluationContextParams,
} from './context.js';

export type {
  EvaluateBeatContentWithLlmParams,
} from './evaluator.js';

export type {
  BeatFinderCandidate,
  BeatFinderCandidateSelector,
  BeatFinderCandidateSelectorParams,
  BeatFinderProcessedItem,
  BeatFinderProcessedStatus,
  BeatFinderRunSummary,
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
  getBeatAgentBlockchainClients,
  getSubjectIdForContentCanonicalId,
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
  fetchUrlContentForBeatAgent,
  resolveBeatAgentContent,
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
  LlmObservationExtractorConfig,
} from './extractor.js';

export {
  createLlmObservationExtractor,
} from './extractor.js';

export {
  defaultBeatFinderCandidateSelector,
  loadBeatFinderState,
  runBeatFinderOnce,
  saveBeatFinderState,
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

export function createBeatAgentApp(config: BeatAgentConfig = loadConfig()) {
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
    resolveContent: (source: BeatAgentContentSource, ipfsConfig) => resolveBeatAgentContent(source, ipfsConfig),
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
    findExistingAttestation: config.evaluationLogFilePath
      ? findExistingAttestationFromJsonl(config.evaluationLogFilePath)
      : undefined,
    version: '0.1.0',
  });
}

export function run(_config: BeatAgentConfig = loadConfig()): BeatAgentRunHandle {
  return { stop: () => Promise.resolve() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig();
  const port = parseInt(process.env.PORT || '3000', 10);
  createBeatAgentApp(config).listen(port, () => {
    console.log(`Beat agent ${config.beatId} listening on port ${port}`);
  });
}
