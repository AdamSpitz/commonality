import assert from 'assert';
import {
  toCanonicalJson,
  createDisplayableDocument,
  createStatement,
  validateDisplayableDocument,
  isDisplayableDocument,
  publishDocument,
  fetchDocument,
  type DisplayableDocument,
  type DisplayFormat
} from './displayable-document.js';
import { clearMockIPFS } from '../../utils/mock-ipfs.js';
import { fakeIpfsCidV1 } from '../../utils/cid-types.js';
import { uploadToIPFS } from '../../utils/ipfs.js';
import { createSDKMachinery } from '../../machinery.js';

const machinery = createSDKMachinery();

// ============================================================================
// toCanonicalJson
// ============================================================================

describe('toCanonicalJson', () => {
  it('sorts object keys alphabetically', () => {
    const result = toCanonicalJson({ z: 1, a: 2, m: 3 });
    assert.strictEqual(result, '{"a":2,"m":3,"z":1}');
  });

  it('sorts nested object keys', () => {
    const result = toCanonicalJson({ b: { d: 1, c: 2 }, a: 1 });
    assert.strictEqual(result, '{"a":1,"b":{"c":2,"d":1}}');
  });

  it('preserves array order (does not sort arrays)', () => {
    const result = toCanonicalJson({ items: [3, 1, 2] });
    assert.strictEqual(result, '{"items":[3,1,2]}');
  });

  it('produces no unnecessary whitespace', () => {
    const result = toCanonicalJson({ hello: 'world' });
    assert.ok(!result.includes(' '));
    assert.ok(!result.includes('\n'));
  });

  it('produces identical output for identical content regardless of key order', () => {
    const a = toCanonicalJson({ format: 'text/plain', content: 'hello' });
    const b = toCanonicalJson({ content: 'hello', format: 'text/plain' });
    assert.strictEqual(a, b);
  });

  it('handles null values', () => {
    const result = toCanonicalJson({ a: null });
    assert.strictEqual(result, '{"a":null}');
  });

  it('handles arrays of objects with unsorted keys', () => {
    const result = toCanonicalJson([{ b: 1, a: 2 }]);
    assert.strictEqual(result, '[{"a":2,"b":1}]');
  });
});

// ============================================================================
// validateDisplayableDocument
// ============================================================================

