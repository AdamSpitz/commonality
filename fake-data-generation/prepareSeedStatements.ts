import fs from 'fs/promises';
import path from 'path';
import {
  createStatementDocumentFromSeed,
  DEFAULT_SEED_STATEMENTS_OUTPUT,
  DEFAULT_SEED_UPLOAD_OUTPUT,
  flattenSeedStatements,
  loadSeedCollections,
  uploadSeedStatementDocument,
} from './seed-content-format.js';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACT_ADDRESSES, RPC_URL, loadEnv } from './loadEnv.js';

const hardhat = {
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
} as const;

const DEFAULT_SEED_PUBLISHER_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function createPublishedDataClients(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return {
    walletClient: createWalletClient({ account, chain: hardhat, transport: http(RPC_URL) }),
    publicClient: createPublicClient({ chain: hardhat, transport: http(RPC_URL) }),
    account: account.address,
  };
}

function parseArgs(args: string[]): { outputPath: string; upload: boolean } {
  const upload = args.includes('--upload');

  const outputIndex = args.findIndex((arg) => arg === '--output');
  if (outputIndex >= 0) {
    const outputPath = args[outputIndex + 1];
    if (!outputPath) {
      throw new Error('Missing value after --output');
    }
    return { outputPath, upload };
  }

  const inlineOutput = args.find((arg) => arg.startsWith('--output='));
  if (inlineOutput) {
    return { outputPath: inlineOutput.slice('--output='.length), upload };
  }

  return {
    outputPath: upload ? DEFAULT_SEED_UPLOAD_OUTPUT : DEFAULT_SEED_STATEMENTS_OUTPUT,
    upload,
  };
}

async function main(): Promise<void> {
  loadEnv();
  const { outputPath, upload } = parseArgs(process.argv.slice(2));
  const collections = await loadSeedCollections();
  const records = flattenSeedStatements(collections);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (!upload) {
    const docs = records.map((record) => ({
      collectionId: record.collection.id,
      groupId: record.group.id,
      statementId: record.statement.id,
      role: record.statement.role ?? null,
      document: createStatementDocumentFromSeed(record),
    }));
    await fs.writeFile(outputPath, JSON.stringify(docs, null, 2) + '\n');
    console.log(`Wrote ${outputPath}`);
    console.log(`Statements prepared: ${docs.length}`);
    return;
  }

  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const publishedDataAddress = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const publicationOptions = publishedDataAddress
    ? {
        clients: createPublishedDataClients((process.env.SEED_PUBLISHER_PRIVATE_KEY ?? DEFAULT_SEED_PUBLISHER_PRIVATE_KEY) as Hex),
        publishedDataAddress,
      }
    : {};
  if (publishedDataAddress) {
    console.log(`Publishing seed statement documents through PublishedData at ${publishedDataAddress}`);
  }
  const uploads = [];

  for (const record of records) {
    const cid = await uploadSeedStatementDocument(ipfsConfig, record, publicationOptions);
    uploads.push({
      collectionId: record.collection.id,
      groupId: record.group.id,
      statementId: record.statement.id,
      role: record.statement.role ?? null,
      cid,
      text: record.statement.text,
    });
    console.log(`${record.collection.id}/${record.group.id}/${record.statement.id}: ${cid}`);
  }

  await fs.writeFile(outputPath, JSON.stringify(uploads, null, 2) + '\n');
  console.log(`Wrote ${outputPath}`);
  console.log(`Statements uploaded: ${uploads.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
