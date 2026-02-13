/**
 * LLM-based implication evaluation for attesters
 * Integrates generateAttesters.js with OpenRouter for intelligent evaluation
 */

import { evaluateImplicationWithLLM, batchEvaluateImplications } from './openrouter.js';

/**
 * Evaluate an implication using LLM with attester-specific threshold
 * @param {Object} attester - The attester making the evaluation
 * @param {Object} statement1 - First statement (S1)
 * @param {Object} statement2 - Second statement (S2)
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<Object>} Evaluation result
 */
async function evaluateImplicationWithAttester(attester, statement1, statement2, apiKey) {
  // First, get LLM evaluation
  const llmResult = await evaluateImplicationWithLLM(
    statement1,
    statement2,
    apiKey,
    'anthropic/claude-3.5-haiku'
  );

  // Apply attester-specific adjustments
  let { implies, confidence, reasoning } = llmResult;
  let adjustedConfidence = calculateConfidenceScore(confidence);

  // Apply attester bias if applicable
  if (attester.bias) {
    const biasResult = applyAttesterBias(attester, statement1, statement2, implies, adjustedConfidence);
    implies = biasResult.implies;
    adjustedConfidence = biasResult.confidence;
    reasoning = biasResult.reasoning || reasoning;
  }

  // Apply attester threshold
  const finalDecision = adjustedConfidence >= attester.threshold;

  // Update attester statistics
  attester.stats.totalAttestations++;
  if (finalDecision) {
    attester.stats.acceptedRequests++;
  } else {
    attester.stats.rejectedRequests++;
  }

  return {
    implies: finalDecision,
    confidence: adjustedConfidence,
    llmConfidence: confidence,
    reasoning,
    attesterId: attester.id,
    attesterType: attester.type,
    threshold: attester.threshold,
    rawLlmResult: llmResult,
    adjustedForBias: attester.bias !== null
  };
}

/**
 * Convert confidence string to numeric score (0-1)
 * @param {string} confidence - Confidence level (high/medium/low)
 * @returns {number} Numeric confidence score
 */
function calculateConfidenceScore(confidence) {
  switch (confidence?.toLowerCase()) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.65;
    case 'low':
    default:
      return 0.3;
  }
}

/**
 * Apply attester-specific bias to evaluation
 * @param {Object} attester - The attester
 * @param {Object} statement1 - S1
 * @param {Object} statement2 - S2
 * @param {boolean} originalImplies - Original LLM decision
 * @param {number} originalConfidence - Original confidence score
 * @returns {Object} Adjusted result
 */
function applyAttesterBias(attester, statement1, statement2, originalImplies, originalConfidence) {
  const domain = statement1.domain;
  const s1Position = statement1.position || statement1.content?.position;
  const s2Position = statement2.position || statement2.content?.position;

  switch (attester.bias) {
    case 'left':
      // Left-leaning attester is more likely to see implications between left positions
      if (domain === 'politics') {
        if (isLeftPosition(s1Position) && isLeftPosition(s2Position)) {
          return {
            implies: true,
            confidence: Math.min(originalConfidence + 0.15, 1.0),
            reasoning: `Left-leaning attester sees connection between left positions`
          };
        }
      }
      break;

    case 'right':
      // Right-leaning attester is more likely to see implications between right positions
      if (domain === 'politics') {
        if (isRightPosition(s1Position) && isRightPosition(s2Position)) {
          return {
            implies: true,
            confidence: Math.min(originalConfidence + 0.15, 1.0),
            reasoning: `Right-leaning attester sees connection between right positions`
          };
        }
      }
      break;

    case 'random':
      // Malicious attester makes random decisions
      return {
        implies: Math.random() > 0.5,
        confidence: Math.random(),
        reasoning: 'Random evaluation (malicious attester)'
      };

    default:
      // No bias
      break;
  }

  return { implies: originalImplies, confidence: originalConfidence, reasoning: null };
}

/**
 * Check if a position is left-leaning
 * @param {string} position - Position identifier
 * @returns {boolean}
 */
function isLeftPosition(position) {
  if (!position) return false;
  const leftMarkers = ['left', 'progressive', 'economic-left', 'social-progressive'];
  return leftMarkers.some(marker => position.toLowerCase().includes(marker));
}

/**
 * Check if a position is right-leaning
 * @param {string} position - Position identifier
 * @returns {boolean}
 */
