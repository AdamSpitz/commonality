import { pathToFileURL } from 'node:url';
import express, { type Express } from 'express';
import { type Request, type Response } from 'express';
import {
  createSDKMachinery,
  type IpfsCidV1,
  type ContractAddresses,
} from '@commonality/sdk';
import { loadConfig, loadConfigFromEnv } from './config.js';
import { getActiveAnchors, loadAnchorStoreFile } from './anchors.js';
import { allContextsReady, fetchBridgeContextSnapshots } from './contextSources.js';
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
export { getActiveAnchors, loadAnchorStoreFile, normalizeAnchorStoreFile } from './anchors.js';
export type { BridgeAnchorRecord, BridgeAnchorStatus, BridgeAnchorStoreFile } from './anchors.js';
import { createNudgerSigner, type NudgeMessage } from '@commonality/nudger-core';
import { createNudgerStrategy } from './nudger.js';

const NEVER: Promise<void> = new Promise(() => {});

interface NudgesResponse {
  nudges: NudgeMessage[];
}

interface NudgerMetadata {
  name: string;
  description: string;
  nudger_type: string;
  signer_address: string;
  strategy_prompt_url: string;
  anchors_url: string;
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
  const machinery = createMachinery(config);
  const nudgerStrategy = createNudgerStrategy();

  app.use(express.json());

  app.get('/nudges', async (req: Request, res: Response) => {
    try {
      const targetStatementCid = req.query.targetStatementCid as string;

      if (!targetStatementCid) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Missing required parameter: targetStatementCid',
        });
        return;
      }

      const nudges = await nudgerStrategy.generateNudges(machinery, targetStatementCid as IpfsCidV1, config);

      res.json({ nudges } as NudgesResponse);
    } catch (error) {
      console.error('Error in /nudges:', error);
      res.status(500).json({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });

  app.get('/nudges/bulk', async (req: Request, res: Response) => {
    try {
      const targetStatementCids = req.query.targetStatementCids as string;

      if (!targetStatementCids) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Missing required parameter: targetStatementCids',
        });
        return;
      }

      const cids = targetStatementCids.split(',').map((cid) => cid.trim()).filter(Boolean);

      if (cids.length === 0) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'No targetStatementCids provided',
        });
        return;
      }

      const MAX_CIDS = 50;
      if (cids.length > MAX_CIDS) {
        res.status(400).json({
          error: 'batch_too_large',
          message: `Batch size exceeds maximum of ${MAX_CIDS} statements`,
          details: { requested: cids.length, maximum: MAX_CIDS },
        });
        return;
      }

      const allNudges: NudgeMessage[] = [];

      for (const cid of cids) {
        try {
          const nudges = await nudgerStrategy.generateNudges(machinery, cid as IpfsCidV1, config);
          allNudges.push(...nudges);
        } catch (error) {
          console.error(`Error generating nudges for ${cid}:`, error);
        }
      }

      res.json({
        nudges: allNudges,
        totalStatements: cids.length,
        totalNudges: allNudges.length,
      } as NudgesResponse & { totalStatements: number; totalNudges: number });
    } catch (error) {
      console.error('Error in /nudges/bulk:', error);
      res.status(500).json({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });

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

  app.get('/anchors', (_req: Request, res: Response) => {
    try {
      const store = loadAnchorStoreFile(config.anchorStorePath);
      res.json({ anchors: getActiveAnchors(store) });
    } catch (error) {
      console.error('Error in /anchors:', error);
      res.status(500).json({
        error: 'anchor_store_unavailable',
        message: error instanceof Error ? error.message : 'Unable to load anchors',
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

export function run(_config = loadConfig()): BridgeCreatorRunHandle {
  return {
    finished: NEVER,
    stop: () => Promise.resolve(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig();
  const signer = createNudgerSigner(config);
  const port = parseInt(process.env.PORT || '3003', 10);
  createBridgeCreatorApp(config, signer.address).listen(port, () => {
    console.log(`Bridge Creator service listening on port ${port}`);
    console.log(`Nudger address: ${signer.address}`);
    console.log(`Strategy: ${config.sourceType}`);
  });
}
