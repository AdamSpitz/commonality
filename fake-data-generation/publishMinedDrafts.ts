/**
 * One-shot: publish unpublished CauseStarter drafts from tmp/mined-drafts.json,
 * then generate fake belief/pledge activity on those statements.
 *
 * Run from fake-data-generation/: npx tsx publishMinedDrafts.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseEther } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { BeliefsAbi, MutableRefUpdaterAbi, RecurringPledgesAbi } from '@commonality/sdk/abis';
import { cidToBytes32, type IpfsCidV1, type WriteClients } from '@commonality/sdk/utils';
import { createIPFSConfigInNodeJSFromTheUsualEnvVars } from '@commonality/sdk/node';
import { getRef, updateRef } from '@commonality/sdk/mutable-refs';
import { approveRecurringPledgeToken, createStandingPledge } from '@commonality/sdk/delegation';
import { publishGeneratedStatement } from './generateStatements.js';
import { CONTRACT_ADDRESSES, loadEnv, RPC_URL } from './loadEnv.js';
import { createSeedClients } from './seedRpc.js';
import { parsePaymentTokenUnits } from './paymentTokenUnits.js';
import {
  buildSeedRosterDocument,
  CAUSE_BOOKMARKS_REF,
  FUNDED_HARDHAT_DEV_KEYS,
  serializeSeedCauseBookmarkList,
  type SeedCauseRosterFields,
} from './seedCauseRoster.js';
import { createDefaultDocumentStore } from '@commonality/sdk/displayable-documents';
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { PublishedDataAbi } from '@commonality/sdk/abis';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRAFTS_PATH = join(__dirname, '..', 'tmp', 'mined-drafts.json');
const OUT_PATH = join(__dirname, '..', 'tmp', 'mined-published.json');

const BELIEVES = 1;
const MONTH_SECONDS = 30n * 24n * 60n * 60n;
const OWNER_KEY = FUNDED_HARDHAT_DEV_KEYS[0]!;
const EXTRA_USERS = 60;
const SIGNS_PER_USER = 12;
const USER_CONCURRENCY = 6;

interface DraftPlank {
  id: string;
  text: string;
  origin?: string;
  cid?: string;
}
interface DraftCause {
  id: string;
  title?: string;
  summary?: string;
  planks?: DraftPlank[];
  slug?: string;
  rosterCid?: string;
  founderAddress?: string;
}

function slugify(title: string, used: Set<string>): string {
  let base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  if (!base) base = 'mined-cause';
  if (!base.startsWith('mined-')) base = `mined-${base}`;
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base.slice(0, 60)}-${n}`.slice(0, 64);
    n += 1;
  }
  used.add(slug);
  return slug;
}

function clients(key: `0x${string}`) {
  return createSeedClients(key, RPC_URL);
}

async function setBelief(key: `0x${string}`, cid: IpfsCidV1): Promise<void> {
  const beliefs = CONTRACT_ADDRESSES.beliefs as `0x${string}`;
  const c = clients(key);
  const hash = await c.walletClient.writeContract({
    address: beliefs,
    abi: BeliefsAbi,
    functionName: 'setBelief',
    args: [cidToBytes32(cid), BELIEVES],
    chain: c.walletClient.chain,
    account: c.walletClient.account,
  });
  await c.publicClient.waitForTransactionReceipt({ hash });
}

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  const q = [...items];
  await Promise.all(
    Array.from({ length: Math.min(n, q.length) }, async () => {
      while (q.length > 0) {
        const item = q.shift();
        if (item === undefined) return;
        await fn(item);
      }
    }),
  );
}

async function mergeBookmarks(entries: Array<{ owner: string; slug: string }>): Promise<void> {
  const mutableRef = CONTRACT_ADDRESSES.mutableRefUpdater as `0x${string}`;
  const refContract = { address: mutableRef, abi: MutableRefUpdaterAbi };
  const reader = clients(OWNER_KEY);
  let existing: { owner: string; slug: string }[] = [];
  try {
    const raw = await getRef(reader as WriteClients, refContract, reader.account, CAUSE_BOOKMARKS_REF);
    if (raw) {
      const parsed = JSON.parse(raw) as { causes?: { owner: string; slug: string }[] };
      existing = parsed.causes ?? [];
    }
  } catch {
    existing = [];
  }
  const seen = new Set(existing.map((row) => `${row.owner.toLowerCase()}:${row.slug}`));
  const merged = [...existing];
  for (const row of entries) {
    const key = `${row.owner.toLowerCase()}:${row.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  const value = serializeSeedCauseBookmarkList(merged);
  for (const key of FUNDED_HARDHAT_DEV_KEYS) {
    await updateRef(clients(key) as WriteClients, refContract, CAUSE_BOOKMARKS_REF, value);
  }
}

async function main(): Promise<void> {
  const publishedData = CONTRACT_ADDRESSES.publishedData as `0x${string}` | undefined;
  const mutableRef = CONTRACT_ADDRESSES.mutableRefUpdater as `0x${string}` | undefined;
  const beliefs = CONTRACT_ADDRESSES.beliefs as `0x${string}` | undefined;
  if (!publishedData || !mutableRef || !beliefs) {
    throw new Error('Need PUBLISHED_DATA, MUTABLE_REF_UPDATER, and BELIEFS addresses in .env');
  }

  const drafts = JSON.parse(readFileSync(DRAFTS_PATH, 'utf8')) as DraftCause[];
  const unpublished = drafts.filter((cause) => {
    const planks = (cause.planks ?? []).filter((p) => p.text?.trim());
    return planks.length > 0 && !cause.rosterCid;
  });
  if (unpublished.length === 0) {
    throw new Error('No unpublished draft boards in mined-drafts.json');
  }

  const owner = clients(OWNER_KEY);
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const usedSlugs = new Set<string>();
  const results: Array<{
    id: string;
    title: string;
    summary: string;
    slug: string;
    owner: string;
    rosterCid: string;
    planks: Array<{ id: string; text: string; cid: string }>;
  }> = [];

  console.log(`Publishing ${unpublished.length} draft boards as ${owner.account}…`);

  for (const cause of unpublished) {
    const slug = slugify(cause.title || 'cause', usedSlugs);
    const planksOut: Array<{ id: string; text: string; cid: string }> = [];
    for (const plank of cause.planks ?? []) {
      const text = plank.text?.trim();
      if (!text) continue;
      const cid = await publishGeneratedStatement(
        ipfsConfig,
        { text, domain: slug, position: plank.id },
        slug,
        plank.id,
        'simple',
        { clients: owner as WriteClients, publishedDataAddress: publishedData },
      );
      await setBelief(OWNER_KEY, cid);
      planksOut.push({ id: plank.id, text, cid });
      console.log(`  plank ${cid}  ${text.slice(0, 72)}`);
    }
    const fields: SeedCauseRosterFields = {
      title: (cause.title || planksOut[0]?.text || 'Untitled cause').slice(0, 120),
      summary: (cause.summary || '').slice(0, 500),
      plankCids: planksOut.map((p) => p.cid),
      mediatorBlurb: '',
    };
    const doc = buildSeedRosterDocument(fields);
    const store = createDefaultDocumentStore(createSDKMachinery({ ipfsConfig }), {
      clients: owner as WriteClients,
      publishedDataContract: { address: publishedData, abi: PublishedDataAbi },
    });
    const publication = await store.publish(doc);
    await updateRef(
      owner as WriteClients,
      { address: mutableRef, abi: MutableRefUpdaterAbi },
      slug,
      publication.cid,
    );
    console.log(`  roster ${slug} → ${publication.cid} (${planksOut.length} planks)`);
    results.push({
      id: cause.id,
      title: fields.title,
      summary: fields.summary,
      slug,
      owner: owner.account,
      rosterCid: publication.cid,
      planks: planksOut,
    });
  }

  await mergeBookmarks(results.map((row) => ({ owner: row.owner, slug: row.slug })));
  console.log(`Bookmarked ${results.length} boards for Hardhat #0–#9`);

  const allCids = results.flatMap((row) => row.planks.map((p) => p.cid));
  console.log(`\nSeeding fake usage on ${allCids.length} statements…`);

  const extraKeys: `0x${string}`[] = [];
  const funder = clients(OWNER_KEY);
  for (let i = 0; i < EXTRA_USERS; i++) {
    extraKeys.push(generatePrivateKey());
  }
  for (const key of extraKeys) {
    const addr = privateKeyToAccount(key).address;
    const hash = await funder.walletClient.sendTransaction({
      to: addr,
      value: parseEther('1.5'),
      account: funder.walletClient.account,
      chain: funder.walletClient.chain,
    });
    await funder.publicClient.waitForTransactionReceipt({ hash });
  }
  console.log(`Funded ${extraKeys.length} fake users`);

  const signers: `0x${string}`[] = [...FUNDED_HARDHAT_DEV_KEYS.slice(1), ...extraKeys];
  let signCount = 0;
  let signFail = 0;
  await pool(signers, USER_CONCURRENCY, async (key) => {
    const count = Math.min(allCids.length, SIGNS_PER_USER + Math.floor(Math.random() * 8));
    const picks = [...allCids].sort(() => Math.random() - 0.5).slice(0, count);
    for (const cid of picks) {
      try {
        await setBelief(key, cid as IpfsCidV1);
        signCount += 1;
      } catch (error) {
        signFail += 1;
        const message = error instanceof Error ? error.message : String(error);
        if (signFail <= 8) console.warn(`  sign failed: ${message.slice(0, 160)}`);
      }
    }
  });
  console.log(`Beliefs written: ${signCount} ok, ${signFail} failed`);

  const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as `0x${string}` | undefined;
  const recurringPledges = CONTRACT_ADDRESSES.recurringPledges as `0x${string}` | undefined;
  const notes = CONTRACT_ADDRESSES.delegatableNotes as `0x${string}` | undefined;
  const paymentTokenFundingAbi = [
    {
      name: 'transfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
    },
    {
      name: 'mintTo',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [],
    },
  ] as const;
  let pledges = 0;
  if (paymentToken && recurringPledges && notes && allCids.length > 0) {
    for (let i = 1; i <= 5; i++) {
      const to = privateKeyToAccount(FUNDED_HARDHAT_DEV_KEYS[i]!).address;
      const amount = parsePaymentTokenUnits('5000');
      try {
        const hash = await funder.walletClient.writeContract({
          address: paymentToken,
          abi: paymentTokenFundingAbi,
          functionName: 'transfer',
          args: [to, amount],
          chain: funder.walletClient.chain,
          account: funder.walletClient.account,
        });
        await funder.publicClient.waitForTransactionReceipt({ hash });
      } catch {
        const hash = await funder.walletClient.writeContract({
          address: paymentToken,
          abi: paymentTokenFundingAbi,
          functionName: 'mintTo',
          args: [to, amount],
          chain: funder.walletClient.chain,
          account: funder.walletClient.account,
        });
        await funder.publicClient.waitForTransactionReceipt({ hash });
      }
    }
    const pledgeCids = allCids.filter((_, i) => i % 7 === 0).slice(0, 16);
    for (let i = 0; i < 5; i++) {
      const key = FUNDED_HARDHAT_DEV_KEYS[i + 1]!;
      const c = clients(key);
      const amount = parsePaymentTokenUnits(String(5 + i * 3));
      try {
        await approveRecurringPledgeToken(c as WriteClients, {
          token: paymentToken,
          delegatableNotes: notes,
          amount: amount * 12n,
        });
        const cid = pledgeCids[i % pledgeCids.length]!;
        await createStandingPledge(
          c as WriteClients,
          { address: recurringPledges, abi: RecurringPledgesAbi },
          {
            delegateTo: owner.account,
            token: paymentToken,
            amountPerPeriod: amount,
            period: MONTH_SECONDS,
            causeRef: cid,
          },
        );
        pledges += 1;
        console.log(`  pledge HH#${i + 1} ${amount} / month on ${cid.slice(0, 18)}…`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`  pledge HH#${i + 1} failed: ${message.slice(0, 180)}`);
      }
    }
  } else {
    console.warn('Skipping pledges — payment token / recurring pledges not configured');
  }

  const payload = {
    owner: owner.account,
    boards: results.length,
    statements: allCids.length,
    beliefs: signCount,
    pledges,
    results,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`Boards ${results.length}, statements ${allCids.length}, beliefs ${signCount}, pledges ${pledges}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
