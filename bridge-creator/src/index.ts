import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import express, { type Express } from 'express';
import { type NextFunction, type Request, type Response } from 'express';
import {
  calculatePaymentRequired,
  createPaymentRequiredResponse,
  createRateLimiter,
  getPaymentFromHeader,
  validatePayment,
  type PaymentConfig,
} from '@commonality/attester-core';
import {
  createSDKMachinery,
  type ContractAddresses,
} from '@commonality/sdk';
import { loadConfig, loadConfigFromEnv } from './config.js';
import { appendProposal, loadProposalStoreFile, markProposalsConsumed, validateProposalInput } from './proposals.js';
import { getActiveAnchors, getFeaturedAnchors, loadAnchorStoreFile } from './anchors.js';
import { allContextsReady, fetchBridgeContextSnapshots } from './contextSources.js';
import { loadDefaultStrategyPrompt } from './strategyPrompt.js';
import { createBridgeImplicationSubmitter } from './implicationPublisher.js';
import { publishBridgeNudgeBatch as defaultPublishBridgeNudgeBatch } from './publication.js';
import { publishBridgeStatement as defaultPublishBridgeStatement } from './statementPublisher.js';
import { loadBridgePublicationDedupState, saveBridgePublicationDedupState } from './dedup.js';
import { synthesizeBridgeTriples as defaultSynthesizeBridgeTriples } from './synthesizer.js';
import { appendAnchorReflectionProposals } from './anchorReflection.js';
import { runBridgeCreatorTick } from './runner.js';
export { loadConfigFromEnv };
export type { BridgeCreatorConfig } from './config.js';
export { publishBridgeStatement } from './statementPublisher.js';
export { createBridgeNudgePublisher, publishBridgeNudgeBatch } from './publication.js';
export type { BridgePublicationResult, BridgeNudgePublisher } from './publication.js';
export { createBridgeImplicationSubmitter, submitBridgeImplication } from './implicationPublisher.js';
export { allContextsReady, fetchBridgeContextSnapshots, parseTrustedContextSources } from './contextSources.js';
export type { BridgeContextResponse, BridgeContextSnapshot, TrustedContextSourceConfig } from './contextSources.js';
export type {
  BridgeImplicationPublisherDependencies,
  BridgeImplicationSubmission,
  BridgeImplicationSubmissionConfig,
  BridgeImplicationSubmitter,
} from './implicationPublisher.js';
export { runAnchorCli, parseAnchorCliArgs } from './anchorCli.js';
export type { AnchorCliCommand, AnchorCliResult } from './anchorCli.js';
export { appendAnchorReflectionProposals, reflectAnchorProposals, renderAnchorReflectionUserPrompt } from './anchorReflection.js';
export type { AnchorReflectionConfig, AnchorReflectionDependencies, AnchorReflectionInput, AnchorReflectionResult } from './anchorReflection.js';
export {
  appendProposal,
  getPendingProposals,
  loadProposalStoreFile,
  markProposalsConsumed,
  normalizeProposalStoreFile,
  saveProposalStoreFile,
  validateProposalInput,
} from './proposals.js';
export type { BridgeProposalInput, BridgeProposalRecord, BridgeProposalStatus, BridgeProposalStoreFile } from './proposals.js';
export { getActiveAnchors, getFeaturedAnchors, loadAnchorStoreFile, normalizeAnchorStoreFile } from './anchors.js';
export type { BridgeAnchorRecord, BridgeAnchorStatus, BridgeAnchorStoreFile } from './anchors.js';
export { loadDefaultStrategyPrompt } from './strategyPrompt.js';
export { renderSynthesisUserPrompt, synthesizeBridgeTriples } from './synthesizer.js';
export type { BridgeSynthesisConfig, BridgeSynthesisInput, SynthesizedBridgeTriple } from './synthesizer.js';
export {
  computeBridgePublicationInputHash,
  loadBridgePublicationDedupState,
  saveBridgePublicationDedupState,
  summarizePublishedBridgeTriples,
} from './dedup.js';
export type { BridgePublicationDedupState } from './dedup.js';
export { createNudgesForPublishedTriples, runBridgeCreatorTick } from './runner.js';
export type { BridgeCreatorRunnerDependencies, BridgeCreatorTickResult, BridgeCreatorTickStatus } from './runner.js';
import { createNudgerSigner } from '@commonality/nudger-core';

const NEVER: Promise<void> = new Promise(() => {});

interface NudgerMetadata {
  name: string;
  description: string;
  nudger_type: string;
  signer_address: string;
  strategy_prompt_url: string;
  anchors_url: string;
  propose_bridge_url: string;
  trusted_sources: Array<{ service_url: string; signer_address?: string; role: string }>;
  status: 'warming' | 'ready';
  contact?: string;
}

