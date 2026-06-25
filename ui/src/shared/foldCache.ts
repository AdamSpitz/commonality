import type { ProjectAccumulator } from '@commonality/sdk/lazy-giving';
import type { ContractAddresses } from '@commonality/sdk/machinery';

const FOLD_CACHE_DB_NAME = 'commonality-fold-cache';
const FOLD_CACHE_DB_VERSION = 1;
const FOLD_CACHE_STORE_NAME = 'fold-accumulators';
const FOLD_CACHE_VERSION = 'v2';
const CURRENT_PROJECT_FOLD_VERSION = 1;

export interface FoldCacheRecord {
  cacheKey: string;
  foldVersion: number;
  accumulator: ProjectAccumulator;
  blockNumber: string;
  updatedAt: number;
}

export interface FoldCacheOptions {
  address: string;
  eventCacheUrl: string;
  contractAddresses: Pick<ContractAddresses, 'assuranceContractFactory'>;
  foldType: 'project';
}

let openDatabasePromise: Promise<IDBDatabase> | null = null;

function getCacheKey({
  address,
  eventCacheUrl,
  contractAddresses,
  foldType,
}: FoldCacheOptions): string {
  return [
    FOLD_CACHE_VERSION,
    foldType,
    eventCacheUrl,
    contractAddresses.assuranceContractFactory.toLowerCase(),
    address.toLowerCase(),
  ].join('::');
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

async function openFoldCacheDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable in this environment');
  }

  if (!openDatabasePromise) {
    openDatabasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(FOLD_CACHE_DB_NAME, FOLD_CACHE_DB_VERSION);

      request.addEventListener('upgradeneeded', () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(FOLD_CACHE_STORE_NAME)) {
          database.createObjectStore(FOLD_CACHE_STORE_NAME, {
            keyPath: 'cacheKey',
          });
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

export async function loadCachedProjectAccumulator(
  options: FoldCacheOptions
): Promise<{ accumulator: ProjectAccumulator; blockNumber: string } | null> {
  const database = await openFoldCacheDatabase();
  const transaction = database.transaction(FOLD_CACHE_STORE_NAME, 'readonly');
  const store = transaction.objectStore(FOLD_CACHE_STORE_NAME);
  const record = await waitForRequest(
    store.get(getCacheKey(options)) as IDBRequest<FoldCacheRecord | undefined>
  );
  await waitForTransaction(transaction);

  if (!record) {
    return null;
  }

  if (record.foldVersion !== CURRENT_PROJECT_FOLD_VERSION) {
    return null;
  }

  const totalReceived = record.accumulator.totalReceived;

  return {
    accumulator: {
      ...record.accumulator,
      totalReceived: typeof totalReceived === 'bigint' ? totalReceived : BigInt(totalReceived),
    },
    blockNumber: record.blockNumber,
  };
}

export async function saveCachedProjectAccumulator(
  options: FoldCacheOptions,
  accumulator: ProjectAccumulator,
  blockNumber: string
): Promise<void> {
  const database = await openFoldCacheDatabase();
  const transaction = database.transaction(FOLD_CACHE_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(FOLD_CACHE_STORE_NAME);
  const record: FoldCacheRecord = {
    cacheKey: getCacheKey(options),
    foldVersion: accumulator.foldVersion,
    accumulator: JSON.parse(
      JSON.stringify(accumulator, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    ),
    blockNumber,
    updatedAt: Date.now(),
  };

  await waitForRequest(store.put(record));
  await waitForTransaction(transaction);
}
