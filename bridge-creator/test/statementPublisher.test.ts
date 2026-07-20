import assert from 'node:assert';
import { fetchDocument } from '@commonality/sdk/displayable-documents';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import { clearMockIPFS } from '@commonality/sdk/utils';
import { publishBridgeStatement } from '../src/statementPublisher.js';

describe('publishBridgeStatement', () => {
  beforeEach(() => {
    clearMockIPFS();
  });

  it('publishes bridge-created text statements through the default DocumentStore seam', async () => {
    const machinery = { ipfsConfig: { shouldUseMock: true } } as SDKMachinery;

    const cid = await publishBridgeStatement(
      machinery,
      'A common-ground statement',
    );

    const document = await fetchDocument(machinery.ipfsConfig, cid);
    assert.deepStrictEqual(document, {
      format: 'text/plain',
      content: 'A common-ground statement',
      assets: {},
      references: [],
      extras: {
        statement: true,
        createdBy: 'bridge-creator',
      },
    });
  });
});
