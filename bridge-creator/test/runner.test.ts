import assert from 'node:assert';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import type { BridgeCreatorConfig } from '../src/config.js';
import type { BridgeCreatorRunnerDependencies } from '../src/runner.js';
import { runBridgeCreatorTick } from '../src/runner.js';

function createConfig(): BridgeCreatorConfig {
  return {
    nudgerPrivateKey: ('0x' + '11'.repeat(32)) as `0x${string}`,
    ethereumRpcUrl: 'http://localhost:8545',
    indexerUrl: 'http://localhost:3001',
    ipfsApiUrl: 'http://localhost:5001',
    ipfsGatewayUrl: 'http://localhost:8080',
    openRouterApiKey: 'test-key',
    openRouterModel: 'test-model',
    name: 'Bridge Creator',
    description: 'Test nudger',
    sourceType: 'bridge-creator',
    version: '0.1.0',
    nudgePublicationsContractAddress: ('0x' + '22'.repeat(20)) as `0x${string}`,
    trustedContextSources: [{ serviceUrl: 'http://csm.local' }],
    anchorStorePath: 'bridge-creator/data/seed-anchors.json',
    strategyPromptUrl: '/strategy-prompt',
    publicBaseUrl: '',
    publicationDedupStatePath: 'tmp/bridge-creator-dedup-test.json',
    tickIntervalMs: 60_000,
    contextMaxAgeMs: 24 * 60 * 60 * 1000,
    anchorReflectionIntervalMs: 24 * 60 * 60 * 1000,
    proposalStorePath: 'tmp/bridge-creator-proposals-test.json',
    serviceMarginPercent: 20,
    ethUsdPrice: 3000,
    proposalEstimatedInputTokens: 1500,
    proposalEstimatedOutputTokens: 300,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 10,
  };
}

function createDependencies(overrides: Partial<BridgeCreatorRunnerDependencies> = {}): BridgeCreatorRunnerDependencies {
  return {
    fetchBridgeContextSnapshots: async () => [
      {
        source: { serviceUrl: 'http://csm.local' },
        response: { readiness: 'ready', summary: 'Ready CSM context' },
      },
    ],
    loadAnchorStoreFile: () => ({
      anchors: [
        {
          id: 'anchor-1',
          cluster_id: 'cluster-1',
          role: 'common-ground',
          text: 'Common ground',
          tally_cid: null,
          topic_tag: 'topic',
          rationale: 'Seed',
          status: 'active',
          created_at: '2026-05-21T00:00:00.000Z',
          last_reviewed_at: '2026-05-21T00:00:00.000Z',
        },
      ],
    }),
    loadStrategyPrompt: () => 'Strategy prompt',
    synthesizeBridgeTriples: async () => [
      {
        modifiedLeft: 'Modified left',
        modifiedRight: 'Modified right',
        commonGround: 'Common ground',
        rationale: 'Good bridge',
        anchorClusterId: 'cluster-1',
      },
    ],
    publishBridgeStatement: async (_machinery, content) => `bafy-${content.replace(/\s+/g, '-').toLowerCase()}` as IpfsCidV1,
    publishBridgeNudgeBatch: async () => ({ txHash: '0xtx', batchCid: 'bafy-batch' as IpfsCidV1 }),
    loadDedupState: () => ({}),
    saveDedupState: () => {},
    loadProposalStore: () => ({ proposals: [] }),
    markProposalsConsumed: () => {},
    ...overrides,
  };
}

