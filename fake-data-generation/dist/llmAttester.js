/**
 * LLM-based implication evaluation for attesters
 * Integrates generateAttesters.ts with OpenRouter for intelligent evaluation
 */
import { evaluateImplicationWithLLM } from './openrouter.js';
/**
 * Evaluate an implication using LLM with attester-specific threshold
 */
async function evaluateImplicationWithAttester(attester, statement1, statement2, apiKey) {
    // First, get LLM evaluation
    const llmResult = await evaluateImplicationWithLLM(statement1, statement2, apiKey, 'anthropic/claude-3.5-haiku');
    // Apply attester-specific adjustments
    let implies = llmResult.implies;
    const confidence = llmResult.confidence;
    let reasoning = llmResult.reasoning;
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
    }
    else {
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
 */
function applyAttesterBias(attester, statement1, statement2, originalImplies, originalConfidence) {
    const domain = statement1.domain;
    const s1Position = statement1.position ?? statement1.content?.position;
    const s2Position = statement2.position ?? statement2.content?.position;
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
    }
    return { implies: originalImplies, confidence: originalConfidence, reasoning: null };
}
/**
 * Check if a position is left-leaning
 */
function isLeftPosition(position) {
    if (!position)
        return false;
    const leftMarkers = ['left', 'progressive', 'economic-left', 'social-progressive'];
    return leftMarkers.some(marker => position.toLowerCase().includes(marker));
}
/**
 * Check if a position is right-leaning
 */
function isRightPosition(position) {
    if (!position)
        return false;
    const rightMarkers = ['right', 'conservative', 'economic-right', 'social-conservative'];
    return rightMarkers.some(marker => position.toLowerCase().includes(marker));
}
/**
 * Batch evaluate implications for multiple attesters and statement pairs
 */
async function batchAttesterEvaluations(attesters, pairs, apiKey, options = {}) {
    const { maxPairsPerAttester = 10, delayBetweenCalls = 1000, onProgress } = options;
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
        const selectedPairs = selectRandomPairs(pairs, maxPairsPerAttester);
        for (const { statement1, statement2 } of selectedPairs) {
            try {
                const evaluation = await evaluateImplicationWithAttester(attester, statement1, statement2, apiKey);
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
            }
            catch (error) {
                const err = error;
                results.summary.errors.push({
                    attesterId: attester.id,
                    error: err.message
                });
            }
        }
    }
    return results;
}
/**
 * Select random pairs from the available pairs
 */
function selectRandomPairs(pairs, count) {
    if (pairs.length <= count)
        return pairs;
    const shuffled = [...pairs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}
/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Cost estimation for batch evaluation
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
        const testResult = await evaluateImplicationWithLLM({ content: { text: 'All humans are mortal' } }, { content: { text: 'Socrates is mortal' } }, apiKey);
        return {
            valid: true,
            testResult,
            message: 'OpenRouter is configured and responding'
        };
    }
    catch (error) {
        const err = error;
        return {
            valid: false,
            error: err.message,
            message: 'Failed to validate OpenRouter setup'
        };
    }
}
export { evaluateImplicationWithAttester, batchAttesterEvaluations, estimateEvaluationCost, validateOpenRouterSetup };
