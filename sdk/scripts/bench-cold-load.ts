#!/usr/bin/env npx tsx
/**
 * Cold-load bench for the global folds in
 * specs/tech/indexer/fold-performance-plan.md.
 *
 * Talks to a running indexer (EVENT_CACHE_URL, default http://localhost:42069)
 * and the contract addresses in the repo-root .env. Prints one row per query:
 * event-cache requests, response bytes, and wall time.
 *
 * Usage (from sdk/): npx tsx scripts/bench-cold-load.ts
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSDKMachinery, type SDKMachinery } from '../src/machinery.js';
import { bytes32ToCid } from '../src/utils/cid-types.js';
import { fetchAllNoteIntentEvents } from '../src/utils/eventCacheClient.js';
import { browseStatements, getAllStatements } from '../src/subsystems/conceptspace/queries/browse.js';
import { getImplicationSourceActivity } from '../src/subsystems/conceptspace/queries/indirect-support.js';
import { fetchAndFoldContentFundingState } from '../src/subsystems/content-funding/queries/fetch-state.js';
import { getDonationActivityByRoot, getNoteIntentAggregate } from '../src/subsystems/delegation/queries.js';
import { getStandingPledges } from '../src/subsystems/delegation/recurring-pledges.js';
import { getKnownProofTiers } from '../src/subsystems/identity/queries.js';
import { getAllProjectAddresses, getAllProjects, getUserContributions } from '../src/subsystems/lazy-giving/queries.js';
import { getRefsByName } from '../src/subsystems/mutable-refs/queries.js';
import { loadWorkRequestBoard } from '../src/subsystems/work-requests/queries.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function loadEnvFile(path: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    values[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return values;
}

function address(env: Record<string, string>, ...keys: string[]): `0x${string}` | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value && /^0x[0-9a-fA-F]{40}$/.test(value)) return value as `0x${string}`;
  }
  return undefined;
}

function machineryFrom(env: Record<string, string>): SDKMachinery {
  return createSDKMachinery({
    eventCacheUrl: env.EVENT_CACHE_URL || 'http://localhost:42069',
    defaultChainId: 31337,
    contractAddresses: {
      beliefs: address(env, 'BELIEFS_CONTRACT_ADDRESS'),
      implications: address(env, 'IMPLICATIONS_CONTRACT_ADDRESS'),
      alignmentAttestations: address(env, 'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS'),
      mutableRefUpdater: address(env, 'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS'),
      trustRegistry: address(env, 'TRUST_REGISTRY_ADDRESS'),
      accountAssertions: address(env, 'ACCOUNT_ASSERTIONS_ADDRESS'),
      publishedData: address(env, 'PUBLISHED_DATA_CONTRACT_ADDRESS'),
      nudgePublications: address(env, 'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS'),
      assuranceContractFactory: address(env, 'ASSURANCE_CONTRACT_FACTORY_ADDRESS')!,
      erc1155Factory: address(env, 'ERC1155_FACTORY_ADDRESS')!,
      delegatableNotes: address(env, 'DELEGATABLE_NOTES_CONTRACT_ADDRESS')!,
      noteIntent: address(env, 'NOTE_INTENT_ADDRESS')!,
      recurringPledges: address(env, 'RECURRING_PLEDGES_ADDRESS'),
      contentRegistry: address(env, 'CONTENT_REGISTRY_ADDRESS'),
      beneficiaryRegistry: address(env, 'BENEFICIARY_REGISTRY_ADDRESS'),
      beneficiaryEscrow: address(env, 'BENEFICIARY_ESCROW_ADDRESS'),
      creatorContractFactory: address(env, 'CREATOR_CONTRACT_FACTORY_ADDRESS'),
      prospectiveContentRoundFactory: address(env, 'PROSPECTIVE_CONTENT_ROUND_FACTORY_ADDRESS'),
    },
  });
}

type Sample = { requests: number; bytes: number; ms: number; detail: string };

const originalFetch = globalThis.fetch;

async function time(run: () => Promise<unknown>, detail: (value: unknown) => string): Promise<Sample> {
  let requests = 0;
  let bytes = 0;
  globalThis.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/api/events')) {
      requests += 1;
      bytes += (await response.clone().arrayBuffer()).byteLength;
    }
    return response;
  };
  const started = performance.now();
  try {
    const value = await run();
    return {
      requests,
      bytes,
      ms: Math.round(performance.now() - started),
      detail: detail(value),
    };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function oneEvent(base: string, eventName: string): Promise<Record<string, string> | null> {
  const url = new URL('/api/events', base);
  url.searchParams.set('chainId', '31337');
  url.searchParams.set('eventName', eventName);
  url.searchParams.set('limit', '1');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  const body = await response.json() as { items?: Record<string, string>[] };
  return body.items?.[0] ?? null;
}

function topicAddress(topic: string | undefined): `0x${string}` | null {
  if (!topic || topic.length < 40) return null;
  const hex = `0x${topic.slice(-40)}`;
  return /^0x[0-9a-fA-F]{40}$/.test(hex) ? hex as `0x${string}` : null;
}

async function main(): Promise<void> {
  const env = loadEnvFile(join(ROOT, '.env'));
  const machinery = machineryFrom(env);
  const base = machinery.eventCacheUrl!;
  const health = await fetch(new URL('/api/events?chainId=31337&limit=1', base));
  if (!health.ok) throw new Error(`Indexer at ${base} returned ${health.status}`);

  const note = await oneEvent(base, 'NoteCreated');
  const support = await oneEvent(base, 'DirectSupport');
  const intent = await oneEvent(base, 'NoteIntentAttested');
  const root = topicAddress(note?.topic2) ?? '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const statementId = support?.topic2 ? bytes32ToCid(support.topic2 as `0x${string}`) : null;
  const intentStatement = intent?.topic2 ? bytes32ToCid(intent.topic2 as `0x${string}`) : statementId;

  const rows: Array<[string, () => Promise<Sample>]> = [
    ['browseStatements (believerCount)', () => time(
      () => browseStatements(machinery, { orderBy: 'believerCount' }),
      value => `${(value as unknown[]).length} statements`,
    )],
    ['getAllStatements', () => time(
      () => getAllStatements(machinery),
      value => `${(value as unknown[]).length} statements`,
    )],
    ['getImplicationSourceActivity', () => time(
      () => getImplicationSourceActivity(machinery),
      value => `${(value as { totalImplications: number }).totalImplications} implications`,
    )],
    ['fetchAndFoldContentFundingState', () => time(
      () => fetchAndFoldContentFundingState(machinery),
      value => value == null ? 'empty' : 'folded',
    )],
    [`getDonationActivityByRoot ${root}`, () => time(
      () => getDonationActivityByRoot(machinery, root),
      value => `${(value as unknown[]).length} rows`,
    )],
    ['fetchAllNoteIntentEvents', () => time(
      () => fetchAllNoteIntentEvents(machinery),
      value => `${(value as unknown[]).length} events`,
    )],
    ['getStandingPledges', () => time(
      () => getStandingPledges(machinery),
      value => `${(value as unknown[]).length} pledges`,
    )],
    ['getAllProjectAddresses', () => time(
      () => getAllProjectAddresses(machinery),
      value => `${(value as unknown[]).length} projects`,
    )],
    ['getAllProjects', () => time(
      () => getAllProjects(machinery),
      value => `${(value as unknown[]).length} projects`,
    )],
    [`getUserContributions ${root}`, () => time(
      () => getUserContributions(machinery, root),
      value => `${(value as unknown[]).length} contributions`,
    )],
    ['getRefsByName (full RefUpdated download)', () => time(
      () => getRefsByName(machinery, 'bench-unused-name'),
      value => `${(value as unknown[]).length} refs`,
    )],
    ['loadWorkRequestBoard', () => time(
      () => loadWorkRequestBoard(machinery),
      () => 'folded',
    )],
    ['getKnownProofTiers', () => time(
      () => getKnownProofTiers(machinery),
      value => `${(value as Map<string, unknown>).size} tiers`,
    )],
  ];
  if (intentStatement) {
    rows.splice(6, 0, [`getNoteIntentAggregate ${intentStatement}`, () => time(
      () => getNoteIntentAggregate(machinery, intentStatement),
      value => `${(value as { noteCount: number }).noteCount} notes`,
    )]);
  }

  console.log(`indexer ${base}`);
  console.log('query\trequests\tbytes\tms\tdetail');
  for (const [name, run] of rows) {
    try {
      const sample = await run();
      console.log(`${name}\t${sample.requests}\t${sample.bytes}\t${sample.ms}\t${sample.detail}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`${name}\tERR\t\t\t${message.split('\n')[0]}`);
    }
  }
}

main().catch(error => {
  globalThis.fetch = originalFetch;
  console.error(error);
  process.exit(1);
});
