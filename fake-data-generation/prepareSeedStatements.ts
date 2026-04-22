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
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk';

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
  const uploads = [];

  for (const record of records) {
    const cid = await uploadSeedStatementDocument(ipfsConfig, record);
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
