import express from 'express';
import { type Request, type Response } from 'express';
import {
  createSDKMachinery,
  getAllStatements,
  type ContractAddresses,
} from '@commonality/sdk';
import { loadConfig } from './config.js';
import {
  initializeSigner,
  getSignerAddress,
  publishNudgeBatch,
  type NudgeMessage,
} from '@commonality/nudger-core';
import { createNudgerStrategy } from './nudger.js';

const config = loadConfig();
initializeSigner(config);

const contractAddresses: ContractAddresses = {
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

const machinery = createSDKMachinery(
  config.indexerUrl,
  { apiUrl: config.ipfsApiUrl, gatewayUrl: config.ipfsGatewayUrl },
  undefined,
  undefined,
  undefined,
  config.indexerUrl,
  contractAddresses
);

const nudgerStrategy = createNudgerStrategy();

const NUDGE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function runNudgingCycle(): Promise<void> {
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

  const { txHash, batchCid } = await publishNudgeBatch(allNudges, config);
  console.log(`Published ${allNudges.length} nudges. Batch CID: ${batchCid}, tx: ${txHash}`);
}

// Run immediately on startup, then on a regular interval.
runNudgingCycle().catch(console.error);
setInterval(() => runNudgingCycle().catch(console.error), NUDGE_INTERVAL_MS);

// Minimal HTTP service for health checks and nudger metadata discovery.
const app = express();

interface NudgerMetadata {
  address: string;
  name: string;
  description: string;
  sourceType: string;
  version: string;
}

app.get('/.well-known/nudger.json', (_req: Request, res: Response) => {
  const metadata: NudgerMetadata = {
    address: getSignerAddress(),
    name: config.name,
    description: config.description,
    sourceType: config.sourceType,
    version: config.version,
  };
  res.json(metadata);
});

app.get('/health', (_req: Request, res: Response) => {
  try {
    const address = getSignerAddress();
    res.json({
      status: 'ok',
      address,
      name: config.name,
      version: config.version,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(config.port, () => {
  console.log(`Nudger service listening on port ${config.port}`);
  console.log(`Nudger address: ${getSignerAddress()}`);
  console.log(`Strategy: ${config.sourceType}`);
});
