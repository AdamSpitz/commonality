import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { base36 } from 'multiformats/bases/base36';
import { CID } from 'multiformats/cid';
import {
  LOCAL_POLICY_LIST_SCHEMA,
  parseLocalPolicyListDocument,
} from './documents.js';

const CID_BASE32 = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

function localDocument(entries: unknown[]): unknown {
  return { schema: LOCAL_POLICY_LIST_SCHEMA, entries };
}

describe('local policy-list documents', () => {
  it('validates and canonicalizes every entry subject', () => {
    const cidBase36 = CID.parse(CID_BASE32).toString(base36);

    assert.deepEqual(
      parseLocalPolicyListDocument(localDocument([
        { subject: { type: 'cid', value: cidBase36 }, reason: 'court-order-2026-0412' },
        { subject: { type: 'address', value: ADDRESS, chainId: '8453' } },
        { subject: { type: 'channel', value: 'Twitter:UID:Case:Sensitive' } },
      ])),
      {
        schema: LOCAL_POLICY_LIST_SCHEMA,
        entries: [
          { subject: { type: 'cid', value: CID_BASE32 }, reason: 'court-order-2026-0412' },
          { subject: { type: 'address', value: ADDRESS, chainId: '8453' } },
          { subject: { type: 'channel', value: 'twitter:uid:Case:Sensitive' } },
        ],
      },
    );
  });

  it('accepts an empty list and an empty reason', () => {
    assert.deepEqual(parseLocalPolicyListDocument(localDocument([])), localDocument([]));
    assert.equal(
      parseLocalPolicyListDocument(localDocument([
        { subject: { type: 'cid', value: CID_BASE32 }, reason: '' },
      ])).entries[0]?.reason,
      '',
    );
  });

  it('rejects wrong schemas, unknown fields, null, and forbidden publication identity fields', () => {
    assert.throws(() => parseLocalPolicyListDocument(null), /must be an object/);
    assert.throws(
      () => parseLocalPolicyListDocument({ schema: 'commonality.policy-list-local/v2', entries: [] }),
      /schema must be/,
    );
    assert.throws(
      () => parseLocalPolicyListDocument({ schema: LOCAL_POLICY_LIST_SCHEMA, entries: [], keeper: ADDRESS }),
      /Unknown policy list field: keeper/,
    );
    assert.throws(
      () => parseLocalPolicyListDocument({ schema: LOCAL_POLICY_LIST_SCHEMA, entries: null }),
      /entries must be an array/,
    );
    assert.throws(
      () => parseLocalPolicyListDocument(localDocument([
        { subject: { type: 'cid', value: CID_BASE32 }, category: 'illegal' },
      ])),
      /Unknown policy list field: category/,
    );
  });

  it('rejects malformed subjects and canonical duplicates', () => {
    assert.throws(
      () => parseLocalPolicyListDocument(localDocument([{ subject: { type: 'wallet', value: ADDRESS } }])),
      /Invalid policy list entry 0 subject/,
    );

    const cidBase36 = CID.parse(CID_BASE32).toString(base36);
    assert.throws(
      () => parseLocalPolicyListDocument(localDocument([
        { subject: { type: 'cid', value: CID_BASE32 } },
        { subject: { type: 'cid', value: cidBase36 } },
      ])),
      new RegExp(`Duplicate policy subject: cid:${CID_BASE32}`),
    );
  });

  it('enforces reason type, valid Unicode, and the 512 UTF-8 byte limit', () => {
    const subject = { type: 'cid', value: CID_BASE32 };

    assert.doesNotThrow(() => parseLocalPolicyListDocument(localDocument([
      { subject, reason: 'é'.repeat(256) },
    ])));
    assert.throws(
      () => parseLocalPolicyListDocument(localDocument([{ subject, reason: 'é'.repeat(257) }])),
      /at most 512 UTF-8 bytes/,
    );
    assert.throws(
      () => parseLocalPolicyListDocument(localDocument([{ subject, reason: null }])),
      /reason must be a string/,
    );
    assert.throws(
      () => parseLocalPolicyListDocument(localDocument([{ subject, reason: '\ud800' }])),
      /valid Unicode/,
    );
  });
});
