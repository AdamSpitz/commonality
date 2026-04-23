import { evaluateImplicationWithLLM, IMPLICATION_EVALUATOR_SYSTEM_PROMPT } from '@commonality/implication-attester/api';
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
}

function parseArgs(args: string[]): CliOptions {
  const scope = readEnumArg(args, '--scope', ['all', 'collection', 'group', 'family']) ?? DEFAULT_IMPLICATION_SCOPE;
  const outputPath = readStringArg(args, '--output') ?? getDefaultEvaluationsPath(scope);
  const metadataPath = readStringArg(args, '--metadata') ?? getDefaultMetadataPath(scope);
  const model = readStringArg(args, '--model') ?? DEFAULT_MODEL;
  const delayMs = readNumberArg(args, '--delay-ms') ?? 0;
  const maxPairs = readNumberArg(args, '--max-pairs') ?? null;
  const resume = !args.includes('--no-resume');
  return { scope, outputPath, metadataPath, model, delayMs, maxPairs, resume };
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

  let existing = new Map<string, StoredSeedImplicationEvaluation>();
  if (options.resume) {
    try {
      existing = new Map((await loadStoredSeedImplicationEvaluations(options.outputPath)).map((item) => [item.pairId, item]));
    } catch {
      existing = new Map();
    }
  }

  const evaluations: StoredSeedImplicationEvaluation[] = [];
  let completed = 0;
  for (const pair of selectedPairs) {
    const cached = existing.get(pair.pairId);
    if (cached) {
      evaluations.push(cached);
      completed += 1;
      continue;
    }

    const result = await evaluateImplicationWithLLM(
      pair.from.text,
      pair.to.text,
      apiKey,
      options.model
    );

    evaluations.push({
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
    if (completed % 25 === 0 || completed === selectedPairs.length) {
      console.log(`Evaluated ${completed}/${selectedPairs.length} pairs`);
      const metadata: SeedImplicationEvaluationMetadata = {
        generatedAt: new Date().toISOString(),
        scope: options.scope,
        statementCount: statements.length,
        pairCount: evaluations.length,
        model: options.model,
        promptFingerprint,
      };
      await writeSeedImplicationEvaluations(
        options.outputPath,
        options.metadataPath,
        evaluations,
        metadata
      );
    }

    if (options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  const metadata: SeedImplicationEvaluationMetadata = {
    generatedAt: new Date().toISOString(),
    scope: options.scope,
    statementCount: statements.length,
    pairCount: evaluations.length,
    model: options.model,
    promptFingerprint,
  };
  await writeSeedImplicationEvaluations(options.outputPath, options.metadataPath, evaluations, metadata);

  console.log(`Saved ${evaluations.length} evaluations to ${options.outputPath}`);
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
