import { pathToFileURL } from 'node:url';
import { enqueueReview, releaseSpend, reserveSpend, runPollingFinder, settleSpend, takeReviewBatch, type PollingFinderRunHandle, type ReviewQueueItem } from '@commonality/finder-core';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import { finderDedupeKey, isFinderReviewCandidate, loadFinderLaneItems, type FinderLaneItem } from './finderLane.js';
import { loadConfig, loadConfigFromEnv, type ContentFinderConfig } from './config.js';
export { loadConfigFromEnv };
export type { ContentFinderConfig };
import { evaluateContentBatch, type ContentAttesterRequest } from './attesterClient.js';
import { resolveContentCandidate } from './platformApiClient.js';
import { loadState, saveState, withStateLock } from './state.js';
import {
  loadSubmissions,
  loadSubmissionsFromApi,
  submissionKey,
  type ContentSubmission,
} from './submissions.js';

export async function runOnce(config: ContentFinderConfig): Promise<void> {
  return withStateLock(config.stateFilePath, () => runOnceUnlocked(config));
}

async function runOnceUnlocked(config: ContentFinderConfig): Promise<void> {
  const [state, submissions] = await Promise.all([
    loadState(config.stateFilePath),
    config.submissionsApiUrl
      ? loadSubmissionsFromApi(config.submissionsApiUrl)
      : loadSubmissions(config.submissionsFilePath),
  ]);

  const processedKeys = new Set(state.processedSubmissionKeys);
  const period = new Date().toISOString().slice(0, 7);
  if (state.spendPeriod !== period) {
    state.spendPeriod = period;
    state.reservedUsd = 0;
    state.settledUsd = 0;
  }
  const queue: ReviewQueueItem[] = (state.queuedItems ?? (state.queuedKeys ?? []).map((dedupeKey) => ({
    lane: 'suggestion' as const,
    dedupeKey,
    enqueuedAt: '',
  }))).flatMap((item) => processedKeys.has(item.dedupeKey) ? [] : [{
    lane: item.lane === 'finder' ? 'finder' as const : 'suggestion' as const,
    dedupeKey: item.dedupeKey,
    enqueuedAt: item.enqueuedAt,
  }]);
  for (const submission of submissions) {
    const key = submissionKey(submission);
    if (processedKeys.has(key)) continue;
    const result = enqueueReview(queue, { lane: 'suggestion', dedupeKey: key, enqueuedAt: new Date().toISOString() }, {
      finderCapacity: config.finderQueueCapacity,
      suggestionCapacity: config.suggestionQueueCapacity,
    });
    if (result.reason === 'duplicate') state.droppedDuplicateCount = (state.droppedDuplicateCount ?? 0) + 1;
    if (result.reason === 'lane_full') state.droppedQueueFullCount = (state.droppedQueueFullCount ?? 0) + 1;
  }
  const finderByKey = new Map<string, FinderLaneItem>();
  if (config.ingestionStateFilePath && config.finderStatementCid) {
    const discovered = await loadFinderLaneItems(config.ingestionStateFilePath);
    for (const item of discovered) {
      finderByKey.set(finderDedupeKey(item.contentCanonicalId, config.finderStatementCid), item);
      if (!isFinderReviewCandidate(item)) continue;
      const key = finderDedupeKey(item.contentCanonicalId, config.finderStatementCid);
      if (processedKeys.has(key)) continue;
      const result = enqueueReview(queue, { lane: 'finder', dedupeKey: key, enqueuedAt: new Date().toISOString() }, {
        finderCapacity: config.finderQueueCapacity,
        suggestionCapacity: config.suggestionQueueCapacity,
      });
      if (result.reason === 'duplicate') state.droppedDuplicateCount = (state.droppedDuplicateCount ?? 0) + 1;
      if (result.reason === 'lane_full') state.droppedQueueFullCount = (state.droppedQueueFullCount ?? 0) + 1;
    }
  }
  const submissionsByKey = new Map(submissions.map((submission) => [submissionKey(submission), submission]));
  const suggestionItems = queue.filter((item) => item.lane === 'suggestion' && submissionsByKey.has(item.dedupeKey));
  const finderItems = queue.filter((item) => {
    if (item.lane !== 'finder') return false;
    const candidate = finderByKey.get(item.dedupeKey);
    return candidate !== undefined && isFinderReviewCandidate(candidate);
  });
  const retained = [...finderItems, ...suggestionItems];
  const selected = config.ingestionStateFilePath
    ? takeReviewBatch(retained, config.reviewBatchSize, config.finderLaneShare)
    : retained;
  state.queuedItems = retained;
  state.queuedKeys = retained.map((item) => item.dedupeKey);
  const pending: Array<ContentSubmission | { finderKey: string }> = [];
  for (const item of selected) {
    if (item.lane === 'suggestion') {
      const submission = submissionsByKey.get(item.dedupeKey);
      if (submission) pending.push(submission);
    } else {
      pending.push({ finderKey: item.dedupeKey });
    }
  }

  if (pending.length === 0) {
    await saveState(config.stateFilePath, state);
    console.log('No pending content submissions.');
    return;
  }

  console.log(`Processing ${pending.length} content submission(s).`);

  const evaluations: Array<{ request: ContentAttesterRequest; submissionKeys: string[] }> = [];

  for (const submission of pending) {
    if ('finderKey' in submission) {
      const item = finderByKey.get(submission.finderKey);
      if (!item || !config.finderStatementCid) continue;
      const request: ContentAttesterRequest = {
        contentCanonicalId: item.contentCanonicalId,
        statementCid: config.finderStatementCid as IpfsCidV1,
        contentText: item.text,
        contentUrl: item.contentUrl,
        contentVersion: item.contentVersion,
        authorId: item.authorId,
        isReply: item.isReply,
        mediaIsPrimary: item.mediaIsPrimary,
        editableUntil: item.editableUntil,
        quotedContent: item.quotedText ? [{ text: item.quotedText }] : undefined,
      };
      const existing = evaluations.find((evaluation) => evaluation.request.contentCanonicalId === item.contentCanonicalId && evaluation.request.statementCid === config.finderStatementCid);
      if (existing) {
        existing.submissionKeys.push(submission.finderKey);
        continue;
      }
      evaluations.push({ request, submissionKeys: [submission.finderKey] });
      continue;
    }
    try {
      const resolved = await resolveContentCandidate(config.platformApiUrl, submission.contentUrl);
      const existing = evaluations.find((evaluation) => evaluation.request.contentCanonicalId === resolved.canonicalId && evaluation.request.statementCid === submission.statementCid);
      if (existing) {
        existing.submissionKeys.push(submissionKey(submission));
        continue;
      }
      const request: ContentAttesterRequest = {
        contentVersion: resolved.contentVersion,
        authorId: resolved.authorId,
        isReply: resolved.isReply,
        mediaIsPrimary: resolved.mediaIsPrimary,
        editableUntil: resolved.editableUntil,
        quotedContent: resolved.quotedContent,
        contentCanonicalId: resolved.canonicalId,
        statementCid: submission.statementCid,
        declaredPerspective: submission.declaredPerspective,
      };

      if (resolved.contentText) {
        request.contentText = resolved.contentText;
      } else {
        request.contentUrl = resolved.contentUrl;
      }

      evaluations.push({
        request,
        submissionKeys: [submissionKey(submission)],
      });
    } catch (error) {
      console.error(`  SKIP ${submission.contentUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (evaluations.length === 0) {
    await saveState(config.stateFilePath, state);
    console.log('No resolvable content submissions this cycle.');
    return;
  }

  const budget = {
    ceilingUsd: config.monthlySpendCeilingUsd ?? Number.POSITIVE_INFINITY,
    reservedUsd: state.reservedUsd ?? 0,
    settledUsd: state.settledUsd ?? 0,
  };
  const affordable = [];
  for (const evaluation of evaluations) {
    if (!reserveSpend(budget, config.estimatedEvaluationUsd)) {
      state.droppedBudgetCount = (state.droppedBudgetCount ?? 0) + 1;
      console.error(`  BUDGET ${evaluation.request.contentCanonicalId}: monthly ceiling would be exceeded`);
      continue;
    }
    affordable.push(evaluation);
  }
  state.reservedUsd = budget.reservedUsd;
  state.settledUsd = budget.settledUsd;
  // Persist before making paid requests. A crash must not reset the spending limit.
  await saveState(config.stateFilePath, state);

  const results = await evaluateContentBatch(
    affordable.map((evaluation) => evaluation.request),
    config.attesterUrl,
    config.attesterFinderKey,
  );

  let succeeded = 0;
  let failed = 0;

  for (let index = 0; index < affordable.length; index++) {
    const result = results[index];
    const evaluation = affordable[index];
    if (!evaluation) {
      continue;
    }

    if (!result?.success) {
      failed++;
      // A failed HTTP response does not prove that the remote evaluation was free.
      settleSpend(budget, config.estimatedEvaluationUsd);
      console.error(`  FAIL ${evaluation.request.contentCanonicalId}: ${result?.error ?? 'Missing batch result'}`);
      continue;
    }

    succeeded++;
    if (result.deferred) {
      // The attester postponed work before a paid model call. Keep the item queued without consuming the ceiling.
      releaseSpend(budget, config.estimatedEvaluationUsd);
      console.log(`  DEFERRED ${result.contentCanonicalId}`);
      continue;
    }
    settleSpend(budget, config.estimatedEvaluationUsd);
    for (const key of evaluation.submissionKeys) processedKeys.add(key);
    state.queuedKeys = (state.queuedKeys ?? []).filter((key) => !evaluation.submissionKeys.includes(key));
    state.queuedItems = (state.queuedItems ?? []).filter((item) => !evaluation.submissionKeys.includes(item.dedupeKey));

    if (result.transactionHash) {
      console.log(`  ATTESTED ${result.contentCanonicalId} (${result.confidence}) tx=${result.transactionHash}`);
    } else {
      console.log(`  EVALUATED ${result.contentCanonicalId} (${result.confidence}) no attestation published`);
    }
  }

  state.reservedUsd = budget.reservedUsd;
  state.settledUsd = budget.settledUsd;
  await saveState(config.stateFilePath, {
    ...state,
    processedSubmissionKeys: [...processedKeys],
  });

  console.log(`Results: ${succeeded} processed, ${failed} failed.`);
}

export type ContentFinderRunHandle = PollingFinderRunHandle;

export function run(config = loadConfig()): ContentFinderRunHandle {
  console.log(`  Platform API: ${config.platformApiUrl}`);
  console.log(`  Attester: ${config.attesterUrl}`);
  console.log(
    config.submissionsApiUrl
      ? `  Submission API: ${config.submissionsApiUrl}`
      : `  Submission file: ${config.submissionsFilePath}`,
  );

  return runPollingFinder({
    serviceName: 'Content Finder',
    pollIntervalMs: config.pollIntervalMs,
    runOnce: () => runOnce(config),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
