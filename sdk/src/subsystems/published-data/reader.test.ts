import { strict as assert } from 'assert';
import { readActiveData, readData, readRetractions } from './reader.js';
import type { PublishedDataCache, PublishedDataId } from './types.js';
import type { Address } from 'viem';

const alice = '0x00000000000000000000000000000000000000a1' as Address;
const bob = '0x00000000000000000000000000000000000000b0' as Address;
const dataId = '0x1111111111111111111111111111111111111111111111111111111111111111' as PublishedDataId;
const bytes = new Uint8Array([1, 2, 3]);

function makeCache(options: { published?: boolean; retracted?: readonly Address[]; data?: Uint8Array | null }): PublishedDataCache {
  return {
    async getPublishedData() {
      return Object.hasOwn(options, 'data') ? options.data ?? null : bytes;
    },
    async isPublished() {
      return options.published ?? true;
    },
    async isRetracted(publisher) {
      return options.retracted?.includes(publisher) ?? false;
    },
  };
}

describe('published-data reader', () => {
  it('returns active data only when the publication exists and is unretracted', async () => {
    assert.deepEqual(await readData(makeCache({}), alice, dataId), { status: 'active', data: bytes });
    assert.equal(await readActiveData(makeCache({}), alice, dataId), bytes);
  });

  it('names retracted bytes retractedData so callers must branch explicitly', async () => {
    assert.deepEqual(await readData(makeCache({ retracted: [alice] }), alice, dataId), {
      status: 'retracted',
      retractedData: bytes,
    });
    assert.equal(await readActiveData(makeCache({ retracted: [alice] }), alice, dataId), null);
  });

  it('returns not-published when either the publication bit or cached bytes are missing', async () => {
    assert.deepEqual(await readData(makeCache({ published: false }), alice, dataId), { status: 'not-published' });
    assert.deepEqual(await readData(makeCache({ data: null }), alice, dataId), { status: 'not-published' });
  });

  it('reports only the configured retractors that actually retracted', async () => {
    assert.deepEqual(await readRetractions(makeCache({ retracted: [bob] }), dataId, [alice, bob]), [bob]);
  });
});
