#!/usr/bin/env node
/**
 * Fail-fast local stack consistency checker.
 *
 * Catches the class of bugs where Hardhat, deployments/localhost.env, SPA
 * config.json files, and the SDK/UI ABIs drift apart (missing PublishedData,
 * stale ProjectFactory ABI, LazyGiving vs CauseStarter address mismatch, …).
 *
 * Usage:
 *   ./scripts/check-local-config-sync.mjs
 *   ./scripts/check-local-config-sync.mjs --env-only
 *   ./scripts/check-local-config-sync.mjs --skip-runtime
 *   ./scripts/check-local-config-sync.mjs --skip-chain
 *
 * Exit 0 = healthy; exit 1 = drift / missing required config.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toFunctionSelector } from 'viem';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const ENV_ONLY = args.has('--env-only');
const SKIP_RUNTIME = ENV_ONLY || args.has('--skip-runtime');
const SKIP_CHAIN = ENV_ONLY || args.has('--skip-chain');
const QUIET = args.has('--quiet');

/** Current ProjectFactory create entrypoint (post secondary-market removal). */
const PROJECT_FACTORY_CREATE_SELECTOR = toFunctionSelector(
  'createERC1155AndAssuranceContract(string,string,address,address,address,uint256,uint256,string,uint256[],uint256[],uint256[])',
);
/** Pre-rename selector still seen on stale local deploys. */
const LEGACY_PROJECT_FACTORY_CREATE_SELECTOR = toFunctionSelector(
  'createERC1155AndMarketplaceAndAssuranceContract(string,string,address,address,address,uint256,uint256,string,uint256[],uint256[],uint256[])',
);

/**
 * Env keys that must be present for a usable local stack.
 * Values are read from deployments/localhost.env (preferred) or root .env.
 */
const REQUIRED_ROOT_KEYS = [
  'BELIEFS_CONTRACT_ADDRESS',
  'IMPLICATIONS_CONTRACT_ADDRESS',
  'PROJECT_FACTORY_ADDRESS',
  'ASSURANCE_CONTRACT_FACTORY_ADDRESS',
  'ERC1155_FACTORY_ADDRESS',
  'PAYMENT_TOKEN_ADDRESS',
  'PUBLISHED_DATA_CONTRACT_ADDRESS',
  'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
  'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
  'TRUST_REGISTRY_ADDRESS',
  'DELEGATABLE_NOTES_CONTRACT_ADDRESS',
  'NOTE_INTENT_ADDRESS',
  'PROSPECTIVE_CONTENT_ROUND_FACTORY_ADDRESS',
];

/** Map root deploy names → VITE_* names expected by SPAs. */
const ROOT_TO_VITE = {
  BELIEFS_CONTRACT_ADDRESS: 'VITE_BELIEFS_CONTRACT_ADDRESS',
  IMPLICATIONS_CONTRACT_ADDRESS: 'VITE_IMPLICATIONS_CONTRACT_ADDRESS',
  PROJECT_FACTORY_ADDRESS: 'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS',
  ASSURANCE_CONTRACT_FACTORY_ADDRESS: 'VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS',
  ERC1155_FACTORY_ADDRESS: 'VITE_ERC1155_FACTORY_ADDRESS',
  PAYMENT_TOKEN_ADDRESS: 'VITE_PAYMENT_TOKEN_ADDRESS',
  PUBLISHED_DATA_CONTRACT_ADDRESS: 'VITE_PUBLISHED_DATA_CONTRACT_ADDRESS',
  ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: 'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
  MUTABLE_REF_UPDATER_CONTRACT_ADDRESS: 'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
  TRUST_REGISTRY_ADDRESS: 'VITE_TRUST_REGISTRY_CONTRACT_ADDRESS',
  DELEGATABLE_NOTES_CONTRACT_ADDRESS: 'VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS',
  NOTE_INTENT_ADDRESS: 'VITE_NOTE_INTENT_CONTRACT_ADDRESS',
  NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: 'VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS',
  PROSPECTIVE_CONTENT_ROUND_FACTORY_ADDRESS: 'VITE_PROSPECTIVE_CONTENT_ROUND_FACTORY_ADDRESS',
};

const RUNTIME_CONFIG_URLS = [
  { name: 'CauseStarter', url: 'http://localhost:8090/config.json' },
  { name: 'LazyGiving UI', url: 'http://lazygiving.localhost:8088/config.json' },
];

const errors = [];
const warnings = [];
const notes = [];

function log(msg) {
  if (!QUIET) console.log(msg);
}

