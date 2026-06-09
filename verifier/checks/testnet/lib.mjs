import { readFile } from "node:fs/promises";
import dns from "node:dns/promises";
import tls from "node:tls";
import path from "node:path";
import { truncate, workspacePath } from "../lib/result.mjs";

export async function readTestnetConfig() {
  const configPath = process.env.COMMONALITY_VERIFIER_TESTNET_CONFIG_PATH ?? workspacePath("environments", "testnet.json");
  return JSON.parse(await readFile(configPath, "utf8"));
}

export function requireOptIn() {
  if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE !== "1") {
    const error = new Error("Refusing to run testnet check without COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE=1.");
    error.requiredEnv = ["COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE"];
    throw error;
  }
}

export function envValue(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
  try {
    const response = await fetch(url, {
      redirect: options.redirect ?? "follow",
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal
    });
    const body = await response.text();
    const probe = {
      url,
      ok: response.ok,
      status: response.status,
      redirected: response.redirected,
      finalUrl: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      body: truncate(body, options.maxBodyChars ?? 2000)
    };
    Object.defineProperty(probe, "rawBody", { value: body, enumerable: false });
    return probe;
  } catch (error) {
    return { url, ok: false, status: "request-error", body: truncate(error?.message ?? String(error), 1000) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function rpcCall(rpcUrl, method, params = []) {
  const probe = await fetchText(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    maxBodyChars: 4000
  });
  if (!probe.ok) return { ok: false, probe };
  try {
    const payload = JSON.parse(probe.rawBody ?? probe.body);
    if (payload.error) return { ok: false, probe, error: payload.error };
    return { ok: true, probe, result: payload.result };
  } catch (error) {
    return { ok: false, probe, error: `Invalid JSON: ${error.message}` };
  }
}

export async function graphqlQuery(url, query) {
  const probe = await fetchText(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
    maxBodyChars: 4000
  });
  if (!probe.ok) return { ok: false, probe };
  try {
    const payload = JSON.parse(probe.rawBody ?? probe.body);
    if (Array.isArray(payload.errors) && payload.errors.length > 0) return { ok: false, probe, payload, error: "GraphQL returned errors." };
    return { ok: true, probe, payload };
  } catch (error) {
    return { ok: false, probe, error: `Invalid JSON: ${error.message}` };
  }
}

export async function resolveHost(hostname) {
  const [a, aaaa, cname] = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
    dns.resolveCname(hostname)
  ]);
  return {
    hostname,
    a: a.status === "fulfilled" ? a.value : [],
    aaaa: aaaa.status === "fulfilled" ? aaaa.value : [],
    cname: cname.status === "fulfilled" ? cname.value : [],
    errors: [a, aaaa, cname].filter((r) => r.status === "rejected").map((r) => r.reason?.code ?? r.reason?.message ?? String(r.reason))
  };
}

export function isPrivateAddress(address) {
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.|169\.254\.|::1$|fc|fd|fe80)/i.test(address);
}

export function checkTls(hostname, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, servername: hostname, port: 443, timeout: timeoutMs }, () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      const authorizationError = socket.authorizationError;
      socket.end();
      resolve({ hostname, ok: authorized, subjectaltname: cert.subjectaltname ?? "", valid_to: cert.valid_to, authorizationError });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ hostname, ok: false, error: "TLS connection timed out" });
    });
    socket.on("error", (error) => resolve({ hostname, ok: false, error: error.message }));
  });
}

export async function readEnvFile(relativePath) {
  const absolute = path.resolve(process.env.VERIFIER_WORKSPACE ?? process.cwd(), relativePath);
  const text = await readFile(absolute, "utf8");
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (match) values[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return values;
}

export function artifactResult(error) {
  return { requiredEnv: error.requiredEnv ?? undefined, message: error.message };
}
