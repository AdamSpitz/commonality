/**
 * Alchemy (and similar) monthly CU fuses return 429 forever until a human
 * raises the cap or the billing period resets. Retrying immediately burns
 * nothing useful and crash-loops the Render service.
 *
 * The fetch wrapper only records the condition. start.sh parks the process
 * behind a stub health server with exponential backoff.
 */

import { writeFileSync } from "node:fs";

export const DEFAULT_MONTHLY_CAPACITY_FLAG_PATH = "/tmp/commonality-rpc-monthly-capacity";

const MONTHLY_CAPACITY_PATTERNS: readonly RegExp[] = [
  /monthly capacity limit exceeded/i,
  /upgrade your scaling policy/i,
  /exceeded (?:your )?monthly (?:compute|capacity|usage)/i,
];

export function isMonthlyCapacityError(text: string): boolean {
  if (!text) return false;
  return MONTHLY_CAPACITY_PATTERNS.some((p) => p.test(text));
}

export function monthlyCapacityFlagPath(): string {
  return process.env.INDEXER_RPC_BUDGET_FLAG_PATH || DEFAULT_MONTHLY_CAPACITY_FLAG_PATH;
}

export function recordMonthlyCapacityHit(path = monthlyCapacityFlagPath()): void {
  writeFileSync(path, `${new Date().toISOString()}\n`, "utf8");
}

export function operatorHintForMonthlyCapacity(): string {
  return [
    "[commonality-indexer] RPC monthly capacity limit exceeded.",
    "Further JSON-RPC calls will fail until the provider fuse is raised or the billing period resets.",
    "start.sh will keep /graphql healthy and back off (1m → 6h) instead of crash-looping.",
    "Do not point PONDER_RPC_URL_84532 at https://sepolia.base.org (pruned history).",
    "Do not bump DATABASE_SCHEMA or START_BLOCK to “fix” this — that forces a full resync and spends more CUs.",
    "See indexer/README.md (RPC budget) and workflow/deployment.md (Indexer on Render).",
  ].join(" ");
}

export type MonthlyCapacityGuardOptions = {
  warn?: (message: string) => void;
  fetchImpl?: typeof fetch;
  flagPath?: string;
};

export function installMonthlyCapacityGuard(options: MonthlyCapacityGuardOptions = {}): () => void {
  const warn = options.warn ?? ((message: string) => console.error(message));
  const previous = globalThis.fetch;
  const currentFetch: typeof fetch = options.fetchImpl
    ? (input, init) => options.fetchImpl!(input, init)
    : previous.bind(globalThis);
  let warned = false;
  const flagPath = options.flagPath ?? monthlyCapacityFlagPath();

  const wrapped: typeof fetch = async (input, init) => {
    const response = await currentFetch(input, init);
    try {
      const responseText = await response.clone().text();
      const blob = `${response.status} ${responseText}`;
      if (!isMonthlyCapacityError(blob)) return response;
      recordMonthlyCapacityHit(flagPath);
      if (!warned) {
        warned = true;
        warn(operatorHintForMonthlyCapacity());
      }
    } catch {
      // Never break RPC on diagnostic failure.
    }
    return response;
  };

  globalThis.fetch = wrapped;

  return () => {
    if (globalThis.fetch === wrapped) {
      globalThis.fetch = previous;
    }
  };
}
