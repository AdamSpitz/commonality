import assert from 'node:assert/strict';
import { buildCanonicalContentId, hashCanonicalId } from '../../content-identity/ids.js';
import {
  defaultProjectWorkId,
  projectAddressFromAttestationSubject,
  workIdHash,
  workItemsFromExtras,
} from './ids.js';

describe('work item ids', () => {
  it('hashes a content canonical id identically to the content helper', () => {
    const canonical = buildCanonicalContentId('twitter:uid:12345', '67890');
    assert.equal(canonical, 'twitter:uid:12345:67890');
    assert.equal(workIdHash(canonical), hashCanonicalId(canonical));
  });

  it('accepts an unfamiliar convention without a schema', () => {
    const id = 'concert:cedarvale:2026-10-08:violin';
    assert.equal(workIdHash(id), hashCanonicalId(id));
  });

  it('does not treat a work hash as an address', () => {
    const hash = workIdHash('concert:cedarvale:2026-10-08:violin');
    assert.equal(projectAddressFromAttestationSubject(hash), null);
    assert.equal(
      projectAddressFromAttestationSubject('0x0000000000000000000000001111111111111111111111111111111111111111'),
      '0x1111111111111111111111111111111111111111',
    );
  });

  it('formats the factory default id in lowercase', () => {
    assert.equal(
      defaultProjectWorkId('0x0000000000000000000000000000000000000001'),
      'project:0x0000000000000000000000000000000000000001',
    );
  });

  it('reads described work items from document extras', () => {
    assert.deepEqual(workItemsFromExtras({
      workItems: [{ id: 'urn:uuid:abc', description: 'October maintenance' }, { nope: true }, 'x'],
    }), [{ id: 'urn:uuid:abc', description: 'October maintenance' }]);
  });
});
