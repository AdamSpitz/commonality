/**
 * Detect RPC eth_getLogs failures caused by block-range or response-size
 * limits, and print an operator hint once. Ponder's HTTP client uses global
 * fetch, so wrapping fetch is enough without a viem custom_transport (which
 * disables Ponder's rate limiter).
 */

const RANGE_OR_SIZE_PATTERNS: readonly RegExp[] = [
  /requested too many blocks/i,
  /max(?:imum)?(?: allowed)?(?: number of requested)? blocks/i,
  /block range is too wide/i,
  /block range too large/i,
  /block range greater than/i,
  /block range exceeds/i,
  /query exceeds max block range/i,
  /exceed max block range/i,
  /allowed block range/i,
  /up to a [\d,.]+ block range/i,
  /this block range should work/i,
  /try with this block range/i,
  /query returned more than/i,
  /log response size/i,
  /response size exceeded/i,
  /response too (?:large|big)/i,
];

const NOT_RANGE_PATTERNS: readonly RegExp[] = [
  /compute units per second/i,
  /exceeded its compute units/i,
  /pruned history/i,
];

export function isEthGetLogsRangeOrSizeError(text: string): boolean {
  if (!text) return false;
  if (NOT_RANGE_PATTERNS.some((p) => p.test(text))) return false;
  return RANGE_OR_SIZE_PATTERNS.some((p) => p.test(text));
}

export function operatorHintForGetLogsRangeError(configuredRange: number | undefined): string {
  const rangeLabel =
    configuredRange !== undefined && Number.isFinite(configuredRange)
      ? String(configuredRange)
      : "(unset)";
  return [
    "[commonality-indexer] eth_getLogs failed because the RPC rejected the block range or response size.",
    `PONDER_ETH_GET_LOGS_BLOCK_RANGE=${rangeLabel}.`,
    "What to do: lower PONDER_ETH_GET_LOGS_BLOCK_RANGE on the indexer (try 1000, then 10 if the provider still has a 10-block free cap), PUT the Render env var, then deploy (deploy_only is enough for env-only; a restart will not pick it up).",
    "Do not raise START_BLOCK without Ask (that drops history). Do not point PONDER_RPC_URL_84532 at https://sepolia.base.org (pruned).",
    "See workflow/deployment.md (Indexer on Render) and workflow/testnet-working-plan.md.",
  ].join(" ");
}

export type EthGetLogsRangeGuardOptions = {
  configuredRange?: number;
  warn?: (message: string) => void;
  fetchImpl?: typeof fetch;
};

export function installEthGetLogsRangeGuard(options: EthGetLogsRangeGuardOptions = {}): () => void {
  const warn = options.warn ?? ((message: string) => console.error(message));
  const previous = globalThis.fetch;
  const currentFetch: typeof fetch = options.fetchImpl
    ? (input, init) => options.fetchImpl!(input, init)
    : previous.bind(globalThis);
  let warned = false;

  const wrapped: typeof fetch = async (input, init) => {
    const response = await currentFetch(input, init);
    if (warned) return response;
    try {
      const requestText = await peekRequestBody(input, init);
      if (requestText && !requestText.includes("eth_getLogs")) return response;
      const responseText = await response.clone().text();
      const blob = `${response.status} ${responseText}`;
      if (!isEthGetLogsRangeOrSizeError(blob)) return response;
      warned = true;
      warn(operatorHintForGetLogsRangeError(options.configuredRange));
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

async function peekRequestBody(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<string> {
  if (typeof init?.body === "string") return init.body;
  if (input instanceof Request) {
    try {
      return await input.clone().text();
    } catch {
      return "";
    }
  }
  return "";
}
