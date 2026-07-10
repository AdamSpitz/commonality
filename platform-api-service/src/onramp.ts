import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { createPublicClient, erc20Abi, formatUnits, http, isAddress, parseUnits, type Address } from 'viem';
import { base } from 'viem/chains';
import { HttpError } from './errors.js';

export interface CoinbaseOnrampConfig {
  apiKeyId?: string;
  apiKeySecret?: string;
}

export interface CreateCoinbaseOnrampSessionRequest {
  address: string;
  clientIp?: string;
  presetFiatAmount?: string;
  fiatCurrency?: string;
}

export interface CoinbaseOnrampSession {
  url: string;
  destinationAddress: Address;
}

export interface UsdcBalanceLookupConfig {
  baseRpcUrl?: string;
}

const COINBASE_ONRAMP_HOST = 'api.developer.coinbase.com';
const COINBASE_ONRAMP_TOKEN_PATH = '/onramp/v1/token';
const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const DEFAULT_PRESET_FIAT_AMOUNT = '50';
const DEFAULT_FIAT_CURRENCY = 'USD';

export async function createCoinbaseOnrampSession(
  config: CoinbaseOnrampConfig,
  request: CreateCoinbaseOnrampSessionRequest,
  fetchImpl: typeof fetch = fetch,
  generateJwtImpl: typeof generateJwt = generateJwt,
): Promise<CoinbaseOnrampSession> {
  if (!config.apiKeyId || !config.apiKeySecret) {
    throw new HttpError(
      503,
      'service_unavailable',
      'Coinbase Onramp is unavailable because CDP API credentials are not configured',
    );
  }

  if (!isAddress(request.address)) {
    throw new HttpError(400, 'invalid_request', `Invalid destination address: ${request.address}`);
  }

  const presetFiatAmount = normalizePositiveDecimal(
    request.presetFiatAmount,
    'presetFiatAmount',
    DEFAULT_PRESET_FIAT_AMOUNT,
  );
  const fiatCurrency = normalizeFiatCurrency(request.fiatCurrency ?? DEFAULT_FIAT_CURRENCY);

  const jwt = await generateJwtImpl({
    apiKeyId: config.apiKeyId,
    apiKeySecret: config.apiKeySecret,
    requestMethod: 'POST',
    requestHost: COINBASE_ONRAMP_HOST,
    requestPath: COINBASE_ONRAMP_TOKEN_PATH,
    expiresIn: 120,
  });

  const body = {
    addresses: [{ address: request.address, blockchains: ['base'] }],
    assets: ['USDC'],
    ...(request.clientIp ? { clientIp: request.clientIp } : {}),
  };

  const response = await fetchImpl(`https://${COINBASE_ONRAMP_HOST}${COINBASE_ONRAMP_TOKEN_PATH}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new HttpError(
      502,
      'coinbase_onramp_error',
      `Coinbase Onramp session-token request failed (${response.status})`,
      { responseBody: text },
    );
  }

  const token = extractCoinbaseSessionToken(text);
  const params = new URLSearchParams({
    sessionToken: token,
    defaultAsset: 'USDC',
    defaultNetwork: 'base',
    defaultPaymentMethod: 'CARD',
    presetFiatAmount,
    fiatCurrency,
  });

  return {
    destinationAddress: request.address,
    url: `https://pay.coinbase.com/buy/select-asset?${params.toString()}`,
  };
}

export async function getBaseUsdcBalance(
  config: UsdcBalanceLookupConfig,
  address: string,
): Promise<{ address: Address; rawBalance: string; formattedBalance: string; addressDeployed: boolean }> {
  if (!isAddress(address)) {
    throw new HttpError(400, 'invalid_request', `Invalid address: ${address}`);
  }

  const client = createPublicClient({
    chain: base,
    transport: http(config.baseRpcUrl || 'https://mainnet.base.org'),
  });

  const [rawBalance, code] = await Promise.all([
    client.readContract({
      address: BASE_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    }),
    client.getCode({ address }),
  ]);

  return {
    address,
    rawBalance: rawBalance.toString(),
    formattedBalance: formatUnits(rawBalance, 6),
    addressDeployed: !!code && code !== '0x',
  };
}

function extractCoinbaseSessionToken(responseText: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new HttpError(502, 'coinbase_onramp_error', 'Coinbase Onramp returned invalid JSON');
  }

  const token = getStringProperty(parsed, 'token')
    ?? getStringProperty(getUnknownProperty(parsed, 'data'), 'token')
    ?? getStringProperty(parsed, 'session_token');

  if (!token) {
    throw new HttpError(502, 'coinbase_onramp_error', 'Coinbase Onramp response did not include a session token');
  }

  return token;
}

function normalizePositiveDecimal(value: string | undefined, fieldName: string, fallback: string): string {
  const candidate = value?.trim() || fallback;
  try {
    if (parseUnits(candidate, 2) <= 0n) throw new Error('not positive');
  } catch {
    throw new HttpError(400, 'invalid_request', `${fieldName} must be a positive decimal amount`);
  }
  return candidate;
}

function normalizeFiatCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new HttpError(400, 'invalid_request', 'fiatCurrency must be a three-letter currency code');
  }
  return normalized;
}

function getUnknownProperty(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function getStringProperty(value: unknown, key: string): string | undefined {
  const property = getUnknownProperty(value, key);
  return typeof property === 'string' && property ? property : undefined;
}
