import type { Address, Hex } from 'viem';

export type CorsAllowedOrigins = '*' | string[];

export interface PlatformApiServiceConfig {
  port: number;
  corsAllowedOrigins: CorsAllowedOrigins;
  commonalityTwitterHandle: string;
  claimPageBaseUrl?: string;
  contentSubmissionsFilePath: string;
  xApiBearerToken?: string;
  xApiBaseUrl: string;
  youtubeApiKey?: string;
  youtubeApiBaseUrl: string;
  verifierPrivateKey?: Hex;
  ethereumRpcUrl?: string;
  channelRegistryAddress?: Address;
  submitVerificationTx: boolean;
  challengeTtlSeconds: number;
  contentCacheTtlSeconds: number;
  resolveRateLimitWindowMs: number;
  resolveRateLimitMaxRequests: number;
  verifyRateLimitWindowMs: number;
  verifyRateLimitMaxRequests: number;
  submissionRateLimitWindowMs: number;
  submissionRateLimitMaxRequests: number;
}

export function loadConfig(): PlatformApiServiceConfig {
  return {
    port: parseInteger('PORT', process.env.PORT, 3001),
    corsAllowedOrigins: parseCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
    commonalityTwitterHandle: normalizeTwitterHandle(
      process.env.COMMONALITY_TWITTER_HANDLE ?? '@commonality',
    ),
    claimPageBaseUrl: normalizeOptionalUrl(process.env.CLAIM_PAGE_BASE_URL),
    contentSubmissionsFilePath: process.env.CONTENT_SUBMISSIONS_FILE_PATH || './platform-api-content-submissions.json',
    xApiBearerToken: normalizeOptionalString(process.env.X_API_BEARER_TOKEN),
    xApiBaseUrl: normalizeRequiredUrlBase(process.env.X_API_BASE_URL ?? 'https://api.x.com'),
    youtubeApiKey: normalizeOptionalString(process.env.YOUTUBE_API_KEY),
    youtubeApiBaseUrl: normalizeRequiredUrlBase(
      process.env.YOUTUBE_API_BASE_URL ?? 'https://www.googleapis.com/youtube/v3',
    ),
    verifierPrivateKey: normalizeOptionalHex32('VERIFIER_PRIVATE_KEY', process.env.VERIFIER_PRIVATE_KEY),
    ethereumRpcUrl: normalizeOptionalUrl(process.env.ETHEREUM_RPC_URL),
    channelRegistryAddress: normalizeOptionalAddress(process.env.CHANNEL_REGISTRY_ADDRESS),
    submitVerificationTx: parseBoolean(process.env.SUBMIT_VERIFICATION_TX, false),
    challengeTtlSeconds: parseInteger('CHALLENGE_TTL_SECONDS', process.env.CHALLENGE_TTL_SECONDS, 1800),
    contentCacheTtlSeconds: parseInteger(
      'CONTENT_CACHE_TTL_SECONDS',
      process.env.CONTENT_CACHE_TTL_SECONDS,
      3600,
    ),
    resolveRateLimitWindowMs: parseInteger(
      'RESOLVE_RATE_LIMIT_WINDOW_MS',
      process.env.RESOLVE_RATE_LIMIT_WINDOW_MS,
      60_000,
    ),
    resolveRateLimitMaxRequests: parseInteger(
      'RESOLVE_RATE_LIMIT_MAX_REQUESTS',
      process.env.RESOLVE_RATE_LIMIT_MAX_REQUESTS,
      60,
    ),
    verifyRateLimitWindowMs: parseInteger(
      'VERIFY_RATE_LIMIT_WINDOW_MS',
      process.env.VERIFY_RATE_LIMIT_WINDOW_MS,
      60_000,
    ),
    verifyRateLimitMaxRequests: parseInteger(
      'VERIFY_RATE_LIMIT_MAX_REQUESTS',
      process.env.VERIFY_RATE_LIMIT_MAX_REQUESTS,
      5,
    ),
    submissionRateLimitWindowMs: parseInteger(
      'SUBMISSION_RATE_LIMIT_WINDOW_MS',
      process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS,
      60_000,
    ),
    submissionRateLimitMaxRequests: parseInteger(
      'SUBMISSION_RATE_LIMIT_MAX_REQUESTS',
      process.env.SUBMISSION_RATE_LIMIT_MAX_REQUESTS,
      10,
    ),
  };
}

function parseInteger(name: string, value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid integer for ${name}: ${value}`);
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

function parseCorsAllowedOrigins(value: string | undefined): CorsAllowedOrigins {
  if (!value?.trim() || value.trim() === '*') {
    return '*';
  }

  const origins = value.split(',').map((entry) => normalizeCorsOrigin(entry));
  return [...new Set(origins)];
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeCorsOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('CORS_ALLOWED_ORIGINS must not contain empty entries');
  }

  const url = new URL(trimmed);
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`CORS_ALLOWED_ORIGINS must contain bare origins, not full URLs: ${value}`);
  }

  return url.origin;
}

function normalizeRequiredUrlBase(value: string): string {
  const url = new URL(value);
  return url.toString().replace(/\/$/, '');
}

function normalizeOptionalUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const url = new URL(value);
  return url.toString().replace(/\/$/, '');
}

function normalizeOptionalHex32(name: string, value: string | undefined): Hex | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${name} must be a 32-byte hex string`);
  }

  return value as Hex;
}

function normalizeOptionalAddress(value: string | undefined): Address | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`Invalid Ethereum address: ${value}`);
  }

  return value as Address;
}

function normalizeTwitterHandle(value: string): string {
  const normalized = value.trim();
  if (!/^@?[A-Za-z0-9_]{1,15}$/.test(normalized)) {
    throw new Error(`Invalid Twitter handle: ${value}`);
  }

  return normalized.startsWith('@') ? normalized : `@${normalized}`;
}
