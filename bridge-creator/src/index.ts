import { type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { type Request, type Response } from 'express';
import {
  createSDKMachinery,
  type IpfsCidV1,
  type ContractAddresses,
} from '@commonality/sdk';
import { loadConfig } from './config.js';
import { createNudgerSigner, type NudgeMessage } from '@commonality/nudger-core';
import { createNudgerStrategy } from './nudger.js';

interface NudgesResponse {
  nudges: NudgeMessage[];
}

interface NudgerMetadata {
  address: string;
  name: string;
  description: string;
  sourceType: string;
  version: string;
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

function createApp(config: ReturnType<typeof loadConfig>, signer = createNudgerSigner(config)) {
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

  app.get('/.well-known/nudger.json', (_req: Request, res: Response) => {
    const metadata: NudgerMetadata = {
      address: signer.address,
      name: config.name,
      description: config.description,
      sourceType: config.sourceType,
      version: config.version,
    };

    res.json(metadata);
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      address: signer.address,
      name: config.name,
      version: config.version,
    });
  });

  return app;
}

export interface BridgeCreatorRunHandle {
  server: Server;
  stop: () => Promise<void>;
}

export function run(config = loadConfig()): BridgeCreatorRunHandle {
  const signer = createNudgerSigner(config);
  const app = createApp(config, signer);
  const server = app.listen(config.port, () => {
    console.log(`Bridge Creator service listening on port ${config.port}`);
    console.log(`Nudger address: ${signer.address}`);
    console.log(`Strategy: ${config.sourceType}`);
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
