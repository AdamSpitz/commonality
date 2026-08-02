import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';
import { Agent, request, type Dispatcher } from 'undici';

export interface PolicyArtifactLookupAddress { address: string; family: 4 | 6 }

export interface PolicyArtifactFetchLimits {
  maxCompressedBytes: number;
  maxDecompressedBytes: number;
  maxCompressionRatio: number;
  maxEntries: number;
  connectTimeoutMs: number;
  headersTimeoutMs: number;
  bodyTimeoutMs: number;
  maxRedirects: number;
}

export interface PolicyArtifactFetchOptions {
  limits?: Partial<PolicyArtifactFetchLimits>;
  /** Hostnames deliberately permitted to resolve to non-public addresses. */
  egressAllowlist?: readonly string[];
  lookup?: (hostname: string) => Promise<readonly PolicyArtifactLookupAddress[]>;
  /** Test/embedding hook; production callers should use the address-pinning default. */
  dispatcher?: Dispatcher;
}

const DEFAULT_LIMITS: PolicyArtifactFetchLimits = {
  maxCompressedBytes: 2 * 1024 * 1024,
  maxDecompressedBytes: 8 * 1024 * 1024,
  maxCompressionRatio: 20,
  maxEntries: 100_000,
  connectTimeoutMs: 5_000,
  headersTimeoutMs: 10_000,
  bodyTimeoutMs: 20_000,
  maxRedirects: 3,
};

export class PolicyArtifactFetchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PolicyArtifactFetchError';
  }
}

function isPublicIpv4(address: string): boolean {
  const [a, b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
    || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168)
    || (a === 100 && b! >= 64 && b! <= 127) || a! >= 224);
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version !== 6) return false;
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) return isPublicIpv4(normalized.slice(7));
  return normalized !== '::' && normalized !== '::1' && !normalized.startsWith('fc')
    && !normalized.startsWith('fd') && !/^fe[89ab]/.test(normalized) && !normalized.startsWith('ff');
}

function checkedUrl(source: string): URL {
  let url: URL;
  try { url = new URL(source); } catch (error) {
    throw new PolicyArtifactFetchError(`Invalid policy-list URL: ${source}`, { cause: error });
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new PolicyArtifactFetchError('Policy-list fetches require an HTTPS URL without credentials or fragments');
  }
  return url;
}

function decompress(bytes: Buffer, encoding: string | undefined, limits: PolicyArtifactFetchLimits): Buffer {
  let output: Buffer;
  try {
    if (encoding === undefined || encoding === 'identity') output = bytes;
    else if (encoding === 'gzip') output = gunzipSync(bytes, { maxOutputLength: limits.maxDecompressedBytes + 1 });
    else if (encoding === 'deflate') output = inflateSync(bytes, { maxOutputLength: limits.maxDecompressedBytes + 1 });
    else if (encoding === 'br') output = brotliDecompressSync(bytes, { maxOutputLength: limits.maxDecompressedBytes + 1 });
    else throw new PolicyArtifactFetchError(`Unsupported content-encoding: ${encoding}`);
  } catch (error) {
    if (error instanceof PolicyArtifactFetchError) throw error;
    throw new PolicyArtifactFetchError('Cannot decompress policy-list response within configured bounds', { cause: error });
  }
  if (output.length > limits.maxDecompressedBytes || (bytes.length > 0 && output.length / bytes.length > limits.maxCompressionRatio)) {
    throw new PolicyArtifactFetchError('Policy-list response exceeds decompression bounds');
  }
  return output;
}

export async function fetchPolicyArtifact(source: string, options: PolicyArtifactFetchOptions = {}): Promise<Uint8Array> {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  const allowed = new Set(options.egressAllowlist?.map((host) => host.toLowerCase()) ?? []);
  const resolveHost = options.lookup ?? (async (hostname) => dnsLookup(hostname, { all: true, verbatim: true }));
  let url = checkedUrl(source);

  for (let redirects = 0; ; redirects += 1) {
    const addresses = await resolveHost(url.hostname);
    if (addresses.length === 0) throw new PolicyArtifactFetchError(`Policy-list host has no addresses: ${url.hostname}`);
    if (!allowed.has(url.hostname.toLowerCase()) && addresses.some(({ address }) => !isPublicAddress(address))) {
      throw new PolicyArtifactFetchError(`Policy-list host resolves to a non-public address: ${url.hostname}`);
    }
    const pinned = addresses[0]!;
    const ownedDispatcher = options.dispatcher === undefined;
    const dispatcher = options.dispatcher ?? new Agent({
      connect: {
        timeout: limits.connectTimeoutMs,
        lookup(_hostname, _options, callback) { callback(null, pinned.address, pinned.family); },
      },
    });
    try {
      const response = await request(url, {
        dispatcher,
        method: 'GET',
        headersTimeout: limits.headersTimeoutMs,
        bodyTimeout: limits.bodyTimeoutMs,
        signal: AbortSignal.timeout(limits.bodyTimeoutMs),
        headers: { accept: 'application/json', 'accept-encoding': 'gzip, deflate, br' },
      });
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.body.destroy();
        const location = response.headers.location;
        if (redirects >= limits.maxRedirects || typeof location !== 'string') throw new PolicyArtifactFetchError('Policy-list redirect limit exceeded or Location is missing');
        url = checkedUrl(new URL(location, url).href);
        continue;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.body.destroy();
        throw new PolicyArtifactFetchError(`Policy-list server returned HTTP ${response.statusCode}`);
      }
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of response.body) {
        length += chunk.length;
        if (length > limits.maxCompressedBytes) {
          response.body.destroy();
          throw new PolicyArtifactFetchError('Policy-list response exceeds compressed-byte limit');
        }
        chunks.push(chunk);
      }
      const bytes = decompress(Buffer.concat(chunks), response.headers['content-encoding'] as string | undefined, limits);
      return bytes;
    } catch (error) {
      if (error instanceof PolicyArtifactFetchError) throw error;
      throw new PolicyArtifactFetchError(`Cannot fetch policy list ${url.href}`, { cause: error });
    } finally {
      if (ownedDispatcher) await dispatcher.close();
    }
  }
}

export function assertPolicyArtifactEntryLimit(document: { entries: readonly unknown[] }, maxEntries = DEFAULT_LIMITS.maxEntries): void {
  if (document.entries.length > maxEntries) throw new PolicyArtifactFetchError(`Policy list exceeds ${maxEntries} entries`);
}
