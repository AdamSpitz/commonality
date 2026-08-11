import assert from 'node:assert';
import { computeBridgePublicationInputHash } from '../src/dedup.js';

const baseInput = {
  contextSnapshots: [],
  activeAnchors: [],
  pendingProposals: [],
  strategyPrompt: 'Founder policy A',
  labels: { sideA: 'owners', sideB: 'renters' },
};

describe('computeBridgePublicationInputHash', () => {
  it('changes when founder policy or side labels change', () => {
    const original = computeBridgePublicationInputHash(baseInput);
    assert.notStrictEqual(
      computeBridgePublicationInputHash({ ...baseInput, strategyPrompt: 'Founder policy B' }),
      original,
    );
    assert.notStrictEqual(
      computeBridgePublicationInputHash({ ...baseInput, labels: { sideA: 'maintainers', sideB: 'users' } }),
      original,
    );
  });
});