describe('runBridgeCreatorTick', () => {
  it('skips synthesis and publication while trusted context is warming', async () => {
    let synthesized = false;
    const result = await runBridgeCreatorTick({} as SDKMachinery, createConfig(), createDependencies({
      fetchBridgeContextSnapshots: async () => [
        { source: { serviceUrl: 'http://csm.local' }, response: { readiness: 'warming', summary: 'Still building faction map' } },
      ],
      synthesizeBridgeTriples: async () => {
        synthesized = true;
        return [];
      },
    }));

    assert.strictEqual(result.status, 'warming');
    assert.strictEqual(synthesized, false);
  });

  it('publishes synthesized bridge statements, nudge batch, and modified-to-common implications', async () => {
    const publishedStatements: string[] = [];
    const publishedNudges: any[] = [];
    const submittedImplications: any[] = [];

    const result = await runBridgeCreatorTick({} as SDKMachinery, createConfig(), createDependencies({
      publishBridgeStatement: async (_machinery, content) => {
        publishedStatements.push(content);
        return `bafy-${publishedStatements.length}` as IpfsCidV1;
      },
      publishBridgeNudgeBatch: async (nudges) => {
        publishedNudges.push(...nudges);
        return { txHash: '0xtx', batchCid: 'bafy-batch' as IpfsCidV1 };
      },
      implicationSubmitter: {
        submitImplication: async () => 'unused',
        submitImplications: async (submissions) => {
          submittedImplications.push(...submissions);
          return ['0ximp-left', '0ximp-right'];
        },
      },
    }));

    assert.strictEqual(result.status, 'published');
    assert.deepStrictEqual(publishedStatements, ['Modified left', 'Modified right', 'Common ground']);
    assert.strictEqual(publishedNudges.length, 2);
    assert.deepStrictEqual(publishedNudges.map((nudge) => nudge.targetStatementCid), ['bafy-1', 'bafy-2']);
    assert.deepStrictEqual(publishedNudges.map((nudge) => nudge.suggestedStatementCid), ['bafy-3', 'bafy-3']);
    assert.deepStrictEqual(submittedImplications, [
      { fromStatementCid: 'bafy-1', toStatementCid: 'bafy-3' },
      { fromStatementCid: 'bafy-2', toStatementCid: 'bafy-3' },
    ]);
    assert.deepStrictEqual(result.implicationTxHashes, ['0ximp-left', '0ximp-right']);
  });

  it('skips publication when the current anchors and context match the last published input hash', async () => {
    let published = false;
    const result = await runBridgeCreatorTick({} as SDKMachinery, createConfig(), createDependencies({
      loadDedupState: () => ({ lastInputHash: 'same-hash', lastPublicationSummary: 'Previous bridges' }),
      synthesizeBridgeTriples: async (input) => {
        assert.strictEqual(input.previousPublicationSummary, 'Previous bridges');
        return [
          {
            modifiedLeft: 'Modified left',
            modifiedRight: 'Modified right',
            commonGround: 'Common ground',
            rationale: 'Good bridge',
            anchorClusterId: 'cluster-1',
          },
        ];
      },
      publishBridgeNudgeBatch: async () => {
        published = true;
        return { txHash: '0xtx', batchCid: 'bafy-batch' as IpfsCidV1 };
      },
    }));

    assert.notStrictEqual(result.inputHash, undefined);
    published = false;

    const duplicateResult = await runBridgeCreatorTick({} as SDKMachinery, createConfig(), createDependencies({
      loadDedupState: () => ({ lastInputHash: result.inputHash, lastPublicationSummary: 'Previous bridges' }),
      publishBridgeNudgeBatch: async () => {
        published = true;
        return { txHash: '0xtx', batchCid: 'bafy-batch' as IpfsCidV1 };
      },
    }));

    assert.strictEqual(duplicateResult.status, 'duplicate');
    assert.strictEqual(duplicateResult.synthesizedBridgeCount, 1);
    assert.strictEqual(published, false);
  });

  it('does not publish when synthesis returns no bridge triples', async () => {
    let published = false;
    const result = await runBridgeCreatorTick({} as SDKMachinery, createConfig(), createDependencies({
      synthesizeBridgeTriples: async () => [],
      publishBridgeNudgeBatch: async () => {
        published = true;
        return { txHash: '0xtx', batchCid: 'bafy-batch' as IpfsCidV1 };
      },
    }));

    assert.strictEqual(result.status, 'no_bridges');
    assert.strictEqual(published, false);
  });

  it('feeds pending external proposals to the synthesizer and marks them consumed', async () => {
    const pending = [
      {
        id: 'prop_1',
        submitted_at: '2026-06-04T00:00:00.000Z',
        suggestion: 'Bridge the abortion debate around a 12-week line',
        status: 'pending' as const,
      },
    ];
    let seenProposals: unknown;
    const consumedIds: string[] = [];

    await runBridgeCreatorTick({} as SDKMachinery, createConfig(), createDependencies({
      loadProposalStore: () => ({ proposals: pending }),
      markProposalsConsumed: (_path, ids) => {
        consumedIds.push(...ids);
      },
      synthesizeBridgeTriples: async (input) => {
        seenProposals = input.externalProposals;
        return [];
      },
    }));

    assert.deepStrictEqual(seenProposals, pending);
    assert.deepStrictEqual(consumedIds, ['prop_1']);
  });

  it('treats a tick with new pending proposals as non-duplicate', async () => {
    const baseDeps = createDependencies({ synthesizeBridgeTriples: async () => [] });
    const withoutProposals = await runBridgeCreatorTick({} as SDKMachinery, createConfig(), baseDeps);

    const withProposals = await runBridgeCreatorTick({} as SDKMachinery, createConfig(), createDependencies({
      synthesizeBridgeTriples: async () => [],
      loadProposalStore: () => ({
        proposals: [
          { id: 'prop_new', submitted_at: '2026-06-04T00:00:00.000Z', suggestion: 'New idea', status: 'pending' as const },
        ],
      }),
    }));

    assert.notStrictEqual(withProposals.inputHash, withoutProposals.inputHash);
  });
});