describe('validateDisplayableDocument', () => {
  describe('basic validation', () => {
    it('accepts a minimal valid document', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'Hello world',
      });
      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it('rejects null', () => {
      const result = validateDisplayableDocument(null);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors[0].includes('must be an object'));
    });

    it('rejects undefined', () => {
      const result = validateDisplayableDocument(undefined);
      assert.strictEqual(result.valid, false);
    });

    it('rejects a non-object', () => {
      const result = validateDisplayableDocument('hello');
      assert.strictEqual(result.valid, false);
    });
  });

  describe('format field', () => {
    it('rejects missing format', () => {
      const result = validateDisplayableDocument({ content: 'hello' });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('format')));
    });

    it('rejects invalid format value', () => {
      const result = validateDisplayableDocument({
        format: 'text/html',
        content: 'hello',
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Invalid format')));
    });

    it('accepts text/plain', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
      });
      assert.strictEqual(result.valid, true);
    });

    it('accepts markdown-restricted', () => {
      const result = validateDisplayableDocument({
        format: 'markdown-restricted',
        content: 'hello',
      });
      assert.strictEqual(result.valid, true);
    });
  });

  describe('content field', () => {
    it('rejects missing content', () => {
      const result = validateDisplayableDocument({ format: 'text/plain' });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('content')));
    });

    it('rejects non-string content', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 123,
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('content') && e.includes('string')));
    });

    it('accepts empty string content', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: '',
      });
      assert.strictEqual(result.valid, true);
    });

    it('rejects content exceeding 50k characters', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'x'.repeat(50001),
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('maximum size')));
    });

    it('accepts content at exactly 50k characters', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'x'.repeat(50000),
      });
      assert.strictEqual(result.valid, true);
    });
  });

  describe('markdown-restricted external URL checks', () => {
    it('rejects external link URLs', () => {
      const result = validateDisplayableDocument({
        format: 'markdown-restricted',
        content: 'Check [this link](https://example.com)',
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('External URLs')));
    });

    it('rejects external image URLs', () => {
      const result = validateDisplayableDocument({
        format: 'markdown-restricted',
        content: '![image](https://example.com/img.png)',
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('External image URLs')));
    });

    it('rejects http:// URLs too', () => {
      const result = validateDisplayableDocument({
        format: 'markdown-restricted',
        content: '[link](http://example.com)',
      });
      assert.strictEqual(result.valid, false);
    });

    it('allows asset references', () => {
      const result = validateDisplayableDocument({
        format: 'markdown-restricted',
        content: '![diagram](asset:diagram)',
      });
      assert.strictEqual(result.valid, true);
    });

    it('allows document references', () => {
      const result = validateDisplayableDocument({
        format: 'markdown-restricted',
        content: 'See [related doc](ref:0)',
      });
      assert.strictEqual(result.valid, true);
    });

    it('does NOT reject external URLs in text/plain format', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'Visit [this](https://example.com)',
      });
      assert.strictEqual(result.valid, true);
    });
  });

  describe('assets validation', () => {
    it('accepts valid inline asset', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        assets: {
          header: { mimeType: 'image/png', data: 'base64data' },
        },
      });
      assert.strictEqual(result.valid, true);
    });

    it('accepts valid CID asset', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        assets: {
          diagram: { mimeType: 'image/svg+xml', cid: fakeIpfsCidV1('diagram') },
        },
      });
      assert.strictEqual(result.valid, true);
    });

    it('rejects asset with both data and cid', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        assets: {
          bad: { mimeType: 'image/png', data: 'base64', cid: fakeIpfsCidV1('bad') },
        },
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('cannot have both')));
    });

    it('rejects asset with neither data nor cid', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        assets: {
          broken: { mimeType: 'image/png' },
        },
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('must have either')));
    });

    it('rejects asset with missing mimeType', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        assets: {
          noMime: { data: 'base64data' },
        },
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('mimeType')));
    });

    it('rejects non-object assets field', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        assets: 'not-an-object',
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('assets') && e.includes('object')));
    });

    it('rejects array as assets field', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        assets: [],
      });
      assert.strictEqual(result.valid, false);
    });
  });

  describe('references validation', () => {
    it('accepts valid reference with cid only', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        references: [{ cid: fakeIpfsCidV1('reference-cid') }],
      });
      assert.strictEqual(result.valid, true);
    });

    it('accepts valid reference with cid and label', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        references: [{ cid: fakeIpfsCidV1('reference-cid'), label: 'Related doc' }],
      });
      assert.strictEqual(result.valid, true);
    });

    it('rejects reference missing cid', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        references: [{ label: 'no cid' }],
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Reference[0]') && e.includes('cid')));
    });

    it('rejects reference with non-string label', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        references: [{ cid: fakeIpfsCidV1('reference-cid'), label: 42 }],
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('label')));
    });

    it('rejects non-array references field', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        references: 'not-an-array',
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('references') && e.includes('array')));
    });
  });

  describe('extras validation', () => {
    it('accepts valid extras object', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        extras: { topic: 'energy', nested: { a: 1 } },
      });
      assert.strictEqual(result.valid, true);
    });

    it('rejects non-object extras', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        extras: 'not-an-object',
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('extras') && e.includes('object')));
    });

    it('rejects array as extras', () => {
      const result = validateDisplayableDocument({
        format: 'text/plain',
        content: 'hello',
        extras: [1, 2, 3],
      });
      assert.strictEqual(result.valid, false);
    });
  });

  describe('accumulates multiple errors', () => {
    it('reports all errors at once', () => {
      const result = validateDisplayableDocument({
        format: 'invalid-format',
        content: 42,
        assets: 'bad',
        references: 'bad',
        extras: 'bad',
      });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length >= 4);
    });
  });
});

// ============================================================================
// createDisplayableDocument
// ============================================================================

describe('createDisplayableDocument', () => {
  it('creates a minimal document', () => {
    const doc = createDisplayableDocument({
      format: 'text/plain',
      content: 'Hello world',
    });
    assert.strictEqual(doc.format, 'text/plain');
    assert.strictEqual(doc.content, 'Hello world');
    assert.strictEqual(doc.assets, undefined);
    assert.strictEqual(doc.references, undefined);
    assert.strictEqual(doc.extras, undefined);
  });

  it('creates a full document with all fields', () => {
    const doc = createDisplayableDocument({
      format: 'markdown-restricted',
      content: '# Title\n\nBody text with ![img](asset:logo)',
      assets: {
        logo: { mimeType: 'image/png', data: 'base64data' },
      },
      references: [{ cid: fakeIpfsCidV1('reference-cid'), label: 'Related' }],
      extras: { topic: 'test' },
    });
    assert.strictEqual(doc.format, 'markdown-restricted');
    assert.ok(doc.assets);
    assert.ok(doc.references);
    assert.ok(doc.extras);
  });

  it('omits empty optional fields', () => {
    const doc = createDisplayableDocument({
      format: 'text/plain',
      content: 'hello',
      assets: {},
      references: [],
      extras: {},
    });
    assert.strictEqual(doc.assets, undefined);
    assert.strictEqual(doc.references, undefined);
    assert.strictEqual(doc.extras, undefined);
  });

  it('throws on invalid document', () => {
    assert.throws(
      () => createDisplayableDocument({
        format: 'bad-format' as DisplayFormat, // type system wouldn't allow this but that's exactly what we're testing - do we get an error at runtime?
        content: 'hello',
      }),
      /Invalid displayable document/
    );
  });

  it('throws on external URL in markdown-restricted', () => {
    assert.throws(
      () => createDisplayableDocument({
        format: 'markdown-restricted',
        content: '[link](https://example.com)',
      }),
      /External URLs/
    );
  });
});

