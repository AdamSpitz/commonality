import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { base36 } from 'multiformats/bases/base36';
import { CID } from 'multiformats/cid';
import {
  extractExcludeAggregationPolicySubjects,
  extractPolicySubjects,
  extractRefuseServePolicySubjects,
  extractSuppressPolicySubjects,
  POLICY_ACTION_SUBJECT_TYPES,
  type PolicyContentItem,
} from './actions.js';

const CID_VALUE = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';
const PUBLISHER = '0x1234567890abcdef1234567890abcdef12345678';
const PROJECT = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

function contentItem(overrides: Partial<PolicyContentItem> = {}): PolicyContentItem {
  return {
    cid: CID_VALUE,
    publisher: { value: PUBLISHER, chainId: '8453' },
    projectContract: { value: PROJECT, chainId: '8453' },
    channel: 'Twitter:UID:Case:Sensitive',
    ...overrides,
  };
}

const EXPECTED_CONTENT_SUBJECTS = [
  { type: 'cid', value: CID_VALUE },
  { type: 'address', value: PUBLISHER, chainId: '8453' },
  { type: 'address', value: PROJECT, chainId: '8453' },
  { type: 'channel', value: 'twitter:uid:Case:Sensitive' },
];

describe('policy-list action extractors', () => {
  it('extracts every required suppress subject in stable order', () => {
    assert.deepEqual(
      extractSuppressPolicySubjects({ item: contentItem() }),
      EXPECTED_CONTENT_SUBJECTS,
    );
  });

  it('uses the same complete item subject set for exclude-aggregation', () => {
    assert.deepEqual(
      extractExcludeAggregationPolicySubjects({ item: contentItem() }),
      EXPECTED_CONTENT_SUBJECTS,
    );
  });

  it('allows an item to omit a channel without omitting required subjects', () => {
    const item = contentItem();
    delete item.channel;

    assert.deepEqual(
      extractPolicySubjects('suppress', { item }),
      EXPECTED_CONTENT_SUBJECTS.slice(0, 3),
    );
  });

  it('extracts only the requested CID for refuse-serve', () => {
    assert.deepEqual(extractRefuseServePolicySubjects({ cid: CID_VALUE }), [
      { type: 'cid', value: CID_VALUE },
    ]);
    assert.deepEqual(POLICY_ACTION_SUBJECT_TYPES['refuse-serve'], ['cid']);
  });

  it('canonicalizes extracted subjects and collapses duplicate exact identities', () => {
    const base36Cid = CID.parse(CID_VALUE).toString(base36);

    assert.deepEqual(
      extractPolicySubjects('exclude-aggregation', {
        item: contentItem({
          cid: base36Cid,
          publisher: { value: PUBLISHER, chainId: '8453' },
          projectContract: { value: PUBLISHER, chainId: '8453' },
        }),
      }),
      [
        { type: 'cid', value: CID_VALUE },
        { type: 'address', value: PUBLISHER, chainId: '8453' },
        { type: 'channel', value: 'twitter:uid:Case:Sensitive' },
      ],
    );
  });

  it('rejects malformed extracted subjects instead of silently narrowing policy', () => {
    assert.throws(
      () => extractSuppressPolicySubjects({
        item: contentItem({ publisher: { value: PUBLISHER, chainId: '08453' } }),
      }),
      /chainId/,
    );
    assert.throws(
      () => extractRefuseServePolicySubjects({ cid: 'not-a-cid' }),
      /Invalid CID policy subject/,
    );
  });

  it('declares the subject types each action can govern', () => {
    assert.deepEqual(POLICY_ACTION_SUBJECT_TYPES, {
      suppress: ['cid', 'address', 'channel'],
      'exclude-aggregation': ['cid', 'address', 'channel'],
      'refuse-serve': ['cid'],
    });
  });
});
