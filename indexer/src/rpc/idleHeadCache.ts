/**
 * Ponder's poll timer is fixed at startup. While idle, replay the last
 * successful `eth_getBlockByNumber("latest")` so that timer does not call
 * Alchemy. A reader or an explicit wake lets polls through for a short window;
 * the next real head makes Ponder catch the gap with one eth_getLogs.
 */

export const DEFAULT_IDLE_HEAD_INTERVAL_MS = 30_000;
export const DEFAULT_IDLE_HEAD_WAKE_MS = 60_000;

type JsonRpc = {
  id?: unknown;
  method?: unknown;
  params?: unknown;
  error?: unknown;
  result?: unknown;
};

export type IdleHeadCacheOptions = {
  enabled?: boolean;
  idleIntervalMs?: number;
  wakeMs?: number;
  now?: () => number;
  fetchImpl?: typeof fetch;
};

export function idleHeadCacheEnabled(chain: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.INDEXER_IDLE_HEAD_CACHE;
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  return chain === "base-sepolia";
}

export function requestWakesIndexer(method: string, path: string): boolean {
  const normalized = path.split("?")[0] ?? path;
  if (method !== "GET" && method !== "POST") return false;
  if (normalized === "/health" || normalized === "/ready" || normalized === "/metrics") return false;
  if (normalized === "/api/project-read-demand") return false;
  if (normalized === "/api/indexer-wake") return method === "POST";
  if (normalized === "/" || normalized === "/graphql" || normalized.startsWith("/graphql/")) return true;
  if (normalized.startsWith("/api/")) return method === "GET";
  if (normalized.startsWith("/sql")) return true;
  return false;
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 500) {
    throw new Error(`Invalid idle-head duration "${raw}". Expected a millisecond count >= 500.`);
  }
  return parsed;
}

function latestBlockRequests(body: string): JsonRpc[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const calls = Array.isArray(parsed) ? parsed : [parsed];
  if (calls.length === 0) return null;
  const requests: JsonRpc[] = [];
  for (const call of calls) {
    if (!call || typeof call !== "object") return null;
    const rpc = call as JsonRpc;
    if (rpc.method !== "eth_getBlockByNumber") return null;
    if (!Array.isArray(rpc.params) || rpc.params[0] !== "latest") return null;
    requests.push(rpc);
  }
  return requests;
}

function rewriteIds(cachedBody: string, requests: JsonRpc[]): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(cachedBody);
  } catch {
    return null;
  }
  const responses = Array.isArray(parsed) ? parsed : [parsed];
  if (responses.length !== requests.length) return null;
  const rewritten = responses.map((response, index) => {
    if (!response || typeof response !== "object") return response;
    return { ...(response as JsonRpc), id: requests[index]?.id };
  });
  return JSON.stringify(Array.isArray(parsed) ? rewritten : rewritten[0]);
}

function cacheableHeadResponse(body: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return false;
  }
  const responses = Array.isArray(parsed) ? parsed : [parsed];
  return responses.every((response) => {
    if (!response || typeof response !== "object") return false;
    const rpc = response as JsonRpc;
    return rpc.error === undefined && rpc.result !== undefined && rpc.result !== null;
  });
}

export type IdleHeadCache = {
  noteWake: (at?: number) => number;
  fastPollingUntil: () => number;
  reset: () => void;
};

export function createIdleHeadCache(options: IdleHeadCacheOptions = {}): IdleHeadCache & {
  install: () => () => void;
} {
  const idleIntervalMs = options.idleIntervalMs ?? DEFAULT_IDLE_HEAD_INTERVAL_MS;
  const wakeMs = options.wakeMs ?? DEFAULT_IDLE_HEAD_WAKE_MS;
  const now = options.now ?? Date.now;
  let wakeUntil = 0;
  let cachedBody = "";
  let cachedKey = "";
  let cachedAt = 0;

  const cache: IdleHeadCache = {
    noteWake(at = now()) {
      wakeUntil = at + wakeMs;
      return wakeUntil;
    },
    fastPollingUntil() {
      return wakeUntil;
    },
    reset() {
      wakeUntil = 0;
      cachedBody = "";
      cachedKey = "";
      cachedAt = 0;
    },
  };

  function install(): () => void {
    const previous = globalThis.fetch;
    const currentFetch: typeof fetch = options.fetchImpl
      ? (input, init) => options.fetchImpl!(input, init)
      : previous.bind(globalThis);

    const wrapped: typeof fetch = async (input, init) => {
      const requestText = await peekRequestBody(input, init);
      const requests = requestText ? latestBlockRequests(requestText) : null;
      const key = requests ? JSON.stringify(requests.map((request) => request.params)) : "";
      const at = now();
      if (
        requests &&
        cachedBody &&
        key === cachedKey &&
        at >= cachedAt &&
        at - cachedAt < idleIntervalMs &&
        at >= wakeUntil
      ) {
        const body = rewriteIds(cachedBody, requests);
        if (body) {
          return new Response(body, {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
      }

      const response = await currentFetch(input, init);
      if (!requests || !response.ok) return response;
      try {
        const responseText = await response.clone().text();
        if (!cacheableHeadResponse(responseText)) return response;
        cachedBody = responseText;
        cachedKey = key;
        cachedAt = at;
      } catch {
        // Never break RPC on a cache write.
      }
      return response;
    };

    globalThis.fetch = wrapped;
    return () => {
      if (globalThis.fetch === wrapped) globalThis.fetch = previous;
    };
  }

  return { ...cache, install };
}

let active: ReturnType<typeof createIdleHeadCache> | null = null;

export function noteIndexerWake(at?: number): number {
  if (!active) return 0;
  return active.noteWake(at);
}

export function indexerFastPollingUntil(): number {
  return active?.fastPollingUntil() ?? 0;
}

export function installIdleHeadCache(options: IdleHeadCacheOptions = {}): () => void {
  if (options.enabled === false) return () => {};
  const idleIntervalMs = options.idleIntervalMs ?? readPositiveInt(process.env.INDEXER_IDLE_HEAD_INTERVAL_MS, DEFAULT_IDLE_HEAD_INTERVAL_MS);
  const wakeMs = options.wakeMs ?? readPositiveInt(process.env.INDEXER_IDLE_HEAD_WAKE_MS, DEFAULT_IDLE_HEAD_WAKE_MS);
  active = createIdleHeadCache({ ...options, idleIntervalMs, wakeMs });
  console.error(
    `[commonality-indexer] idle head cache on: replay latest block for ${idleIntervalMs}ms, fast poll for ${wakeMs}ms after a client read or POST /api/indexer-wake.`,
  );
  const restoreFetch = active.install();
  return () => {
    restoreFetch();
    active = null;
  };
}

async function peekRequestBody(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<string> {
  if (typeof init?.body === "string") return init.body;
  if (init?.body instanceof Uint8Array) return new TextDecoder().decode(init.body);
  if (input instanceof Request) {
    try {
      return await input.clone().text();
    } catch {
      return "";
    }
  }
  return "";
}
