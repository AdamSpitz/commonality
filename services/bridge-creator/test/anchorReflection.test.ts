import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  appendAnchorReflectionProposals,
  reflectAnchorProposals,
  renderAnchorReflectionUserPrompt,
  type AnchorReflectionDependencies,
} from '../src/anchorReflection.js';
import { normalizeAnchorStoreFile, type BridgeAnchorRecord } from '../src/anchors.js';
import type { BridgeContextSnapshot } from '../src/contextSources.js';

describe('anchor reflection', () => {
  const now = new Date('2026-05-21T12:00:00.000Z');

  it('passes trusted context and current anchors to the reflection LLM', async () => {
    const requests: unknown[] = [];
    await reflectAnchorProposals(
      {
        contextSnapshots: [makeContextSnapshot()],
        currentAnchors: [makeAnchor({ id: 'immigration-common' })],
        previousPublicationSummary: 'Published immigration bridge last tick.',
        outcomeSummary: 'The immigration common-ground bridge was signed 12 times and ignored 3 times.',
        now,
      },
      { openRouterApiKey: 'key', openRouterModel: 'model' },
      makeDependencies(requests, { proposals: [] }),
    );

    const request = requests[0] as { userPrompt: string; staticUserPrompt: string; title: string };
    assert.strictEqual(request.title, 'Commonality Bridge Anchor Reflection');
    assert.match(request.staticUserPrompt, /popular-and-sane/);
    assert.match(request.userPrompt, /Housing affordability is now a live topic/);
    assert.match(request.userPrompt, /immigration-common/);
    assert.match(request.userPrompt, /Published immigration bridge last tick/);
    assert.match(request.userPrompt, /signed 12 times and ignored 3 times/);
  });

  it('normalizes proposals as advisory-only proposed anchors', async () => {
    const proposals = await reflectAnchorProposals(
      { contextSnapshots: [makeContextSnapshot()], currentAnchors: [], now },
      { openRouterApiKey: 'key', openRouterModel: 'model' },
      makeDependencies([], {
        proposals: [
          {
            id: 'housing-common-ground-v1',
            cluster_id: 'housing-v1',
            role: 'common-ground',
            text: 'More homes should be built while protecting tenants from sudden displacement.',
            topic_tag: 'housing',
            rationale: 'CSM context shows housing is a live coverage gap.',
            status: 'active',
          },
        ],
      }),
    );

    assert.strictEqual(proposals[0]?.status, 'proposed');
    assert.strictEqual(proposals[0]?.tally_cid, null);
    assert.strictEqual(proposals[0]?.created_at, now.toISOString());
  });

  it('appends proposed anchors to the store for later operator review', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'bridge-anchor-reflection-'));
    const storePath = join(tempDir, 'anchors.json');
    try {
      writeFileSync(storePath, `${JSON.stringify({ anchors: [makeAnchor({ id: 'existing' })] }, null, 2)}\n`);

      const result = await appendAnchorReflectionProposals(
        storePath,
        { contextSnapshots: [makeContextSnapshot()], previousPublicationSummary: 'No housing anchors yet.', now },
        { openRouterApiKey: 'key', openRouterModel: 'model' },
        makeDependencies([], {
          proposals: [
            {
              id: 'housing-common-ground-v1',
              cluster_id: 'housing-v1',
              role: 'common-ground',
              text: 'More homes should be built while protecting tenants from sudden displacement.',
              tally_cid: null,
              topic_tag: 'housing',
              rationale: 'CSM context shows housing is a live coverage gap.',
              status: 'proposed',
              created_at: now.toISOString(),
              last_reviewed_at: now.toISOString(),
            },
          ],
        }),
      );
      const store = normalizeAnchorStoreFile(JSON.parse(readFileSync(storePath, 'utf8')));

      assert.strictEqual(result.proposals.length, 1);
      assert.deepStrictEqual(store.anchors.map((anchor) => anchor.id), ['existing', 'housing-common-ground-v1']);
      assert.strictEqual(store.anchors[1]?.status, 'proposed');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renders the expected output shape', () => {
    const rendered = renderAnchorReflectionUserPrompt({ contextSnapshots: [], currentAnchors: [], now });
    assert.match(rendered, /"status": "proposed"/);
    assert.match(rendered, /"expected_output"/);
  });
});

function makeDependencies(requests: unknown[], response: unknown): AnchorReflectionDependencies {
  return {
    requestJsonCompletion: async <T>(request: Parameters<AnchorReflectionDependencies['requestJsonCompletion']>[0]): Promise<T> => {
      requests.push(request);
      return response as T;
    },
  };
}

function makeAnchor(overrides: Partial<BridgeAnchorRecord> = {}): BridgeAnchorRecord {
  return {
    id: 'anchor-id',
    cluster_id: 'cluster-id',
    role: 'common-ground',
    text: 'A compromise statement.',
    tally_cid: null,
    topic_tag: 'topic',
    rationale: 'Test fixture.',
    status: 'active',
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
    ...overrides,
  };
}

function makeContextSnapshot(): BridgeContextSnapshot {
  return {
    source: {
      serviceUrl: 'http://csm.local',
      expectedSignerAddress: '0x1234567890123456789012345678901234567890',
    },
    response: {
      readiness: 'ready',
      summary: 'Housing affordability is now a live topic with popular moderate statements on both sides.',
      generatedAt: '2026-05-21T11:00:00.000Z',
      signerAddress: '0x1234567890123456789012345678901234567890',
      signature: '0xsig',
    },
  };
}
