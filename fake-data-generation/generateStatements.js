import { keccak256, toBytes } from 'viem';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate statements from the universe configuration
 * Statements represent positions on various domains
 */

function createStatementId(content) {
  const hash = keccak256(toBytes(JSON.stringify(content)));
  return hash;
}

function generatePositionKey(domain, position) {
  if (typeof position === 'string') {
    return position;
  } else if (typeof position === 'object') {
    // For spectrum types with multiple axes
    return Object.entries(position)
      .sort(([k1], [k2]) => k1.localeCompare(k2))
      .map(([k, v]) => `${k}-${v}`)
      .join('_');
  }
}

async function generateStatements() {
  const universePath = join(__dirname, 'universe.json');
  const universe = JSON.parse(await fs.readFile(universePath, 'utf-8'));

  const statements = [];
  let idCounter = 0;

  for (const [domain, domainConfig] of Object.entries(universe.domains)) {
    const templates = universe.statementTemplates[domain];
    if (!templates) continue;

    for (const [positionKey, statementTexts] of Object.entries(templates)) {
      for (const text of statementTexts) {
        const statement = {
          id: idCounter++,
          domain,
          position: positionKey,
          statementType: 'simple',
          content: {
            text,
            domain,
            position: positionKey
          }
        };

        // Generate statement ID (mock CID)
        statement.statementId = createStatementId(statement.content);

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
      const coalition = {
        id: idCounter++,
        domain: stmt1.domain,
        position: 'coalition',
        statementType: 'disjunction',
        content: {
          text: `I support either "${stmt1.content.text}" or "${stmt2.content.text}"`,
          domain: stmt1.domain,
          references: [stmt1.statementId, stmt2.statementId],
          type: 'or'
        }
      };

      coalition.statementId = createStatementId(coalition.content);
      statements.push(coalition);
    }
  }

  // Generate some commonality statements (finding common ground)
  const numCommonality = Math.min(10, Math.floor(statements.length / 20));
  for (let i = 0; i < numCommonality; i++) {
    const stmt1 = statements[Math.floor(Math.random() * statements.length)];
    const stmt2 = statements[Math.floor(Math.random() * statements.length)];

    if (stmt1.id !== stmt2.id && stmt1.domain === stmt2.domain) {
      const commonality = {
        id: idCounter++,
        domain: stmt1.domain,
        position: 'commonality',
        statementType: 'conjunction',
        content: {
          text: `Both "${stmt1.content.text}" and "${stmt2.content.text}" are important`,
          domain: stmt1.domain,
          references: [stmt1.statementId, stmt2.statementId],
          type: 'and'
        }
      };

      commonality.statementId = createStatementId(commonality.content);
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

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateStatements().catch(console.error);
}

export { generateStatements };