function createContractAddresses(): ContractAddresses {
  return {
    beliefs: '0x0000000000000000000000000000000000000000',
    implications: (process.env.IMPLICATIONS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    assuranceContractFactory: '0x0000000000000000000000000000000000000',
    erc1155Factory: '0x0000000000000000000000000000000000000',
    marketplaceFactory: '0x0000000000000000000000000000000000',
    delegatableNotes: '0x0000000000000000000000000000000000000',
    noteIntent: '0x0000000000000000000000000000000000000',
    alignmentAttestations: '0x0000000000000000000000000000000000000',
    mutableRefUpdater: '0x0000000000000000000000000000000000000',
    trustRegistry: '0x0000000000000000000000000000000000000',
  };
}

function resolvePublicUrl(publicBaseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (!publicBaseUrl) return pathOrUrl;
  return `${publicBaseUrl.replace(/\/+$/, '')}/${pathOrUrl.replace(/^\/+/, '')}`;
}

function loadOptionalTextFile(path: string | undefined): string | undefined {
  if (!path || !existsSync(path)) return undefined;
  const text = readFileSync(path, 'utf8').trim();
  return text || undefined;
}

function createMachinery(config: ReturnType<typeof loadConfig>) {
  return createSDKMachinery(
    config.indexerUrl,
    { apiUrl: config.ipfsApiUrl, gatewayUrl: config.ipfsGatewayUrl },
    undefined,
    undefined,
    undefined,
    config.indexerUrl,
    createContractAddresses(),
  );
}

export function createBridgeCreatorApp(
  config: ReturnType<typeof loadConfig>,
  signerAddress = createNudgerSigner(config).address,
): Express {
  const app = express();
  app.use(express.json());

  app.get('/.well-known/nudger.json', async (_req: Request, res: Response) => {
    try {
      const snapshots = await fetchBridgeContextSnapshots(config.trustedContextSources);
      const metadata: NudgerMetadata = {
        name: config.name,
        description: config.description,
        nudger_type: config.sourceType,
        signer_address: signerAddress,
        strategy_prompt_url: resolvePublicUrl(config.publicBaseUrl, config.strategyPromptUrl),
        anchors_url: resolvePublicUrl(config.publicBaseUrl, '/anchors'),
        propose_bridge_url: resolvePublicUrl(config.publicBaseUrl, '/propose-bridge'),
        trusted_sources: config.trustedContextSources.map((source) => ({
          service_url: source.serviceUrl,
          signer_address: source.expectedSignerAddress,
          role: 'csm-beat-context',
        })),
        status: allContextsReady(snapshots) ? 'ready' : 'warming',
        contact: config.contact,
      };

      res.json(metadata);
    } catch (error) {
      console.error('Error in /.well-known/nudger.json:', error);
      res.status(503).json({
        error: 'context_unavailable',
        message: error instanceof Error ? error.message : 'Unable to fetch trusted context status',
      });
    }
  });

  app.get('/anchors', (req: Request, res: Response) => {
    try {
      const store = loadAnchorStoreFile(config.anchorStorePath);
      const anchors = req.query.featured === 'true' ? getFeaturedAnchors(store) : getActiveAnchors(store);
      res.json({ anchors });
    } catch (error) {
      console.error('Error in /anchors:', error);
      res.status(500).json({
        error: 'anchor_store_unavailable',
        message: error instanceof Error ? error.message : 'Unable to load anchors',
      });
    }
  });

  const paymentConfig: PaymentConfig = {
    openRouterModel: config.openRouterModel,
    estimatedInputTokens: config.proposalEstimatedInputTokens,
    estimatedOutputTokens: config.proposalEstimatedOutputTokens,
    serviceMarginPercent: config.serviceMarginPercent,
    ethUsdPrice: config.ethUsdPrice,
    paymentAddress: config.paymentAddress || signerAddress,
    // A proposal triggers no per-request on-chain transaction — the
    // bridge-creator publishes on its own schedule — so the fee covers only the
    // marginal LLM cost of having the synthesizer consider the suggestion.
    estimatedGas: 1,
  };

  const proposalRateLimiter = createRateLimiter({
    windowMs: config.rateLimitWindowMs,
    maxRequests: config.rateLimitMaxRequests,
    message: 'Too many bridge proposals. Please wait before submitting again.',
  });

  function requirePayment(req: Request, res: Response, next: NextFunction): void {
    const paymentId = getPaymentFromHeader(req.headers['x-payment-proof'] as string | undefined);
    if (!paymentId || !validatePayment(paymentId)) {
      const paymentDetails = calculatePaymentRequired(0n, paymentConfig);
      res.status(402).json(createPaymentRequiredResponse(paymentDetails));
      return;
    }
    next();
  }

  app.post('/propose-bridge', proposalRateLimiter, requirePayment, (req: Request, res: Response) => {
    let input;
    try {
      input = validateProposalInput(req.body);
    } catch (error) {
      res.status(400).json({
        error: 'invalid_proposal',
        message: error instanceof Error ? error.message : 'Invalid proposal',
      });
      return;
    }

    try {
      const record = appendProposal(config.proposalStorePath, input);
      res.status(202).json({
        status: 'accepted',
        message:
          'Proposal received. The bridge-creator will consider it on a future synthesis tick; it may adopt, adapt, or decline it.',
        proposalId: record.id,
        submittedAt: record.submitted_at,
      });
    } catch (error) {
      console.error('Error in /propose-bridge:', error);
      res.status(500).json({
        error: 'proposal_store_unavailable',
        message: error instanceof Error ? error.message : 'Unable to record proposal',
      });
    }
  });

  app.get('/strategy-prompt', (_req: Request, res: Response) => {
    try {
      res.type('text/markdown').send(loadDefaultStrategyPrompt());
    } catch (error) {
      console.error('Error in /strategy-prompt:', error);
      res.status(500).json({
        error: 'strategy_prompt_unavailable',
        message: error instanceof Error ? error.message : 'Unable to load strategy prompt',
      });
    }
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      address: signerAddress,
      name: config.name,
      version: config.version,
    });
  });

  return app;
}

