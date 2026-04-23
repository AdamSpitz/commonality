import { evaluateImplicationWithLLM, IMPLICATION_EVALUATOR_SYSTEM_PROMPT } from '@commonality/implication-attester/api';
import type { OpenRouterUsage } from '@commonality/attester-core';
import {
  DEFAULT_IMPLICATION_SCOPE,
  DEFAULT_MODEL,
  buildSeedImplicationPairs,
  getDefaultEvaluationsPath,
  getDefaultMetadataPath,
  getPromptFingerprint,
  loadSeedImplicationStatements,
  loadStoredSeedImplicationEvaluations,
  type ImplicationEvaluationScope,
  type SeedImplicationEvaluationMetadata,
  type StoredSeedImplicationEvaluation,
  writeSeedImplicationEvaluations,
} from './seedImplicationEvaluations.js';

interface CliOptions {
  scope: ImplicationEvaluationScope;
  outputPath: string;
  metadataPath: string;
  model: string;
  delayMs: number;
  maxPairs: number | null;
  resume: boolean;
  concurrency: number;
}

function parseArgs(args: string[]): CliOptions {
  const scope = readEnumArg(args, '--scope', ['all', 'collection', 'group', 'family', 'original-variants']) ?? DEFAULT_IMPLICATION_SCOPE;
  const outputPath = readStringArg(args, '--output') ?? getDefaultEvaluationsPath(scope);
  const metadataPath = readStringArg(args, '--metadata') ?? getDefaultMetadataPath(scope);
  const model = readStringArg(args, '--model') ?? DEFAULT_MODEL;
  const delayMs = readNumberArg(args, '--delay-ms') ?? 0;
  const maxPairs = readNumberArg(args, '--max-pairs') ?? null;
  const resume = !args.includes('--no-resume');
  const concurrency = readNumberArg(args, '--concurrency') ?? 4;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`Invalid value for --concurrency: ${concurrency}`);
  }
  return { scope, outputPath, metadataPath, model, delayMs, maxPairs, resume, concurrency };
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable not set');
  }

  const options = parseArgs(process.argv.slice(2));
  const statements = await loadSeedImplicationStatements();
  const allPairs = buildSeedImplicationPairs(statements, options.scope);
  const selectedPairs = options.maxPairs === null ? allPairs : allPairs.slice(0, options.maxPairs);
  const promptFingerprint = getPromptFingerprint(IMPLICATION_EVALUATOR_SYSTEM_PROMPT);
  console.log(
    `Preparing ${selectedPairs.length} pair(s) with scope=${options.scope}, model=${options.model}, resume=${options.resume}, concurrency=${options.concurrency}`
  );

  let existing = new Map<string, StoredSeedImplicationEvaluation>();
  if (options.resume) {
    try {
      existing = new Map((await loadStoredSeedImplicationEvaluations(options.outputPath)).map((item) => [item.pairId, item]));
    } catch {
      existing = new Map();
    }
  }
  console.log(`Loaded ${existing.size} cached evaluation(s) from ${options.outputPath}`);
  const cachedSelectedPairs = selectedPairs.filter((pair) => existing.has(pair.pairId)).length;
  console.log(
    `Resume status: ${cachedSelectedPairs}/${selectedPairs.length} selected pair(s) already saved, ` +
    `${selectedPairs.length - cachedSelectedPairs} remaining to evaluate`
  );

  const evaluationsByPairId = new Map<string, StoredSeedImplicationEvaluation>();
  for (const pair of selectedPairs) {
    const cached = existing.get(pair.pairId);
    if (cached) {
      evaluationsByPairId.set(pair.pairId, cached);
    }
  }
  let completed = cachedSelectedPairs;
  const usageTotals = {
    requestsWithUsage: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedTokens: 0,
    cacheWriteTokens: 0,
  };
  let lastUsage: OpenRouterUsage | null = null;
  const remainingPairs = selectedPairs.filter((pair) => !existing.has(pair.pairId));
  if (remainingPairs.length > 0) {
    console.log(`Starting live evaluation at pair ${cachedSelectedPairs + 1}/${selectedPairs.length}: ${remainingPairs[0]!.pairId}`);
  }

  let nextPairIndex = 0;
  let lastPersistedCount = completed;
  const persistProgress = async (): Promise<void> => {
    if (!shouldLogProgress(completed, selectedPairs.length) || completed === lastPersistedCount) {
      return;
    }
    lastPersistedCount = completed;
    console.log(
      `Evaluated ${completed}/${selectedPairs.length} pairs (${formatUsageSummary(usageTotals, lastUsage)})`
    );
    await writeSeedImplicationEvaluations(
      options.outputPath,
      options.metadataPath,
      buildOrderedEvaluations(selectedPairs, evaluationsByPairId),
      buildMetadata(statements.length, completed, options.scope, options.model, promptFingerprint)
    );
  };

  const workerCount = Math.min(options.concurrency, Math.max(remainingPairs.length, 1));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const currentIndex = nextPairIndex;
        if (currentIndex >= remainingPairs.length) {
          return;
        }
        nextPairIndex += 1;
        const pair = remainingPairs[currentIndex]!;

        const result = await evaluateImplicationWithLLM(
          pair.from.text,
          pair.to.text,
          apiKey,
          options.model
        );
        accumulateUsage(usageTotals, result.usage);
        lastUsage = result.usage;

        evaluationsByPairId.set(pair.pairId, {
          pairId: pair.pairId,
          bucketKey: pair.bucketKey,
          from: pair.from,
          to: pair.to,
          implies: result.implies,
          confidence: result.confidence,
          reasoning: result.reasoning,
          model: options.model,
          promptFingerprint,
          evaluatedAt: new Date().toISOString(),
        });

        completed += 1;
        await persistProgress();

        if (options.delayMs > 0) {
          await sleep(options.delayMs);
        }
      }
    })
  );

  const evaluations = buildOrderedEvaluations(selectedPairs, evaluationsByPairId);
  const metadata = buildMetadata(
    statements.length,
    evaluations.length,
    options.scope,
    options.model,
    promptFingerprint
  );
  await writeSeedImplicationEvaluations(options.outputPath, options.metadataPath, evaluations, metadata);

  console.log(`Saved ${evaluations.length} evaluations to ${options.outputPath}`);
}

