import assert from 'assert';
import type { Address } from 'viem';
import {
  clearWalletCapabilitiesCache,
  getWalletCapabilities,
  paymasterServiceCapability,
} from './walletCapabilities.js';

const ACCOUNT = '0xbbbb000000000000000000000000000000000000' as Address;

describe('walletCapabilities', () => {
  beforeEach(() => clearWalletCapabilitiesCache());

  it('parses paymasterService and atomicBatch from wallet_getCapabilities', async () => {
    const walletClient = {
      request: async () => ({
        '0x14a34': {
          paymasterService: { supported: true },
          atomicBatch: { supported: true },
        },
      }),
    };
    const caps = await getWalletCapabilities(walletClient, ACCOUNT, 84532);
    assert.deepStrictEqual(caps, { atomicBatches: true, paymasterService: true });
  });

  it('treats atomic.status supported as atomic batches', async () => {
    const walletClient = {
      request: async () => ({
        '0x14a34': { atomic: { status: 'supported' } },
      }),
    };
    const caps = await getWalletCapabilities(walletClient, ACCOUNT, 84532);
    assert.deepStrictEqual(caps, { atomicBatches: true, paymasterService: false });
  });

  it('returns none when the method is missing', async () => {
    const walletClient = {
      request: async () => {
        throw Object.assign(new Error('method not found'), { code: -32601 });
      },
    };
    const caps = await getWalletCapabilities(walletClient, ACCOUNT, 84532);
    assert.deepStrictEqual(caps, { atomicBatches: false, paymasterService: false });
  });

  it('caches per account and chain', async () => {
    let calls = 0;
    const walletClient = {
      request: async () => {
        calls += 1;
        return { '0x14a34': { atomicBatch: { supported: true } } };
      },
    };
    await getWalletCapabilities(walletClient, ACCOUNT, 84532);
    await getWalletCapabilities(walletClient, ACCOUNT, 84532);
    assert.strictEqual(calls, 1);
  });

  it('does not reuse another connected wallet capabilities for the same account', async () => {
    const smart = { request: async () => ({ '0x14a34': { atomicBatch: { supported: true } } }) };
    const plain = { request: async () => ({}) };
    assert.strictEqual((await getWalletCapabilities(smart, ACCOUNT, 84532)).atomicBatches, true);
    assert.strictEqual((await getWalletCapabilities(plain, ACCOUNT, 84532)).atomicBatches, false);
  });

  it('retries after a transient RPC failure', async () => {
    let attempts = 0;
    const wallet = { request: async () => {
      if (++attempts === 1) throw new Error('disconnected');
      return { '0x14a34': { paymasterService: { supported: true } } };
    } };
    assert.strictEqual((await getWalletCapabilities(wallet, ACCOUNT, 84532)).paymasterService, false);
    assert.strictEqual((await getWalletCapabilities(wallet, ACCOUNT, 84532)).paymasterService, true);
  });

  it('attaches paymasterService only when the wallet supports it and a URL is set', () => {
    assert.deepStrictEqual(
      paymasterServiceCapability('https://example.test/paymaster', {
        atomicBatches: true,
        paymasterService: true,
      }),
      { paymasterService: { url: 'https://example.test/paymaster' } },
    );
    assert.strictEqual(
      paymasterServiceCapability('https://example.test/paymaster', {
        atomicBatches: true,
        paymasterService: false,
      }),
      undefined,
    );
    assert.strictEqual(
      paymasterServiceCapability(undefined, { atomicBatches: true, paymasterService: true }),
      undefined,
    );
  });
});
