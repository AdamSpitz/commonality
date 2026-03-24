import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Attester } from './types.js';
import { IpfsCidV1 } from '@commonality/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate implication attesters with different evaluation strategies
 * Attesters are specialized accounts that evaluate whether S1 implies S2
 */

interface AttesterTypeConfig {
  threshold: number;
  weight: number;
  description: string;
  bias: string | null;
}

// Attester types with their characteristics
const ATTESTER_TYPES: Record<string, AttesterTypeConfig> = {
  NEUTRAL: {
    threshold: 0.8,
    weight: 0.3,
    description: 'Balanced evaluation requiring clear logical connection',
    bias: null
  },
  STRICT: {
    threshold: 0.95,
    weight: 0.2,
    description: 'Very high bar for implication, only obvious logical entailments',
    bias: null
  },
  LENIENT: {
    threshold: 0.6,
    weight: 0.2,
    description: 'Permissive evaluation, allows loose connections',
    bias: null
  },
  POLITICAL_LEFT: {
    threshold: 0.75,
    weight: 0.1,
    description: 'Evaluates through left-leaning political lens',
    bias: 'left'
  },
  POLITICAL_RIGHT: {
    threshold: 0.75,
    weight: 0.1,
    description: 'Evaluates through right-leaning political lens',
    bias: 'right'
  },
  MALICIOUS: {
    threshold: 0.5,
    weight: 0.1,
    description: 'Random/incorrect evaluations for testing robustness',
    bias: 'random'
  }
};

function selectAttesterType(): string {
  const rand = Math.random();
  let cumulative = 0;

  for (const [type, config] of Object.entries(ATTESTER_TYPES)) {
    cumulative += config.weight;
    if (rand < cumulative) {
      return type;
    }
  }

  return 'NEUTRAL';
}

function generateAttester(id: number): Attester {
  const privateKey = generatePrivateKey();
  const wallet = privateKeyToAccount(privateKey);
  const type = selectAttesterType();
  const config = ATTESTER_TYPES[type];

  return {
    id,
    address: wallet.address,
    privateKey: privateKey, // use the key we generated, not wallet.privateKey
    type,
    threshold: config.threshold,
    description: config.description,
    bias: config.bias,
    stats: {
      totalAttestations: 0,
      acceptedRequests: 0,
      rejectedRequests: 0,
      lastAttestationBlock: 0
    }
  };
}

/**
 * Generate a set of implication attesters
 */
async function generateAttesters(count = 10): Promise<Attester[]> {
  const attesters: Attester[] = [];

  for (let i = 0; i < count; i++) {
    attesters.push(generateAttester(i));
  }

  // Save to file
  const outputPath = join(__dirname, 'data', 'attesters.json');
  await fs.writeFile(outputPath, JSON.stringify(attesters, null, 2));

  // Print summary
  console.log(`Generated ${count} attesters`);
  console.log('\nAttester type distribution:');
  for (const [type, config] of Object.entries(ATTESTER_TYPES)) {
    const typeCount = attesters.filter(a => a.type === type).length;
    if (typeCount > 0) {
      console.log(`  ${type}: ${typeCount} (${config.description})`);
    }
  }

  return attesters;
}

/**
 * Load existing attesters from file
 */
async function loadAttesters(): Promise<Attester[]> {
  try {
    const attestersPath = join(__dirname, 'data', 'attesters.json');
    const data = await fs.readFile(attestersPath, 'utf-8');
    return JSON.parse(data) as Attester[];
  } catch {
    console.log('No existing attesters found, generating new ones...');
    return generateAttesters(10);
  }
}

interface Statement {
  domain: string;
  position: string;
  cid: IpfsCidV1;
}

interface EvaluationResult {
  implies: boolean;
  confidence: number;
  reasoning: string;
  attesterId: number;
  attesterType: string;
  threshold: number;
}

/**
 * Evaluate whether statement1 implies statement2
 * This is a simplified simulation - in production, this would use LLM evaluation
 */
