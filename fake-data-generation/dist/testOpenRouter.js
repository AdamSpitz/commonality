#!/usr/bin/env node
/**
 * Test script for OpenRouter LLM-based implication evaluation
 *
 * Usage:
 *   npx tsx testOpenRouter.ts [numTests]
 *
 * Environment variables:
 *   OPENROUTER_API_KEY - Required. Your OpenRouter API key.
 *   OPENROUTER_MODEL - Optional. Model to use (default: anthropic/claude-3.5-haiku)
 *
 * Example:
 *   OPENROUTER_API_KEY=sk-or-xxx npx tsx testOpenRouter.ts 3
 */
import { loadAttesters, ATTESTER_TYPES } from './generateAttesters.js';
import { loadStatements } from './generateStatements.js';
import { evaluateImplicationWithAttester, batchAttesterEvaluations, validateOpenRouterSetup, estimateEvaluationCost } from './llmAttester.js';
import { batchEvaluateImplications } from './openrouter.js';
const API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-haiku';
// suppress unused warnings
void ATTESTER_TYPES;
void batchAttesterEvaluations;
async function testSingleEvaluation() {
    console.log('=== Test 1: Single Implication Evaluation ===\n');
    const attesters = await loadAttesters();
    const statements = await loadStatements();
    if (attesters.length < 1 || statements.length < 2) {
        console.error('Need at least 1 attester and 2 statements');
        return;
    }
    const attester = attesters[0];
    const stmt1 = statements[0];
    const stmt2 = statements[1];
    console.log(`Attester: ${attester.id} (${attester.type})`);
    console.log(`Threshold: ${attester.threshold}`);
    console.log(`\nStatement 1: "${stmt1.content?.text}"`);
    console.log(`Statement 2: "${stmt2.content?.text}"`);
    console.log('\nEvaluating...\n');
    try {
        const result = await evaluateImplicationWithAttester(attester, stmt1, stmt2, API_KEY);
        console.log('Result:');
        console.log(`  Decision: ${result.implies ? 'IMPLIES' : 'DOES NOT IMPLY'}`);
        console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
        console.log(`  LLM Confidence: ${result.llmConfidence}`);
        console.log(`  Reasoning: ${result.reasoning}`);
        console.log(`  Adjusted for bias: ${result.adjustedForBias}`);
        const usage = result.rawLlmResult.usage;
        if (usage) {
            console.log(`  Tokens: ${usage.total_tokens} ` +
                `(${usage.prompt_tokens} prompt + ` +
                `${usage.completion_tokens} completion)`);
        }
    }
    catch (error) {
        const err = error;
        console.error('Error:', err.message);
    }
}
async function testBatchEvaluation(numTests = 3) {
    console.log(`\n=== Test 2: Batch Evaluation (${numTests} pairs) ===\n`);
    const statements = await loadStatements();
    // Create test pairs
    const pairs = [];
    for (let i = 0; i < numTests; i++) {
        const idx1 = Math.floor(Math.random() * statements.length);
        let idx2 = Math.floor(Math.random() * statements.length);
        while (idx2 === idx1) {
            idx2 = Math.floor(Math.random() * statements.length);
        }
        pairs.push({
            statement1: statements[idx1],
            statement2: statements[idx2]
        });
    }
    console.log(`Testing ${pairs.length} random statement pairs...\n`);
    const startTime = Date.now();
    const results = await batchEvaluateImplications(pairs, API_KEY, MODEL, {
        delayMs: 1000,
        onProgress: (completed, total, result) => {
            console.log(`  [${completed}/${total}] Pair ${completed}: ${result.implies ? '✓ IMPLIES' : '✗ NO IMPLY'} (${result.confidence})`);
        }
    });
    const elapsed = Date.now() - startTime;
    console.log(`\nCompleted ${results.length} evaluations in ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`Average time per evaluation: ${(elapsed / results.length / 1000).toFixed(1)}s`);
    // Summary
    const implies = results.filter(r => r.implies).length;
    const errors = results.filter(r => r.error).length;
    console.log(`\nSummary:`);
    console.log(`  Implies: ${implies}/${results.length}`);
    console.log(`  Errors: ${errors}`);
    // Show detailed results
    console.log(`\nDetailed Results:`);
    results.forEach((result, i) => {
        console.log(`\n  Pair ${i + 1}:`);
        console.log(`    S1: "${pairs[i].statement1.content?.text?.slice(0, 60)}..."`);
        console.log(`    S2: "${pairs[i].statement2.content?.text?.slice(0, 60)}..."`);
        console.log(`    Result: ${result.implies ? 'IMPLIES' : 'NO IMPLY'} (${result.confidence})`);
        if (result.reasoning) {
            console.log(`    Reasoning: ${result.reasoning.slice(0, 100)}...`);
        }
        if (result.error) {
            console.log(`    Error: ${result.error}`);
        }
    });
}
async function testAttesterEvaluations() {
    console.log('\n=== Test 3: Multiple Attester Types ===\n');
    const attesters = await loadAttesters();
    const statements = await loadStatements();
    // Group attesters by type
    const attestersByType = {};
    attesters.forEach(a => {
        if (!attestersByType[a.type])
            attestersByType[a.type] = [];
        attestersByType[a.type].push(a);
    });
    // Test one of each type
    const testAttesters = [];
    for (const [, list] of Object.entries(attestersByType)) {
        if (list.length > 0) {
            testAttesters.push(list[0]);
        }
    }
    console.log(`Testing ${testAttesters.length} different attester types...\n`);
    // Pick two statements
    const stmt1 = statements[0];
    const stmt2 = statements[1];
    console.log(`Statement 1: "${stmt1.content?.text?.slice(0, 70)}..."`);
    console.log(`Statement 2: "${stmt2.content?.text?.slice(0, 70)}..."\n`);
    for (const attester of testAttesters) {
        console.log(`${attester.type} (threshold: ${attester.threshold}, bias: ${attester.bias || 'none'}):`);
        try {
            const result = await evaluateImplicationWithAttester(attester, stmt1, stmt2, API_KEY);
            console.log(`  Result: ${result.implies ? 'ACCEPT' : 'REJECT'} (confidence: ${result.confidence.toFixed(2)}, LLM: ${result.llmConfidence})`);
            console.log(`  Reasoning: ${result.reasoning.slice(0, 80)}...`);
        }
        catch (error) {
            const err = error;
            console.log(`  Error: ${err.message}`);
        }
        // Small delay between attesters
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
async function printCostEstimate() {
    const estimate = estimateEvaluationCost(100);
    console.log('\n=== Cost Estimate ===\n');
    console.log(`For ${estimate.numEvaluations} evaluations:`);
    console.log(`  Estimated cost: $${estimate.totalCostUsd.toFixed(2)} USD`);
    console.log(`  Per evaluation: $${estimate.costPerEvaluation.toFixed(4)} USD`);
    console.log(`  Model: ${estimate.breakdown.model}`);
    console.log(`  Estimated tokens per call: ${estimate.breakdown.estimatedTokensPerCall}`);
    console.log('\nNote: Actual costs may vary based on prompt length and model choice.');
}
async function main() {
    console.log('OpenRouter LLM Implication Evaluation Test\n');
    console.log('='.repeat(50));
    // Validate setup
    console.log('\nValidating OpenRouter setup...');
    const validation = await validateOpenRouterSetup(API_KEY || undefined);
    if (!validation.valid) {
        console.error('\nError:', validation.error);
        console.error('\nPlease set the OPENROUTER_API_KEY environment variable:');
        console.error('  export OPENROUTER_API_KEY=sk-or-your-key-here');
        console.error('\nGet an API key at: https://openrouter.ai/keys');
        process.exit(1);
    }
    console.log('✓', validation.message);
    console.log('✓ Model:', MODEL);
    // Check if we have test data
    try {
        const attesters = await loadAttesters();
        const statements = await loadStatements();
        console.log(`✓ Loaded ${attesters.length} attesters and ${statements.length} statements`);
    }
    catch (error) {
        const err = error;
        console.error('\nError loading test data:', err.message);
        console.error('Run these commands first to generate test data:');
        console.error('  npx tsx generateAttesters.ts 10');
        console.error('  npx tsx generateStatements.ts');
        process.exit(1);
    }
    // Run tests
    const numTests = parseInt(process.argv[2]) || 3;
    try {
        await testSingleEvaluation();
        await testBatchEvaluation(numTests);
        await testAttesterEvaluations();
        await printCostEstimate();
        console.log('\n' + '='.repeat(50));
        console.log('\nAll tests completed successfully! ✓');
    }
    catch (error) {
        console.error('\nTest failed:', error);
        process.exit(1);
    }
}
main();
