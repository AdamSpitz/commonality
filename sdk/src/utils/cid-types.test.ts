import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';
import { hexToBytes } from 'viem';
import {
  buildCidV1FromDigest, bytes32ToCid, cidToBytes32,
  normalizeCidV1, normalizeIpfsMetadataReference,
} from './cid-types.js';
import { publishedDataIdToCid, type PublishedDataId } from '../subsystems/published-data/index.js';

const digest = '0xb94d27b9934d3e08a52e52d7da7dabfadeaef5c6a6685dbb5d3bdf62a8eebbf3' as const;
const raw = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';
const dagPb = 'bafybeifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';

describe('chain-backed CID encoding', () => {
  it('round-trips the canonical raw SHA-256 CID and agrees with PublishedData', () => {
    const expected = CID.createV1(0x55, createDigest(0x12, hexToBytes(digest)));
    assert.equal(bytes32ToCid(digest), expected.toString());
    assert.equal(bytes32ToCid(digest), raw);
    assert.equal(cidToBytes32(raw), digest);
    assert.equal(publishedDataIdToCid(digest as PublishedDataId), raw);
    assert.equal(normalizeCidV1(digest), raw);
    assert.equal(bytes32ToCid(`0x${digest.slice(2).toUpperCase()}`), raw);
  });

  it('rejects dag-pb rather than silently losing the codec', () => {
    assert.throws(() => cidToBytes32(dagPb), /raw codec/);
  });

  it('rejects malformed digests', () => {
    for (const value of ['0x', '0x1234', `0x${'z'.repeat(64)}`, `${digest}00`, digest.slice(2)]) {
      assert.throws(() => bytes32ToCid(value as `0x${string}`), /Expected bytes32/);
    }
  });

  it('rejects truncated, overlong, noncanonical, or non-SHA-256 CIDs', () => {
    const parsed = CID.parse(raw);
    const wrongHash = CID.createV1(0x55, { ...parsed.multihash, code: 0x13,
      bytes: new Uint8Array([0x13, 0x20, ...parsed.multihash.digest]) }).toString();
    for (const value of [raw.slice(0, -2), `${raw}aa`, `${raw.slice(0, -1)}n`, wrongHash]) {
      assert.throws(() => cidToBytes32(value));
    }
    assert.throws(() => cidToBytes32(buildCidV1FromDigest(0x55, new Uint8Array(31))));
  });

  it('preserves genuine dag-pb and CIDv0 references in generic metadata normalization', () => {
    const cidV0 = CID.parse(dagPb).toV0().toString();
    assert.equal(normalizeCidV1(cidV0), dagPb);
    assert.equal(normalizeCidV1(dagPb), dagPb);
    assert.equal(normalizeIpfsMetadataReference(`ipfs://${cidV0}/`), dagPb);
  });
});
