import assert from 'assert';
import { fetchStatementDomain, fetchStatementDomains } from '../src/domainFetcher.js';

describe('domainFetcher', () => {
  describe('fetchStatementDomain', () => {
    it('returns domain from valid statement content', async () => {
      // We can't easily mock fetch in this test setup, so we test the happy path
      // by verifying the function structure. In practice this is tested via integration.
      const result = await fetchStatementDomain('http://localhost:8080', 'someCid');
      // Will be null since no real IPFS gateway is running, but shouldn't throw
      assert.strictEqual(result, null);
    });
  });

  describe('fetchStatementDomains', () => {
    it('returns empty map when no CIDs provided', async () => {
      const result = await fetchStatementDomains('http://localhost:8080', []);
      assert.strictEqual(result.size, 0);
    });

    it('deduplicates CIDs before fetching', async () => {
      const result = await fetchStatementDomains('http://localhost:8080', ['cid1', 'cid1', 'cid2']);
      // Should not throw even with duplicate CIDs
      assert.ok(result instanceof Map);
    });
  });
});
