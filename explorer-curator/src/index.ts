import { type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { type Request, type Response } from 'express';
import {
  createSDKMachinery,
  type ContractAddresses,
} from '@commonality/sdk';
import { loadConfig } from './config.js';
import { createNudgerSigner } from '@commonality/nudger-core';
import { ExplorerCurator } from './curator.js';
import { suggestForUser, type ExplorerSuggestRequest, type ExplorerSuggestion } from './personalizer.js';

function createContractAddresses(config: ReturnType<typeof loadConfig>): ContractAddresses {
  return {
    beliefs: '0x0000000000000000000000000000000000000000',
    implications: (process.env.IMPLICATIONS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    assuranceContractFactory: '0x0000000000000000000000000000000000000000',
    erc1155Factory: '0x0000000000000000000000000000000000000000',
    marketplaceFactory: '0x0000000000000000000000000000000000000000',
    delegatableNotes: '0x0000000000000000000000000000000000000000',
    noteIntent: '0x0000000000000000000000000000000000000000',
    alignmentAttestations: '0x0000000000000000000000000000000000000000',
    mutableRefUpdater: '0x0000000000000000000000000000000000000000',
    trustRegistry: '0x0000000000000000000000000000000000000000',
    nudgePublications: config.nudgePublicationsContractAddress as `0x${string}`,
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
    createContractAddresses(config),
  );
}

async function runCuratorCycle(
  curator: ExplorerCurator,
  machinery: ReturnType<typeof createMachinery>,
  config: ReturnType<typeof loadConfig>,
): Promise<void> {
  try {
    const result = await curator.runCuratorCycle(machinery, config);
    if (result.published) {
      console.log(`Curator cycle complete: published ${result.entryCount} entries.`);
    } else {
      console.log(`Curator cycle complete: no changes (${result.entryCount} entries in collection).`);
    }
  } catch (error) {
    console.error('Curator cycle failed:', error);
  }
}

interface NudgerMetadata {
  address: string;
  name: string;
  description: string;
  sourceType: string;
  version: string;
}

function createApp(
  config: ReturnType<typeof loadConfig>,
  signer: ReturnType<typeof createNudgerSigner>,
  machinery: ReturnType<typeof createMachinery>,
) {
  const app = express();
  app.use(express.json());

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
      stream: config.stream,
    });
  });

  app.post('/suggest', async (req: Request, res: Response) => {
    try {
      const body = req.body as ExplorerSuggestRequest;

      if (!body.stream || !Array.isArray(body.signedStatementCids)) {
        res.status(400).json({ error: 'Missing required fields: stream (string), signedStatementCids (string[])' });
        return;
      }

      const suggestions: ExplorerSuggestion[] = await suggestForUser(machinery, body, config);
      res.json({ suggestions });
    } catch (error) {
      console.error('Error in /suggest endpoint:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  });

  app.get('/collection', async (_req: Request, res: Response) => {
    try {
      const { getCuratedCollections } = await import('@commonality/sdk');
      const collections = await getCuratedCollections(machinery, undefined, config.stream);

      if (collections.length === 0) {
        res.json({ entries: [] });
        return;
      }

      res.json({
        stream: config.stream,
        publishedAt: collections[0].publishedAt,
        entries: collections[0].entries,
      });
    } catch (error) {
      console.error('Error in /collection endpoint:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  });

  return app;
}

export interface ExplorerCuratorRunHandle {
  server: Server;
  finished: Promise<void>;
  stop: () => Promise<void>;
}

export function run(config = loadConfig()): ExplorerCuratorRunHandle {
  const signer = createNudgerSigner(config);
  const machinery = createMachinery(config);
  const curator = new ExplorerCurator();
  const app = createApp(config, signer, machinery);
  let stopRequested = false;

  void runCuratorCycle(curator, machinery, config).catch(console.error);
  const interval = setInterval(() => {
    void runCuratorCycle(curator, machinery, config).catch(console.error);
  }, config.curatorIntervalMs);

  const server = app.listen(config.port, () => {
    console.log(`Explorer curator service listening on port ${config.port}`);
    console.log(`Nudger address: ${signer.address}`);
    console.log(`Stream: ${config.stream}`);
    console.log(`Curator interval: ${config.curatorIntervalMs / (60 * 60 * 1000)} hours`);
  });

  const finished = new Promise<void>((resolve, reject) => {
    server.once('close', () => {
      resolve();
    });
    server.once('error', (error) => {
      if (stopRequested) {
        resolve();
        return;
      }
      reject(error);
    });
  });

  return {
    server,
    finished,
    stop: () => new Promise((resolve, reject) => {
      stopRequested = true;
      clearInterval(interval);
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
