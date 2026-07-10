import assert from 'assert';
import type { generateJwt } from '@coinbase/cdp-sdk/auth';
import { HttpError } from './errors.js';
import { createCoinbaseOnrampSession, getBaseUsdcBalance } from './onramp.js';

const VALID_ADDRESS = '0x1111111111111111111111111111111111111111';
const CREDENTIALS = { apiKeyId: 'key-id', apiKeySecret: 'key-secret' };

/** A generateJwt stand-in that records its args and returns a fixed token. */
function fakeJwt(token = 'stub-jwt'): typeof generateJwt & { calls: unknown[] } {
  const fn = (async (options: unknown) => {
    fn.calls.push(options);
    return token;
  }) as typeof generateJwt & { calls: unknown[] };
  fn.calls = [];
  return fn;
}

/** A fetch stand-in that records the request and returns the given body/status. */
function fakeFetch(body: string, status = 200): typeof fetch & { calls: Array<{ url: string; init?: RequestInit }> } {
  const fn = (async (url: string, init?: RequestInit) => {
    fn.calls.push({ url, init });
    return new Response(body, { status });
  }) as unknown as typeof fetch & { calls: Array<{ url: string; init?: RequestInit }> };
  fn.calls = [];
  return fn;
}

async function expectHttpError(promise: Promise<unknown>, status: number, code: string): Promise<HttpError> {
  try {
    await promise;
  } catch (err) {
    assert.ok(err instanceof HttpError, `expected HttpError, got ${err}`);
    assert.strictEqual(err.status, status);
    assert.strictEqual(err.code, code);
    return err;
  }
  throw new assert.AssertionError({ message: `expected the promise to reject with status ${status}` });
}

describe('createCoinbaseOnrampSession', () => {
  it('fails with 503 when CDP credentials are not configured', async () => {
    await expectHttpError(
      createCoinbaseOnrampSession({}, { address: VALID_ADDRESS }, fakeFetch('{}'), fakeJwt()),
      503,
      'service_unavailable',
    );
  });

  it('rejects an invalid destination address', async () => {
    await expectHttpError(
      createCoinbaseOnrampSession(CREDENTIALS, { address: 'not-an-address' }, fakeFetch('{}'), fakeJwt()),
      400,
      'invalid_request',
    );
  });

  it('rejects a non-positive preset fiat amount', async () => {
    await expectHttpError(
      createCoinbaseOnrampSession(CREDENTIALS, { address: VALID_ADDRESS, presetFiatAmount: '0' }, fakeFetch('{}'), fakeJwt()),
      400,
      'invalid_request',
    );
  });

  it('rejects a malformed fiat currency', async () => {
    await expectHttpError(
      createCoinbaseOnrampSession(CREDENTIALS, { address: VALID_ADDRESS, fiatCurrency: 'dollars' }, fakeFetch('{}'), fakeJwt()),
      400,
      'invalid_request',
    );
  });

  it('builds a pay.coinbase.com URL from the returned session token', async () => {
    const fetchImpl = fakeFetch(JSON.stringify({ token: 'sess-123' }));
    const session = await createCoinbaseOnrampSession(
      CREDENTIALS,
      { address: VALID_ADDRESS, presetFiatAmount: '25', fiatCurrency: 'usd' },
      fetchImpl,
      fakeJwt(),
    );

    assert.strictEqual(session.destinationAddress, VALID_ADDRESS);
    const url = new URL(session.url);
    assert.strictEqual(url.origin + url.pathname, 'https://pay.coinbase.com/buy/select-asset');
    assert.strictEqual(url.searchParams.get('sessionToken'), 'sess-123');
    assert.strictEqual(url.searchParams.get('defaultAsset'), 'USDC');
    assert.strictEqual(url.searchParams.get('defaultNetwork'), 'base');
    assert.strictEqual(url.searchParams.get('defaultPaymentMethod'), 'CARD');
    assert.strictEqual(url.searchParams.get('presetFiatAmount'), '25');
    // fiatCurrency is normalized to upper case.
    assert.strictEqual(url.searchParams.get('fiatCurrency'), 'USD');
  });

  it('extracts the session token from a nested data object', async () => {
    const session = await createCoinbaseOnrampSession(
      CREDENTIALS,
      { address: VALID_ADDRESS },
      fakeFetch(JSON.stringify({ data: { token: 'nested-tok' } })),
      fakeJwt(),
    );
    assert.strictEqual(new URL(session.url).searchParams.get('sessionToken'), 'nested-tok');
  });

  it('extracts the session token from a snake_case session_token field', async () => {
    const session = await createCoinbaseOnrampSession(
      CREDENTIALS,
      { address: VALID_ADDRESS },
      fakeFetch(JSON.stringify({ session_token: 'snake-tok' })),
      fakeJwt(),
    );
    assert.strictEqual(new URL(session.url).searchParams.get('sessionToken'), 'snake-tok');
  });

  it('defaults to a $50 USD checkout when no amount or currency is given', async () => {
    const session = await createCoinbaseOnrampSession(
      CREDENTIALS,
      { address: VALID_ADDRESS },
      fakeFetch(JSON.stringify({ token: 't' })),
      fakeJwt(),
    );
    const url = new URL(session.url);
    assert.strictEqual(url.searchParams.get('presetFiatAmount'), '50');
    assert.strictEqual(url.searchParams.get('fiatCurrency'), 'USD');
  });

  it('forwards the client IP to the Coinbase token request when provided', async () => {
    const fetchImpl = fakeFetch(JSON.stringify({ token: 't' }));
    await createCoinbaseOnrampSession(
      CREDENTIALS,
      { address: VALID_ADDRESS, clientIp: '203.0.113.7' },
      fetchImpl,
      fakeJwt(),
    );
    const body = JSON.parse((fetchImpl.calls[0].init?.body as string) ?? '{}');
    assert.strictEqual(body.clientIp, '203.0.113.7');
    assert.deepStrictEqual(body.assets, ['USDC']);
    assert.deepStrictEqual(body.addresses, [{ address: VALID_ADDRESS, blockchains: ['base'] }]);
  });

  it('surfaces a 502 when the Coinbase token request fails', async () => {
    await expectHttpError(
      createCoinbaseOnrampSession(CREDENTIALS, { address: VALID_ADDRESS }, fakeFetch('upstream boom', 500), fakeJwt()),
      502,
      'coinbase_onramp_error',
    );
  });

  it('surfaces a 502 when the response is not valid JSON', async () => {
    await expectHttpError(
      createCoinbaseOnrampSession(CREDENTIALS, { address: VALID_ADDRESS }, fakeFetch('<html>nope</html>'), fakeJwt()),
      502,
      'coinbase_onramp_error',
    );
  });

  it('surfaces a 502 when no session token is present in the response', async () => {
    await expectHttpError(
      createCoinbaseOnrampSession(CREDENTIALS, { address: VALID_ADDRESS }, fakeFetch(JSON.stringify({ other: 'x' })), fakeJwt()),
      502,
      'coinbase_onramp_error',
    );
  });
});

describe('getBaseUsdcBalance', () => {
  it('rejects an invalid address before making any RPC call', async () => {
    await expectHttpError(
      getBaseUsdcBalance({ baseRpcUrl: 'http://127.0.0.1:1/unused' }, 'not-an-address'),
      400,
      'invalid_request',
    );
  });
});
