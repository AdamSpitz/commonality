import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { MockAgent } from 'undici';
import { canonicalJsonSha256, type JsonValue } from './json.js';
import {
  activateResolvedPolicyBundle,
  resolveAndActivateLocalPolicyBundle,
  resolveLocalPolicyBundle,
} from './resolver-node.js';

const execFileAsync = promisify(execFile);

const list = {
  schema: 'commonality.policy-list-local/v1',
  entries: [{ subject: { type: 'address', chainId: '8453', value: '0x1111111111111111111111111111111111111111' } }],
} as const;

function root(contentHash?: string) {
  return {
    schema: 'commonality.policy-root/v1',
    layers: [{ id: 'editorial', ref: { source: 'file:./list.json', ...(contentHash === undefined ? {} : { contentHash }) }, op: 'block', onError: 'closed' }],
    actions: { editorial: ['suppress'] },
    honoredRetractors: [],
  };
}

async function fixture(): Promise<{ directory: string; rootPath: string; bundlePath: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'policy-resolver-'));
  const rootPath = join(directory, 'root.json');
  await writeFile(join(directory, 'list.json'), JSON.stringify(list));
  await writeFile(rootPath, JSON.stringify(root()));
  return { directory, rootPath, bundlePath: join(directory, 'bundle.json') };
}

