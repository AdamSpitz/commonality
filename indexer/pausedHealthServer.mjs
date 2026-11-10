#!/usr/bin/env node
/**
 * Keep Render's /health check green while the indexer is parked
 * because the RPC monthly capacity fuse is blown. The sync engine is not running.
 */
import { createServer } from "node:http";

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const seconds = Math.max(1, Number(argValue("--seconds", "60")) || 60);
const port = Number(argValue("--port", process.env.PORT || "42069"));
const until = new Date(Date.now() + seconds * 1000).toISOString();

const health = JSON.stringify({
  ok: true,
  ready: false,
  parked: true,
  reason: "rpc_monthly_capacity_pause",
  resumeAt: until,
});

const status = JSON.stringify({
  parked: true,
  ready: false,
  reason: "rpc_monthly_capacity_pause",
  resumeAt: until,
});

const server = createServer((req, res) => {
  const path = req.url?.split("?")[0] ?? "/";
  if (path === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(health);
    return;
  }
  if (path === "/status") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(status);
    return;
  }
  res.writeHead(404);
  res.end();
});

await new Promise((resolve, reject) => {
  server.listen(port, () => {
    console.error(
      `[commonality-indexer] RPC monthly-capacity pause: stub /health on :${port} for ${seconds}s (resumeAt=${until})`,
    );
    resolve();
  });
  server.on("error", reject);
});

await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
await new Promise((resolve) => server.close(() => resolve()));
