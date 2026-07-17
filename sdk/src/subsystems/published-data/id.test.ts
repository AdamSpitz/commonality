import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { hexToBytes, sha256, toBytes } from 'viem';
import { buildCidV1FromDigest } from '../../utils/cid-types.js';
import {
  computePublishedDataId,
  PUBLISHED_DATA_CID_CODEC,
  publishedDataCidToId,
  publishedDataIdToCid,
} from './index.js';
import type { PublishedDataId } from './types.js';

describe('published-data ids', () => {
  it('computes the same dataId rule as the contract', () => {
    const content = toBytes('hello published data');

    assert.equal(computePublishedDataId(content), sha256(content));
  });

  it('uses CIDv1/base32 + raw multicodec + sha2-256 for user-facing CIDs', () => {
    const dataId = '0xb94d27b9934d3e08a52e52d7da7dabfadeaef5c6a6685dbb5d3bdf62a8eebbf3' as PublishedDataId;
    const expected = buildCidV1FromDigest(PUBLISHED_DATA_CID_CODEC, hexToBytes(dataId));

    assert.equal(publishedDataIdToCid(dataId), expected);
    assert.equal(publishedDataIdToCid(dataId), 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m');
  });

  it('round-trips from canonical CID back to dataId', () => {
    const dataId = computePublishedDataId(toBytes('round trip content'));
    const cid = publishedDataIdToCid(dataId);

    assert.equal(publishedDataCidToId(cid), dataId);
  });

  it('rejects malformed dataIds before constructing a CID', () => {
    assert.throws(
      () => publishedDataIdToCid('0x1234' as PublishedDataId),
      /Expected bytes32 hex value/,
    );
  });
});
