import type { IpfsCidV1 } from '@commonality/sdk';

const NUDGE_STORE_DB_NAME = 'commonality-nudge-store';
const NUDGE_STORE_DB_VERSION = 1;
const NUDGE_STORE_NAME = 'nudges';

export type NudgeState = 'dismissed' | 'seen';

export interface NudgeRecord {
  key: string;
  targetStatementCid: IpfsCidV1;
  suggestedStatementCid: IpfsCidV1;
  nudger: string;
  state: NudgeState;
  timestamp: number;
}

let openDatabasePromise: Promise<IDBDatabase> | null = null;

function makeRecordKey(
  targetStatementCid: IpfsCidV1,
  suggestedStatementCid: IpfsCidV1,
  nudger: string,
): string {
  return `${targetStatementCid}::${suggestedStatementCid}::${nudger.toLowerCase()}`;
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => {
      resolve(request.result);
    });
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    });
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => {
      resolve();
    });
    transaction.addEventListener('abort', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });
    transaction.addEventListener('error', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    });
  });
}

async function openNudgeStoreDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable in this environment');
  }

  if (!openDatabasePromise) {
    openDatabasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(NUDGE_STORE_DB_NAME, NUDGE_STORE_DB_VERSION);

      request.addEventListener('upgradeneeded', () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(NUDGE_STORE_NAME)) {
          database.createObjectStore(NUDGE_STORE_NAME, { keyPath: 'key' });
        }
      });

      request.addEventListener('success', () => {
        resolve(request.result);
      });

      request.addEventListener('error', () => {
        openDatabasePromise = null;
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      });
    });
  }

  return openDatabasePromise;
}

export async function getNudgeState(
  targetStatementCid: IpfsCidV1,
  suggestedStatementCid: IpfsCidV1,
  nudger: string,
): Promise<NudgeState | null> {
  const database = await openNudgeStoreDatabase();
  const transaction = database.transaction(NUDGE_STORE_NAME, 'readonly');
  const store = transaction.objectStore(NUDGE_STORE_NAME);
  const record = await waitForRequest(
    store.get(makeRecordKey(targetStatementCid, suggestedStatementCid, nudger)) as IDBRequest<NudgeRecord | undefined>,
  );
  await waitForTransaction(transaction);
  return record?.state ?? null;
}

export async function setNudgeState(
  targetStatementCid: IpfsCidV1,
  suggestedStatementCid: IpfsCidV1,
  nudger: string,
  state: NudgeState,
): Promise<void> {
  const database = await openNudgeStoreDatabase();
  const transaction = database.transaction(NUDGE_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(NUDGE_STORE_NAME);
  const record: NudgeRecord = {
    key: makeRecordKey(targetStatementCid, suggestedStatementCid, nudger),
    targetStatementCid,
    suggestedStatementCid,
    nudger: nudger.toLowerCase(),
    state,
    timestamp: Date.now(),
  };
  await waitForRequest(store.put(record));
  await waitForTransaction(transaction);
}

export async function dismissNudge(
  targetStatementCid: IpfsCidV1,
  suggestedStatementCid: IpfsCidV1,
  nudger: string,
): Promise<void> {
  await setNudgeState(targetStatementCid, suggestedStatementCid, nudger, 'dismissed');
}

export async function markNudgeSeen(
  targetStatementCid: IpfsCidV1,
  suggestedStatementCid: IpfsCidV1,
  nudger: string,
): Promise<void> {
  const existing = await getNudgeState(targetStatementCid, suggestedStatementCid, nudger);
  if (existing !== 'dismissed') {
    await setNudgeState(targetStatementCid, suggestedStatementCid, nudger, 'seen');
  }
}

export async function getDismissedNudges(): Promise<NudgeRecord[]> {
  const database = await openNudgeStoreDatabase();
  const transaction = database.transaction(NUDGE_STORE_NAME, 'readonly');
  const store = transaction.objectStore(NUDGE_STORE_NAME);
  const allRecords = await waitForRequest(store.getAll() as IDBRequest<NudgeRecord[]>);
  await waitForTransaction(transaction);
  return allRecords.filter((record) => record.state === 'dismissed');
}

export async function clearNudgeStore(): Promise<void> {
  const database = await openNudgeStoreDatabase();
  const transaction = database.transaction(NUDGE_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(NUDGE_STORE_NAME);
  await waitForRequest(store.clear());
  await waitForTransaction(transaction);
}
