import assert from 'node:assert';
import type { DisplayableDocument, IpfsCidV1, SDKMachinery } from '@commonality/sdk';
import { publishBridgeStatement } from '../src/statementPublisher.js';

describe('publishBridgeStatement', () => {
  it('uploads bridge-created text statements with the expected metadata', async () => {
    let uploadedDoc: DisplayableDocument | undefined;
    let uploadedIpfsConfig: unknown;

    const cid = await publishBridgeStatement(
      { ipfsConfig: { apiUrl: 'http://ipfs.local' } } as SDKMachinery,
      'A common-ground statement',
      {
        uploadToIPFS: async (ipfsConfig, doc) => {
          uploadedIpfsConfig = ipfsConfig;
          uploadedDoc = doc as DisplayableDocument;
          return 'bafy-bridge-statement' as IpfsCidV1;
        },
      },
    );

    assert.strictEqual(cid, 'bafy-bridge-statement');
    assert.deepStrictEqual(uploadedIpfsConfig, { apiUrl: 'http://ipfs.local' });
    assert.deepStrictEqual(uploadedDoc, {
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
