import assert from 'node:assert/strict';
import type { IpfsCidV1 } from '@commonality/sdk';
import {
  extractCanonicalIdFromStructuredContent,
  resolveBeatAgentContentForRequest,
  type PlatformLocalContextResponse,
} from '../src/index.js';

const ipfsConfig = {
  apiUrl: 'http://localhost:5001',
  gatewayUrl: 'http://localhost:8080',
};

const statementCid = 'bafybeistatementcid' as IpfsCidV1;

describe('beat-agent content resolution', () => {
  it('uses platform local-context target text and validates URL canonical IDs', async () => {
    const result = await resolveBeatAgentContentForRequest(
      {
        contentCanonicalId: 'twitter:uid:123:456',
        statementCid,
        contentUrl: 'https://x.com/alice/status/456',
      },
      ipfsConfig,
      {
        platformApiUrl: 'https://platform.example',
        fetchPlatformLocalContext: async (platformApiUrl, url): Promise<PlatformLocalContextResponse> => {
          assert.equal(platformApiUrl, 'https://platform.example');
          assert.equal(url, 'https://x.com/alice/status/456');
          return {
            target: {
              canonicalId: 'twitter:uid:123:456',
              text: '  Resolved post text  ',
            },
          };
        },
      },
    );

    assert.equal(result, 'Resolved post text');
  });

  it('rejects URL requests whose submitted canonical ID does not match platform resolution', async () => {
    await assert.rejects(
      resolveBeatAgentContentForRequest(
        {
          contentCanonicalId: 'twitter:uid:attacker:999',
          statementCid,
          contentUrl: 'https://x.com/alice/status/456',
        },
        ipfsConfig,
        {
          platformApiUrl: 'https://platform.example',
          fetchPlatformLocalContext: async () => ({
            target: {
              canonicalId: 'twitter:uid:123:456',
              text: 'Resolved post text',
            },
          }),
        },
      ),
      /Content canonical ID mismatch: request used twitter:uid:attacker:999, but platform API resolved twitter:uid:123:456/,
    );
  });

  it('validates structured content CID canonical IDs when declared', async () => {
    const result = await resolveBeatAgentContentForRequest(
      {
        contentCanonicalId: 'twitter:uid:123:456',
        statementCid,
        contentCid: 'bafybeicontentcid' as IpfsCidV1,
      },
      ipfsConfig,
      {
        fetchIpfsContent: async (_ipfsConfig, cid) => {
          assert.equal(cid, 'bafybeicontentcid');
          return JSON.stringify({
            contentCanonicalId: 'twitter:uid:123:456',
            content: { text: 'CID content text' },
          });
        },
      },
    );

    assert.equal(result, 'CID content text');
  });

  it('rejects structured content CIDs that declare a different canonical ID', async () => {
    await assert.rejects(
      resolveBeatAgentContentForRequest(
        {
          contentCanonicalId: 'twitter:uid:attacker:999',
          statementCid,
          contentCid: 'bafybeicontentcid' as IpfsCidV1,
        },
        ipfsConfig,
        {
          fetchIpfsContent: async () => JSON.stringify({
            canonicalId: 'twitter:uid:123:456',
            text: 'CID content text',
          }),
        },
      ),
      /Content canonical ID mismatch: request used twitter:uid:attacker:999, but content CID declares twitter:uid:123:456/,
    );
  });

  it('extracts declared canonical IDs from structured content documents', () => {
    assert.equal(
      extractCanonicalIdFromStructuredContent(JSON.stringify({
        contentCanonicalId: 'twitter:uid:123:456',
        content: { text: 'Post text' },
      })),
      'twitter:uid:123:456',
    );
    assert.equal(
      extractCanonicalIdFromStructuredContent(JSON.stringify({
        content: { canonicalId: 'youtube:channel:abc:def', text: 'Video text' },
      })),
      'youtube:channel:abc:def',
    );
    assert.equal(extractCanonicalIdFromStructuredContent('plain text'), null);
  });

  it('falls back to direct URL fetching when platform API target has no text', async () => {
    const result = await resolveBeatAgentContentForRequest(
      {
        contentCanonicalId: 'substack:publication:post',
        statementCid,
        contentUrl: 'https://example.substack.com/p/post',
      },
      ipfsConfig,
      {
        platformApiUrl: 'https://platform.example',
        fetchPlatformLocalContext: async () => ({
          target: {
            canonicalId: 'substack:publication:post',
          },
        }),
        fetchUrlContent: async (url) => {
          assert.equal(url, 'https://example.substack.com/p/post');
          return 'Fetched long-form content';
        },
      },
    );

    assert.equal(result, 'Fetched long-form content');
  });
});
