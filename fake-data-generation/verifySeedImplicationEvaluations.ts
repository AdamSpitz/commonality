import { evaluateImplicationWithLLM, IMPLICATION_EVALUATOR_SYSTEM_PROMPT } from '@commonality/implication-attester/api';
import {
  DEFAULT_IMPLICATION_SCOPE,
  buildSeedImplicationPairs,
  compareEvaluations,
  getDefaultEvaluationsPath,
  getPromptFingerprint,
  loadSeedImplicationStatements,
  loadStoredSeedImplicationEvaluations,
  type ImplicationEvaluationScope,
  type StoredSeedImplicationEvaluation,
} from './seedImplicationEvaluations.js';

interface CliOptions {
  scope: ImplicationEvaluationScope;
  inputPath: string;
  recheckDecisions: boolean;
  limit: number | null;
  model: string | null;
}

function parseArgs(args: string[]): CliOptions {
  const scope = readEnumArg(args, '--scope', ['all', 'collection', 'group', 'family', 'original-variants']) ?? DEFAULT_IMPLICATION_SCOPE;
  return {
    scope,
    inputPath: readStringArg(args, '--input') ?? getDefaultEvaluationsPath(scope),
    recheckDecisions: args.includes('--recheck-decisions'),
    limit: readNumberArg(args, '--limit'),
    model: readStringArg(args, '--model'),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const statements = await loadSeedImplicationStatements();
  const expectedPairs = buildSeedImplicationPairs(statements, options.scope);
  const saved = await loadStoredSeedImplicationEvaluations(options.inputPath);
  const currentPromptFingerprint = getPromptFingerprint(IMPLICATION_EVALUATOR_SYSTEM_PROMPT);
  const savedPromptFingerprints = [...new Set(saved.map((evaluation) => evaluation.promptFingerprint))].sort();

  const actualByPairId = new Map<string, Pick<StoredSeedImplicationEvaluation, 'implies' | 'confidence'>>();
  if (options.recheckDecisions) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable not set');
    }
    const toCheck = options.limit === null ? saved : saved.slice(0, options.limit);
    const model = options.model ?? toCheck[0]?.model ?? 'anthropic/claude-3.5-haiku';
    for (const evaluation of toCheck) {
      const result = await evaluateImplicationWithLLM(
        evaluation.from.text,
        evaluation.to.text,
        apiKey,
        model
      );
      actualByPairId.set(evaluation.pairId, {
        implies: result.implies,
        confidence: result.confidence,
      });
    }
  }

  const report = compareEvaluations(expectedPairs, saved, actualByPairId);
  console.log(`Expected pairs: ${report.expectedPairCount}`);
  console.log(`Saved pairs: ${report.savedPairCount}`);
  console.log(`Prompt fingerprint now: ${currentPromptFingerprint}`);
  if (savedPromptFingerprints.length > 0) {
    console.log(`Prompt fingerprints in saved file: ${savedPromptFingerprints.join(', ')}`);
  }

  if (report.missingPairIds.length > 0) {
    console.error(`Missing saved evaluations for ${report.missingPairIds.length} current pairs`);
    console.error(report.missingPairIds.slice(0, 20).join('\n'));
  }
  if (report.extraPairIds.length > 0) {
    console.error(`Saved file contains ${report.extraPairIds.length} obsolete pairs`);
    console.error(report.extraPairIds.slice(0, 20).join('\n'));
  }
  if (report.mismatches.length > 0) {
    console.error(`Decision mismatches: ${report.mismatches.length}`);
    for (const mismatch of report.mismatches.slice(0, 20)) {
      console.error(
        `${mismatch.pairId}\n` +
        `  saved=${mismatch.expected.implies}/${mismatch.expected.confidence}\n` +
        `  live=${mismatch.actual.implies}/${mismatch.actual.confidence}`
      );
    }
  }

  if (report.missingPairIds.length > 0 || report.extraPairIds.length > 0 || report.mismatches.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('Seed implication evaluations are up to date.');
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