function buildOrderedEvaluations(
  selectedPairs: ReturnType<typeof buildSeedImplicationPairs>,
  evaluationsByPairId: Map<string, StoredSeedImplicationEvaluation>
): StoredSeedImplicationEvaluation[] {
  return selectedPairs.flatMap((pair) => {
    const evaluation = evaluationsByPairId.get(pair.pairId);
    return evaluation ? [evaluation] : [];
  });
}

function buildMetadata(
  statementCount: number,
  pairCount: number,
  scope: ImplicationEvaluationScope,
  model: string,
  promptFingerprint: string
): SeedImplicationEvaluationMetadata {
  return {
    generatedAt: new Date().toISOString(),
    scope,
    statementCount,
    pairCount,
    model,
    promptFingerprint,
  };
}

function shouldLogProgress(completed: number, total: number): boolean {
  if (completed === total) {
    return true;
  }
  if (completed <= 10) {
    return true;
  }
  return completed % 25 === 0;
}

function accumulateUsage(
  totals: {
    requestsWithUsage: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens: number;
    cacheWriteTokens: number;
  },
  usage: OpenRouterUsage | null
): void {
  if (!usage) {
    return;
  }

  totals.requestsWithUsage += 1;
  totals.promptTokens += usage.prompt_tokens ?? 0;
  totals.completionTokens += usage.completion_tokens ?? 0;
  totals.totalTokens += usage.total_tokens ?? 0;
  totals.cachedTokens += usage.prompt_tokens_details?.cached_tokens ?? 0;
  totals.cacheWriteTokens += usage.prompt_tokens_details?.cache_write_tokens ?? 0;
}

function formatUsageSummary(
  totals: {
    requestsWithUsage: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens: number;
    cacheWriteTokens: number;
  },
  lastUsage: OpenRouterUsage | null
): string {
  if (totals.requestsWithUsage === 0) {
    return 'usage unavailable';
  }

  const cacheHitRate = totals.promptTokens > 0
    ? ((totals.cachedTokens / totals.promptTokens) * 100).toFixed(1)
    : '0.0';
  const lastCachedTokens = lastUsage?.prompt_tokens_details?.cached_tokens ?? 0;
  const lastCacheWriteTokens = lastUsage?.prompt_tokens_details?.cache_write_tokens ?? 0;

  return [
    `usage samples=${totals.requestsWithUsage}`,
    `prompt=${totals.promptTokens}`,
    `completion=${totals.completionTokens}`,
    `cached=${totals.cachedTokens}`,
    `cacheWrites=${totals.cacheWriteTokens}`,
    `cacheHit=${cacheHitRate}%`,
    `lastCached=${lastCachedTokens}`,
    `lastCacheWrite=${lastCacheWriteTokens}`,
  ].join(', ');
}

function readStringArg(args: string[], flag: string): string | null {
  const index = args.findIndex((arg) => arg === flag);
  if (index >= 0) {
    return args[index + 1] ?? null;
  }
  const inline = args.find((arg) => arg.startsWith(`${flag}=`));
  return inline ? inline.slice(flag.length + 1) : null;
}

function readNumberArg(args: string[], flag: string): number | null {
  const raw = readStringArg(args, flag);
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${flag}: ${raw}`);
  }
  return parsed;
}

function readEnumArg<T extends string>(args: string[], flag: string, values: readonly T[]): T | null {
  const raw = readStringArg(args, flag);
  if (raw === null) {
    return null;
  }
  if (!values.includes(raw as T)) {
    throw new Error(`Invalid value for ${flag}: ${raw}`);
  }
  return raw as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
