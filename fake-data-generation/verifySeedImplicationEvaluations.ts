import { evaluateImplicationWithLLM, IMPLICATION_EVALUATOR_SYSTEM_PROMPT } from '@commonality/implication-attester/api';
import fs from 'fs/promises';
import { dirname } from 'path';
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
  reviewOutputPath: string | null;
  recheckDecisions: boolean;
  limit: number | null;
  model: string | null;
}

function parseArgs(args: string[]): CliOptions {
  const scope = readEnumArg(args, '--scope', ['all', 'collection', 'group', 'family', 'original-variants']) ?? DEFAULT_IMPLICATION_SCOPE;
  return {
    scope,
    inputPath: readStringArg(args, '--input') ?? getDefaultEvaluationsPath(scope),
    reviewOutputPath: readStringArg(args, '--review-output'),
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
  const hasPromptFingerprintMismatch = savedPromptFingerprints.some(
    (fingerprint) => fingerprint !== currentPromptFingerprint
  );
  if (hasPromptFingerprintMismatch && !options.recheckDecisions) {
    console.error(
      'Saved prompt fingerprint differs from the current implication-attester prompt. ' +
      'Run with --recheck-decisions to compare current-prompt decisions before refreshing the corpus.'
    );
  }

  if (report.missingPairIds.length > 0) {
    console.error(`Missing saved evaluations for ${report.missingPairIds.length} current pairs`);
    console.error(report.missingPairIds.slice(0, 20).join('\n'));
  }
  if (report.extraPairIds.length > 0) {
    console.error(`Saved file contains ${report.extraPairIds.length} obsolete pairs`);
    console.error(report.extraPairIds.slice(0, 20).join('\n'));
  }
  if (report.changedPairs.length > 0) {
    console.error(`Saved file contains ${report.changedPairs.length} pair(s) whose statement content or metadata changed`);
    for (const changed of report.changedPairs.slice(0, 20)) {
      console.error(`${changed.pairId}\n  changed=${changed.changes.join(', ')}`);
    }
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

  if (options.reviewOutputPath) {
    await writeReviewPacket(options.reviewOutputPath, expectedPairs, saved, report);
    console.log(`Wrote focused review packet to ${options.reviewOutputPath}`);
  }

  if (
    report.missingPairIds.length > 0 ||
    report.extraPairIds.length > 0 ||
    report.changedPairs.length > 0 ||
    report.mismatches.length > 0 ||
    (hasPromptFingerprintMismatch && !options.recheckDecisions)
  ) {
    process.exitCode = 1;
    return;
  }

  console.log('Seed implication evaluations are up to date.');
}

async function writeReviewPacket(
  outputPath: string,
  expectedPairs: ReturnType<typeof buildSeedImplicationPairs>,
  saved: StoredSeedImplicationEvaluation[],
  report: ReturnType<typeof compareEvaluations>
): Promise<void> {
  const expectedByPairId = new Map(expectedPairs.map((pair) => [pair.pairId, pair]));
  const savedByPairId = new Map(saved.map((evaluation) => [evaluation.pairId, evaluation]));
  const missingPairs = report.missingPairIds.flatMap((pairId) => {
    const pair = expectedByPairId.get(pairId);
    return pair ? [pair] : [];
  });
  const changedPairs = report.changedPairs.map(({ pairId, changes, expected, saved: savedEvaluation }) => ({
    pairId,
    changes,
    current: expected,
    saved: {
      bucketKey: savedEvaluation.bucketKey,
      from: savedEvaluation.from,
      to: savedEvaluation.to,
      implies: savedEvaluation.implies,
      confidence: savedEvaluation.confidence,
      reasoning: savedEvaluation.reasoning,
      model: savedEvaluation.model,
      promptFingerprint: savedEvaluation.promptFingerprint,
      evaluatedAt: savedEvaluation.evaluatedAt,
    },
  }));
  const promptMismatches = saved.filter(
    (evaluation) => evaluation.promptFingerprint !== getPromptFingerprint(IMPLICATION_EVALUATOR_SYSTEM_PROMPT)
  );

  const packet = {
    generatedAt: new Date().toISOString(),
    summary: {
      missingPairCount: missingPairs.length,
      changedPairCount: changedPairs.length,
      extraPairCount: report.extraPairIds.length,
      promptMismatchCount: promptMismatches.length,
    },
    instructions: [
      'Human/LLM review should focus on missingPairs and changedPairs.',
      'extraPairIds are obsolete saved decisions and usually should be regenerated or removed, not reviewed in place.',
      'promptMismatches mean the corpus was produced with an older prompt; use --recheck-decisions to compare current-prompt decisions.',
    ],
    missingPairs,
    changedPairs,
    extraPairIds: report.extraPairIds,
    promptMismatches: promptMismatches.map((evaluation) => ({
      pairId: evaluation.pairId,
      savedPromptFingerprint: evaluation.promptFingerprint,
    })),
    obsoleteSavedPairs: report.extraPairIds.flatMap((pairId) => {
      const evaluation = savedByPairId.get(pairId);
      return evaluation ? [evaluation] : [];
    }),
  };

  await fs.mkdir(dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(packet, null, 2) + '\n');
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
