#!/usr/bin/env node

import fs from "node:fs/promises";

const BASE_RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node check-candidates.mjs candidates.json");
  process.exit(1);
}

const candidates = JSON.parse(await fs.readFile(inputPath, "utf8"));

async function rpc(method, params) {
  const res = await fetch(BASE_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

async function callString(address, selector) {
  const data = await rpc("eth_call", [{ to: address, data: selector }, "latest"]);
  if (data === "0x") return null;
  try {
    const bytes = Buffer.from(data.slice(2), "hex");
    // ABI string: offset(32), length(32), bytes padded.
    const len = Number(BigInt(`0x${bytes.subarray(32, 64).toString("hex")}`));
    return bytes.subarray(64, 64 + len).toString("utf8");
  } catch {
    return data;
  }
}

async function callUint8(address, selector) {
  const data = await rpc("eth_call", [{ to: address, data: selector }, "latest"]);
  if (data === "0x") return null;
  return Number(BigInt(data));
}

async function dexPairs(address) {
  const res = await fetch(`https://api.dexscreener.com/token-pairs/v1/base/${address}`, {
    headers: { "user-agent": "commonality-cad-stablecoin-spike/1.0" },
  });
  if (!res.ok) throw new Error(`Dexscreener HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

for (const c of candidates) {
  console.log(`\n## ${c.symbol} — ${c.issuer ?? "unknown issuer"}`);
  const address = c.baseAddress;
  if (!ADDRESS_RE.test(address ?? "")) {
    console.log(`- Base address: missing/invalid (${address ?? "unset"})`);
    continue;
  }

  console.log(`- Base address: ${address}`);
  const code = await rpc("eth_getCode", [address, "latest"]);
  console.log(`- Contract code: ${code === "0x" ? "NOT DEPLOYED" : `${(code.length - 2) / 2} bytes`}`);

  if (code !== "0x") {
    const [name, symbol, decimals] = await Promise.all([
      callString(address, "0x06fdde03").catch((e) => `ERROR: ${e.message}`),
      callString(address, "0x95d89b41").catch((e) => `ERROR: ${e.message}`),
      callUint8(address, "0x313ce567").catch((e) => `ERROR: ${e.message}`),
    ]);
    console.log(`- ERC-20 metadata: name=${JSON.stringify(name)} symbol=${JSON.stringify(symbol)} decimals=${decimals}`);
  }

  const pairs = await dexPairs(address).catch((e) => ({ error: e.message }));
  if (pairs.error) {
    console.log(`- Dexscreener: ERROR ${pairs.error}`);
    continue;
  }
  if (!pairs.length) {
    console.log("- Base DEX pairs: none found by Dexscreener");
    continue;
  }

  const sorted = [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  console.log("- Top Base DEX pairs:");
  for (const p of sorted.slice(0, 5)) {
    const base = `${p.baseToken?.symbol ?? "?"}/${p.quoteToken?.symbol ?? "?"}`;
    const liq = Math.round(p.liquidity?.usd ?? 0).toLocaleString();
    const vol = Math.round(p.volume?.h24 ?? 0).toLocaleString();
    console.log(`  - ${p.dexId} ${base}: liquidity=$${liq}, 24h volume=$${vol}, ${p.url}`);
  }
}
