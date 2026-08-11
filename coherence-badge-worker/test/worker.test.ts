import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'mocha';
import { createDisplayableDocument, type DisplayableDocument } from '@commonality/sdk/displayable-documents';
import { processRefUpdated, type RefUpdatedLog, type WorkerDependencies } from '../src/worker.js';
import { readCursor, writeCursor } from '../src/state.js';

const log: RefUpdatedLog = {
  owner: '0x0000000000000000000000000000000000000001',
  name: 'clean-river',
  currentRefValue: 'bafyroster',
  transactionHash: `0x${'12'.repeat(32)}`,
  blockNumber: 12n,
  logIndex: 3,
};

function deps(document: DisplayableDocument | null): WorkerDependencies {
  return {
    loadDocument: async () => document,
    attest: async () => ({ attested: true, reason: 'already_attested' }),
    sleep: async () => undefined,
  };
}

function roster(): DisplayableDocument {
  return createDisplayableDocument({
    format: 'markdown-restricted',
    content: '# Clean river',
    references: [{ cid: 'bafyplank', label: 'plank' }],
    extras: {
      kind: 'causestarter.roster',
      version: 1,
      title: 'Clean river',
      summary: 'Restore the river.',
      plankCids: ['bafyplank'],
      mediatorBlurb: '',
    },
  });
}

describe('coherence badge worker', () => {
  it('filters empty refs, shared reserved names, and non-roster documents', async () => {
    assert.deepEqual(
      await processRefUpdated({ ...log, currentRefValue: ' ' }, deps(null), 0),
      { status: 'ignored', reason: 'empty_ref' },
    );
    assert.deepEqual(
      await processRefUpdated({ ...log, name: 'favorites' }, deps(null), 0),
      { status: 'ignored', reason: 'reserved_name' },
    );
    const ordinary = createDisplayableDocument({ format: 'text/plain', content: 'not a roster' });
    assert.deepEqual(
      await processRefUpdated(log, deps(ordinary), 0),
      { status: 'ignored', reason: 'non_roster' },
    );
  });

  it('builds attest input exclusively from the loaded roster and preserves idempotent result', async () => {
    let request: Record<string, unknown> | undefined;
    const result = await processRefUpdated(log, {
      ...deps(roster()),
      attest: async (input) => {
        request = input;
        return { attested: true, reason: 'already_attested' };
      },
    }, 0);
    assert.deepEqual(request, {
      rosterCid: 'bafyroster',
      title: 'Clean river',
      summary: 'Restore the river.',
      plankCids: ['bafyplank'],
      mediatorBlurb: '',
    });
    assert.equal(result.status, 'judged');
    if (result.status === 'judged') assert.equal(result.result.reason, 'already_attested');
  });

  it('briefly retries unavailable content, then continues silently', async () => {
    let loads = 0;
    let sleeps = 0;
    const result = await processRefUpdated(log, {
      ...deps(null),
      loadDocument: async () => { loads += 1; return null; },
      sleep: async () => { sleeps += 1; },
    }, 2, 1);
    assert.deepEqual(result, { status: 'unavailable' });
    assert.equal(loads, 3);
    assert.equal(sleeps, 2);
  });

  it('persists block plus log-index cursor bound to chain and contract', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'coherence-worker-'));
    const path = join(directory, 'state.json');
    const identity = { chainId: 31337, mutableRefUpdaterAddress: log.owner };
    try {
      await writeCursor(path, { blockNumber: 12n, logIndex: 3 }, identity);
      assert.deepEqual(await readCursor(path, 1n, identity), { blockNumber: 12n, logIndex: 3 });
      await assert.rejects(readCursor(path, 1n, { ...identity, chainId: 1 }), /different chain/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
