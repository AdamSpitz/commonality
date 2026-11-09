import { createServer, type Server } from "node:http";
import { Hono } from "hono";
import { attachRest } from "../api/restApp";
import type { Snapshot } from "./types";
import { snapshotEventStore } from "./memoryStore";
import { getIndexerChainName } from "../utils/chain";

/**
 * Answer the liveness probe `POST /graphql { _meta { block { number } } }`
 * and the testnet check `{ _meta { status } }`. This is not Ponder's GraphQL API.
 */
export function attachGraphqlCompat(app: Hono, current: () => Snapshot | undefined, chainName: string = getIndexerChainName()): void {
  const handler = async (c: { req: { json: () => Promise<unknown> }; json: (body: unknown, status?: number) => Response }) => {
    let query = "";
    try {
      const body = await c.req.json() as { query?: unknown };
      query = typeof body.query === "string" ? body.query : "";
    } catch {
      query = "";
    }
    if (!query.includes("_meta")) {
      return c.json({ errors: [{ message: "prototype GraphQL compat only answers _meta liveness probes" }] }, 400);
    }
    const snapshot = current();
    const number = snapshot ? Number(snapshot.head.number) : 0;
    const status = snapshot
      ? { [chainName]: { block: { number } } }
      : "not_ready";
    return c.json({ data: { _meta: { block: { number }, status } } });
  };
  app.get("/graphql", handler);
  app.post("/graphql", handler);
}

/** Ponder's `/status` shape. The SDK waits on `result[chain].block.number`. */
export function attachStatus(app: Hono, current: () => Snapshot | undefined, chainName: string): void {
  app.get("/status", c => {
    const snapshot = current();
    const block = snapshot
      ? { number: Number(snapshot.head.number), timestamp: Number(snapshot.head.timestamp) }
      : null;
    return c.json({
      [chainName]: {
        id: snapshot?.chainId ?? null,
        block,
      },
    });
  });
}

export function createPrototypeApp(current: () => Snapshot | undefined, chainName: string = getIndexerChainName()): Hono {
  const app = new Hono();
  attachRest(app, snapshotEventStore(current, chainName));
  attachGraphqlCompat(app, current, chainName);
  attachStatus(app, current, chainName);
  return app;
}

export function listen(app: Hono, port: number, onRequest?: (method: string, path: string) => void, host = "127.0.0.1"): Promise<Server> {
  const server = createServer(async (req, res) => {
    try {
      const host = req.headers.host ?? `127.0.0.1:${port}`;
      const url = new URL(req.url ?? "/", `http://${host}`);
      onRequest?.(req.method ?? "GET", url.pathname);
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const hasBody = req.method !== "GET" && req.method !== "HEAD";
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value == null) continue;
        if (Array.isArray(value)) for (const item of value) headers.append(key, item);
        else headers.set(key, value);
      }
      const response = await app.fetch(new Request(url, {
        method: req.method,
        headers,
        body: hasBody && chunks.length > 0 ? Buffer.concat(chunks) : undefined,
      }));
      const payload = Buffer.from(await response.arrayBuffer());
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(payload);
    } catch (error) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "request failed" }));
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve(server));
  });
}
