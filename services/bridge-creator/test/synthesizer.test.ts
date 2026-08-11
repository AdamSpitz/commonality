import assert from 'node:assert';
import type { OpenRouterJsonRequest } from '@commonality/attester-core';
import type { BridgeAnchorRecord } from '../src/anchors.js';
import {
  interpolateStrategyLabels,
  renderSynthesisUserPrompt,
  synthesizeBridgeTriples,
  type BridgeSynthesisInput,
} from '../src/synthesizer.js';

const anchor: BridgeAnchorRecord = {
  id: 'immigration-common-ground',
  cluster_id: 'immigration',
  role: 'common-ground',
  text: 'Immigration should be orderly, humane, and enforceable.',
  tally_cid: null,
  topic_tag: 'immigration',
  rationale: 'Seed hidden-majority compromise anchor',
  status: 'active',
  featured: true,
  created_at: '2026-05-21T00:00:00.000Z',
  last_reviewed_at: '2026-05-21T00:00:00.000Z',
};

function createInput(overrides: Partial<BridgeSynthesisInput> = {}): BridgeSynthesisInput {
  return {
    strategyPrompt: 'Prefer popular-and-sane bridge statements.',
    contextSnapshots: [
      {
        source: { serviceUrl: 'http://csm.local', expectedSignerAddress: '0x0000000000000000000000000000000000000001' },
        response: {
          readiness: 'ready',
          summary: 'Immigration discourse is focused on enforcement plus humane treatment.',
          signerAddress: '0x0000000000000000000000000000000000000001',
          generatedAt: '2026-05-21T00:00:00.000Z',
        },
      },
    ],
    activeAnchors: [anchor],
    previousPublicationSummary: 'No previous publication.',
    labels: { sideA: 'homeowners', sideB: 'renters' },
    ...overrides,
  };
}

describe('renderSynthesisUserPrompt', () => {
  it('interpolates the founder label pair into strategy placeholders', () => {
    assert.strictEqual(
      interpolateStrategyLabels('Listen to {{side_a_label}} and {{side_b_label}}.', { sideA: 'homeowners', sideB: 'renters' }),
      'Listen to homeowners and renters.',
    );
  });

  it('passes trusted context, active anchors, and previous publication state to the LLM', () => {
    const rendered = JSON.parse(renderSynthesisUserPrompt(createInput())) as any;

    assert.strictEqual(rendered.trusted_contexts[0].service_url, 'http://csm.local');
    assert.strictEqual(rendered.trusted_contexts[0].readiness, 'ready');
    assert.strictEqual(rendered.active_anchors[0].cluster_id, 'immigration');
    assert.strictEqual(rendered.previous_publication_summary, 'No previous publication.');
    assert.deepStrictEqual(rendered.labels, { side_a: 'homeowners', side_b: 'renters' });
    assert.strictEqual(rendered.expected_output.bridges[0].common_ground, 'statement implied by both modified statements');
  });
});

describe('synthesizeBridgeTriples', () => {
  it('requests JSON synthesis using the strategy prompt as static prompt and normalizes bridge triples', async () => {
    const requests: OpenRouterJsonRequest[] = [];

    const triples = await synthesizeBridgeTriples(
      createInput(),
      { openRouterApiKey: 'key', openRouterModel: 'model' },
      {
        requestJsonCompletion: async <T>(request: OpenRouterJsonRequest) => {
          requests.push(request);
          return {
            bridges: [
              {
                side_a: ' Humane enforcement can include a clearer path for long-settled families. ',
                side_b: 'Orderly enforcement can include humane treatment for long-settled families.',
                common_ground: 'Immigration policy should be orderly, enforceable, and humane to long-settled families.',
                rationale: 'Matches live CSM context and the immigration anchor.',
                anchor_cluster_id: 'immigration',
              },
            ],
          } as T;
        },
      },
    );

    assert.strictEqual(requests[0]?.apiKey, 'key');
    assert.strictEqual(requests[0]?.model, 'model');
    assert.strictEqual(requests[0]?.staticUserPrompt, 'Prefer popular-and-sane bridge statements.');
    assert.match(requests[0]?.systemPrompt ?? '', /Return only JSON/);
    assert.deepStrictEqual(triples, [
      {
        sideA: 'Humane enforcement can include a clearer path for long-settled families.',
        sideB: 'Orderly enforcement can include humane treatment for long-settled families.',
        commonGround: 'Immigration policy should be orderly, enforceable, and humane to long-settled families.',
        rationale: 'Matches live CSM context and the immigration anchor.',
        anchorClusterId: 'immigration',
      },
    ]);
  });

  it('rejects malformed LLM output before publication', async () => {
    await assert.rejects(
      synthesizeBridgeTriples(
        createInput(),
        { openRouterApiKey: 'key', openRouterModel: 'model' },
        { requestJsonCompletion: async <T>() => ({ bridges: [{ side_a: 'left only' }] }) as T },
      ),
      /missing side_b/,
    );
  });
});
