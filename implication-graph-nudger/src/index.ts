import { pathToFileURL } from 'node:url';
import express, { type Express } from 'express';
import { type Request, type Response } from 'express';
import {
  createSDKMachinery,
  getAllStatements,
  type ContractAddresses,
} from '@commonality/sdk';
import { loadConfig } from './config.js';
import {
  createNudgerSigner,
  type NudgeMessage,
} from '@commonality/nudger-core';
import { createNudgerStrategy } from './nudger.js';

const NUDGE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const NEVER: Promise<void> = new Promise(() => {});

function createContractAddresses(): ContractAddresses {
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

async function runNudgingCycle(
  machinery: ReturnType<typeof createMachinery>,
  signer: ReturnType<typeof createNudgerSigner>,
  config: ReturnType<typeof loadConfig>,
): Promise<void> {
  const nudgerStrategy = createNudgerStrategy();

  console.log('Starting nudging cycle...');

  const statements = await getAllStatements(machinery);
  console.log(`Found ${statements.length} statements to process.`);

  const allNudges: NudgeMessage[] = [];

  for (const statement of statements) {
    try {
      const nudges = await nudgerStrategy.generateNudges(machinery, statement.cid, config);
      allNudges.push(...nudges);
    } catch (error) {
      console.error(`Error generating nudges for ${statement.cid}:`, error);
    }
  }

  if (allNudges.length === 0) {
    console.log('No nudges to publish.');
    return;
  }

  const { txHash, batchCid } = await signer.publishNudgeBatch(allNudges, config);
  console.log(`Published ${allNudges.length} nudges. Batch CID: ${batchCid}, tx: ${txHash}`);
}

interface NudgerMetadata {
  address: string;
  name: string;
  description: string;
  sourceType: string;
  version: string;
}

export function createImplicationGraphNudgerApp(
  config: ReturnType<typeof loadConfig>,
  signerAddress = createNudgerSigner(config).address,
): Express {
  const app = express();

  app.get('/.well-known/nudger.json', (_req: Request, res: Response) => {
    const metadata: NudgerMetadata = {
      address: signerAddress,
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
      address: signerAddress,
      name: config.name,
      version: config.version,
    });
  });

  return app;
}

export interface ImplicationGraphNudgerRunHandle {
  finished: Promise<void>;
  stop: () => Promise<void>;
}

export function run(config = loadConfig()): ImplicationGraphNudgerRunHandle {
  const signer = createNudgerSigner(config);
  const machinery = createMachinery(config);

  void runNudgingCycle(machinery, signer, config).catch(console.error);
  const interval = setInterval(() => {
    void runNudgingCycle(machinery, signer, config).catch(console.error);
  }, NUDGE_INTERVAL_MS);

  return {
    finished: NEVER,
    stop: () => {
      clearInterval(interval);
      return Promise.resolve();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig();
  const signer = createNudgerSigner(config);
  const port = parseInt(process.env.PORT || '3002', 10);
  run(config);
  createImplicationGraphNudgerApp(config, signer.address).listen(port, () => {
    console.log(`Nudger service listening on port ${port}`);
    console.log(`Nudger address: ${signer.address}`);
    console.log(`Strategy: ${config.sourceType}`);
  });
}
