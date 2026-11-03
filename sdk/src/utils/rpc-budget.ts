/**
 * Alchemy's monthly CU fuse returns 429 until a human raises the cap or the
 * billing period resets. Background workers must stay alive through that,
 * or Render's stuck-crashloop suspender stops them. Patterns match
 * indexer/src/rpc/monthlyCapacity.ts.
 */

const MONTHLY_CAPACITY_PATTERNS: readonly RegExp[] = [
  /monthly capacity limit exceeded/i,
  /upgrade your scaling policy/i,
  /exceeded (?:your )?monthly (?:compute|capacity|usage)/i,
];

const RATE_LIMIT_PATTERNS: readonly RegExp[] = [
  /compute units per second/i,
  /too many requests/i,
  /rate limit/i,
];

export const RPC_MONTHLY_BACKOFF_MIN_MS = 60_000;
export const RPC_MONTHLY_BACKOFF_MAX_MS = 6 * 60 * 60 * 1000;
export const RPC_RATE_LIMIT_BACKOFF_MS = 5_000;

export type RpcFailureKind = 'monthly-capacity' | 'rate-limit' | 'fatal';

export function rpcErrorText(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const record = current as Record<string, unknown>;
    for (const key of ['message', 'details', 'shortMessage'] as const) {
      if (typeof record[key] === 'string') parts.push(record[key]);
    }
    if (typeof record.status === 'number') parts.push(String(record.status));
    if (typeof record.code === 'number') parts.push(String(record.code));
    current = record.cause;
  }
  if (parts.length === 0) parts.push(String(error));
  return parts.join('\n');
}

export function isMonthlyCapacityError(text: string): boolean {
  if (!text) return false;
  return MONTHLY_CAPACITY_PATTERNS.some((pattern) => pattern.test(text));
}

export function classifyRpcFailure(error: unknown): RpcFailureKind {
  const text = rpcErrorText(error);
  if (isMonthlyCapacityError(text)) return 'monthly-capacity';
  if (RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(text)) || /\b429\b/.test(text)) {
    return 'rate-limit';
  }
  return 'fatal';
}

export function interruptibleSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0 || signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(finish, ms);
    const onAbort = () => finish();
    function finish() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export type RpcBudgetPauseOptions = {
  serviceName: string;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  log?: (line: string) => void;
  minMonthlyMs?: number;
  maxMonthlyMs?: number;
  rateLimitMs?: number;
};

/**
 * One log line per monthly-capacity episode. Backoff doubles from 1 minute
 * to 6 hours and resets after a successful poll. A compute-unit burst waits
 * a few seconds and does not grow that backoff.
 */
export class RpcBudgetPause {
  private monthlyMs: number;
  private monthlyLogged = false;
  private rateLogged = false;

  constructor(private readonly options: RpcBudgetPauseOptions) {
    this.monthlyMs = options.minMonthlyMs ?? RPC_MONTHLY_BACKOFF_MIN_MS;
  }

  noteSuccess(): void {
    if (this.monthlyLogged) {
      this.write(`[${this.options.serviceName}] RPC monthly capacity cleared; resuming.`);
    }
    this.monthlyMs = this.options.minMonthlyMs ?? RPC_MONTHLY_BACKOFF_MIN_MS;
    this.monthlyLogged = false;
    this.rateLogged = false;
  }

  async pause(kind: Exclude<RpcFailureKind, 'fatal'>, signal?: AbortSignal): Promise<number> {
    if (kind === 'rate-limit') {
      const ms = this.options.rateLimitMs ?? RPC_RATE_LIMIT_BACKOFF_MS;
      if (!this.rateLogged) {
        this.rateLogged = true;
        this.write(
          `[${this.options.serviceName}] RPC rate limit. Pausing ${Math.round(ms / 1000)}s and retrying without exiting.`,
        );
      }
      await this.sleep(ms, signal);
      return ms;
    }

    const min = this.options.minMonthlyMs ?? RPC_MONTHLY_BACKOFF_MIN_MS;
    const max = this.options.maxMonthlyMs ?? RPC_MONTHLY_BACKOFF_MAX_MS;
    const ms = Math.min(Math.max(this.monthlyMs, min), max);
    if (!this.monthlyLogged) {
      this.monthlyLogged = true;
      this.write(
        `[${this.options.serviceName}] RPC monthly capacity limit exceeded. `
        + `Pausing JSON-RPC (starting at ${Math.round(ms / 1000)}s, backing off up to ${Math.round(max / 1000)}s). `
        + 'This process stays up so Render does not suspend it. Raise the provider cap or wait for the billing period. '
        + 'Do not wipe the worker disk or bump its start block.',
      );
    }
    await this.sleep(ms, signal);
    this.monthlyMs = Math.min(ms * 2, max);
    return ms;
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return (this.options.sleep ?? interruptibleSleep)(ms, signal);
  }

  private write(line: string): void {
    (this.options.log ?? ((message: string) => console.error(message)))(line);
  }
}

export async function runPollLoop(options: {
  serviceName: string;
  poll: () => Promise<void>;
  signal?: AbortSignal;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  log?: (line: string) => void;
  minMonthlyMs?: number;
  maxMonthlyMs?: number;
  rateLimitMs?: number;
}): Promise<void> {
  const budget = new RpcBudgetPause(options);
  while (!options.signal?.aborted) {
    try {
      await options.poll();
      budget.noteSuccess();
    } catch (error) {
      const kind = classifyRpcFailure(error);
      if (kind === 'fatal') throw error;
      await budget.pause(kind, options.signal);
    }
  }
}
