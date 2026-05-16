import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { IpfsCidV1 } from '@commonality/sdk';
import {
  processBeatAgentEvaluation,
  runBeatIngestionOnce,
  extractObservationsFromItems,
  retrieveRelevantObservations,
  mineCoverageGaps,
  type BeatAgentEvaluationLogEntry,
  type BeatAgentEvaluationRequest,
  type BeatDefinition,
  type BeatSourceAdapter,
  type BeatSourceFetchResult,
} from '../src/index.js';

describe('beat-agent end-to-end integration (ingest→memory→retrieve→evaluate→publish)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'beat-agent-e2e-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('ingests posts, retrieves ambient context, evaluates with context, and publishes positive attestations', async () => {
    const ingestStatePath = join(tmpDir, 'ingestion.json');
    const memoryStatePath = join(tmpDir, 'memory.json');
    const logEntries: BeatAgentEvaluationLogEntry[] = [];
    const published: Array<{
      contentCanonicalId: string;
      statementCid: string;
      topicStatementCid: string;
    }> = [];

    // --- Phase 1: Ingestion ---
    const beatDefinition: BeatDefinition = {
      beatId: 'us-political-twitter',
      sources: [
        {
          id: 'twitter-account-a',
          type: 'account',
          locator: '@moderate_democrat',
          platform: 'twitter',
        },
        {
          id: 'twitter-account-b',
          type: 'account',
          locator: '@reasonable_gop',
          platform: 'twitter',
        },
      ],
    };

    const now = new Date('2026-05-15T12:00:00.000Z');
    const oneHourAgo = new Date('2026-05-15T11:00:00.000Z');

    // Stubbed platform adapter — returns recent posts from the two accounts.
    const mockTwitterAdapter: BeatSourceAdapter = {
      fetchSource: async (source): Promise<BeatSourceFetchResult> => {
        if (source.locator === '@moderate_democrat') {
          return {
            items: [
              {
                contentCanonicalId: 'twitter:tweet:1',
                sourceId: source.id,
                platform: 'twitter',
                contentUrl: 'https://twitter.com/moderate_democrat/status/1',
                authorHandle: '@moderate_democrat',
                text: 'We need common-sense immigration reform that respects both borders and human dignity.',
                observedAt: oneHourAgo.toISOString(),
                ingestedAt: oneHourAgo.toISOString(),
              },
              {
                contentCanonicalId: 'twitter:tweet:2',
                sourceId: source.id,
                platform: 'twitter',
                contentUrl: 'https://twitter.com/moderate_democrat/status/2',
                authorHandle: '@moderate_democrat',
                text: 'The phrase "secure borders" has lately been used in good faith by both sides — a rare point of possible agreement.',
                observedAt: oneHourAgo.toISOString(),
                ingestedAt: oneHourAgo.toISOString(),
              },
            ],
          };
        }
        return {
          items: [
            {
              contentCanonicalId: 'twitter:tweet:3',
              sourceId: source.id,
              platform: 'twitter',
              contentUrl: 'https://twitter.com/reasonable_gop/status/3',
              authorHandle: '@reasonable_gop',
              text: 'Immigration built this country. We need a system that works — both enforcement and a path to citizenship.',
              observedAt: oneHourAgo.toISOString(),
              ingestedAt: oneHourAgo.toISOString(),
            },
          ],
        };
      },
    };

    const ingestionSummary = await runBeatIngestionOnce({
      definition: beatDefinition,
      stateFilePath: ingestStatePath,
      adapters: { account: mockTwitterAdapter },
      now,
      env: {},
    });

    assert.equal(ingestionSummary.fetchedSourceIds.length, 2);
    assert.equal(ingestionSummary.newItemCount, 3);
    assert.equal(ingestionSummary.duplicateItemCount, 0);

    // Second run should deduplicate.
    const ingestionSummary2 = await runBeatIngestionOnce({
      definition: beatDefinition,
      stateFilePath: ingestStatePath,
      adapters: { account: mockTwitterAdapter },
      now,
      env: {},
    });
    assert.equal(ingestionSummary2.newItemCount, 0);
    assert.equal(ingestionSummary2.duplicateItemCount, 3);

    // --- Phase 2: Memory extraction ---
    const extractionSummary = await extractObservationsFromItems({
      beatId: 'us-political-twitter',
      items: [
        {
          contentCanonicalId: 'twitter:tweet:1',
          sourceId: 'twitter-account-a',
          platform: 'twitter',
          authorHandle: '@moderate_democrat',
          text: 'We need common-sense immigration reform that respects both borders and human dignity.',
          observedAt: oneHourAgo.toISOString(),
          ingestedAt: oneHourAgo.toISOString(),
        },
        {
          contentCanonicalId: 'twitter:tweet:2',
          sourceId: 'twitter-account-a',
          platform: 'twitter',
          authorHandle: '@moderate_democrat',
          text: 'The phrase "secure borders" has lately been used in good faith by both sides.',
          observedAt: oneHourAgo.toISOString(),
          ingestedAt: oneHourAgo.toISOString(),
        },
        {
          contentCanonicalId: 'twitter:tweet:3',
          sourceId: 'twitter-account-b',
          platform: 'twitter',
          authorHandle: '@reasonable_gop',
          text: 'Immigration built this country. We need a system that works.',
          observedAt: oneHourAgo.toISOString(),
          ingestedAt: oneHourAgo.toISOString(),
        },
      ],
      memoryFilePath: memoryStatePath,
      now,
    });

    assert.equal(extractionSummary.itemCount, 3);
    assert.equal(extractionSummary.observationCount, 3);

    // --- Phase 3: Retrieval ---
    const relevantObservations = await retrieveRelevantObservations({
      beatId: 'us-political-twitter',
      memoryFilePath: memoryStatePath,
      queryText: 'secure borders immigration reform common-sense',
      now,
      maxObservations: 5,
    });

    assert.ok(relevantObservations.length > 0, 'Should retrieve at least one relevant observation');
    // The observation about "secure borders" should rank highly.
    const secureBordersObs = relevantObservations.find(
      (observation) => observation.observation.includes('secure borders'),
    );
    assert.ok(secureBordersObs, 'Should retrieve the secure-borders observation');

    // --- Phase 4: Evaluation with context ---
    const evaluationRequest: BeatAgentEvaluationRequest = {
      contentCanonicalId: 'twitter:tweet:new',
      statementCid: 'bafybeistatementcid' as IpfsCidV1,
      contentText:
        'Both parties are starting to use "secure borders" as a genuine search for solutions rather than a political weapon. This is progress.',
    };

    const result = await processBeatAgentEvaluation(
      {
        beatId: 'us-political-twitter',
        attesterName: 'test-beat-agent',
        alignmentTopicStatementCid: 'bafy-topic-cid' as IpfsCidV1,
      },
      evaluationRequest,
      {
        resolveContent: async (source) => source.contentText ?? 'resolved',
        buildEvaluationContext: async (req, content) => {
          const observations = await retrieveRelevantObservations({
            beatId: 'us-political-twitter',
            memoryFilePath: memoryStatePath,
            queryText: content,
            contentCanonicalId: req.contentCanonicalId,
            now,
          });

          return {
            localContextUsed: [
              {
                type: 'parent_post',
                contentCanonicalId: 'twitter:tweet:parent',
                summary: 'The parent post asked for a constructive discussion about immigration.',
              },
            ],
            ambientContextUsed: observations.map((observation) => ({
              observation: observation.observation,
              observedAt: `${observation.observedAtStart}/${observation.observedAtEnd}`,
              confidence: observation.confidence,
              supportingExamples: observation.supportingContentIds.slice(0, 3),
            })),
          };
        },
        evaluateContent: async ({ content, context }) => {
          // Simulate LLM: if we have ambient context about "secure borders" being used constructively,
          // and the content acknowledges this, it should be a positive evaluation.
          const hasSecureBordersContext = context.ambientContextUsed.some(
            (ctx) => ctx.observation.includes('secure borders'),
          );

          if (hasSecureBordersContext && content.includes('secure borders') && content.includes('progress')) {
            return {
              decision: 'positive',
              confidence: 'high',
              reasoning:
                'Ambient context confirms "secure borders" is currently used constructively in this beat. The post extends this with forward-looking framing.',
            };
          }

          if (content.length < 20) {
            return {
              decision: 'abstain',
              confidence: 'low',
              reasoning: 'Content too short to evaluate.',
              abstainReason: 'insufficient_local_context',
            };
          }

          return {
            decision: 'positive',
            confidence: 'medium',
            reasoning: 'The content appears constructive.',
          };
        },
        uploadExplanation: async (content) => {
          const parsed = JSON.parse(content) as {
            decision: string;
            ambientContextUsed: unknown[];
          };
          assert.equal(parsed.decision, 'positive');
          assert.ok(parsed.ambientContextUsed.length > 0, 'Should cite ambient context');
          return { cid: 'bafy-integration-test-cid' };
        },
        publishAttestation: async (contentCanonicalId, statementCid, topicStatementCid) => {
          published.push({ contentCanonicalId, statementCid, topicStatementCid });
          return '0x-integration-tx';
        },
        appendEvaluationLog: async (entry) => {
          logEntries.push(entry);
        },
        now: () => now,
      },
    );

    assert.equal(result.decision, 'positive');
    assert.equal(result.confidence, 'high');
    assert.equal(result.explanationCid, 'bafy-integration-test-cid');
    assert.equal(result.transactionHash, '0x-integration-tx');
    assert.equal(logEntries.length, 1);
    assert.equal(logEntries[0]?.decision, 'positive');
    assert.equal(logEntries[0]?.ambientContextUsed.length, relevantObservations.length);
    assert.equal(published.length, 1);

    // --- Phase 5: Idempotency ---
    const logEntries2: BeatAgentEvaluationLogEntry[] = [];
    const result2 = await processBeatAgentEvaluation(
      {
        beatId: 'us-political-twitter',
        attesterName: 'test-beat-agent',
        alignmentTopicStatementCid: 'bafy-topic-cid' as IpfsCidV1,
      },
      evaluationRequest,
      {
        resolveContent: async () => {
          throw new Error('Should not call resolveContent for existing attestation');
        },
        buildEvaluationContext: async () => {
          throw new Error('Should not call buildEvaluationContext for existing attestation');
        },
        evaluateContent: async () => {
          throw new Error('Should not call evaluateContent for existing attestation');
        },
        uploadExplanation: async () => {
          throw new Error('Should not call uploadExplanation for existing attestation');
        },
        publishAttestation: async () => {
          throw new Error('Should not call publishAttestation for existing attestation');
        },
        appendEvaluationLog: async (entry) => {
          logEntries2.push(entry);
        },
        findExistingAttestation: async () => ({
          decision: 'positive',
          confidence: 'high',
          reasoning: result.reasoning,
          subjectId: '0xsubject',
          explanationCid: result.explanationCid,
          transactionHash: result.transactionHash,
        }),
        now: () => now,
      },
    );

    assert.equal(result2.alreadyAttested, true);
    assert.equal(result2.decision, 'positive');
    assert.equal(logEntries2.length, 0);

    // --- Phase 6: Coverage-gap mining ---
    // Simulate a log file with mixed decisions.
    const coverageLines = [
      JSON.stringify({ ...logEntries[0], decision: 'positive' as const }),
      JSON.stringify({
        ...logEntries[0],
        contentCanonicalId: 'twitter:tweet:outside',
        decision: 'abstain' as const,
        abstainReason: 'outside_beat' as const,
        transactionHash: null,
        explanationCid: null,
      }),
      JSON.stringify({
        ...logEntries[0],
        contentCanonicalId: 'bluesky:post:gap',
        decision: 'abstain' as const,
        abstainReason: 'outside_beat' as const,
        transactionHash: null,
        explanationCid: null,
      }),
      JSON.stringify({
        ...logEntries[0],
        contentCanonicalId: 'bluesky:post:gap',
        decision: 'abstain' as const,
        abstainReason: 'insufficient_ambient_context' as const,
        transactionHash: null,
        explanationCid: null,
      }),
    ];

    const coverage = mineCoverageGaps({ logLines: coverageLines });
    assert.equal(coverage.totalEntries, 4);
    assert.equal(coverage.totalPositive, 1);
    assert.equal(coverage.totalAbstentions, 3);
    assert.equal(coverage.overallAbstentionRate, 0.75);
    assert.equal(coverage.byReason.outside_beat.count, 2);
    assert.equal(coverage.byReason.insufficient_ambient_context.count, 1);

    // bluesky should be the platform with highest abstentions.
    assert.ok(coverage.byPlatform.length >= 1);
    assert.equal(coverage.byPlatform[0]!.platform, 'bluesky');
    assert.equal(coverage.byPlatform[0]!.totalAbstentions, 2);

    // bluesky:post:gap should appear as a repeated abstention.
    assert.equal(coverage.repeatedAbstainContentIds.length, 1);
    assert.equal(coverage.repeatedAbstainContentIds[0]!.contentCanonicalId, 'bluesky:post:gap');
    assert.equal(coverage.repeatedAbstainContentIds[0]!.count, 2);
  });

  it('abstains when ambient context is insufficient to resolve meaning', async () => {
    const memoryStatePath = join(tmpDir, 'memory.json');
    const logEntries: BeatAgentEvaluationLogEntry[] = [];
    const now = new Date('2026-05-15T12:00:00.000Z');
    const oneHourAgo = new Date('2026-05-15T11:00:00.000Z');

    // Seed memory with a single observation that is not relevant to the evaluation.
    await extractObservationsFromItems({
      beatId: 'us-political-twitter',
      items: [
        {
          contentCanonicalId: 'twitter:tweet:unrelated',
          sourceId: 'src',
          authorHandle: '@account',
          text: 'Pizza is delicious and everyone should enjoy it.',
          observedAt: oneHourAgo.toISOString(),
          ingestedAt: oneHourAgo.toISOString(),
        },
      ],
      memoryFilePath: memoryStatePath,
      now,
    });

    const evaluationRequest: BeatAgentEvaluationRequest = {
      contentCanonicalId: 'twitter:tweet:ambiguous',
      statementCid: 'bafybeistatementcid' as IpfsCidV1,
      contentText: '"Yeah, right. Sure thing." — this could mean anything without context.',
    };

    const result = await processBeatAgentEvaluation(
      {
        beatId: 'us-political-twitter',
        attesterName: 'test-beat-agent',
        alignmentTopicStatementCid: 'bafy-topic-cid' as IpfsCidV1,
      },
      evaluationRequest,
      {
        resolveContent: async (source) => source.contentText ?? 'resolved',
        buildEvaluationContext: async () => ({
          localContextUsed: [],
          ambientContextUsed: [
            {
              observation: 'No relevant ambient discourse context found for this content.',
              observedAt: `${oneHourAgo.toISOString()}/${now.toISOString()}`,
              confidence: 'low',
              supportingExamples: [],
            },
          ],
        }),
        evaluateContent: async () => ({
          decision: 'abstain',
          confidence: 'low',
          reasoning: 'The content is ambiguous and the agent lacks enough ambient context to resolve the intended meaning.',
          abstainReason: 'insufficient_ambient_context',
        }),
        uploadExplanation: async () => {
          throw new Error('Should not upload for abstention');
        },
        publishAttestation: async () => {
          throw new Error('Should not publish for abstention');
        },
        appendEvaluationLog: async (entry) => {
          logEntries.push(entry);
        },
        now: () => now,
      },
    );

    assert.equal(result.decision, 'abstain');
    assert.equal(result.abstainReason, 'insufficient_ambient_context');
    assert.equal(result.explanationCid, null);
    assert.equal(result.transactionHash, null);
    assert.equal(logEntries.length, 1);
    assert.equal(logEntries[0]?.decision, 'abstain');
    assert.equal(logEntries[0]?.abstainReason, 'insufficient_ambient_context');
  });
});
