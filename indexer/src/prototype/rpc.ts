import { setTimeout as delay } from "node:timers/promises";
import { isMonthlyCapacityError, recordMonthlyCapacityHit } from "../rpc/monthlyCapacity";
import { SpendLedger } from "./spend";
import type { Rpc } from "./types";

export class RpcFailure extends Error {
  constructor(message: string, readonly rangeLimit = false) { super(message); }
}

/** Sequential requests, bounded retries and a hard request ceiling, including failed attempts. */
export class MeteredRpc implements Rpc {
  readonly calls: Record<string, number> = {};
  private total = 0;
  constructor(private readonly url: string, private readonly maxRequests = 1000, private readonly spend?: SpendLedger) {}

  async request(method: string, params: unknown[]): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      this.spend?.admit(method);
      if (this.total >= this.maxRequests) throw new Error("Prototype RPC request budget exhausted");
      this.calls[method] = (this.calls[method] ?? 0) + 1;
      const id = ++this.total;
      let response: Response;
      try {
        response = await fetch(this.url, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        // Avoid leaking credentials embedded in a provider URL via fetch's cause/stack.
        throw new Error(`RPC ${method} transport failed`);
      }
      const text = await response.text();
      if (isMonthlyCapacityError(text)) {
        recordMonthlyCapacityHit();
        throw new Error("RPC monthly capacity exhausted; prototype stopped");
      }
      let body: { id?: number; error?: { message?: string; code?: number }; result?: unknown };
      try { body = JSON.parse(text); } catch {
        if (response.status === 429 || response.status >= 500) body = {};
        else throw new Error(`RPC ${method} returned invalid JSON (HTTP ${response.status})`);
      }
      if (!body || typeof body !== "object") throw new Error("Invalid RPC response envelope");
      const message = body.error?.message ?? "";
      const rateLimited = response.status === 429 || /compute units per second|rate limit|too many requests/i.test(message);
      if ((rateLimited || response.status >= 500) && attempt < 3) {
        await delay(250 * 2 ** attempt + Math.random() * 100);
        continue;
      }
      if (!response.ok || body.error) {
        const { isEthGetLogsRangeOrSizeError } = await import("../rpc/ethGetLogsRangeGuard");
        throw new RpcFailure(`RPC ${method} failed (HTTP ${response.status}, code ${body.error?.code ?? "none"})`,
          !rateLimited && (response.status === 413 || isEthGetLogsRangeOrSizeError(message)));
      }
      if (body.id !== id || !("result" in body)) throw new Error("Invalid RPC response envelope");
      return body.result;
    }
  }
}