// ============================================================================
// isDisplayableDocument
// ============================================================================

describe('isDisplayableDocument', () => {
  it('returns true for valid document', () => {
    assert.strictEqual(
      isDisplayableDocument({ format: 'text/plain', content: 'hello' }),
      true
    );
  });

  it('returns true for document with extra fields (type guard is loose)', () => {
    assert.strictEqual(
      isDisplayableDocument({ format: 'text/plain', content: 'hello', extra: true }),
      true
    );
  });

  it('returns false for null', () => {
    assert.strictEqual(isDisplayableDocument(null), false);
  });

  it('returns false for undefined', () => {
    assert.strictEqual(isDisplayableDocument(undefined), false);
  });

  it('returns false for string', () => {
    assert.strictEqual(isDisplayableDocument('hello'), false);
  });

  it('returns false for array', () => {
    assert.strictEqual(isDisplayableDocument([]), false);
  });

  it('returns false for object missing format', () => {
    assert.strictEqual(isDisplayableDocument({ content: 'hello' }), false);
  });

  it('returns false for object missing content', () => {
    assert.strictEqual(isDisplayableDocument({ format: 'text/plain' }), false);
  });
});

// ============================================================================
// createStatement
// ============================================================================

describe('createStatement', () => {
  it('creates a statement with correct defaults', () => {
    const doc = createStatement({ content: 'I believe in clean energy.' });
    assert.strictEqual(doc.format, 'markdown-restricted');
    assert.strictEqual(doc.content, 'I believe in clean energy.');
    assert.ok(doc.extras);
    assert.strictEqual(doc.extras!.statementType, 'statement');
    assert.ok(doc.extras!.createdDate);
  });

  it('includes topic when provided', () => {
    const doc = createStatement({
      content: 'Solar is great.',
      topic: 'energy',
    });
    assert.strictEqual(doc.extras!.topic, 'energy');
  });

  it('uses provided createdDate', () => {
    const date = '2025-01-01T00:00:00.000Z';
    const doc = createStatement({
      content: 'Test statement.',
      createdDate: date,
    });
    assert.strictEqual(doc.extras!.createdDate, date);
  });

  it('includes references when provided', () => {
    const doc = createStatement({
      content: 'See [related](ref:0)',
      references: [{ cid: fakeIpfsCidV1('reference-cid') }],
    });
    assert.ok(doc.references);
    assert.strictEqual(doc.references!.length, 1);
  });

  it('merges custom extras with defaults', () => {
    const doc = createStatement({
      content: 'Test',
      extras: { sentiment: 'supportive' },
    });
    assert.strictEqual(doc.extras!.statementType, 'statement');
    assert.strictEqual(doc.extras!.sentiment, 'supportive');
  });

  it('allows custom extras to override statementType', () => {
    const doc = createStatement({
      content: 'Test',
      extras: { statementType: 'proposal' },
    });
    assert.strictEqual(doc.extras!.statementType, 'proposal');
  });
});

// ============================================================================
// Canonical JSON + Document identity
// ============================================================================

describe('document identity via canonical JSON', () => {
  it('two documents with same content produce identical canonical JSON', () => {
    const doc1 = createDisplayableDocument({
      format: 'text/plain',
      content: 'hello',
      extras: { b: 2, a: 1 },
    });
    const doc2 = createDisplayableDocument({
      format: 'text/plain',
      content: 'hello',
      extras: { a: 1, b: 2 },
    });
    assert.strictEqual(toCanonicalJson(doc1), toCanonicalJson(doc2));
  });

  it('different content produces different canonical JSON', () => {
    const doc1 = createDisplayableDocument({ format: 'text/plain', content: 'hello' });
    const doc2 = createDisplayableDocument({ format: 'text/plain', content: 'world' });
    assert.notStrictEqual(toCanonicalJson(doc1), toCanonicalJson(doc2));
  });
});

