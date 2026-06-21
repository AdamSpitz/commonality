#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const LOGICAL_CONTRACTS = [
  ['Beliefs', 'BELIEFS_CONTRACT_ADDRESS', 'START_BLOCK'],
  ['Implications', 'IMPLICATIONS_CONTRACT_ADDRESS', 'START_BLOCK'],
  ['TrustRegistry', 'TRUST_REGISTRY_ADDRESS', 'START_BLOCK'],
  ['AlignmentAttestations', 'ALIGNMENT_ATTESTATIONS_ADDRESS', 'FUNDING_PORTAL_START_BLOCK'],
  ['NoteIntent', 'NOTE_INTENT_ADDRESS', 'DELEGATION_START_BLOCK'],
  ['DelegatableNotes', 'DELEGATABLE_NOTES_ADDRESS', 'DELEGATION_START_BLOCK'],
  ['RecurringPledges', 'RECURRING_PLEDGES_ADDRESS', 'DELEGATION_START_BLOCK'],
  ['MutableRefUpdater', 'MUTABLE_REF_UPDATER_ADDRESS', 'START_BLOCK'],
  ['NudgePublications', 'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS', 'START_BLOCK'],
  ['AssuranceContractFactory', 'ASSURANCE_CONTRACT_FACTORY_ADDRESS', 'LAZYGIVING_START_BLOCK'],
  ['ERC1155Factory', 'ERC1155_FACTORY_ADDRESS', 'LAZYGIVING_START_BLOCK'],
  ['MarketplaceFactory', 'MARKETPLACE_FACTORY_ADDRESS', 'LAZYGIVING_START_BLOCK'],
  ['ContentRegistry', 'CONTENT_REGISTRY_ADDRESS', 'CONTENT_FUNDING_START_BLOCK'],
  ['ChannelRegistry', 'CHANNEL_REGISTRY_ADDRESS', 'CONTENT_FUNDING_START_BLOCK'],
  ['ChannelEscrow', 'CHANNEL_ESCROW_ADDRESS', 'CONTENT_FUNDING_START_BLOCK'],
  ['CreatorAssuranceContractFactory', 'CREATOR_CONTRACT_FACTORY_ADDRESS', 'CONTENT_FUNDING_START_BLOCK'],
];

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function parseArgs(argv) {
  const args = { network: undefined, env: undefined, out: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--network') args.network = argv[++i];
    else if (arg === '--env') args.env = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage: node scripts/deployment-manifest.mjs --network <chain-name> [--env deployments/<chain>.env] [--out deployments/<chain>.manifest.json]\n\nBuilds the versioned deployment manifest consumed by INDEXER_DEPLOYMENT_MANIFEST and publishable through MutableRefUpdater.`;
}

function parseEnv(content) {
  const values = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    values[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^"|"$/g, '');
  }
  return values;
}

function parseStartBlock(values, key) {
  const raw = values[key] ?? values.START_BLOCK ?? '0';
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} must be a non-negative integer; got ${raw}`);
  }
  return parsed;
}

export function buildDeploymentManifest(network, envValues) {
  const chainManifest = {};
  for (const [logicalName, addressKey, startBlockKey] of LOGICAL_CONTRACTS) {
    const address = envValues[addressKey];
    if (!address) continue;
    if (!ADDRESS_RE.test(address)) {
      throw new Error(`${addressKey} must be an Ethereum address; got ${address}`);
    }
    chainManifest[logicalName] = [{ address, startBlock: parseStartBlock(envValues, startBlockKey) }];
  }
  return {
    schema: 'commonality.deployment-manifest.v1',
    generatedAt: new Date().toISOString(),
    chains: { [network]: chainManifest },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.network) throw new Error('--network is required');

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const envPath = path.resolve(repoRoot, args.env ?? `deployments/${args.network}.env`);
  const outPath = path.resolve(repoRoot, args.out ?? `deployments/${args.network}.manifest.json`);
  const envValues = parseEnv(await fs.readFile(envPath, 'utf8'));
  const manifest = buildDeploymentManifest(args.network, envValues);
  await fs.writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
  console.log(`INDEXER_DEPLOYMENT_MANIFEST='${JSON.stringify({ chains: manifest.chains })}'`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
