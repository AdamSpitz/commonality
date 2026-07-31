import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { base36 } from 'multiformats/bases/base36';
import { CID } from 'multiformats/cid';
import * as Digest from 'multiformats/hashes/digest';
import { buildCidV1FromDigest } from '../utils/cid-types.js';
import {
  assertUniquePolicySubjects,
  parsePolicySubject,
  policySubjectKey,
} from './subjects.js';

const RAW_SHA256_CID = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

describe('policy-list subjects', () => {
  describe('CID subjects', () => {
    it('canonicalizes equivalent CIDv1 encodings to base32', () => {
      const base36Cid = CID.parse(RAW_SHA256_CID).toString(base36);

      assert.deepEqual(parsePolicySubject({ type: 'cid', value: base36Cid }), {
        type: 'cid',
        value: RAW_SHA256_CID,
      });
      assert.equal(
        policySubjectKey({ type: 'cid', value: base36Cid }),
        `cid:${RAW_SHA256_CID}`,
      );
    });

    it('rejects CIDv0, non-raw codecs, and non-sha2-256 multihashes', () => {
      const digest = new Uint8Array(32);
      const dagPbCid = buildCidV1FromDigest(0x70, digest);
      const nonShaCid = CID.createV1(0x55, Digest.create(0x1e, digest)).toString();

      assert.throws(
        () => parsePolicySubject({ type: 'cid', value: 'QmYwAPJzv5CZsnAzt8auVZRnGiRAKJuxWjztU1Vbo1Y7L8' }),
        /CIDv1/,
      );
      assert.throws(
        () => parsePolicySubject({ type: 'cid', value: dagPbCid }),
        /raw codec/,
      );
      assert.throws(
        () => parsePolicySubject({ type: 'cid', value: nonShaCid }),
        /sha2-256/,
      );
    });
  });

  describe('address subjects', () => {
    it('includes the canonical decimal chain ID in the subject key', () => {
      assert.deepEqual(parsePolicySubject({ type: 'address', value: ADDRESS, chainId: '8453' }), {
        type: 'address',
        value: ADDRESS,
        chainId: '8453',
      });
      assert.equal(
        policySubjectKey({ type: 'address', value: ADDRESS, chainId: '8453' }),
        `address:8453:${ADDRESS}`,
      );
    });

    it('rejects non-lowercase addresses and non-canonical chain IDs', () => {
      assert.throws(
        () => parsePolicySubject({ type: 'address', value: ADDRESS.toUpperCase(), chainId: '8453' }),
        /lowercase 0x hex/,
      );
      for (const chainId of ['01', '+1', '-1', '1.0', 1]) {
        assert.throws(
          () => parsePolicySubject({ type: 'address', value: ADDRESS, chainId }),
          /chainId/,
        );
      }
    });
  });

  describe('channel subjects', () => {
    it('lowercases platform and kind while preserving the opaque ID byte-for-byte', () => {
      const subject = { type: 'channel' as const, value: 'Twitter:UID:Case:Sensitive/User' };

      assert.deepEqual(parsePolicySubject(subject), {
        type: 'channel',
        value: 'twitter:uid:Case:Sensitive/User',
      });
      assert.equal(policySubjectKey(subject), 'channel:twitter:uid:Case:Sensitive/User');
    });

    it('requires non-empty visible-ASCII platform and kind segments', () => {
      for (const value of ['twitter:uid', ':uid:123', 'twitter::123', 'twitter:uid:', 'tw itter:uid:123', 'twitter:üid:123']) {
        assert.throws(() => parsePolicySubject({ type: 'channel', value }), /Channel policy subject/);
      }
    });
  });

  it('strictly rejects unknown, missing, and type-specific fields', () => {
    assert.throws(() => parsePolicySubject(null), /must be an object/);
    assert.throws(() => parsePolicySubject({ type: 'wallet', value: ADDRESS }), /Unknown policy subject type/);
    assert.throws(() => parsePolicySubject({ type: 'cid' }), /Missing policy subject field: value/);
    assert.throws(
      () => parsePolicySubject({ type: 'cid', value: RAW_SHA256_CID, chainId: '1' }),
      /Unknown policy subject field: chainId/,
    );
    assert.throws(
      () => parsePolicySubject({ type: 'channel', value: 'twitter:uid:\ud800' }),
      /valid Unicode/,
    );
  });

  it('rejects duplicates after canonicalization', () => {
    const base36Cid = CID.parse(RAW_SHA256_CID).toString(base36);

    assert.throws(
      () => assertUniquePolicySubjects([
        { type: 'cid', value: RAW_SHA256_CID },
        { type: 'cid', value: base36Cid },
      ]),
      new RegExp(`Duplicate policy subject: cid:${RAW_SHA256_CID}`),
    );
    assert.throws(
      () => assertUniquePolicySubjects([
        { type: 'channel', value: 'Twitter:UID:123' },
        { type: 'channel', value: 'twitter:uid:123' },
      ]),
      /Duplicate policy subject: channel:twitter:uid:123/,
    );
  });
});
