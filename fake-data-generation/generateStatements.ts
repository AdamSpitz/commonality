import { keccak256, toBytes } from 'viem';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Statement } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate statements from the universe configuration
 * Statements represent positions on various domains
 */

function createStatementId(content: Record<string, unknown>): `0x${string}` {
  const hash = keccak256(toBytes(JSON.stringify(content)));
  return hash;
}

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

async function generateStatements(): Promise<Statement[]> {
  const universePath = join(__dirname, 'universe.json');
  const universe = JSON.parse(await fs.readFile(universePath, 'utf-8')) as {
    domains: Record<string, unknown>;
    statementTemplates: Record<string, Record<string, string[]>>;
  };

  const statements: Statement[] = [];
  let idCounter = 0;

  for (const [domain] of Object.entries(universe.domains)) {
    const templates = universe.statementTemplates[domain];
    if (!templates) continue;

    for (const [positionKey, statementTexts] of Object.entries(templates)) {
      for (const text of statementTexts) {
        const content = {
          text,
          domain,
          position: positionKey
        };

        const statement: Statement = {
          id: idCounter++,
          domain,
          position: positionKey,
          statementType: 'simple',
          content,
          statementId: createStatementId(content),
        };

        statements.push(statement);
      }
    }
  }

  // Generate some coalition statements ("I believe either A or B")
  const numCoalitions = Math.min(10, Math.floor(statements.length / 10));
  for (let i = 0; i < numCoalitions; i++) {
    const stmt1 = statements[Math.floor(Math.random() * statements.length)];
    const stmt2 = statements[Math.floor(Math.random() * statements.length)];

    if (stmt1.id !== stmt2.id && stmt1.domain === stmt2.domain) {
      const content = {
        text: `I support either "${stmt1.content.text}" or "${stmt2.content.text}"`,
        domain: stmt1.domain,
        references: [stmt1.statementId, stmt2.statementId],
        type: 'or'
      };

      const coalition: Statement = {
        id: idCounter++,
        domain: stmt1.domain,
        position: 'coalition',
        statementType: 'disjunction',
        content,
        statementId: createStatementId(content),
      };

      statements.push(coalition);
    }
  }

  // Generate some commonality statements (finding common ground)
  const numCommonality = Math.min(10, Math.floor(statements.length / 20));
  for (let i = 0; i < numCommonality; i++) {
    const stmt1 = statements[Math.floor(Math.random() * statements.length)];
    const stmt2 = statements[Math.floor(Math.random() * statements.length)];

    if (stmt1.id !== stmt2.id && stmt1.domain === stmt2.domain) {
      const content = {
        text: `Both "${stmt1.content.text}" and "${stmt2.content.text}" are important`,
        domain: stmt1.domain,
        references: [stmt1.statementId, stmt2.statementId],
        type: 'and'
      };

      const commonality: Statement = {
        id: idCounter++,
        domain: stmt1.domain,
        position: 'commonality',
        statementType: 'conjunction',
        content,
        statementId: createStatementId(content),
      };

      statements.push(commonality);
    }
  }

  // Save to file
  const outputPath = join(__dirname, 'statements.json');
  await fs.writeFile(outputPath, JSON.stringify(statements, null, 2));

  console.log(`Generated ${statements.length} statements`);
  console.log(`  Simple: ${statements.filter(s => s.statementType === 'simple').length}`);
  console.log(`  Coalitions: ${statements.filter(s => s.statementType === 'disjunction').length}`);
  console.log(`  Commonality: ${statements.filter(s => s.statementType === 'conjunction').length}`);

  return statements;
}

async function loadStatements(): Promise<Statement[]> {
  const statementsPath = join(__dirname, 'statements.json');
  const data = await fs.readFile(statementsPath, 'utf-8');
  return JSON.parse(data) as Statement[];
}

// suppress unused variable warning for generatePositionKey
void generatePositionKey;

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateStatements().catch(console.error);
}

export { generateStatements, loadStatements };
