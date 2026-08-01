import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import {
  canonicalizeJson,
  canonicalJsonSha256,
  parseStrictJson,
} from './json.js';

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

describe('strict policy JSON and RFC 8785 canonicalization', () => {
  it('strictly parses valid UTF-8 JSON', () => {
    assert.deepEqual(
      parseStrictJson(utf8('{"schema":"example/v1","entries":[true,false,null,1.5]}')),
      { schema: 'example/v1', entries: [true, false, null, 1.5] },
    );
  });

  it('rejects duplicate keys at every object depth', () => {
    assert.throws(() => parseStrictJson(utf8('{"a":1,"a":2}')), /Duplicate object key "a"/);
    assert.throws(() => parseStrictJson(utf8('{"outer":{"a":1,"a":2}}')), /Duplicate object key "a"/);
    assert.throws(() => parseStrictJson(utf8('{"a":1,"\\u0061":2}')), /Duplicate object key "a"/);
  });

  it('rejects trailing data, malformed JSON, invalid Unicode, and invalid UTF-8', () => {
    assert.throws(() => parseStrictJson(utf8('{} []')), /Trailing data/);
    assert.throws(() => parseStrictJson(utf8('{"a":01}')), /comma or closing brace/);
    assert.throws(() => parseStrictJson(utf8('{"a":"\\ud800"}')), /valid Unicode/);
    assert.throws(() => parseStrictJson(Uint8Array.from([0x7b, 0x22, 0xff, 0x22, 0x7d])), /not valid UTF-8/);
  });

  it('matches the RFC 8785 serialization example', () => {
    const input = parseStrictJson(utf8(`{
      "numbers": [333333333.33333329, 1E30, 4.50, 2e-3, 0.000000000000000000000000001],
      "literals": [null, true, false]
    }`));

    assert.equal(
      canonicalizeJson(input),
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27]}',
    );
  });

  it('sorts property names by UTF-16 code units and hashes canonical bytes', () => {
    const first = parseStrictJson(utf8('{"z":1,"a":2,"😀":3,"é":4}'));
    const second = parseStrictJson(utf8('{"é":4,"😀":3,"a":2,"z":1}'));

    assert.equal(canonicalizeJson(first), '{"a":2,"z":1,"é":4,"😀":3}');
    assert.equal(canonicalizeJson(first), canonicalizeJson(second));
    assert.equal(canonicalJsonSha256(first), canonicalJsonSha256(second));
    assert.match(canonicalJsonSha256(first), /^0x[0-9a-f]{64}$/);
  });
});
