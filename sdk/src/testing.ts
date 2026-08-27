/**
 * Test-only SDK helpers. Import from `@commonality/sdk/testing`, not `/utils`,
 * so production UI bundles do not pull Hardhat keys or in-memory IPFS.
 */

export { TEST_PRIVATE_KEYS, fakeIpfsCidV1 } from './utils/test-helpers.js';
export {
  fetchFromMockIPFS,
  clearMockIPFS,
  uploadToMockIPFS,
  uploadBlobToMockIPFS,
} from './utils/mock-ipfs.js';
