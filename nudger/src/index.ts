import express from 'express';
import { type Request, type Response } from 'express';
import {
  createSDKMachinery,
  type IpfsCidV1,
  type ContractAddresses,
} from '@commonality/sdk';
import { loadConfig } from './config.js';
import { initializeSigner, getSignerAddress, type NudgeMessage } from './signer.js';
import { createNudgerStrategy } from './nudger.js';

const app = express();
app.use(express.json());

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

const nudgerStrategy = createNudgerStrategy(config.sourceType);

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