#!/usr/bin/env node
// Probe CAD stablecoin contracts on Base for admin-control surfaces
// (pause/blacklist selectors, EIP-1967 proxy implementation) plus basic
// ERC-20 metadata. Read-only eth_calls; throttled to stay under public
// RPC rate limits.

import fs from "node:fs/promises";

const BASE_RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node admin-probe.mjs candidates.json");
  process.exit(1);
}
const candidates = JSON.parse(await fs.readFile(inputPath, "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(method, params) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(BASE_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const json = await res.json().catch(() => null);
    if (json?.error?.code === -32016 || res.status === 429) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${method} HTTP ${res.status}`);
    if (json.error) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
    return json.result;
  }
  throw new Error(`${method}: rate-limited after retries`);
}

async function call(address, data) {
  try {
    return await rpc("eth_call", [{ to: address, data }, "latest"]);
  } catch (e) {
    return `REVERT_OR_ERROR: ${e.message}`;
  }
}

function decodeString(data) {
  if (typeof data !== "string" || !data.startsWith("0x") || data === "0x") return null;
  const bytes = Buffer.from(data.slice(2), "hex");
  if (bytes.length < 64) return `0x${bytes.toString("hex")}`;
  const len = Number(BigInt(`0x${bytes.subarray(32, 64).toString("hex")}`));
  return bytes.subarray(64, 64 + len).toString("utf8");
}

const ZERO_PAD = "0".repeat(24);
const PROBE_ADDR = "1111111111111111111111111111111111111111"; // arbitrary EOA-shaped address

// selector, human name, how to interpret the result
const probes = [
  ["0x95d89b41", "symbol()", "string"],
  ["0x313ce567", "decimals()", "uint"],
  ["0x18160ddd", "totalSupply()", "uint"],
  ["0x5c975abb", "paused()", "bool"],
  ["0x8da5cb5b", "owner()", "address"],
  ["0xbd102430", "blacklister() [USDC-style]", "address"],
  [`0xfe575a87${ZERO_PAD}${PROBE_ADDR}`, "isBlacklisted(addr) [USDC-style]", "bool"],
  [`0xe47d6060${ZERO_PAD}${PROBE_ADDR}`, "isBlackListed(addr) [USDT-style]", "bool"],
  ["0xaa271e1a" + ZERO_PAD + PROBE_ADDR, "isMinter(addr)", "bool"],
];

const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

function interpret(kind, raw) {
  if (typeof raw !== "string" || !raw.startsWith("0x")) return raw;
  if (raw === "0x") return "NOT IMPLEMENTED (empty return)";
  switch (kind) {
    case "string": return JSON.stringify(decodeString(raw));
    case "uint": return BigInt(raw).toString();
    case "bool": return BigInt(raw) === 0n ? "false" : "true";
    case "address": return `0x${raw.slice(-40)}`;
    default: return raw;
  }
}

for (const c of candidates) {
  console.log(`\n## ${c.symbol} @ ${c.baseAddress}`);
  for (const slot of [["implementation", IMPL_SLOT], ["proxy admin", ADMIN_SLOT]]) {
    const v = await rpc("eth_getStorageAt", [c.baseAddress, slot[1], "latest"]);
    const addr = `0x${v.slice(-40)}`;
    console.log(`- EIP-1967 ${slot[0]}: ${/^0x0+$/.test(addr) ? "none" : addr}`);
    await sleep(400);
  }
  for (const [data, name, kind] of probes) {
    const raw = await call(c.baseAddress, data);
    console.log(`- ${name}: ${interpret(kind, raw)}`);
    await sleep(400);
  }
}
