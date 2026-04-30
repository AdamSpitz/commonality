import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Statement, StatementContent } from './types.js';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars, createStatement, IpfsCidV1, publishDocument, type IPFSConfig } from '@commonality/sdk';

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

export async function uploadStatementToIPFS(ipfsConfig: IPFSConfig, content: StatementContent, domain: string, position: string, statementType: 'simple' | 'disjunction' | 'conjunction'): Promise<IpfsCidV1> {
  return await publishDocument(ipfsConfig, createStatement({
    content: content.text,
    topic: domain,
    extras: {
      domain: domain,
      position: position,
      statementType: statementType,
      references: content.references || [],
    },
  }));
}

interface GenerateStatementsOptions {
  limit?: number;
  universePath?: string;
}

async function generateStatements(ipfsConfig: IPFSConfig, options: GenerateStatementsOptions = {}): Promise<Statement[]> {
  const universePath = options.universePath ?? join(__dirname, 'universe.json');
  const universe = JSON.parse(await fs.readFile(universePath, 'utf-8')) as {
    domains: Record<string, unknown>;
    statementTemplates: Record<string, Record<string, string[]>>;
  };

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
        const cid = await uploadStatementToIPFS(ipfsConfig, content, domain, positionKey, 'simple');
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

      const cid = await uploadStatementToIPFS(ipfsConfig, content, stmt1.domain, `coalition(${stmt1.position},${stmt2.position})`, 'disjunction');
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

      const cid = await uploadStatementToIPFS(ipfsConfig, content, stmt1.domain, `commonality(${stmt1.position},${stmt2.position})`, 'conjunction');
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