function isRightPosition(position) {
  if (!position) return false;
  const rightMarkers = ['right', 'conservative', 'economic-right', 'social-conservative'];
  return rightMarkers.some(marker => position.toLowerCase().includes(marker));
}

/**
 * Batch evaluate implications for multiple attesters and statement pairs
 * This is useful for simulation runs with many evaluations
 * @param {Array} attesters - Array of attesters
 * @param {Array} pairs - Array of {statement1, statement2} pairs to evaluate
 * @param {string} apiKey - OpenRouter API key
 * @param {Object} options - Options for batch processing
 * @returns {Promise<Object>} Results organized by attester and pair
 */
async function batchAttesterEvaluations(attesters, pairs, apiKey, options = {}) {
  const { 
    maxPairsPerAttester = 10,  // Limit evaluations per attester to control costs
    delayBetweenCalls = 1000,   // Rate limiting
    onProgress 
  } = options;

  const results = {
    evaluations: [],
    summary: {
      total: 0,
      byAttester: {},
      byType: {},
      errors: []
    }
  };

  // For each attester, select random pairs to evaluate
  for (const attester of attesters) {
    const attesterResults = [];
    const selectedPairs = selectRandomPairs(pairs, maxPairsPerAttester);

    for (const { statement1, statement2 } of selectedPairs) {
      try {
        const evaluation = await evaluateImplicationWithAttester(
          attester,
          statement1,
          statement2,
          apiKey
        );

        attesterResults.push(evaluation);
        results.evaluations.push(evaluation);
        results.summary.total++;

        // Update summary statistics
        if (!results.summary.byAttester[attester.id]) {
          results.summary.byAttester[attester.id] = { total: 0, accepted: 0 };
        }
        results.summary.byAttester[attester.id].total++;
        if (evaluation.implies) {
          results.summary.byAttester[attester.id].accepted++;
        }

        if (!results.summary.byType[attester.type]) {
          results.summary.byType[attester.type] = { total: 0, accepted: 0 };
        }
        results.summary.byType[attester.type].total++;
        if (evaluation.implies) {
          results.summary.byType[attester.type].accepted++;
        }

        if (onProgress) {
          onProgress(results.summary.total, attesters.length * maxPairsPerAttester, evaluation);
        }

        // Rate limiting
        if (delayBetweenCalls > 0) {
          await sleep(delayBetweenCalls);
        }

      } catch (error) {
        results.summary.errors.push({
          attesterId: attester.id,
          error: error.message
        });
      }
    }
  }

  return results;
}

/**
 * Select random pairs from the available pairs
 * @param {Array} pairs - All available pairs
 * @param {number} count - Number to select
 * @returns {Array} Selected pairs
 */
function selectRandomPairs(pairs, count) {
  if (pairs.length <= count) return pairs;
  
  const shuffled = [...pairs].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cost estimation for batch evaluation
 * @param {number} numEvaluations - Number of evaluations to perform
 * @param {number} costPerEvaluation - Estimated cost per evaluation in USD
 * @returns {Object} Cost estimate
 */
function estimateEvaluationCost(numEvaluations, costPerEvaluation = 0.002) {
  const totalCost = numEvaluations * costPerEvaluation;
  
  return {
    numEvaluations,
    costPerEvaluation,
    totalCostUsd: totalCost,
    breakdown: {
      llmCalls: numEvaluations,
      estimatedTokensPerCall: 1200, // ~1000 input + ~200 output
      model: 'anthropic/claude-3.5-haiku'
    }
  };
}

/**
 * Validate that OpenRouter is configured and working
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<Object>} Validation result
 */
async function validateOpenRouterSetup(apiKey) {
  if (!apiKey) {
    return {
      valid: false,
      error: 'OPENROUTER_API_KEY environment variable not set'
    };
  }

  try {
    // Try a simple test call
    const testResult = await evaluateImplicationWithLLM(
      { content: { text: 'All humans are mortal' } },
      { content: { text: 'Socrates is mortal' } },
      apiKey
    );

    return {
      valid: true,
      testResult,
      message: 'OpenRouter is configured and responding'
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      message: 'Failed to validate OpenRouter setup'
    };
  }
}

export {
  evaluateImplicationWithAttester,
  batchAttesterEvaluations,
  estimateEvaluationCost,
  validateOpenRouterSetup
};
