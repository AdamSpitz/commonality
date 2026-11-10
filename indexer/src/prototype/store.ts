import { open, readFile, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { json, type Child, type EventRow, type Header, type Snapshot } from "./types";

const hash32 = /^0x[0-9a-fA-F]{64}$/;
const address40 = /^0x[0-9a-f]{40}$/;

function bigintField(value: unknown, label: string): bigint {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") throw new Error(`Invalid prototype snapshot ${label}`);
  try { return BigInt(value); } catch { throw new Error(`Invalid prototype snapshot ${label}`); }
}

function header(value: Header, label: string): Header {
  const number = bigintField(value?.number, label);
  if (!hash32.test(value?.hash ?? "") || number < 0n) throw new Error(`Invalid prototype snapshot ${label}`);
  return { number, hash: value.hash, timestamp: bigintField(value.timestamp, label) };
}

/** Fail closed before a restart treats file contents as durable history. */
export function validateSnapshot(value: Snapshot): Snapshot {
  if (value?.version !== 1 || !Array.isArray(value.rows) || !Array.isArray(value.children)) throw new Error("Invalid prototype snapshot");
  if (!Number.isSafeInteger(value.chainId) || !/^[0-9a-f]{64}$/.test(value.scope ?? "")) throw new Error("Invalid prototype snapshot identity");
  if (value.upstreamId != null && !/^[0-9a-f]{64}$/.test(value.upstreamId)) throw new Error("Invalid prototype snapshot upstreamId");
  const fromBlock = bigintField(value.fromBlock, "fromBlock");
  const head = header(value.head, "head");
  const durable = header(value.durable, "durable");
  if (fromBlock < 1n || durable.number < fromBlock - 1n || durable.number > head.number) throw new Error("Invalid prototype snapshot coverage");
  const coverage = value.coverage?.map(source => {
    if (!address40.test(source?.address ?? "") || !Array.isArray(source.selectors) || source.selectors.some(item => !hash32.test(item))) {
      throw new Error("Invalid prototype snapshot source coverage");
    }
    return { address: source.address, startBlock: bigintField(source.startBlock, "coverage start"), selectors: source.selectors };
  });
  const children: Child[] = value.children.map(child => {
    if (!address40.test(child?.address ?? "") || !hash32.test(child?.creationHash ?? "") || !Array.isArray(child.events)) {
      throw new Error("Invalid prototype snapshot child");
    }
    const startBlock = bigintField(child.startBlock, "child start");
    if (startBlock < fromBlock || startBlock > head.number) throw new Error("Invalid prototype snapshot child coverage");
    return { ...child, startBlock };
  });
  if (new Set(children.map(child => `${child.name}:${child.address}`)).size !== children.length) throw new Error("Duplicate prototype snapshot child");
  const rows: EventRow[] = value.rows.map(row => {
    const blockNumber = bigintField(row?.blockNumber, "row block");
    if (!address40.test(row?.contractAddress ?? "") || !hash32.test(row?.transactionHash ?? "") ||
        !Number.isSafeInteger(row.logIndex) || row.chainId !== value.chainId ||
        row.id !== `${value.chainId}-${row.transactionHash}-${row.logIndex}` ||
        blockNumber < fromBlock || blockNumber > head.number) {
      throw new Error("Invalid prototype snapshot row");
    }
    return row;
  });
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error("Duplicate prototype snapshot row");
  return { ...value, fromBlock, head, durable, children, rows, coverage };
}

export async function readSnapshot(path: string): Promise<Snapshot | undefined> {
  let text: string;
  try { text = await readFile(path, "utf8"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  return validateSnapshot(JSON.parse(text) as Snapshot);
}

/** One file holds both rows and coverage; rename is the commit point. Caller holds the lock. */
export async function writeSnapshot(path: string, snapshot: Snapshot): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`;
  const file = await open(temporary, "wx", 0o600);
  try {
    await file.writeFile(json(snapshot));
    await file.sync();
    await file.close();
    await rename(temporary, path);
    const directory = await open(dirname(path), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  } finally {
    await file.close();
    await unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; });
  }
}

export async function lockSnapshot(path: string): Promise<() => Promise<void>> {
  const lock = `${path}.lock`;
  const handle = await open(lock, "wx", 0o600);
  await handle.writeFile(String(process.pid));
  await handle.close();
  return () => unlink(lock);
}