export interface BridgeCreatorRunHandle {
  finished: Promise<void>;
  stop: () => Promise<void>;
}

export function run(config = loadConfig()): BridgeCreatorRunHandle {
  const machinery = createMachinery(config);
  const implicationSubmitter = config.implicationsContractAddress
    ? createBridgeImplicationSubmitter({
        ethereumPrivateKey: config.nudgerPrivateKey as `0x${string}`,
        ethereumRpcUrl: config.ethereumRpcUrl,
        implicationsContractAddress: config.implicationsContractAddress,
      })
    : undefined;

  async function runTick(): Promise<void> {
    const result = await runBridgeCreatorTick(machinery, config, {
      fetchBridgeContextSnapshots,
      loadAnchorStoreFile,
      loadStrategyPrompt: loadDefaultStrategyPrompt,
      synthesizeBridgeTriples: defaultSynthesizeBridgeTriples,
      publishBridgeStatement: defaultPublishBridgeStatement,
      publishBridgeNudgeBatch: defaultPublishBridgeNudgeBatch,
      loadDedupState: loadBridgePublicationDedupState,
      saveDedupState: saveBridgePublicationDedupState,
      loadProposalStore: loadProposalStoreFile,
      markProposalsConsumed,
      implicationSubmitter,
    });
    console.log(
      `Bridge creator tick: ${result.status}; synthesized=${result.synthesizedBridgeCount}; published_nudges=${result.publishedNudgeCount}`,
    );
  }

  async function runAnchorReflection(): Promise<void> {
    const contextSnapshots = await fetchBridgeContextSnapshots(config.trustedContextSources);
    if (!allContextsReady(contextSnapshots)) {
      console.log('Bridge creator anchor reflection skipped: trusted context is warming');
      return;
    }

    const dedupState = loadBridgePublicationDedupState(config.publicationDedupStatePath);
    const result = await appendAnchorReflectionProposals(
      config.anchorStorePath,
      {
        contextSnapshots,
        previousPublicationSummary: dedupState.lastPublicationSummary,
        outcomeSummary: loadOptionalTextFile(config.anchorReflectionOutcomeSummaryPath),
      },
      {
        openRouterApiKey: config.openRouterApiKey,
        openRouterModel: config.openRouterModel,
      },
    );
    console.log(`Bridge creator anchor reflection: proposed=${result.proposals.length}`);
  }

  void runTick().catch((error) => console.error('Bridge creator tick failed:', error));
  void runAnchorReflection().catch((error) => console.error('Bridge creator anchor reflection failed:', error));
  const tickInterval = setInterval(() => {
    void runTick().catch((error) => console.error('Bridge creator tick failed:', error));
  }, config.tickIntervalMs);
  const reflectionInterval = setInterval(() => {
    void runAnchorReflection().catch((error) => console.error('Bridge creator anchor reflection failed:', error));
  }, config.anchorReflectionIntervalMs);

  return {
    finished: NEVER,
    stop: () => {
      clearInterval(tickInterval);
      clearInterval(reflectionInterval);
      return Promise.resolve();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig();
  const signer = createNudgerSigner(config);
  const port = parseInt(process.env.PORT || '3003', 10);
  run(config);
  createBridgeCreatorApp(config, signer.address).listen(port, () => {
    console.log(`Bridge Creator service listening on port ${port}`);
    console.log(`Nudger address: ${signer.address}`);
    console.log(`Strategy: ${config.sourceType}`);
  });
}
