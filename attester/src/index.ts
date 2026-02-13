import express, { type Request, type Response, type NextFunction } from 'express';
import { loadConfig } from './config.js';
import { evaluateImplicationWithLLM } from './evaluator.js';
import { uploadToIpfs, fetchFromIpfs } from './ipfs.js';
import { publishAttestation, getBlockchainClients, checkAttesterBalance } from './blockchain.js';
import {
  calculatePaymentRequired,
  validatePayment,
  getPaymentFromHeader,
  createPaymentRequiredResponse,
} from './payment.js';
import { createRateLimiter } from './rateLimit.js';
import {
  BlockchainError,
  classifyBlockchainError,
  formatBlockchainError,
  getHttpStatusForError,
} from './errors.js';

const app = express();
app.use(express.json());

const config = loadConfig();

const evaluationRateLimiter = createRateLimiter({
  windowMs: config.rateLimitWindowMs,
  maxRequests: config.rateLimitMaxRequests,
  message: 'Too many evaluation requests. Please wait before trying again.',
});

async function getCurrentGasPrice(): Promise<bigint> {
  try {
    const { testClients } = getBlockchainClients();
    const gasPrice = await testClients.publicClient.getGasPrice();
    const config = loadConfig();
    return gasPrice * BigInt(Math.floor(config.gasPriceMultiplier * 100)) / 100n;
  } catch {
    return BigInt(20000000000);
  }
}

async function requirePayment(req: Request, res: Response, next: NextFunction) {
  const xPaymentProof = req.headers['x-payment-proof'] as string | undefined;
  const paymentId = getPaymentFromHeader(xPaymentProof);

  if (!paymentId || !validatePayment(paymentId)) {
    const gasPrice = await getCurrentGasPrice();
    const paymentDetails = calculatePaymentRequired(gasPrice);
    res.status(402).json(createPaymentRequiredResponse(paymentDetails));
    return;
  }

  next();
}

interface EvaluateImplicationRequest {
  fromStatementId: string;
  toStatementId: string;
}

interface EvaluateImplicationResponse {
  alreadyAttested: boolean;
  decision: boolean;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  explanationCid: string | null;
  transactionHash: string | null;
  gasUsed: number | null;
  processingTime: number;
}

interface BatchEvaluationItem {
  fromStatementId: string;
  toStatementId: string;
}

interface BatchEvaluationRequest {
  evaluations: BatchEvaluationItem[];
}

