import express from 'express';
import { type Request, type Response } from 'express';
import {
  createSDKMachinery,
  type ContractAddresses,
} from '@commonality/sdk';
import { loadConfig } from './config.js';
import { initializeSigner, getSignerAddress } from '@commonality/nudger-core';
import { ExplorerCurator } from './curator.js';
import { suggestForUser, type ExplorerSuggestRequest, type ExplorerSuggestion } from './personalizer.js';

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
  nudgePublications: config.nudgePublicationsContractAddress as `0x${string}`,
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

const curator = new ExplorerCurator();

async function runCuratorCycle(): Promise<void> {
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

runCuratorCycle().catch(console.error);
setInterval(() => runCuratorCycle().catch(console.error), config.curatorIntervalMs);

const app = express();
app.use(express.json());

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
      stream: config.stream,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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

app.listen(config.port, () => {
  console.log(`Explorer curator service listening on port ${config.port}`);
  console.log(`Nudger address: ${getSignerAddress()}`);
  console.log(`Stream: ${config.stream}`);
  console.log(`Curator interval: ${config.curatorIntervalMs / (60 * 60 * 1000)} hours`);
});
