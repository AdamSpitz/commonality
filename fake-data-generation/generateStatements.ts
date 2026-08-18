import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Statement, StatementContent } from './types.js';
import { createDefaultDocumentStore, createStatement, publishDocumentToPublishedData } from '@commonality/sdk/displayable-documents';
import { PublishedDataAbi } from '@commonality/sdk/abis';
import { IpfsCidV1, type IPFSConfig, type WriteClients } from '@commonality/sdk/utils';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import { createSDKMachinery } from '@commonality/sdk/machinery';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate statements from the universe configuration
 * Statements represent positions on various domains
 */

function generatePositionKey(position: unknown): string {
  if (typeof position === 'string') {
    return position;
  } else if (typeof position === 'object' && position !== null) {
    // For spectrum types with multiple axes
    return Object.entries(position as Record<string, string>)
      .sort(([k1], [k2]) => k1.localeCompare(k2))
      .map(([k, v]) => `${k}-${v}`)
      .join('_');
  }
  return '';
}

interface StatementPublicationOptions {
  clients?: WriteClients;
  publishedDataAddress?: `0x${string}`;
  store?: ReturnType<typeof createDefaultDocumentStore>;
}

export const SEED_PUBLISH_CONCURRENCY = 8;

function statementDocument(
  content: StatementContent,
  domain: string,
  position: string,
  statementType: 'simple' | 'disjunction' | 'conjunction',
) {
  return createStatement({
    content: content.text,
    topic: domain,
    extras: {
      domain: domain,
      position: position,
      statementType: statementType,
      references: content.references || [],
    },
  });
}

export function createStatementPublishStore(
  ipfsConfig: IPFSConfig,
  options: StatementPublicationOptions = {},
) {
  return createDefaultDocumentStore(
    createSDKMachinery({ ipfsConfig }),
    options.clients && options.publishedDataAddress
      ? {
          clients: options.clients,
          publishedDataContract: { address: options.publishedDataAddress, abi: PublishedDataAbi },
        }
      : {},
  );
}

export async function publishGeneratedStatement(
  ipfsConfig: IPFSConfig,
  content: StatementContent,
  domain: string,
  position: string,
  statementType: 'simple' | 'disjunction' | 'conjunction',
  options: StatementPublicationOptions = {},
): Promise<IpfsCidV1> {
  const document = statementDocument(content, domain, position, statementType);
  const store = options.store ?? createStatementPublishStore(ipfsConfig, options);
  return (await store.publish(document)).cid;
}

export async function publishGeneratedStatements(
  statements: Statement[],
  ipfsConfig: IPFSConfig,
  publishers: WriteClients[],
  publishedDataAddress?: `0x${string}`,
): Promise<{ uploaded: number; failed: number }> {
  if (statements.length === 0) {
    return { uploaded: 0, failed: 0 };
  }

  if (!publishedDataAddress || publishers.length === 0) {
    const store = createStatementPublishStore(ipfsConfig, {
      clients: publishers[0],
      publishedDataAddress,
    });
    let uploaded = 0;
    let failed = 0;
    for (const stmt of statements) {
      try {
        stmt.cid = await publishGeneratedStatement(
          ipfsConfig,
          stmt.content,
          stmt.domain,
          stmt.position,
          stmt.statementType,
          { store },
        );
        uploaded++;
        if (uploaded % 10 === 0) {
          console.log(`  Published ${uploaded}/${statements.length} statements...`);
        }
      } catch (err) {
        failed++;
        console.error(`  Failed to publish statement: ${(err as Error).message}`);
      }
    }
    return { uploaded, failed };
  }

  const contract = { address: publishedDataAddress, abi: PublishedDataAbi };
  const workerCount = Math.max(1, Math.min(SEED_PUBLISH_CONCURRENCY, publishers.length, statements.length));
  const workers = publishers.slice(0, workerCount);
  console.log(`  Publishing ${statements.length} statements via ${workerCount} wallets (receipts batched)...`);

  const slices: Statement[][] = Array.from({ length: workerCount }, () => []);
  statements.forEach((stmt, index) => {
    slices[index % workerCount].push(stmt);
  });

  const results = await Promise.all(slices.map(async (slice, workerIndex) => {
    const clients = workers[workerIndex];
    let uploaded = 0;
    let failed = 0;
    if (slice.length === 0) {
      return { uploaded, failed };
    }

    let nonce = await clients.publicClient.getTransactionCount({ address: clients.account });
    const pending: Array<{ stmt: Statement; hash: `0x${string}` }> = [];

    for (const stmt of slice) {
      try {
        const result = await publishDocumentToPublishedData(
          clients,
          contract,
          statementDocument(stmt.content, stmt.domain, stmt.position, stmt.statementType),
          { waitForReceipt: false, nonce: nonce++ },
        );
        stmt.cid = result.cid;
        pending.push({ stmt, hash: result.txHash });
      } catch (err) {
        failed++;
        console.error(`  Failed to submit statement: ${(err as Error).message}`);
      }
    }

    const receipts = await Promise.allSettled(
      pending.map(({ hash }) => clients.publicClient.waitForTransactionReceipt({ hash })),
    );
    receipts.forEach((receipt, index) => {
      if (receipt.status === 'fulfilled') {
        uploaded++;
      } else {
        failed++;
        delete pending[index].stmt.cid;
        console.error(`  Failed to confirm statement: ${receipt.reason}`);
      }
    });

    return { uploaded, failed };
  }));

  const uploaded = results.reduce((sum, result) => sum + result.uploaded, 0);
  const failed = results.reduce((sum, result) => sum + result.failed, 0);
  if (uploaded > 0) {
    console.log(`  Published ${uploaded}/${statements.length} statements...`);
  }
  return { uploaded, failed };
}

