#!/usr/bin/env node
// Add beat-agent wallet/trust-secret entries to an existing generated deployment.
// Safe to re-run: it preserves existing non-placeholder values unless --force.

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const secretsPath = join(rootDir, '.env.secrets');
const walletsPath = join(rootDir, 'deployments', 'wallets.env');
const force = process.argv.includes('--force');

async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

function parseEnv(content) {
  const entries = new Map();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    entries.set(trimmed.slice(0, index), trimmed.slice(index + 1));
  }
  return entries;
}

function isPlaceholderValue(value) {
  return value === '' || value.includes('your_') || value.includes('0x_') || value.startsWith('generated_');
}

function upsertEnv(content, entries) {
  const keys = new Set(Object.keys(entries));
  const lines = content ? content.replace(/\n*$/, '').split('\n') : [];
  const seen = new Set();
  const updated = lines.map((line) => {
    const trimmed = line.trim();
    const index = trimmed.indexOf('=');
    if (!trimmed || trimmed.startsWith('#') || index === -1) return line;
    const key = trimmed.slice(0, index);
    if (!keys.has(key)) return line;
    seen.add(key);
    return `${key}=${entries[key]}`;
  });
  const missing = Object.entries(entries)
    .filter(([key]) => !seen.has(key))
    .map(([key, value]) => `${key}=${value}`);
  if (updated.length > 0 && missing.length > 0) updated.push('');
  return [...updated, ...missing].join('\n') + '\n';
}

function reusable(existing, key) {
  const value = existing.get(key);
  return value && !isPlaceholderValue(value) && !force ? value : undefined;
}

const secretsContent = await readText(secretsPath);
const walletsContent = await readText(walletsPath);
const secrets = parseEnv(secretsContent);
const wallets = parseEnv(walletsContent);

let privateKey = reusable(secrets, 'BEAT_AGENT_PRIVATE_KEY');
let address = reusable(wallets, 'BEAT_AGENT_ADDRESS');
if (!privateKey || force) {
  privateKey = generatePrivateKey();
  address = privateKeyToAccount(privateKey).address;
} else if (!address) {
  address = privateKeyToAccount(privateKey).address;
}

const finderKey = reusable(secrets, 'BEAT_AGENT_TRUSTED_FINDER_KEY') || randomBytes(32).toString('base64url');

const privateEntries = {
  BEAT_AGENT_PRIVATE_KEY: privateKey,
  BEAT_AGENT_TRUSTED_FINDER_KEY: finderKey,
  BEAT_AGENT_FINDER_KEY: finderKey,
};
const publicEntries = {
  BEAT_AGENT_ADDRESS: address,
  BEAT_AGENT_PAYMENT_ADDRESS: address,
  VITE_DEFAULT_TRUSTED_BEAT_AGENTS: address,
};

await mkdir(dirname(walletsPath), { recursive: true });
await writeFile(secretsPath, upsertEnv(secretsContent || '# Commonality private deployment secrets. Gitignored; do not commit.\n\n', privateEntries));
await writeFile(walletsPath, upsertEnv(walletsContent || '# Public operational wallet addresses for the current non-local deployment.\n\n', publicEntries));

console.log('Beat agent wallet/trust config:');
console.log(`  BEAT_AGENT_PRIVATE_KEY=${privateKey}`);
console.log(`  BEAT_AGENT_ADDRESS=${address}`);
console.log(`  BEAT_AGENT_PAYMENT_ADDRESS=${address}`);
console.log(`  BEAT_AGENT_TRUSTED_FINDER_KEY=${finderKey}`);
console.log(`  BEAT_AGENT_FINDER_KEY=${finderKey}`);
console.log(`Wrote ${secretsPath} and ${walletsPath}`);
