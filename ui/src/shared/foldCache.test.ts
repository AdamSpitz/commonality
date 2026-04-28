import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_FOLD_VERSION, type ProjectAccumulator } from '@commonality/sdk';

const originalIndexedDB = globalThis.indexedDB;

type Listener = () => void;

class FakeEventTarget {
  private listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

class FakeRequest<T> extends FakeEventTarget {
  result!: T;
  error: Error | null = null;
}

class FakeTransaction extends FakeEventTarget {
  error: Error | null = null;

  constructor(private records: Map<string, unknown>) {
    super();
  }

  objectStore(_name: string) {
    return new FakeObjectStore(this.records, this);
  }
}

class FakeObjectStore {
  constructor(
    private records: Map<string, unknown>,
    private transaction: FakeTransaction
  ) {}

  get(key: string) {
    const request = new FakeRequest<unknown>();

    queueMicrotask(() => {
      request.result = this.records.get(key);
      request.dispatch('success');
      setTimeout(() => {
        this.transaction.dispatch('complete');
      }, 0);
    });

    return request;
  }

  put(record: { cacheKey: string }) {
    const request = new FakeRequest<string>();

    const serialized = JSON.stringify(record, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );

    queueMicrotask(() => {
      this.records.set(record.cacheKey, JSON.parse(serialized));
      request.result = record.cacheKey;
      request.dispatch('success');
      setTimeout(() => {
        this.transaction.dispatch('complete');
      }, 0);
    });

    return request;
  }
}

class FakeDatabase {
  readonly objectStoreNames;

  constructor(private stores: Map<string, Map<string, unknown>>) {
    this.objectStoreNames = {
      contains: (name: string) => this.stores.has(name),
    };
  }

  createObjectStore(name: string, _options: { keyPath: string }) {
    const records = new Map<string, unknown>();
    this.stores.set(name, records);
    return new FakeObjectStore(records, new FakeTransaction(records));
  }

  transaction(name: string, _mode: string) {
    const records = this.stores.get(name);

    if (!records) {
      throw new Error(`Unknown object store: ${name}`);
    }

    return new FakeTransaction(records);
  }
}

class FakeIndexedDBFactory {
  private databases = new Map<string, FakeDatabase>();

  open(name: string, _version: number) {
    const request = new FakeRequest<FakeDatabase>();

    queueMicrotask(() => {
      let database = this.databases.get(name);

      if (!database) {
        database = new FakeDatabase(new Map());
        this.databases.set(name, database);
        request.result = database;
        request.dispatch('upgradeneeded');
      } else {
        request.result = database;
      }

      request.dispatch('success');
    });

    return request;
  }
}

function createCacheOptions(cacheBuster: string) {
  return {
    address: '0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd',
    eventCacheUrl: `http://localhost:42069/api/${cacheBuster}`,
    contractAddresses: {
      assuranceContractFactory: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const,
    },
    foldType: 'project' as const,
  };
}

describe('foldCache', () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.indexedDB = new FakeIndexedDBFactory() as unknown as IDBFactory;
  });

  it('round-trips cached project accumulators and normalizes the lookup key', async () => {
    const { loadCachedProjectAccumulator, saveCachedProjectAccumulator } = await import(
      './foldCache'
    );
    const options = createCacheOptions('roundtrip');

    expect(await loadCachedProjectAccumulator(options)).toBeNull();

    const accumulator = {
      foldVersion: PROJECT_FOLD_VERSION,
      id: '0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd',
      erc1155Address: '0x1111111111111111111111111111111111111111',
      recipient: '0x2222222222222222222222222222222222222222',
      conditionAddress: '0x3333333333333333333333333333333333333333',
      metadataCid: 'QmTest123',
      createdAt: '1234567890',
      blockNumber: '123',
      totalReceived: 1000000000000000000n,
    } as ProjectAccumulator;

    await saveCachedProjectAccumulator(options, accumulator, '123');

    await expect(
      loadCachedProjectAccumulator({
        ...options,
        address: options.address.toLowerCase(),
        contractAddresses: {
          assuranceContractFactory:
            options.contractAddresses.assuranceContractFactory.toUpperCase() as `0x${string}`,
        },
      })
    ).resolves.toEqual({
      accumulator: {
        ...accumulator,
        totalReceived: accumulator.totalReceived,
      },
      blockNumber: '123',
    });
  });

  it('keeps cache entries isolated by event cache url and contract addresses', async () => {
    const { loadCachedProjectAccumulator, saveCachedProjectAccumulator } = await import(
      './foldCache'
    );
    const options = createCacheOptions('isolation');

    const accumulator = {
      foldVersion: PROJECT_FOLD_VERSION,
      id: '0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd',
      erc1155Address: '',
      recipient: '',
      conditionAddress: null,
      metadataCid: undefined,
      createdAt: undefined,
      blockNumber: undefined,
      totalReceived: 0n,
    } as ProjectAccumulator;

    await saveCachedProjectAccumulator(options, accumulator, '123');

    await expect(
      loadCachedProjectAccumulator({
        ...options,
        eventCacheUrl: `${options.eventCacheUrl}/different`,
      })
    ).resolves.toBeNull();

    await expect(
      loadCachedProjectAccumulator({
        ...options,
        contractAddresses: {
          assuranceContractFactory: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const,
        },
      })
    ).resolves.toBeNull();
  });

  it('returns null when foldVersion mismatches', async () => {
    const { loadCachedProjectAccumulator, saveCachedProjectAccumulator } = await import(
      './foldCache'
    );
    const options = createCacheOptions('version-mismatch');

    const accumulator = {
      foldVersion: 2 as const,
      id: '0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd',
      erc1155Address: '',
      recipient: '',
      conditionAddress: null,
      metadataCid: undefined,
      createdAt: undefined,
      blockNumber: undefined,
      totalReceived: 0n,
    } as unknown as ProjectAccumulator;

    await saveCachedProjectAccumulator(options, accumulator, '123');

    const loaded = await loadCachedProjectAccumulator(options);
    expect(loaded).toBeNull();
  });

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDB;
  });
});