export const uploadStatementToIPFS = publishGeneratedStatement;

interface GenerateStatementsOptions extends StatementPublicationOptions {
  limit?: number;
  universePath?: string;
}

async function generateStatements(ipfsConfig: IPFSConfig, options: GenerateStatementsOptions = {}): Promise<Statement[]> {
  const universePath = options.universePath ?? join(__dirname, 'universe.json');
  const universe = JSON.parse(await fs.readFile(universePath, 'utf-8')) as {
    domains: Record<string, unknown>;
    statementTemplates: Record<string, Record<string, string[]>>;
  };
  const store = createStatementPublishStore(ipfsConfig, options);
  const publishOptions = { ...options, store };

  const statements: Statement[] = [];
  let __idCounter = 0;

  for (const [domain] of Object.entries(universe.domains)) {
    const templates = universe.statementTemplates[domain];
    if (!templates) continue;

    for (const [positionKey, statementTexts] of Object.entries(templates)) {
      for (const text of statementTexts) {
        if (options.limit !== undefined && statements.length >= options.limit) break;

        const content = {
          text,
          domain,
          position: positionKey
        };

        __idCounter++;
        const cid = await publishGeneratedStatement(ipfsConfig, content, domain, positionKey, 'simple', publishOptions);
        const statement: Statement = {
          domain,
          position: positionKey,
          statementType: 'simple',
          content,
          cid,
        };

        statements.push(statement);
      }
      if (options.limit !== undefined && statements.length >= options.limit) break;
    }
    if (options.limit !== undefined && statements.length >= options.limit) break;
  }

  // Generate some coalition statements ("I believe either A or B")
  const shouldSkipDerivedStatements = options.limit !== undefined && statements.length >= options.limit;
  const numCoalitions = shouldSkipDerivedStatements ? 0 : Math.min(10, Math.floor(statements.length / 10));
  for (let i = 0; i < numCoalitions; i++) {
    const stmt1 = statements[Math.floor(Math.random() * statements.length)];
    const stmt2 = statements[Math.floor(Math.random() * statements.length)];

    if (stmt1 !== stmt2 && stmt1.domain === stmt2.domain) {
      __idCounter++;
      const content = {
        text: `I support either "${stmt1.content.text}" or "${stmt2.content.text}"`,
        domain: stmt1.domain,
        type: 'or'
      };

      const cid = await publishGeneratedStatement(ipfsConfig, content, stmt1.domain, `coalition(${stmt1.position},${stmt2.position})`, 'disjunction', publishOptions);
      const coalition: Statement = {
        domain: stmt1.domain,
        position: 'coalition',
        statementType: 'disjunction',
        content,
        cid,
      };

      statements.push(coalition);
    }
  }

  // Generate some commonality statements (finding common ground)
  const numCommonality = shouldSkipDerivedStatements ? 0 : Math.min(10, Math.floor(statements.length / 20));
  for (let i = 0; i < numCommonality; i++) {
    const stmt1 = statements[Math.floor(Math.random() * statements.length)];
    const stmt2 = statements[Math.floor(Math.random() * statements.length)];

    if (stmt1 !== stmt2 && stmt1.domain === stmt2.domain) {
      __idCounter++;
      const content = {
        text: `Both "${stmt1.content.text}" and "${stmt2.content.text}" are important`,
        domain: stmt1.domain,
        type: 'and'
      };

      const cid = await publishGeneratedStatement(ipfsConfig, content, stmt1.domain, `commonality(${stmt1.position},${stmt2.position})`, 'conjunction', publishOptions);
      const commonality: Statement = {
        domain: stmt1.domain,
        position: 'commonality',
        statementType: 'conjunction',
        content,
        cid,
      };

      statements.push(commonality);
    }
  }

  // Save to file (without CIDs — those are set at runtime via IPFS upload)
  const outputPath = join(__dirname, 'data', 'statements.json');
  const statementsForFile = statements.map(({ cid: __unused_cid, ...rest }) => rest);
  await fs.writeFile(outputPath, JSON.stringify(statementsForFile, null, 2));

  console.log(`Generated ${statements.length} statements`);
  console.log(`  Simple: ${statements.filter(s => s.statementType === 'simple').length}`);
  console.log(`  Coalitions: ${statements.filter(s => s.statementType === 'disjunction').length}`);
  console.log(`  Commonality: ${statements.filter(s => s.statementType === 'conjunction').length}`);

  return statements;
}

async function loadStatements(): Promise<Statement[]> {
  const statementsPath = join(__dirname, 'data', 'statements.json');
  const data = await fs.readFile(statementsPath, 'utf-8');
  return JSON.parse(data) as Statement[];
}

// suppress unused variable warning for generatePositionKey
void generatePositionKey;

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  generateStatements(ipfsConfig).catch(console.error);
}

export { generateStatements, loadStatements };