interface BatchEvaluationResult {
  fromStatementId: string;
  toStatementId: string;
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
  fromStatementId: string,
  toStatementId: string,
  config: ReturnType<typeof loadConfig>
): Promise<BatchEvaluationResult> {
  const startTime = Date.now();
  
  try {
    let statement1Content: string;
    let statement2Content: string;

    try {
      statement1Content = await fetchFromIpfs(fromStatementId);
    } catch {
      return {
        fromStatementId,
        toStatementId,
        success: false,
        error: `Could not fetch fromStatementId content from IPFS: ${fromStatementId}`,
        processingTime: Date.now() - startTime,
      };
    }

    try {
      statement2Content = await fetchFromIpfs(toStatementId);
    } catch {
      return {
        fromStatementId,
        toStatementId,
        success: false,
        error: `Could not fetch toStatementId content from IPFS: ${toStatementId}`,
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
        fromStatementId,
        toStatementId,
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
      fromStatementId,
      toStatementId,
      decision: evaluation.implies,
      confidence: evaluation.confidence,
      reasoning: evaluation.reasoning,
      timestamp: new Date().toISOString(),
    };

    const { cid: explanationCid } = await uploadToIpfs(JSON.stringify(explanationData));

    // Publish attestation with blockchain error handling
    let txHash: string;
    try {
      txHash = await publishAttestation(fromStatementId, toStatementId, explanationCid);
    } catch (error) {
      const blockchainError = classifyBlockchainError(error);
      const formattedError = formatBlockchainError(blockchainError);
      
      return {
        fromStatementId,
        toStatementId,
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
      fromStatementId,
      toStatementId,
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
      fromStatementId,
      toStatementId,
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      processingTime: Date.now() - startTime,
    };
  }
}

app.post('/evaluate-implication', evaluationRateLimiter, requirePayment, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { fromStatementId, toStatementId } = req.body as EvaluateImplicationRequest;

    if (!fromStatementId || !toStatementId) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Missing required fields: fromStatementId, toStatementId',
      });
      return;
    }

    const config = loadConfig();

    let statement1Content: string;
    let statement2Content: string;

    try {
      statement1Content = await fetchFromIpfs(fromStatementId);
    } catch {
      res.status(404).json({
        error: 'statement_not_found',
        message: 'Could not fetch fromStatementId content from IPFS',
        details: { statementId: fromStatementId },
      });
      return;
    }

    try {
      statement2Content = await fetchFromIpfs(toStatementId);
    } catch {
      res.status(404).json({
        error: 'statement_not_found',
        message: 'Could not fetch toStatementId content from IPFS',
        details: { statementId: toStatementId },
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
      config.openRouterModel
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
      fromStatementId,
      toStatementId,
      decision: evaluation.implies,
      confidence: evaluation.confidence,
      reasoning: evaluation.reasoning,
      timestamp: new Date().toISOString(),
    };

    const { cid: explanationCid } = await uploadToIpfs(JSON.stringify(explanationData));

    // Publish attestation with blockchain error handling
    let txHash: string;
    try {
      txHash = await publishAttestation(fromStatementId, toStatementId, explanationCid);
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
    
    // Check if it's a blockchain error
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
      if (!item.fromStatementId || !item.toStatementId) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Each evaluation must have fromStatementId and toStatementId',
        });
        return;
      }
    }

    const config = loadConfig();
    const results: BatchEvaluationResult[] = [];

    for (const item of evaluations) {
      const result = await processSingleEvaluation(
        item.fromStatementId,
        item.toStatementId,
        config
      );
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      total: evaluations.length,
      successful,
      failed,
      results,
      totalProcessingTime: Date.now() - batchStartTime,
    } as BatchEvaluationResponse);
  } catch (error) {
    console.error('Error in /evaluate-implications-batch:', error);
    
    // Check if it's a blockchain error
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

app.get('/health', async (_req: Request, res: Response) => {
  try {
    const config = loadConfig();
    let ethBalance = '0';
    let lowBalanceWarning = false;
    let blockchainConnected = false;
    let blockchainError: string | null = null;
    
    try {
      const balanceInfo = await checkAttesterBalance();
      ethBalance = (Number(balanceInfo.balance) / 1e18).toFixed(4);
      lowBalanceWarning = !balanceInfo.hasSufficientFunds;
      blockchainConnected = true;
    } catch (error) {
      lowBalanceWarning = true;
      blockchainConnected = false;
      const classifiedError = classifyBlockchainError(error);
      blockchainError = classifiedError.message;
    }

    const status = !blockchainConnected 
      ? 'degraded' 
      : lowBalanceWarning 
        ? 'degraded' 
        : 'healthy';

    const response: Record<string, unknown> = {
      status,
      details: {
        ethBalance,
        ethBalanceUsd: (parseFloat(ethBalance) * config.ethUsdPrice).toFixed(2),
        lowBalanceWarning,
        blockchainConnected,
        openRouterConfigured: !!config.openRouterApiKey,
        ethereumConfigured: !!config.ethereumPrivateKey,
        ipfsConfigured: !!config.ipfsApiUrl,
        paymentAddress: config.paymentAddress,
      },
      uptime: process.uptime(),
      version: '0.2.0',
    };

    if (blockchainError) {
      response.details = {
        ...response.details as Record<string, unknown>,
        blockchainError,
      };
    }

    res.status(status === 'healthy' ? 200 : 503).json(response);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Configuration error',
    });
  }
});

app.get('/status/:fromStatementId/:toStatementId', async (req: Request, res: Response) => {
  const { fromStatementId, toStatementId } = req.params;

  if (!fromStatementId || !toStatementId) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Missing required parameters: fromStatementId, toStatementId',
    });
    return;
  }

  try {
    const config = loadConfig();
    const gasPrice = await getCurrentGasPrice();
    const paymentDetails = calculatePaymentRequired(gasPrice);

    res.json({
      exists: false,
      attestation: null,
      paymentDetails: {
        ...paymentDetails,
        description: 'Payment required to check attestation status',
      },
    });
  } catch (error) {
    console.error('Error in /status:', error);
    res.status(500).json({
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

app.get('/quote', async (_req: Request, res: Response) => {
  try {
    const gasPrice = await getCurrentGasPrice();
    const paymentDetails = calculatePaymentRequired(gasPrice);
    res.json({
      price: paymentDetails.amount,
      priceUsd: paymentDetails.amountUsd,
      currency: paymentDetails.currency,
      expiresAt: paymentDetails.expiresAt,
    });
  } catch (error) {
    console.error('Error in /quote:', error);
    res.status(500).json({
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

app.get('/attester-status', async (_req: Request, res: Response) => {
  try {
    const balanceInfo = await checkAttesterBalance();
    
    res.json({
      address: await (async () => {
        const { testClients } = getBlockchainClients();
        return testClients.account;
      })(),
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

app.listen(config.port, () => {
  console.log(`Implication Attester AI service listening on port ${config.port}`);
});
