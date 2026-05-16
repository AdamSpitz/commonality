import { mkdir, appendFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { type Request, type Response, type NextFunction } from 'express';
import type { Express } from 'express';
import {
  calculatePaymentRequired,
  classifyBlockchainError,
  createAttesterApp,
  createPaymentRequiredResponse,
  createRateLimiter,
  formatBlockchainError,
  getHttpStatusForError,
  getPaymentFromHeader,
  registerCommonAttesterRoutes,
  uploadToIpfs,
  validatePayment,
  type CommonAttesterConfigSnapshot,
  type IpfsConfig,
  type PaymentConfig,
} from '@commonality/attester-core';
import type { IpfsCidV1 } from '@commonality/sdk';
import type { BeatAgentEvaluationLogEntry, BeatAgentEvaluationRequest, BeatAgentEvaluationResult } from './types.js';
import { processBeatAgentEvaluation, validateBeatAgentEvaluationRequest, type BeatAgentExistingAttestation } from './attester.js';
import type { BeatAgentEvaluationContext } from './types.js';

export interface BeatAgentAppConfig extends CommonAttesterConfigSnapshot {
  beatId: string;
  ipfsGatewayUrl: string;
  openRouterModel: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  serviceMarginPercent: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  alignmentTopicStatementCid: IpfsCidV1;
  attesterName: string;
  minimumConfidence?: 'high' | 'medium' | 'low';
  trustedFinderKey?: string;
  minAuthorsForFullWeight?: number;
  minHoursForFullWeight?: number;
  diversityNeutralFloor?: number;
  maxUntrustedChars?: number;
}

export interface BeatAgentAppDependencies {
  getConfig: () => BeatAgentAppConfig;
  getCurrentGasPrice: () => Promise<bigint>;
  getPaymentConfig: (config: BeatAgentAppConfig) => PaymentConfig;
  getIpfsConfig: (config: BeatAgentAppConfig) => IpfsConfig;
  checkAttesterBalance: () => Promise<{ balance: bigint; hasSufficientFunds: boolean; minimumRequired: bigint }>;
  resolveContent: (request: BeatAgentEvaluationRequest, ipfsConfig: IpfsConfig) => Promise<string>;
  buildEvaluationContext: (request: BeatAgentEvaluationRequest, content: string) => Promise<BeatAgentEvaluationContext>;
  evaluateContent: (params: {
    request: BeatAgentEvaluationRequest;
    content: string;
    context: BeatAgentEvaluationContext;
  }) => Promise<BeatAgentEvaluationResult>;
  uploadExplanation: (ipfsConfig: IpfsConfig, content: string) => Promise<{ cid: string }>;
  publishAttestation: (
    contentCanonicalId: string,
    statementCid: IpfsCidV1,
    topicStatementCid: IpfsCidV1,
  ) => Promise<string>;
  appendEvaluationLog?: (entry: BeatAgentEvaluationLogEntry) => Promise<void>;
  findExistingAttestation?: (contentCanonicalId: string, statementCid: IpfsCidV1) => Promise<BeatAgentExistingAttestation | null>;
  version: string;
}

export function createBeatAgentServiceApp(dependencies: BeatAgentAppDependencies): Express {
  const app = createAttesterApp();
  const evaluationRateLimiter = createRateLimiter({
    windowMs: dependencies.getConfig().rateLimitWindowMs,
    maxRequests: dependencies.getConfig().rateLimitMaxRequests,
    message: 'Too many beat-agent evaluation requests. Please wait before trying again.',
  });

  async function requirePayment(req: Request, res: Response, next: NextFunction) {
    const trustedFinderKey = dependencies.getConfig().trustedFinderKey;
    if (trustedFinderKey && req.headers['x-finder-key'] === trustedFinderKey) {
      next();
      return;
    }

    const xPaymentProof = req.headers['x-payment-proof'] as string | undefined;
    const paymentId = getPaymentFromHeader(xPaymentProof);
    if (!paymentId || !validatePayment(paymentId)) {
      const gasPrice = await dependencies.getCurrentGasPrice();
      const paymentDetails = calculatePaymentRequired(
        gasPrice,
        dependencies.getPaymentConfig(dependencies.getConfig()),
      );
      res.status(402).json(createPaymentRequiredResponse(paymentDetails));
      return;
    }

    next();
  }

  registerCommonAttesterRoutes(app, {
    getConfig: dependencies.getConfig,
    getCurrentGasPrice: dependencies.getCurrentGasPrice,
    getPaymentConfig: dependencies.getPaymentConfig,
    checkAttesterBalance: dependencies.checkAttesterBalance,
    version: dependencies.version,
    statusRoute: {
      path: '/status/:statementCid/:contentCanonicalId',
      requiredParams: ['statementCid', 'contentCanonicalId'],
      missingParamsMessage: 'Missing required parameters: statementCid, contentCanonicalId',
      paymentDescription: 'Payment required to check beat-agent attestation status',
    },
  });

  app.post('/evaluate-content', evaluationRateLimiter, requirePayment, async (req: Request, res: Response) => {
    const request = req.body as BeatAgentEvaluationRequest;
    const validationError = validateBeatAgentEvaluationRequest(request);
    if (validationError) {
      res.status(400).json({ error: 'invalid_request', message: validationError });
      return;
    }

    const config = dependencies.getConfig();
    const ipfsConfig = dependencies.getIpfsConfig(config);
    try {
      const result = await processBeatAgentEvaluation(
        {
          beatId: config.beatId,
          attesterName: config.attesterName,
          alignmentTopicStatementCid: config.alignmentTopicStatementCid,
          minimumConfidence: config.minimumConfidence,
        },
        request,
        {
          resolveContent: (evaluationRequest) => dependencies.resolveContent(evaluationRequest, ipfsConfig),
          buildEvaluationContext: dependencies.buildEvaluationContext,
          evaluateContent: dependencies.evaluateContent,
          uploadExplanation: (content) => dependencies.uploadExplanation(ipfsConfig, content),
          publishAttestation: dependencies.publishAttestation,
          appendEvaluationLog: dependencies.appendEvaluationLog,
          findExistingAttestation: dependencies.findExistingAttestation,
        },
      );

      res.json({
        alreadyAttested: result.alreadyAttested,
        decision: result.decision,
        confidence: result.confidence,
        reasoning: result.reasoning,
        abstainReason: result.abstainReason,
        subjectId: result.subjectId,
        explanationCid: result.explanationCid,
        transactionHash: result.transactionHash,
        processingTime: result.processingTime,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Content canonical ID mismatch:')) {
        res.status(400).json({
          error: 'invalid_request',
          message: error.message,
        });
        return;
      }
      if (
        error instanceof Error &&
        (
          error.message.startsWith('Failed to resolve content URL through platform API:') ||
          error.message.startsWith('Platform API local-context response did not include target.canonicalId')
        )
      ) {
        res.status(502).json({
          error: 'upstream_resolution_failed',
          message: error.message,
        });
        return;
      }

      const blockchainError = classifyBlockchainError(error);
      if (blockchainError.code !== 'unknown_error') {
        const formattedError = formatBlockchainError(blockchainError);
        res.status(getHttpStatusForError(blockchainError)).json({
          error: blockchainError.code,
          message: formattedError.message,
          details: formattedError.details,
        });
        return;
      }

      res.status(500).json({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });

  return app;
}

export const defaultUploadExplanation = uploadToIpfs;

export function appendEvaluationLogToJsonl(filePath: string) {
  return async (entry: BeatAgentEvaluationLogEntry): Promise<void> => {
    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(entry)}\n`, 'utf-8');
  };
}

export function findExistingAttestationFromJsonl(filePath: string) {
  return async (contentCanonicalId: string, statementCid: IpfsCidV1): Promise<BeatAgentExistingAttestation | null> => {
    try {
      const raw = await readFile(filePath, 'utf-8');
      const lines = raw.split('\n').filter((line) => line.trim());

      // Walk lines in reverse so the most recent match wins.
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]) as BeatAgentEvaluationLogEntry;
          if (
            entry.contentCanonicalId === contentCanonicalId &&
            entry.statementCid === statementCid &&
            entry.decision === 'positive' &&
            entry.transactionHash
          ) {
            return {
              decision: entry.decision,
              confidence: entry.confidence,
              reasoning: entry.reasoning,
              abstainReason: entry.abstainReason,
              subjectId: entry.contentCanonicalId,
              explanationCid: entry.explanationCid,
              transactionHash: entry.transactionHash,
            };
          }
        } catch {
          // Skip malformed log lines.
        }
      }
      return null;
    } catch {
      // File doesn't exist or is unreadable — no existing attestations.
      return null;
    }
  };
}
