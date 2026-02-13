import express, { type Request, type Response } from 'express';
import { loadConfig } from './config.js';
import { evaluateImplicationWithLLM } from './evaluator.js';
import { uploadToIpfs, fetchFromIpfs } from './ipfs.js';
import { publishAttestation } from './blockchain.js';

const app = express();
app.use(express.json());

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

app.post('/evaluate-implication', async (req: Request, res: Response) => {
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
    res.json({
      status: 'healthy',
      details: {
        openRouterConfigured: !!config.openRouterApiKey,
        ethereumConfigured: !!config.ethereumPrivateKey,
        ipfsConfigured: !!config.ipfsApiUrl,
      },
      uptime: process.uptime(),
      version: '0.1.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Configuration error',
    });
  }
});

const config = loadConfig();

app.listen(config.port, () => {
  console.log(`Implication Attester AI service listening on port ${config.port}`);
});
