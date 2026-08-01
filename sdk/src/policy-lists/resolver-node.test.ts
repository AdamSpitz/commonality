import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalJsonSha256, type JsonValue } from './json.js';
import {
  LocalPolicyResolverError,
  activateResolvedPolicyBundle,
  resolveAndActivateLocalPolicyBundle,
  resolveLocalPolicyBundle,
} from './resolver-node.js';

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

  it('rejects mismatched pins without replacing last-known-good state', async () => {
    const { rootPath, bundlePath } = await fixture();
    const active = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await writeFile(rootPath, JSON.stringify(root(`0x${'00'.repeat(32)}`)));
    await assert.rejects(resolveLocalPolicyBundle(rootPath, bundlePath), LocalPolicyResolverError);
    assert.deepEqual(JSON.parse(await readFile(bundlePath, 'utf8')), active);
  });

  it('rejects rollback activation', async () => {
    const { directory, rootPath, bundlePath } = await fixture();
    const old = await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await writeFile(join(directory, 'list.json'), JSON.stringify({ ...list, entries: [] }));
    await resolveAndActivateLocalPolicyBundle(rootPath, bundlePath);
    await assert.rejects(activateResolvedPolicyBundle(old, bundlePath), /rollback/);
  });
});
