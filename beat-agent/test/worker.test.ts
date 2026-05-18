import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runBeatAgentWorkerOnce, loadConfigFromEnv, type BeatAgentConfig, type BeatSourceAdapter } from '../src/index.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'beat-agent-worker-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function baseConfig(overrides: Partial<BeatAgentConfig>): BeatAgentConfig {
  return {
    beatId: 'test-beat',
    purposes: ['civility_attestation'],
    attesterName: 'test beat agent',
    ethereumPrivateKey: '0xabc',
    ethereumRpcUrl: 'http://localhost:8545',
    alignmentAttestationsContractAddress: '0x0000000000000000000000000000000000000001',
    alignmentTopicStatementCid: 'bafy-topic',
    openRouterApiKey: 'openrouter-key',
    openRouterModel: 'anthropic/claude-3-sonnet',
    promptTemplate: 'Evaluate the content.',
    ipfsApiUrl: 'http://localhost:5001',
    ipfsGatewayUrl: 'http://localhost:8080',
    paymentAddress: '0x0000000000000000000000000000000000000002',
    serviceMarginPercent: 20,
    ethUsdPrice: 3000,
    gasPriceMultiplier: 1.2,
    estimatedInputTokens: 3000,
    estimatedOutputTokens: 500,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 10,
    minimumConfidence: 'medium',
    workerPollIntervalMs: 60_000,
    memoryCompactionOlderThanMs: 21 * 24 * 60 * 60 * 1000,
    memoryCompactionMinObservations: 3,
    finderEnabled: false,
    minAuthorsForFullWeight: 3,
    minHoursForFullWeight: 6,
    diversityNeutralFloor: 0.25,
    maxUntrustedChars: 4000,
    ...overrides,
  };
}

describe('beat-agent worker', () => {
  it('loads worker configuration from environment variables', () => {
    const config = loadConfigFromEnv({
      BEAT_AGENT_PRIVATE_KEY: '0xabc',
      BEAT_AGENT_ETHEREUM_RPC_URL: 'http://localhost:8545',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000001',
      ALIGNMENT_TOPIC_STATEMENT_CID: 'bafy-topic',
      OPENROUTER_API_KEY: 'openrouter-key',
      BEAT_AGENT_PROMPT_TEMPLATE: 'Evaluate content.',
      BEAT_AGENT_PAYMENT_ADDRESS: '0x0000000000000000000000000000000000000002',
      BEAT_AGENT_BEAT_DEFINITION_JSON: JSON.stringify({
        beatId: 'civic-twitter',
        purposes: ['civility_attestation', 'bridge_opportunity_detection'],
        sources: [{ id: 'query:civic', type: 'query', locator: 'civic', credentialEnvVar: 'X_API_BEARER_TOKEN' }],
      }),
      BEAT_AGENT_INGESTION_STATE_FILE: './data/ingestion.json',
      BEAT_AGENT_WORKER_POLL_INTERVAL_MS: '30000',
      BEAT_AGENT_MEMORY_FILE: './data/memory.json',
      BEAT_AGENT_LLM_EXTRACTION_ENABLED: 'true',
      BEAT_AGENT_FINDER_ENABLED: 'true',
      BEAT_AGENT_FINDER_STATE_FILE: './data/finder.json',
      BEAT_AGENT_FINDER_ATTESTER_URL: 'http://localhost:3000/evaluate-content',
    } as NodeJS.ProcessEnv);

    assert.equal(config.beatDefinition?.beatId, 'civic-twitter');
    assert.deepEqual(config.beatDefinition?.purposes, ['civility_attestation', 'bridge_opportunity_detection']);
    assert.equal(config.ingestionStateFilePath, './data/ingestion.json');
    assert.equal(config.workerPollIntervalMs, 30_000);
    assert.equal(config.memoryFilePath, './data/memory.json');
    assert.equal(config.llmExtractionEnabled, true);
    assert.equal(config.finderEnabled, true);
    assert.equal(config.finderAttesterUrl, 'http://localhost:3000/evaluate-content');
  });

  it('runs ingestion, text observation extraction, and compaction in one worker tick', async () => {
    await withTempDir(async (dir) => {
      const ingestionStateFilePath = join(dir, 'ingestion.json');
      const memoryFilePath = join(dir, 'memory.json');
      const adapter: BeatSourceAdapter = {
        fetchSource: async (source) => ({
          items: [
            {
              contentCanonicalId: 'rss:item:1',
              sourceId: source.id,
              platform: 'rss',
              authorHandle: 'LocalNews',
              text: 'The council housing debate keeps using the phrase shared abundance.',
              observedAt: '2026-05-15T10:00:00.000Z',
              ingestedAt: '',
            },
          ],
          cursor: 'cursor-1',
        }),
      };

      const config = baseConfig({
        beatDefinition: {
          beatId: 'local-civic',
          purposes: ['civility_attestation', 'beat_context_provider', 'source_management'],
          sources: [{ id: 'rss:local-news', type: 'rss', locator: 'https://example.com/feed.xml', platform: 'rss' }],
        },
        ingestionStateFilePath,
        memoryFilePath,
      });
      const dependencies = {
        ingestionAdapters: { rss: adapter },
        now: () => new Date('2026-05-16T12:00:00.000Z'),
      };

      const summary = await runBeatAgentWorkerOnce(config, dependencies);

      assert.equal(summary.ingestion?.newItemCount, 1);
      assert.equal(summary.extraction?.observationCount, 1);
      assert.equal(summary.compaction?.createdSummaryCount, 0);
      assert.equal(summary.purposeSummarySnapshots?.generatedSnapshotCount, 3);
      assert.equal(summary.sourceManagementReport?.generatedReportCount, 1);

      const memory = JSON.parse(await readFile(memoryFilePath, 'utf-8')) as { observations: Array<{ observation: string }>; purposeSummarySnapshots?: Array<{ purpose: string }>; sourceManagementReports?: unknown[] };
      assert.equal(memory.observations.length, 2);
      assert.ok(memory.observations.some((observation) => /shared abundance/u.test(observation.observation)));
      assert.deepEqual(memory.purposeSummarySnapshots?.map((snapshot) => snapshot.purpose).sort(), ['beat_context_provider', 'civility_attestation', 'source_management']);
      assert.equal(memory.sourceManagementReports?.length, 1);

      const secondSummary = await runBeatAgentWorkerOnce(config, dependencies);
      assert.equal(secondSummary.ingestion?.duplicateItemCount, 1);
      assert.equal(secondSummary.extraction?.itemCount, 0);
      assert.equal(secondSummary.extraction?.observationCount, 0);
    });
  });
});
