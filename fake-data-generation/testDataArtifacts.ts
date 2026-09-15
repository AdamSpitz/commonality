import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { User } from './types.js';

const root = dirname(fileURLToPath(import.meta.url));
const artifactRoot = join(root, 'output', 'test-data');
const keyPath = join(artifactRoot, '.admin-capability');
const registryPath = join(artifactRoot, 'registry.enc.json');

export const TEST_DATA_ARTIFACT_VERSION = 'commonality-test-data-v1' as const;

export interface TestDataRun {
  schema: typeof TEST_DATA_ARTIFACT_VERSION;
  runId: string;
  createdAt: string;
  network: 'local' | 'testnet';
  chainId: number;
  gitCommit?: string;
  parameters: Record<string, unknown>;
  entities: Record<string, unknown>;
  users: Array<Omit<User, 'privateKey'> & { privateKey: `0x${string}`; label: string }>;
  actions: Array<Record<string, unknown>>;
  metrics: Record<string, unknown>;
}

export interface TestDataRegistry {
  schema: typeof TEST_DATA_ARTIFACT_VERSION;
  updatedAt: string;
  runs: Array<{
    runId: string;
    createdAt: string;
    network: TestDataRun['network'];
    chainId: number;
    userCount: number;
    actionCount: number;
    href: string;
  }>;
}

export interface EncryptedTestDataDocument {
  schema: 'commonality-test-data-encrypted-v1';
  algorithm: 'AES-256-GCM';
  iv: string;
  authTag: string;
  ciphertext: string;
}

function jsonReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}

async function capability(): Promise<Buffer> {
  await fs.mkdir(artifactRoot, { recursive: true });
  try {
    const encoded = (await fs.readFile(keyPath, 'utf8')).trim();
    const key = Buffer.from(encoded, 'base64url');
    if (key.length !== 32) throw new Error('not a 256-bit key');
    return key;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const key = randomBytes(32);
    await fs.writeFile(keyPath, `${key.toString('base64url')}\n`, { mode: 0o600 });
    return key;
  }
}

export function encryptTestData(value: unknown, key: Buffer, iv = randomBytes(12)): EncryptedTestDataDocument {
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value, jsonReplacer));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    schema: 'commonality-test-data-encrypted-v1',
    algorithm: 'AES-256-GCM',
    iv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  };
}

async function loadRegistry(key: Buffer): Promise<TestDataRegistry> {
  try {
    const encrypted = JSON.parse(await fs.readFile(registryPath, 'utf8')) as EncryptedTestDataDocument;
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, 'base64url')),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as TestDataRegistry;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return { schema: TEST_DATA_ARTIFACT_VERSION, updatedAt: new Date(0).toISOString(), runs: [] };
  }
}

function runId(createdAt: string): string {
  return createdAt.replace(/[^0-9TZ]/g, '');
}

export async function writeTestDataRun(input: Omit<TestDataRun, 'schema' | 'runId' | 'createdAt'>) {
  const key = await capability();
  const createdAt = new Date().toISOString();
  const id = runId(createdAt);
  const run: TestDataRun = { schema: TEST_DATA_ARTIFACT_VERSION, runId: id, createdAt, ...input };
  const runDirectory = join(artifactRoot, 'runs', id);
  const runPath = join(runDirectory, 'run.enc.json');
  await fs.mkdir(runDirectory, { recursive: true });
  await fs.writeFile(runPath, `${JSON.stringify(encryptTestData(run, key), null, 2)}\n`);

  const registry = await loadRegistry(key);
  registry.updatedAt = createdAt;
  registry.runs = [
    {
      runId: id,
      createdAt,
      network: run.network,
      chainId: run.chainId,
      userCount: run.users.length,
      actionCount: run.actions.length,
      href: relative(artifactRoot, runPath).replaceAll('\\', '/'),
    },
    ...registry.runs.filter((entry) => entry.runId !== id),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await fs.writeFile(registryPath, `${JSON.stringify(encryptTestData(registry, key), null, 2)}\n`);

  const keyText = key.toString('base64url');
  console.log(`  Test-data run: ${id}`);
  console.log(`  Admin: http://commonality.localhost:8088/#/admin/test-data?key=${keyText}`);
  return { run, registry, capability: keyText, artifactRoot };
}