function parseEnv(content) {
  const entries = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

async function loadEnvFile(filePath) {
  try {
    return parseEnv(await fs.readFile(filePath, 'utf8'));
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

function isAddress(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function normalizeAddress(value) {
  return value.toLowerCase();
}

async function rpc(url, method, params = []) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));
  return body.result;
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function bytecodeHasSelector(codeHex, selector) {
  if (!codeHex || codeHex === '0x') return false;
  // PUSH4 <selector> appears in the dispatcher as 63XXXXXXXX
  const bare = selector.replace(/^0x/i, '').toLowerCase();
  return codeHex.toLowerCase().includes(`63${bare}`);
}

function mergeEnvSources(sources) {
  // Later sources win (matches deploy-causestarter load order intent: localhost.env then live .env).
  const merged = {};
  for (const src of sources) {
    if (!src) continue;
    Object.assign(merged, src);
  }
  return merged;
}

function checkRequiredKeys(env, label) {
  for (const key of REQUIRED_ROOT_KEYS) {
    const value = env[key] || env[ROOT_TO_VITE[key]];
    if (!value) {
      errors.push(`${label}: missing ${key}`);
    } else if (!isAddress(value)) {
      errors.push(`${label}: ${key} is not a 20-byte address (${value})`);
    }
  }
}

function checkViteMirror(rootEnv, viteEnv, label) {
  for (const [rootKey, viteKey] of Object.entries(ROOT_TO_VITE)) {
    const rootVal = rootEnv[rootKey];
    if (!rootVal || !isAddress(rootVal)) continue;
    const viteVal = viteEnv[viteKey] || viteEnv[rootKey];
    if (!viteVal) {
      // ui/.env may omit optional keys; required ones are already covered by REQUIRED list via mirror.
      if (REQUIRED_ROOT_KEYS.includes(rootKey)) {
        errors.push(`${label}: missing ${viteKey} (expected ${rootVal})`);
      }
      continue;
    }
    if (normalizeAddress(viteVal) !== normalizeAddress(rootVal)) {
      errors.push(
        `${label}: ${viteKey} drift — file has ${viteVal}, deploy env has ${rootVal}`,
      );
    }
  }
}

function checkRuntimeAgainstDeploy(name, config, deployEnv) {
  for (const [rootKey, viteKey] of Object.entries(ROOT_TO_VITE)) {
    if (!REQUIRED_ROOT_KEYS.includes(rootKey) && rootKey !== 'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS') {
      continue;
    }
    const expected = deployEnv[rootKey];
    if (!expected || !isAddress(expected)) continue;
    const actual = config[viteKey];
    if (!actual) {
      errors.push(`${name} config.json: missing ${viteKey}`);
      continue;
    }
    if (normalizeAddress(actual) !== normalizeAddress(expected)) {
      errors.push(
        `${name} config.json: ${viteKey} is ${actual}, expected ${expected} from deploy env. `
        + 'Republish UI / recreate CauseStarter after hardhat-deploy.',
      );
    }
  }
}

async function checkChain(rpcUrl, deployEnv) {
  let blockNumber;
  try {
    blockNumber = await rpc(rpcUrl, 'eth_blockNumber');
  } catch (err) {
    warnings.push(`Chain RPC ${rpcUrl} unreachable (${err.message}); skipped on-chain checks.`);
    return;
  }
  notes.push(`RPC ${rpcUrl} ok (block ${Number.parseInt(blockNumber, 16)})`);

  for (const key of REQUIRED_ROOT_KEYS) {
    const address = deployEnv[key];
    if (!address || !isAddress(address)) continue;
    let code;
    try {
      code = await rpc(rpcUrl, 'eth_getCode', [address, 'latest']);
    } catch (err) {
      errors.push(`eth_getCode failed for ${key} (${address}): ${err.message}`);
      continue;
    }
    if (!code || code === '0x') {
      errors.push(
        `No contract code at ${key}=${address}. Chain was likely reset without re-running hardhat-deploy.`,
      );
    }
  }

  const factory = deployEnv.PROJECT_FACTORY_ADDRESS;
  if (factory && isAddress(factory)) {
    let code;
    try {
      code = await rpc(rpcUrl, 'eth_getCode', [factory, 'latest']);
    } catch (err) {
      errors.push(`Could not read ProjectFactory bytecode: ${err.message}`);
      return;
    }
    if (!code || code === '0x') return;

    const hasCurrent = bytecodeHasSelector(code, PROJECT_FACTORY_CREATE_SELECTOR);
    const hasLegacy = bytecodeHasSelector(code, LEGACY_PROJECT_FACTORY_CREATE_SELECTOR);

    if (!hasCurrent && hasLegacy) {
      errors.push(
        `ProjectFactory at ${factory} only has the legacy create selector `
        + `(${LEGACY_PROJECT_FACTORY_CREATE_SELECTOR}). SDK/UI expect `
        + `${PROJECT_FACTORY_CREATE_SELECTOR} (createERC1155AndAssuranceContract). `
        + 'Redeploy contracts: ./scripts/deploy-contracts.sh localhost '
        + 'then republish UIs / recreate CauseStarter.',
      );
    } else if (!hasCurrent) {
      errors.push(
        `ProjectFactory at ${factory} does not expose createERC1155AndAssuranceContract `
        + `(selector ${PROJECT_FACTORY_CREATE_SELECTOR}). Redeploy contracts from current tree.`,
      );
    } else if (hasLegacy) {
      warnings.push(
        `ProjectFactory at ${factory} has both current and legacy create selectors; current is fine.`,
      );
    } else {
      notes.push(`ProjectFactory ABI selector ok (${PROJECT_FACTORY_CREATE_SELECTOR})`);
    }
  }
}

async function main() {
  log('Checking local config sync…');

  const localhostEnvPath = path.join(ROOT, 'deployments', 'localhost.env');
  const rootEnvPath = path.join(ROOT, '.env');
  const uiEnvPath = path.join(ROOT, 'ui', '.env');
  const causestarterEnvPath = path.join(ROOT, 'causestarter', '.env');

  const localhostEnv = await loadEnvFile(localhostEnvPath);
  const rootEnv = await loadEnvFile(rootEnvPath);
  const uiEnv = await loadEnvFile(uiEnvPath);
  const causestarterEnv = await loadEnvFile(causestarterEnvPath);

  if (!localhostEnv && !rootEnv) {
    errors.push('Neither deployments/localhost.env nor .env found. Run hardhat-deploy first.');
  }

  if (localhostEnv) {
    log(`  loaded ${path.relative(ROOT, localhostEnvPath)}`);
    checkRequiredKeys(localhostEnv, 'deployments/localhost.env');
  } else {
    warnings.push('deployments/localhost.env missing — falling back to root .env only');
  }

  if (rootEnv) {
    log(`  loaded ${path.relative(ROOT, rootEnvPath)}`);
    // Root .env should mirror deploy addresses when present.
    if (localhostEnv) {
      for (const key of REQUIRED_ROOT_KEYS) {
        if (localhostEnv[key] && rootEnv[key]
          && normalizeAddress(localhostEnv[key]) !== normalizeAddress(rootEnv[key])) {
          errors.push(
            `.env ${key} (${rootEnv[key]}) differs from deployments/localhost.env (${localhostEnv[key]})`,
          );
        }
      }
    } else {
      checkRequiredKeys(rootEnv, '.env');
    }
  }

  const deployEnv = mergeEnvSources([localhostEnv, rootEnv]);

  if (uiEnv) {
    log(`  loaded ${path.relative(ROOT, uiEnvPath)}`);
    checkViteMirror(deployEnv, uiEnv, 'ui/.env');
  } else {
    warnings.push('ui/.env missing — UI IPFS publisher may bake empty contract addresses');
  }

  if (causestarterEnv) {
    // Optional package env; only check drift if it sets addresses.
    const hasAny = Object.values(ROOT_TO_VITE).some((k) => causestarterEnv[k]);
    if (hasAny) {
      checkViteMirror(deployEnv, causestarterEnv, 'causestarter/.env');
    }
  }

  // Explicit PublishedData callout (the gap that broke CauseStarter publish).
  if (!deployEnv.PUBLISHED_DATA_CONTRACT_ADDRESS) {
    errors.push(
      'PUBLISHED_DATA_CONTRACT_ADDRESS is unset. Statement launch and project metadata publish need it. '
      + 'Redeploy: ./scripts/deploy-contracts.sh localhost',
    );
  }

  if (!SKIP_CHAIN) {
    const rpcUrl = deployEnv.ETH_RPC_URL
      || deployEnv.VITE_ETH_RPC_URL
      || 'http://127.0.0.1:8545';
    await checkChain(rpcUrl, deployEnv);
  }

  if (!SKIP_RUNTIME) {
    for (const { name, url } of RUNTIME_CONFIG_URLS) {
      try {
        const config = await fetchJson(url);
        log(`  fetched ${name} (${url})`);
        checkRuntimeAgainstDeploy(name, config, deployEnv);
      } catch (err) {
        warnings.push(`${name} config unreachable at ${url} (${err.message}); skipped.`);
      }
    }
  }

  if (notes.length && !QUIET) {
    for (const n of notes) console.log(`  note: ${n}`);
  }
  if (warnings.length) {
    for (const w of warnings) console.warn(`  warning: ${w}`);
  }
  if (errors.length) {
    console.error('\nLocal config sync FAILED:');
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error('\nFix:');
    console.error('  1. ./scripts/deploy-contracts.sh localhost');
    console.error('  2. Restart indexer if addresses changed (docker compose up -d --force-recreate indexer)');
    console.error('  3. ./scripts/deploy-causestarter.sh');
    console.error('  4. Republish domain UIs: ./scripts/services.sh --start  (or re-run UI IPFS publishers)');
    console.error('  5. Re-run: ./scripts/check-local-config-sync.sh');
    process.exit(1);
  }

  log('\nLocal config sync OK.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