describe('local policy resolver', () => {
  it('resolves relative file sources and atomically activates a canonical bundle', async () => {
    const { rootPath, bundlePath } = await fixture();
    const bundle = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    assert.equal(bundle.sequence, '0');
    assert.equal(bundle.layers[0]?.ref?.contentHash, canonicalJsonSha256(list as unknown as JsonValue));
    assert.deepEqual(JSON.parse(await readFile(bundlePath, 'utf8')), bundle);
  });

  it('retains the digest and sequence when resolved policy content is unchanged', async () => {
    const { rootPath, bundlePath } = await fixture();
    const first = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    const second = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    assert.deepEqual(second, first);
  });

  it('increments sequence when a local list changes', async () => {
    const { directory, rootPath, bundlePath } = await fixture();
    const first = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await writeFile(join(directory, 'list.json'), JSON.stringify({ ...list, entries: [] }));
    const second = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    assert.equal(first.sequence, '0');
    assert.equal(second.sequence, '1');
    assert.notEqual(second.digest, first.digest);
  });

  it('carries a closed layer last-known-good artifact forward when resolution fails', async () => {
    const { directory, rootPath, bundlePath } = await fixture();
    const active = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await writeFile(join(directory, 'list.json'), '{ invalid');

    const candidate = await resolveLocalPolicyBundle(rootPath, bundlePath);
    assert.equal(candidate.sequence, '0');
    assert.deepEqual(candidate, active);
  });

  it('resolves pinned HTTPS bytes and preserves last-known-good on a hash mismatch', async () => {
    const { rootPath, bundlePath } = await fixture();
    const dispatcher = new MockAgent();
    dispatcher.disableNetConnect();
    const pool = dispatcher.get('https://lists.example');
    pool.intercept({ path: '/list.json', method: 'GET' }).reply(200, JSON.stringify(list));
    const contentHash = canonicalJsonSha256(list as unknown as JsonValue);
    await writeFile(rootPath, JSON.stringify({
      ...root(),
      layers: [{ ...root().layers[0], ref: { source: 'https://lists.example/list.json', contentHash } }],
    }));
    const fetchOptions = {
      dispatcher,
      lookup: async () => [{ address: '203.0.113.10', family: 4 as const }],
    };
    const active = await resolveLocalPolicyBundle(rootPath, bundlePath, fetchOptions);
    await activateResolvedPolicyBundle(active, bundlePath);
    pool.intercept({ path: '/list.json', method: 'GET' }).reply(200, JSON.stringify({ ...list, entries: [] }));
    const candidate = await resolveLocalPolicyBundle(rootPath, bundlePath, fetchOptions);
    assert.deepEqual(candidate, active);
    await dispatcher.close();
  });

  it('marks a closed layer unresolved on cold start', async () => {
    const { directory, rootPath, bundlePath } = await fixture();
    await writeFile(join(directory, 'list.json'), '{ invalid');

    const candidate = await resolveLocalPolicyBundle(rootPath, bundlePath);
    assert.deepEqual(candidate.layers[0], {
      id: 'editorial',
      unresolved: true,
      onError: 'closed',
    });
  });

  it('marks an open layer unresolved instead of carrying its previous artifact forward', async () => {
    const { directory, rootPath, bundlePath } = await fixture();
    await writeFile(rootPath, JSON.stringify({
      ...root(),
      layers: [{ ...root().layers[0], onError: 'open' }],
    }));
    const active = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await writeFile(join(directory, 'list.json'), '{ invalid');

    const candidate = await resolveLocalPolicyBundle(rootPath, bundlePath);
    assert.equal(candidate.sequence, '1');
    assert.notEqual(candidate.digest, active.digest);
    assert.deepEqual(candidate.layers[0], {
      id: 'editorial',
      unresolved: true,
      onError: 'open',
    });
  });

  it('resolves healthy layers while carrying a different closed layer forward', async () => {
    const { directory, rootPath, bundlePath } = await fixture();
    await writeFile(join(directory, 'second.json'), JSON.stringify(list));
    const twoLayerRoot = {
      ...root(),
      layers: [
        root().layers[0],
        { id: 'second', ref: { source: 'file:./second.json' }, op: 'block', onError: 'closed' },
      ],
      actions: { editorial: ['suppress'], second: ['suppress'] },
    };
    await writeFile(rootPath, JSON.stringify(twoLayerRoot));
    const active = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await writeFile(join(directory, 'list.json'), '{ invalid');
    await writeFile(join(directory, 'second.json'), JSON.stringify({ ...list, entries: [] }));

    const candidate = await resolveLocalPolicyBundle(rootPath, bundlePath);
    assert.deepEqual(candidate.layers[0]?.ref, active.layers[0]?.ref);
    assert.deepEqual(candidate.layers[1]?.ref?.document.entries, []);
    assert.equal(candidate.sequence, '1');
  });

  it('carries a pinned exception forward independently of a freshly resolved block list', async () => {
    const { directory, rootPath, bundlePath } = await fixture();
    const exceptionHash = canonicalJsonSha256(list as unknown as JsonValue);
    await writeFile(join(directory, 'exception.json'), JSON.stringify(list));
    await writeFile(rootPath, JSON.stringify({
      ...root(),
      layers: [{
        ...root().layers[0],
        except: { ref: { source: 'file:./exception.json', contentHash: exceptionHash } },
      }],
    }));
    const active = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await writeFile(join(directory, 'list.json'), JSON.stringify({ ...list, entries: [] }));
    await writeFile(join(directory, 'exception.json'), '{ invalid');

    const candidate = await resolveLocalPolicyBundle(rootPath, bundlePath);
    assert.deepEqual(candidate.layers[0]?.ref?.document.entries, []);
    assert.deepEqual(candidate.layers[0]?.except, active.layers[0]?.except);
  });

  it('marks a missing pinned exception unresolved on cold start', async () => {
    const { rootPath, bundlePath } = await fixture();
    await writeFile(rootPath, JSON.stringify({
      ...root(),
      layers: [{
        ...root().layers[0],
        except: { ref: { source: 'file:./missing.json', contentHash: `0x${'00'.repeat(32)}` } },
      }],
    }));

    const candidate = await resolveLocalPolicyBundle(rootPath, bundlePath);
    assert.deepEqual(candidate.layers[0]?.except, { unresolved: true });
  });

  it('inspects active layer status and exact-subject lookup provenance', async () => {
    const { rootPath, bundlePath } = await fixture();
    const bundle = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    const subject = JSON.stringify(list.entries[0].subject);
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', new URL('../../scripts/policy-lists-inspect.ts', import.meta.url).pathname, bundlePath, subject],
    );
    const inspected = JSON.parse(stdout);
    assert.equal(inspected.digest, bundle.digest);
    assert.equal(inspected.layers[0].status, 'resolved');
    assert.equal(inspected.layers[0].exceptionStatus, 'not-configured');
    assert.deepEqual(inspected.lookup.assertedBy, ['editorial']);
  });

  it('rejects rollback activation', async () => {
    const { directory, rootPath, bundlePath } = await fixture();
    const old = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await writeFile(join(directory, 'list.json'), JSON.stringify({ ...list, entries: [] }));
    await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await assert.rejects(activateResolvedPolicyBundle(old, bundlePath), /rollback/);
  });
});
