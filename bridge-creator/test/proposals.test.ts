import assert from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendProposal,
  getPendingProposals,
  loadProposalStoreFile,
  markProposalsConsumed,
  normalizeProposalStoreFile,
  validateProposalInput,
} from '../src/proposals.js';

describe('bridge proposal store', () => {
  let dir: string;
  let storePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bridge-proposals-'));
    storePath = join(dir, 'proposals.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns an empty store when the file does not exist', () => {
    assert.deepStrictEqual(loadProposalStoreFile(storePath), { proposals: [] });
  });

  it('appends a pending proposal with a generated id and timestamp', () => {
    const record = appendProposal(storePath, { suggestion: 'Bridge the gun debate' });
    assert.match(record.id, /^prop_/);
    assert.strictEqual(record.status, 'pending');
    assert.strictEqual(record.suggestion, 'Bridge the gun debate');
    assert.ok(record.submitted_at);

    const reloaded = loadProposalStoreFile(storePath);
    assert.strictEqual(reloaded.proposals.length, 1);
    assert.strictEqual(reloaded.proposals[0].id, record.id);
  });

  it('only returns pending proposals once others are consumed', () => {
    const first = appendProposal(storePath, { suggestion: 'First' });
    const second = appendProposal(storePath, { suggestion: 'Second' });

    markProposalsConsumed(storePath, [first.id]);

    const pending = getPendingProposals(loadProposalStoreFile(storePath));
    assert.deepStrictEqual(pending.map((proposal) => proposal.id), [second.id]);
  });

  it('marking consumed is a no-op for empty id lists and unknown ids', () => {
    const record = appendProposal(storePath, { suggestion: 'Only one' });
    markProposalsConsumed(storePath, []);
    markProposalsConsumed(storePath, ['prop_does_not_exist']);
    const pending = getPendingProposals(loadProposalStoreFile(storePath));
    assert.deepStrictEqual(pending.map((proposal) => proposal.id), [record.id]);
  });
});

describe('validateProposalInput', () => {
  it('requires a non-empty suggestion', () => {
    assert.throws(() => validateProposalInput({}), /suggestion/);
    assert.throws(() => validateProposalInput({ suggestion: '   ' }), /suggestion/);
    assert.throws(() => validateProposalInput('not an object'), /JSON object/);
  });

  it('normalizes snake_case and camelCase optional fields', () => {
    const input = validateProposalInput({
      suggestion: '  Bridge it  ',
      proposer: '0xabc',
      left_statement: 'Left',
      rightStatement: 'Right',
      common_ground: 'Common',
      topicTag: 'guns',
    });
    assert.deepStrictEqual(input, {
      suggestion: 'Bridge it',
      proposer: '0xabc',
      leftStatement: 'Left',
      rightStatement: 'Right',
      commonGround: 'Common',
      topicTag: 'guns',
    });
  });
});

describe('normalizeProposalStoreFile', () => {
  it('rejects a file without a proposals array', () => {
    assert.throws(() => normalizeProposalStoreFile({}), /proposals array/);
  });

  it('rejects duplicate ids', () => {
    const record = {
      id: 'prop_dup',
      submitted_at: '2026-06-04T00:00:00.000Z',
      suggestion: 'x',
      status: 'pending',
    };
    assert.throws(() => normalizeProposalStoreFile({ proposals: [record, record] }), /Duplicate proposal id/);
  });
});
