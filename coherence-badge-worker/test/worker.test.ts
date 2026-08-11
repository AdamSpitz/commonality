import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'mocha';
import { createDisplayableDocument, type DisplayableDocument } from '@commonality/sdk/displayable-documents';
import { assertWorkerCanMint } from '../src/index.js';
import type { WorkerConfig } from '../src/config.js';
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

  it('retries when plank texts are temporarily unavailable after the roster loads', async () => {
    let attestCalls = 0;
    let sleeps = 0;
    const result = await processRefUpdated(log, {
      loadDocument: async () => roster(),
      attest: async () => {
        attestCalls += 1;
        if (attestCalls < 3) return { attested: false, reason: 'roster_unavailable' };
        return { attested: true, reason: 'already_attested' };
      },
      sleep: async () => { sleeps += 1; },
    }, 3, 1);
    assert.equal(result.status, 'judged');
    if (result.status === 'judged') assert.equal(result.result.reason, 'already_attested');
    assert.equal(attestCalls, 3);
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

  it('refuses to start without LLM and operator attester configuration', () => {
    const base = {
      rpcUrl: 'http://127.0.0.1:8545',
      chainId: 31337,
      mutableRefUpdaterAddress: log.owner,
      startBlock: 1n,
      confirmations: 0n,
      blockRange: 1000n,
      pollIntervalMs: 10_000,
      stateFile: './data/x.json',
      contentRetryCount: 3,
      contentRetryDelayMs: 2_000,
    } satisfies Omit<WorkerConfig, 'causeAssist'>;

    assert.throws(
      () => assertWorkerCanMint({
        ...base,
        causeAssist: {
          apiBaseUrl: 'https://api.example.test/v1',
          suggestModel: 'm',
          implicationModel: 'm',
          safetyModel: 'm',
          coherenceModel: 'm',
          port: 0,
        },
      }),
      /XAI_API_KEY|OPENROUTER_API_KEY/,
    );

    assert.throws(
      () => assertWorkerCanMint({
        ...base,
        causeAssist: {
          apiBaseUrl: 'https://api.example.test/v1',
          suggestModel: 'm',
          implicationModel: 'm',
          safetyModel: 'm',
          coherenceModel: 'm',
          port: 0,
          apiKey: 'test-key',
        },
      }),
      /CAUSE_ASSIST_COHERENCE_ATTESTER_PRIVATE_KEY|ALIGNMENT_ATTESTATIONS/,
    );

    assert.doesNotThrow(() => assertWorkerCanMint({
      ...base,
      causeAssist: {
        apiBaseUrl: 'https://api.example.test/v1',
        suggestModel: 'm',
        implicationModel: 'm',
        safetyModel: 'm',
        coherenceModel: 'm',
        port: 0,
        apiKey: 'test-key',
        ethereumPrivateKey: `0x${'11'.repeat(32)}`,
        ethereumRpcUrl: 'http://127.0.0.1:8545',
        alignmentAttestationsContractAddress: log.owner,
      },
    }));
  });
});
