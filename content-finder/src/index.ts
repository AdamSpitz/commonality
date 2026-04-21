import { runPollingFinder } from '@commonality/finder-core';
import { loadConfig } from './config.js';
import { evaluateContentBatch, type ContentAttesterRequest } from './attesterClient.js';
import { resolveContentCandidate } from './platformApiClient.js';
import { loadState, saveState } from './state.js';
import {
  loadSubmissions,
  loadSubmissionsFromApi,
  submissionKey,
} from './submissions.js';

const config = loadConfig();

async function runOnce(): Promise<void> {
  const [state, submissions] = await Promise.all([
    loadState(config.stateFilePath),
    config.submissionsApiUrl
      ? loadSubmissionsFromApi(config.submissionsApiUrl)
      : loadSubmissions(config.submissionsFilePath),
  ]);

  const processedKeys = new Set(state.processedSubmissionKeys);
  const pending = submissions.filter((submission) => !processedKeys.has(submissionKey(submission)));

  if (pending.length === 0) {
    console.log('No pending content submissions.');
    return;
  }

  console.log(`Processing ${pending.length} content submission(s).`);

  const evaluations: Array<{ request: ContentAttesterRequest; submissionKey: string }> = [];

  for (const submission of pending) {
    try {
      const resolved = await resolveContentCandidate(config.platformApiUrl, submission.contentUrl);
      const request: ContentAttesterRequest = {
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
        submissionKey: submissionKey(submission),
      });
    } catch (error) {
      console.error(`  SKIP ${submission.contentUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (evaluations.length === 0) {
    console.log('No resolvable content submissions this cycle.');
    return;
  }

  const results = await evaluateContentBatch(
    evaluations.map((evaluation) => evaluation.request),
    config.attesterUrl,
    config.attesterFinderKey,
  );

  let succeeded = 0;
  let failed = 0;

  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    const evaluation = evaluations[index];
    if (!result || !evaluation) {
      continue;
    }

    if (!result.success) {
      failed++;
      console.error(`  FAIL ${result.contentCanonicalId}: ${result.error}`);
      continue;
    }

    succeeded++;
    processedKeys.add(evaluation.submissionKey);

    if (result.transactionHash) {
      console.log(`  ATTESTED ${result.contentCanonicalId} (${result.confidence}) tx=${result.transactionHash}`);
    } else {
      console.log(`  EVALUATED ${result.contentCanonicalId} (${result.confidence}) no attestation published`);
    }
  }

  await saveState(config.stateFilePath, {
    processedSubmissionKeys: [...processedKeys],
  });

  console.log(`Results: ${succeeded} processed, ${failed} failed.`);
}

async function main() {
  console.log(`  Platform API: ${config.platformApiUrl}`);
  console.log(`  Attester: ${config.attesterUrl}`);
  console.log(
    config.submissionsApiUrl
      ? `  Submission API: ${config.submissionsApiUrl}`
      : `  Submission file: ${config.submissionsFilePath}`,
  );

  await runPollingFinder({
    serviceName: 'Content Finder',
    pollIntervalMs: config.pollIntervalMs,
    runOnce,
  });
}

main();
