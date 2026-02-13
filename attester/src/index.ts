import express, { type Request, type Response, type NextFunction } from 'express';
import { loadConfig } from './config.js';
import { evaluateImplicationWithLLM } from './evaluator.js';
import { uploadToIpfs, fetchFromIpfs } from './ipfs.js';
import { publishAttestation, getBlockchainClients } from './blockchain.js';
import {
  calculatePaymentRequired,
  validatePayment,
  getPaymentFromHeader,
  createPaymentRequiredResponse,
} from './payment.js';
import { createRateLimiter } from './rateLimit.js';

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

    const txHash = await publishAttestation(fromStatementId, toStatementId, explanationCid);

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
    
    try {
      const { testClients } = getBlockchainClients();
      const balance = await testClients.publicClient.getBalance({
        address: testClients.account,
      });
      ethBalance = (Number(balance) / 1e18).toFixed(4);
      lowBalanceWarning = Number(balance) < BigInt(1e16);
    } catch {
      lowBalanceWarning = true;
    }

    res.json({
      status: lowBalanceWarning ? 'degraded' : 'healthy',
      details: {
        ethBalance,
        ethBalanceUsd: (parseFloat(ethBalance) * config.ethUsdPrice).toFixed(2),
        lowBalanceWarning,
        openRouterConfigured: !!config.openRouterApiKey,
        ethereumConfigured: !!config.ethereumPrivateKey,
        ipfsConfigured: !!config.ipfsApiUrl,
        paymentAddress: config.paymentAddress,
      },
      uptime: process.uptime(),
      version: '0.2.0',
    });
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

app.listen(config.port, () => {
  console.log(`Implication Attester AI service listening on port ${config.port}`);
});