// ============================================================================
// publishDocument + fetchDocument
// ============================================================================

describe('publishDocument', () => {
  beforeEach(() => {
    clearMockIPFS();
  });

  it('publishes a valid document and returns a CID string', async () => {
    const doc = createDisplayableDocument({
      format: 'text/plain',
      content: 'Hello world',
    });
    const cid = await publishDocument(machinery.ipfsConfig, doc);
    assert.ok(typeof cid === 'string');
    assert.ok(cid.length > 0);
  });

  it('returns the same CID for the same document content', async () => {
    const doc1 = createDisplayableDocument({
      format: 'text/plain',
      content: 'Deterministic test',
    });
    const doc2 = createDisplayableDocument({
      format: 'text/plain',
      content: 'Deterministic test',
    });
    const cid1 = await publishDocument(machinery.ipfsConfig, doc1);
    const cid2 = await publishDocument(machinery.ipfsConfig, doc2);
    assert.strictEqual(cid1, cid2);
  });

  it('returns the same CID regardless of original key order', async () => {
    // Manually construct objects with different key orders
    const doc1 = { content: 'hello', format: 'text/plain' } as DisplayableDocument;
    const doc2 = { format: 'text/plain', content: 'hello' } as DisplayableDocument;
    const cid1 = await publishDocument(machinery.ipfsConfig, doc1);
    const cid2 = await publishDocument(machinery.ipfsConfig, doc2);
    assert.strictEqual(cid1, cid2);
  });

  it('returns different CIDs for different documents', async () => {
    const doc1 = createDisplayableDocument({ format: 'text/plain', content: 'hello' });
    const doc2 = createDisplayableDocument({ format: 'text/plain', content: 'world' });
    const cid1 = await publishDocument(machinery.ipfsConfig, doc1);
    const cid2 = await publishDocument(machinery.ipfsConfig, doc2);
    assert.notStrictEqual(cid1, cid2);
  });

  it('throws on invalid document', async () => {
    const bad = { format: 'bad-format', content: 'hello' } as unknown as DisplayableDocument;
    await assert.rejects(() => publishDocument(machinery.ipfsConfig, bad), /Invalid displayable document/);
  });
});

describe('fetchDocument', () => {
  beforeEach(() => {
    clearMockIPFS();
  });

  it('round-trips a document through publish and fetch', async () => {
    const doc = createDisplayableDocument({
      format: 'text/plain',
      content: 'Round trip test',
    });
    const cid = await publishDocument(machinery.ipfsConfig, doc);
    const fetched = await fetchDocument(machinery.ipfsConfig, cid);
    assert.ok(fetched !== null);
    assert.strictEqual(fetched!.format, 'text/plain');
    assert.strictEqual(fetched!.content, 'Round trip test');
  });

  it('round-trips a document with all optional fields', async () => {
    const doc = createDisplayableDocument({
      format: 'markdown-restricted',
      content: '# Hello\n\nSee [ref](ref:0) and ![img](asset:logo)',
      assets: {
        logo: { mimeType: 'image/png', data: 'base64data' },
      },
      references: [{ cid: fakeIpfsCidV1('reference-cid'), label: 'Related doc' }],
      extras: { topic: 'test', nested: { a: 1 } },
    });
    const cid = await publishDocument(machinery.ipfsConfig, doc);
    const fetched = await fetchDocument(machinery.ipfsConfig, cid);
    assert.ok(fetched !== null);
    assert.strictEqual(fetched!.format, 'markdown-restricted');
    assert.ok(fetched!.assets);
    assert.ok(fetched!.assets!.logo);
    assert.strictEqual(fetched!.references!.length, 1);
    assert.strictEqual(fetched!.references![0].label, 'Related doc');
    assert.strictEqual(fetched!.extras!.topic, 'test');
  });

  it('returns null for a non-existent CID', async () => {
    const result = await fetchDocument(machinery.ipfsConfig, fakeIpfsCidV1('nonexistent'));
    assert.strictEqual(result, null);
  });

  it('returns null if fetched content is not a valid displayable document', async () => {
    // Publish raw non-document content via the underlying IPFS mock
    const cid = await uploadToIPFS(machinery.ipfsConfig, { notADocument: true });
    const result = await fetchDocument(machinery.ipfsConfig, cid);
    assert.strictEqual(result, null);
  });
});
