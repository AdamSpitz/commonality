import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  put(record: { key: string }) {
    const request = new FakeRequest<string>();

    queueMicrotask(() => {
      this.records.set(record.key, { ...record });
      request.result = record.key;
      request.dispatch('success');
      setTimeout(() => {
        this.transaction.dispatch('complete');
      }, 0);
    });

    return request;
  }

  getAll() {
    const request = new FakeRequest<unknown[]>();

    queueMicrotask(() => {
      request.result = Array.from(this.records.values());
      request.dispatch('success');
      setTimeout(() => {
        this.transaction.dispatch('complete');
      }, 0);
    });

    return request;
  }

  clear() {
    const request = new FakeRequest<void>();

    queueMicrotask(() => {
      this.records.clear();
      request.result = undefined;
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

  reset() {
    this.databases.clear();
  }
}

const fakeIndexedDB = new FakeIndexedDBFactory();

describe('nudgeStore', () => {
  const TARGET = 'bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
  const SUGGESTED = 'bafkreibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
  const NUDGER = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    vi.resetModules();
    fakeIndexedDB.reset();
    globalThis.indexedDB = fakeIndexedDB as unknown as IDBFactory;
  });

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDB;
  });

  it('returns null for a nudge that has not been interacted with', async () => {
    const { getNudgeState } = await import('./nudgeStore');
    const state = await getNudgeState(TARGET, SUGGESTED, NUDGER);
    expect(state).toBeNull();
  });

  it('can mark a nudge as seen', async () => {
    const { markNudgeSeen, getNudgeState } = await import('./nudgeStore');
    await markNudgeSeen(TARGET, SUGGESTED, NUDGER);
    const state = await getNudgeState(TARGET, SUGGESTED, NUDGER);
    expect(state).toBe('seen');
  });

  it('can dismiss a nudge', async () => {
    const { dismissNudge, getNudgeState } = await import('./nudgeStore');
    await dismissNudge(TARGET, SUGGESTED, NUDGER);
    const state = await getNudgeState(TARGET, SUGGESTED, NUDGER);
    expect(state).toBe('dismissed');
  });

  it('does not overwrite dismissed state when marking seen', async () => {
    const { dismissNudge, markNudgeSeen, getNudgeState } = await import('./nudgeStore');
    await dismissNudge(TARGET, SUGGESTED, NUDGER);
    await markNudgeSeen(TARGET, SUGGESTED, NUDGER);
    const state = await getNudgeState(TARGET, SUGGESTED, NUDGER);
    expect(state).toBe('dismissed');
  });

  it('returns dismissed nudges from getDismissedNudges', async () => {
    const { dismissNudge, getDismissedNudges } = await import('./nudgeStore');
    await dismissNudge(TARGET, SUGGESTED, NUDGER);
    const dismissed = await getDismissedNudges();
    expect(dismissed).toHaveLength(1);
    expect(dismissed[0].targetStatementCid).toBe(TARGET);
    expect(dismissed[0].suggestedStatementCid).toBe(SUGGESTED);
    expect(dismissed[0].nudger).toBe(NUDGER.toLowerCase());
  });

  it('does not return seen nudges in getDismissedNudges', async () => {
    const { markNudgeSeen, getDismissedNudges } = await import('./nudgeStore');
    await markNudgeSeen(TARGET, SUGGESTED, NUDGER);
    const dismissed = await getDismissedNudges();
    expect(dismissed).toHaveLength(0);
  });

  it('clears all records', async () => {
    const { dismissNudge, getDismissedNudges, clearNudgeStore } = await import('./nudgeStore');
    await dismissNudge(TARGET, SUGGESTED, NUDGER);
    await clearNudgeStore();
    const dismissed = await getDismissedNudges();
    expect(dismissed).toHaveLength(0);
  });

  it('treats nudger addresses case-insensitively', async () => {
    const { dismissNudge, getNudgeState } = await import('./nudgeStore');
    await dismissNudge(TARGET, SUGGESTED, NUDGER.toUpperCase());
    const state = await getNudgeState(TARGET, SUGGESTED, NUDGER.toLowerCase());
    expect(state).toBe('dismissed');
  });
});
