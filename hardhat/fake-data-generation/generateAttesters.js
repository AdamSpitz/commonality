import { ethers } from 'ethers';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate implication attesters with different evaluation strategies
 * Attesters are specialized accounts that evaluate whether S1 implies S2
 */

// Attester types with their characteristics
const ATTESTER_TYPES = {
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

function selectAttesterType() {
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

function generateAttester(id) {
  const wallet = ethers.Wallet.createRandom();
  const type = selectAttesterType();
  const config = ATTESTER_TYPES[type];

  return {
    id,
    address: wallet.address,
    privateKey: wallet.privateKey,
    type,
    threshold: config.threshold,
    description: config.description,
    bias: config.bias,
    // Track attestation statistics
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
 * @param {number} count - Number of attesters to generate (default: 10)
 * @returns {Promise<Array>} Array of attester objects
 */
async function generateAttesters(count = 10) {
  const attesters = [];

  for (let i = 0; i < count; i++) {
    attesters.push(generateAttester(i));
  }

  // Save to file
  const outputPath = join(__dirname, 'attesters.json');
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
 * @returns {Promise<Array>} Array of attester objects
 */
async function loadAttesters() {
  try {
    const attestersPath = join(__dirname, 'attesters.json');
    const data = await fs.readFile(attestersPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.log('No existing attesters found, generating new ones...');
    return generateAttesters(10);
  }
}

/**
 * Evaluate whether statement1 implies statement2
 * This is a simplified simulation - in production, this would use LLM evaluation
 * @param {Object} attester - The attester making the evaluation
 * @param {Object} statement1 - First statement (S1)
 * @param {Object} statement2 - Second statement (S2)
 * @returns {Object} Evaluation result with confidence score
 */
function evaluateImplication(attester, statement1, statement2) {
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
function isCompatiblePosition(pos1, pos2) {
  if (typeof pos1 === 'string' && typeof pos2 === 'string') {
    return pos1 === pos2;
  }
  if (typeof pos1 === 'object' && typeof pos2 === 'object') {
    // Check if any axis matches
    for (const [axis, value] of Object.entries(pos1)) {
      if (pos2[axis] === value) {
        return true;
      }
    }
  }
  return false;
}

function areRelatedDomains(domain1, domain2) {
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

function isLeftLeaning(position) {
  if (typeof position === 'string') {
    return ['left', 'progressive'].includes(position);
  }
  if (typeof position === 'object') {
    return position.economic === 'left' || position.social === 'progressive';
  }
  return false;
}

function isRightLeaning(position) {
  if (typeof position === 'string') {
    return ['right', 'conservative'].includes(position);
  }
  if (typeof position === 'object') {
    return position.economic === 'right' || position.social === 'conservative';
  }
  return false;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const count = parseInt(process.argv[2]) || 10;
  generateAttesters(count).catch(console.error);
}

export { generateAttesters, loadAttesters, evaluateImplication, ATTESTER_TYPES };
