/**
 * Generate pre-computed implication attestations
 * Uses LLM to evaluate statement pairs and saves results for reuse
 * This avoids calling OpenRouter on every test run
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { evaluateImplicationWithLLM } from './openrouter.js';
import type { Statement, Attester } from './types.js';
import { IpfsCidV1 } from '@commonality/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Attestation {
  id: string;
  fromStatementCid: IpfsCidV1;
  toStatementCid: IpfsCidV1;
  fromDomain: string;
  toDomain: string;
  implies: boolean;
  confidence: string;
  reasoning: string;
  model: string;
  timestamp: number;
}

/**
 * Generate implication attestations for all statement pairs within the same domain
 */
async function generateAttestations(maxPairsPerDomain = 50): Promise<Attestation[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('Error: OPENROUTER_API_KEY environment variable not set');
    console.log('Please set your API key: export OPENROUTER_API_KEY=sk-or-your-key-here');
    process.exit(1);
  }

  console.log('=== Generating Pre-computed Attestations ===\n');

  // Load statements
  const statementsPath = join(__dirname, 'statements.json');
  let statements: Statement[];
  try {
    const data = await fs.readFile(statementsPath, 'utf-8');
    statements = JSON.parse(data) as Statement[];
    console.log(`Loaded ${statements.length} statements`);
  } catch {
    console.error('Error: statements.json not found. Run generateStatements.ts first.');
    process.exit(1);
  }

  // Load attesters
  let attesters: Attester[] = [];
  const attestersPath = join(__dirname, 'attesters.json');
  try {
    const data = await fs.readFile(attestersPath, 'utf-8');
    attesters = JSON.parse(data) as Attester[];
    console.log(`Loaded ${attesters.length} attesters`);
  } catch {
    console.log('No attesters.json found, using generated attesters');
    const { generateAttesters } = await import('./generateAttesters.js');
    attesters = await generateAttesters(10);
  }

  // suppress unused variable warning
  void attesters;

  // Group statements by domain
  const statementsByDomain: Record<string, Statement[]> = {};
  for (const stmt of statements) {
    const domain = stmt.domain;
    if (!statementsByDomain[domain]) {
      statementsByDomain[domain] = [];
    }
    statementsByDomain[domain].push(stmt);
  }

  console.log(`\nDomains: ${Object.keys(statementsByDomain).join(', ')}`);

  // Generate attestations for each domain
  const attestations: Attestation[] = [];
  let totalCost = 0;

  for (const [domain, domainStatements] of Object.entries(statementsByDomain)) {
    console.log(`\n--- Processing domain: ${domain} (${domainStatements.length} statements) ---`);

    // Generate all possible pairs within the domain
    const pairs: Array<{ statement1: Statement; statement2: Statement }> = [];
    for (let i = 0; i < domainStatements.length; i++) {
      for (let j = 0; j < domainStatements.length; j++) {
        if (i !== j) {
          pairs.push({
            statement1: domainStatements[i],
            statement2: domainStatements[j]
          });
        }
      }
    }

    // Limit pairs per domain for cost control
    const selectedPairs = pairs.length > maxPairsPerDomain
      ? pairs.sort(() => 0.5 - Math.random()).slice(0, maxPairsPerDomain)
      : pairs;

    console.log(`  Evaluating ${selectedPairs.length} pairs (from ${pairs.length} total)`);

    // Evaluate each pair
    for (const pair of selectedPairs) {
      try {
        const result = await evaluateImplicationWithLLM(
          pair.statement1,
          pair.statement2,
          apiKey
        );

        // Only save positive implications (where S1 implies S2)
        if (result.implies) {
          const attestation: Attestation = {
            id: `attestation-${attestations.length}`,
            fromStatementCid: pair.statement1.statementId,
            toStatementCid: pair.statement2.statementId,
            fromDomain: pair.statement1.domain,
            toDomain: pair.statement2.domain,
            implies: result.implies,
            confidence: result.confidence,
            reasoning: result.reasoning,
            model: result.model,
            timestamp: Date.now()
          };
          attestations.push(attestation);
        }

        // Track cost (approximate)
        totalCost += 0.002; // ~$0.002 per call

        // Progress indicator
        if (attestations.length % 10 === 0) {
          console.log(`  Progress: ${attestations.length} attestations generated, ~$${totalCost.toFixed(2)}`);
        }

        // Rate limiting (1 call per second to respect API limits)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        const error = err as Error;
        console.error(`  Error evaluating pair: ${error.message}`);
      }
    }
  }

  console.log(`\n=== Generated ${attestations.length} pre-computed attestations ===`);
  console.log(`Estimated cost: ~$${totalCost.toFixed(2)}`);

  // Save to file
  const outputPath = join(__dirname, 'attestations.json');
  await fs.writeFile(outputPath, JSON.stringify(attestations, null, 2));
  console.log(`Saved to: ${outputPath}`);

  // Also save metadata
  const metadata = {
    generatedAt: new Date().toISOString(),
    numStatements: statements.length,
    numAttestations: attestations.length,
    domains: Object.keys(statementsByDomain),
    estimatedCost: totalCost,
    model: 'anthropic/claude-3.5-haiku'
  };

  const metadataPath = join(__dirname, 'attestations.metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`Metadata saved to: ${metadataPath}`);

  return attestations;
}

/**
 * Load pre-computed attestations
 */
async function loadAttestations(): Promise<Attestation[]> {
  const path = join(__dirname, 'attestations.json');
  try {
    const data = await fs.readFile(path, 'utf-8');
    return JSON.parse(data) as Attestation[];
  } catch {
    return [];
  }
}

/**
 * Get attestation for a specific statement pair
 */
async function getAttestation(fromStatementCid: IpfsCidV1, toStatementCid: IpfsCidV1): Promise<Attestation | null> {
  const attestations = await loadAttestations();
  return attestations.find(a =>
    a.fromStatementCid === fromStatementCid && a.toStatementCid === toStatementCid
  ) ?? null;
}

/**
 * Get all attestations for a given statement
 */
async function getAttestationsForStatement(statementCid: IpfsCidV1): Promise<{
  inbound: Attestation[];
  outbound: Attestation[];
}> {
  const attestations = await loadAttestations();

  return {
    inbound: attestations.filter(a => a.toStatementCid === statementCid),
    outbound: attestations.filter(a => a.fromStatementCid === statementCid)
  };
}

/**
 * Check if pre-generated attestations exist
 */
async function hasAttestations(): Promise<boolean> {
  const path = join(__dirname, 'attestations.json');
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear cached attestations (for regeneration)
 */
async function clearAttestations(): Promise<void> {
  const path = join(__dirname, 'attestations.json');
  const metadataPath = join(__dirname, 'attestations.metadata.json');

  try {
    await fs.unlink(path);
    console.log('Deleted attestations.json');
  } catch {
    // File may not exist
  }

  try {
    await fs.unlink(metadataPath);
    console.log('Deleted attestations.metadata.json');
  } catch {
    // File may not exist
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const maxPairs = parseInt(process.argv[2]) || 50;
  generateAttestations(maxPairs)
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

export {
  generateAttestations,
  loadAttestations,
  getAttestation,
  getAttestationsForStatement,
  hasAttestations,
  clearAttestations
};
export type { Attestation };