function evaluateImplication(attester: Attester, statement1: Statement, statement2: Statement): EvaluationResult {
  let confidence = 0;
  let reasoning = '';

  switch (attester.type) {
    case 'STRICT':
      // Only high confidence for same domain + compatible positions
      if (statement1.domain === statement2.domain) {
        if (statement1.position === statement2.position) {
          confidence = 0.98;
          reasoning = 'Same position within domain';
        } else if (isCompatiblePosition(statement1.position, statement2.position)) {
          confidence = 0.85;
          reasoning = 'Compatible positions';
        }
      }
      break;

    case 'NEUTRAL':
      // Moderate confidence for domain matches
      if (statement1.domain === statement2.domain) {
        confidence = 0.82;
        reasoning = 'Same domain evaluation';
      } else if (areRelatedDomains(statement1.domain, statement2.domain)) {
        confidence = 0.65;
        reasoning = 'Related domains';
      }
      break;

    case 'LENIENT':
      // Higher baseline confidence
      if (statement1.domain === statement2.domain) {
        confidence = 0.75;
        reasoning = 'Same domain (lenient)';
      } else {
        confidence = 0.55;
        reasoning = 'Loose connection allowed';
      }
      break;

    case 'POLITICAL_LEFT':
      // Bias toward left-leaning positions
      if (statement1.domain === 'politics' && statement2.domain === 'politics') {
        if (isLeftLeaning(statement1.position) && isLeftLeaning(statement2.position)) {
          confidence = 0.88;
          reasoning = 'Left-leaning alignment';
        } else if (!isRightLeaning(statement1.position) && !isRightLeaning(statement2.position)) {
          confidence = 0.72;
          reasoning = 'Non-right positions';
        }
      }
      break;

    case 'POLITICAL_RIGHT':
      // Bias toward right-leaning positions
      if (statement1.domain === 'politics' && statement2.domain === 'politics') {
        if (isRightLeaning(statement1.position) && isRightLeaning(statement2.position)) {
          confidence = 0.88;
          reasoning = 'Right-leaning alignment';
        } else if (!isLeftLeaning(statement1.position) && !isLeftLeaning(statement2.position)) {
          confidence = 0.72;
          reasoning = 'Non-left positions';
        }
      }
      break;

    case 'MALICIOUS':
      // Random evaluation (for testing robustness)
      confidence = Math.random();
      reasoning = 'Random evaluation (malicious)';
      break;

    default:
      confidence = 0.5;
      reasoning = 'Default evaluation';
  }

  const implies = confidence >= attester.threshold;

  return {
    implies,
    confidence,
    reasoning,
    attesterId: attester.id,
    attesterType: attester.type,
    threshold: attester.threshold
  };
}

// Helper functions for position evaluation
function isCompatiblePosition(pos1: unknown, pos2: unknown): boolean {
  if (typeof pos1 === 'string' && typeof pos2 === 'string') {
    return pos1 === pos2;
  }
  if (typeof pos1 === 'object' && pos1 !== null && typeof pos2 === 'object' && pos2 !== null) {
    for (const [axis, value] of Object.entries(pos1 as Record<string, unknown>)) {
      if ((pos2 as Record<string, unknown>)[axis] === value) {
        return true;
      }
    }
  }
  return false;
}

function areRelatedDomains(domain1: string, domain2: string): boolean {
  const relatedPairs = [
    ['politics', 'technology'],
    ['politics', 'climate'],
    ['crypto', 'technology'],
    ['climate', 'technology']
  ];

  return relatedPairs.some(
    pair => (pair[0] === domain1 && pair[1] === domain2) ||
            (pair[0] === domain2 && pair[1] === domain1)
  );
}

function isLeftLeaning(position: unknown): boolean {
  if (typeof position === 'string') {
    return ['left', 'progressive'].includes(position);
  }
  if (typeof position === 'object' && position !== null) {
    const p = position as Record<string, string>;
    return p.economic === 'left' || p.social === 'progressive';
  }
  return false;
}

function isRightLeaning(position: unknown): boolean {
  if (typeof position === 'string') {
    return ['right', 'conservative'].includes(position);
  }
  if (typeof position === 'object' && position !== null) {
    const p = position as Record<string, string>;
    return p.economic === 'right' || p.social === 'conservative';
  }
  return false;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const count = parseInt(process.argv[2]) || 10;
  generateAttesters(count).catch(console.error);
}

export { generateAttesters, loadAttesters, evaluateImplication, ATTESTER_TYPES };
