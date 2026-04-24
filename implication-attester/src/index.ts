import { type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { type Request, type Response, type NextFunction } from 'express';
import {
  BlockchainError,
  calculatePaymentRequired,
  classifyBlockchainError,
  createAttesterApp,
  createPaymentRequiredResponse,
  createRateLimiter,
  fetchFromIpfs,
  formatBlockchainError,
  getHttpStatusForError,
  getPaymentFromHeader,
  registerCommonAttesterRoutes,
  uploadToIpfs,
  validatePayment,
} from '@commonality/attester-core';
import { getIpfsConfig, getPaymentConfig, loadConfig, type AttesterConfig } from './config.js';
import { evaluateImplicationWithLLM } from './evaluator.js';
import { publishAttestation, getBlockchainClients, checkAttesterBalance, getAttesterAddress } from './blockchain.js';
import { IpfsCidV1, normalizeCidV1 } from '@commonality/sdk';

interface EvaluateImplicationRequest {
  fromStatementCid: IpfsCidV1;
  toStatementCid: IpfsCidV1;
}

interface EvaluateImplicationResponse {
  alreadyAttested: boolean;
  decision: boolean;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  explanationCid: IpfsCidV1 | null;
  transactionHash: string | null;
  gasUsed: number | null;
  processingTime: number;
}

interface BatchEvaluationItem {
  fromStatementCid: IpfsCidV1;
  toStatementCid: IpfsCidV1;
}

interface BatchEvaluationRequest {
  evaluations: BatchEvaluationItem[];
}

interface BatchEvaluationResult {
  fromStatementCid: IpfsCidV1;
  toStatementCid: IpfsCidV1;
  success: boolean;
  decision?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  explanation?: string;
  explanationCid?: string | null;
  transactionHash?: string | null;
  error?: string;
  processingTime: number;
}

interface BatchEvaluationResponse {
  total: number;
  successful: number;
  failed: number;
  results: BatchEvaluationResult[];
  totalProcessingTime: number;
}

async function processSingleEvaluation(
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1,
  config: AttesterConfig,
): Promise<BatchEvaluationResult> {
  const startTime = Date.now();
  const ipfsConfig = getIpfsConfig(config);
  
  try {
    let statement1Content: string;
    let statement2Content: string;

    try {
      statement1Content = await fetchFromIpfs(ipfsConfig, fromStatementCid);
    } catch {
      return {
        fromStatementCid,
        toStatementCid,
        success: false,
        error: `Could not fetch fromStatementCid content from IPFS: ${fromStatementCid}`,
        processingTime: Date.now() - startTime,
      };
    }

    try {
      statement2Content = await fetchFromIpfs(ipfsConfig, toStatementCid);
    } catch {
      return {
        fromStatementCid,
        toStatementCid,
        success: false,
        error: `Could not fetch toStatementCid content from IPFS: ${toStatementCid}`,
        processingTime: Date.now() - startTime,
      };
    }

    const statement1 = JSON.parse(statement1Content);
    const statement2 = JSON.parse(statement2Content);

    const s1Text = statement1.content?.text || statement1.text || statement1Content;
    const s2Text = statement2.content?.text || statement2.text || statement2Content;

    const evaluation = await evaluateImplicationWithLLM(
      s1Text,
      s2Text,
      config.openRouterApiKey,
      config.openRouterModel
    );

    if (!evaluation.implies || evaluation.confidence === 'low') {
      return {
        fromStatementCid,
        toStatementCid,
        success: true,
        decision: evaluation.implies,
        confidence: evaluation.confidence,
        explanation: evaluation.reasoning,
        explanationCid: null,
        transactionHash: null,
        processingTime: Date.now() - startTime,
      };
    }

    const explanationData = {
      fromStatementCid,
      toStatementCid,
      decision: evaluation.implies,
      confidence: evaluation.confidence,
      reasoning: evaluation.reasoning,
      timestamp: new Date().toISOString(),
    };

    const uploadResult = await uploadToIpfs(ipfsConfig, JSON.stringify(explanationData));
    const explanationCid = normalizeCidV1(uploadResult.cid);

    // Publish attestation with blockchain error handling
    let txHash: string;
    try {
      txHash = await publishAttestation(config, fromStatementCid, toStatementCid, explanationCid);
    } catch (error) {
      const blockchainError = classifyBlockchainError(error);
      const formattedError = formatBlockchainError(blockchainError);
      
      return {
        fromStatementCid,
        toStatementCid,
        success: false,
        decision: evaluation.implies,
        confidence: evaluation.confidence,
        explanation: evaluation.reasoning,
        explanationCid,
        transactionHash: null,
        error: formattedError.message,
        processingTime: Date.now() - startTime,
      };
    }

    return {
      fromStatementCid,
      toStatementCid,
      success: true,
      decision: evaluation.implies,
      confidence: evaluation.confidence,
      explanation: evaluation.reasoning,
      explanationCid,
      transactionHash: txHash,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      fromStatementCid,
      toStatementCid,
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      processingTime: Date.now() - startTime,
    };
  }
}

export function createImplicationAttesterApp(config: AttesterConfig) {
  const app = createAttesterApp();
  const ipfsConfig = getIpfsConfig(config);
  const paymentConfig = getPaymentConfig(config);
  const evaluationRateLimiter = createRateLimiter({
    windowMs: config.rateLimitWindowMs,
    maxRequests: config.rateLimitMaxRequests,
    message: 'Too many evaluation requests. Please wait before trying again.',
  });

  async function getCurrentGasPrice(): Promise<bigint> {
    try {
      const { testClients } = getBlockchainClients(config);
      const gasPrice = await testClients.publicClient.getGasPrice();
      return gasPrice * BigInt(Math.floor(config.gasPriceMultiplier * 100)) / 100n;
    } catch {
      return BigInt(20_000_000_000);
    }
  }

  async function requirePayment(req: Request, res: Response, next: NextFunction) {
    if (config.trustedFinderKey && req.headers['x-finder-key'] === config.trustedFinderKey) {
      next();
      return;
    }

    const xPaymentProof = req.headers['x-payment-proof'] as string | undefined;
    const paymentId = getPaymentFromHeader(xPaymentProof);

    if (!paymentId || !validatePayment(paymentId)) {
      const gasPrice = await getCurrentGasPrice();
      const paymentDetails = calculatePaymentRequired(gasPrice, paymentConfig);
      res.status(402).json(createPaymentRequiredResponse(paymentDetails));
      return;
    }

    next();
  }

  registerCommonAttesterRoutes(app, {
    getConfig: () => config,
    getCurrentGasPrice,
    getPaymentConfig: () => paymentConfig,
    checkAttesterBalance: () => checkAttesterBalance(config),
    version: '0.2.0',
    statusRoute: {
      path: '/status/:fromStatementCid/:toStatementCid',
      requiredParams: ['fromStatementCid', 'toStatementCid'],
      missingParamsMessage: 'Missing required parameters: fromStatementCid, toStatementCid',
      paymentDescription: 'Payment required to check attestation status',
    },
  });

  app.post('/evaluate-implication', evaluationRateLimiter, requirePayment, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const { fromStatementCid, toStatementCid } = req.body as EvaluateImplicationRequest;

      if (!fromStatementCid || !toStatementCid) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Missing required fields: fromStatementCid, toStatementCid',
        });
        return;
      }

      let statement1Content: string;
      let statement2Content: string;

      try {
        statement1Content = await fetchFromIpfs(ipfsConfig, fromStatementCid);
      } catch {
        res.status(404).json({
          error: 'statement_not_found',
          message: 'Could not fetch fromStatementCid content from IPFS',
          details: { statementId: fromStatementCid },
        });
        return;
      }

      try {
        statement2Content = await fetchFromIpfs(ipfsConfig, toStatementCid);
      } catch {
        res.status(404).json({
          error: 'statement_not_found',
          message: 'Could not fetch toStatementCid content from IPFS',
          details: { statementId: toStatementCid },
        });
        return;
      }

      const statement1 = JSON.parse(statement1Content);
      const statement2 = JSON.parse(statement2Content);

      const s1Text = statement1.content?.text || statement1.text || statement1Content;
      const s2Text = statement2.content?.text || statement2.text || statement2Content;

      const evaluation = await evaluateImplicationWithLLM(
        s1Text,
        s2Text,
        config.openRouterApiKey,
        config.openRouterModel,
      );

      if (!evaluation.implies || evaluation.confidence === 'low') {
        res.json({
          alreadyAttested: false,
          decision: evaluation.implies,
          confidence: evaluation.confidence,
          explanation: evaluation.reasoning,
          explanationCid: null,
          transactionHash: null,
          gasUsed: null,
          processingTime: Date.now() - startTime,
        } as EvaluateImplicationResponse);
        return;
      }

      const explanationData = {
        fromStatementCid,
        toStatementCid,
        decision: evaluation.implies,
        confidence: evaluation.confidence,
        reasoning: evaluation.reasoning,
        timestamp: new Date().toISOString(),
      };

      const uploadResult = await uploadToIpfs(ipfsConfig, JSON.stringify(explanationData));
      const explanationCid = normalizeCidV1(uploadResult.cid);

      let txHash: string;
      try {
        txHash = await publishAttestation(config, fromStatementCid, toStatementCid, explanationCid);
      } catch (error) {
        const blockchainError = classifyBlockchainError(error);
        const formattedError = formatBlockchainError(blockchainError);
        const statusCode = getHttpStatusForError(blockchainError);

        console.error('Blockchain error in /evaluate-implication:', blockchainError);
        res.status(statusCode).json({
          alreadyAttested: false,
          decision: evaluation.implies,
          confidence: evaluation.confidence,
          explanation: evaluation.reasoning,
          explanationCid,
          transactionHash: null,
          gasUsed: null,
          processingTime: Date.now() - startTime,
          error: formattedError,
        });
        return;
      }

      res.json({
        alreadyAttested: false,
        decision: evaluation.implies,
        confidence: evaluation.confidence,
        explanation: evaluation.reasoning,
        explanationCid,
        transactionHash: txHash,
        gasUsed: null,
        processingTime: Date.now() - startTime,
      } as EvaluateImplicationResponse);
    } catch (error) {
      console.error('Error in /evaluate-implication:', error);

      if (error instanceof BlockchainError) {
        const formattedError = formatBlockchainError(error);
        const statusCode = getHttpStatusForError(error);
        res.status(statusCode).json({
          error: formattedError.error,
          message: formattedError.message,
          details: formattedError.details,
          retryable: formattedError.retryable,
        });
        return;
      }

      res.status(500).json({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });

  app.post('/evaluate-implications-batch', evaluationRateLimiter, requirePayment, async (req: Request, res: Response) => {
    const batchStartTime = Date.now();

    try {
      const { evaluations } = req.body as BatchEvaluationRequest;

      if (!evaluations || !Array.isArray(evaluations)) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Missing required field: evaluations (must be an array)',
        });
        return;
      }

      const MAX_BATCH_SIZE = 10;
      if (evaluations.length > MAX_BATCH_SIZE) {
        res.status(400).json({
          error: 'batch_too_large',
          message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} evaluations`,
          details: { requested: evaluations.length, maximum: MAX_BATCH_SIZE },
        });
        return;
      }

      if (evaluations.length === 0) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Evaluations array cannot be empty',
        });
        return;
      }

      for (const item of evaluations) {
        if (!item.fromStatementCid || !item.toStatementCid) {
          res.status(400).json({
            error: 'invalid_request',
            message: 'Each evaluation must have fromStatementCid and toStatementCid',
          });
          return;
        }
      }

      const results: BatchEvaluationResult[] = [];

      for (const item of evaluations) {
        const result = await processSingleEvaluation(
          item.fromStatementCid,
          item.toStatementCid,
          config,
        );
        results.push(result);
      }

      const successful = results.filter((result) => result.success).length;
      const failed = results.filter((result) => !result.success).length;

      res.json({
        total: evaluations.length,
        successful,
        failed,
        results,
        totalProcessingTime: Date.now() - batchStartTime,
      } as BatchEvaluationResponse);
    } catch (error) {
      console.error('Error in /evaluate-implications-batch:', error);

      if (error instanceof BlockchainError) {
        const formattedError = formatBlockchainError(error);
        const statusCode = getHttpStatusForError(error);
        res.status(statusCode).json({
          error: formattedError.error,
          message: formattedError.message,
          details: formattedError.details,
          retryable: formattedError.retryable,
        });
        return;
      }

      res.status(500).json({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });

  app.get('/attester-status', async (_req: Request, res: Response) => {
    try {
      const balanceInfo = await checkAttesterBalance(config);

      res.json({
        address: await getAttesterAddress(config),
        balanceWei: balanceInfo.balance.toString(),
        balanceEth: (Number(balanceInfo.balance) / 1e18).toFixed(6),
        hasSufficientFunds: balanceInfo.hasSufficientFunds,
        minimumRequiredEth: (Number(balanceInfo.minimumRequired) / 1e18).toFixed(6),
        canPublishAttestations: balanceInfo.hasSufficientFunds,
      });
    } catch (error) {
      const blockchainError = classifyBlockchainError(error);
      const formattedError = formatBlockchainError(blockchainError);
      const statusCode = getHttpStatusForError(blockchainError);

      res.status(statusCode).json({
        error: formattedError.error,
        message: formattedError.message,
        details: formattedError.details,
        retryable: formattedError.retryable,
      });
    }
  });

  return app;
}

export interface ImplicationAttesterRunHandle {
  server: Server;
  stop: () => Promise<void>;
}

export function run(config = loadConfig()): ImplicationAttesterRunHandle {
  const app = createImplicationAttesterApp(config);
  const server = app.listen(config.port, () => {
    console.log(`Implication Attester AI service listening on port ${config.port}`);
  });

  return {
    server,
    stop: () => new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
