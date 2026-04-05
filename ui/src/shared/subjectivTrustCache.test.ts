import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const TRUST_REGISTRY_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const
const originalIndexedDB = globalThis.indexedDB

type Listener = () => void

class FakeEventTarget {
  private listeners = new Map<string, Listener[]>()

  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  dispatch(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener()
    }
  }
}

class FakeRequest<T> extends FakeEventTarget {
  result!: T
  error: Error | null = null
}

class FakeTransaction extends FakeEventTarget {
  error: Error | null = null

  constructor(private records: Map<string, unknown>) {
    super()
  }

  objectStore(_name: string) {
    return new FakeObjectStore(this.records, this)
  }
}

class FakeObjectStore {
  constructor(
    private records: Map<string, unknown>,
    private transaction: FakeTransaction
  ) {}

  get(key: string) {
    const request = new FakeRequest<unknown>()

    queueMicrotask(() => {
      request.result = this.records.get(key)
      request.dispatch('success')
      setTimeout(() => {
        this.transaction.dispatch('complete')
      }, 0)
    })

    return request
  }

  put(record: { cacheKey: string }) {
    const request = new FakeRequest<string>()

    queueMicrotask(() => {
      this.records.set(record.cacheKey, JSON.parse(JSON.stringify(record)))
      request.result = record.cacheKey
      request.dispatch('success')
      setTimeout(() => {
        this.transaction.dispatch('complete')
      }, 0)
    })

    return request
  }
}

class FakeDatabase {
  readonly objectStoreNames

  constructor(private stores: Map<string, Map<string, unknown>>) {
    this.objectStoreNames = {
      contains: (name: string) => this.stores.has(name),
    }
  }

  createObjectStore(name: string, _options: { keyPath: string }) {
    const records = new Map<string, unknown>()
    this.stores.set(name, records)
    return new FakeObjectStore(records, new FakeTransaction(records))
  }

  transaction(name: string, _mode: string) {
    const records = this.stores.get(name)

    if (!records) {
      throw new Error(`Unknown object store: ${name}`)
    }

    return new FakeTransaction(records)
  }
}

class FakeIndexedDBFactory {
  private databases = new Map<string, FakeDatabase>()

  open(name: string, _version: number) {
    const request = new FakeRequest<FakeDatabase>()

    queueMicrotask(() => {
      let database = this.databases.get(name)

      if (!database) {
        database = new FakeDatabase(new Map())
        this.databases.set(name, database)
        request.result = database
        request.dispatch('upgradeneeded')
      } else {
        request.result = database
      }

      request.dispatch('success')
    })

    return request
  }
}

function createCacheOptions(cacheBuster: string) {
  return {
    address: '0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd',
    eventCacheUrl: `http://localhost:42069/api/${cacheBuster}`,
    contractAddresses: {
      trustRegistry: TRUST_REGISTRY_ADDRESS,
    },
  }
}

describe('subjectivTrustCache', () => {
  beforeEach(() => {
    vi.resetModules()
    globalThis.indexedDB = new FakeIndexedDBFactory() as typeof indexedDB
  })

  it('round-trips cached trusted sets and normalizes the lookup key', async () => {
    const { loadCachedSubjectivTrustedSet, saveCachedSubjectivTrustedSet } = await import(
      './subjectivTrustCache'
    )
    const options = createCacheOptions('roundtrip')

    expect(await loadCachedSubjectivTrustedSet(options)).toBeNull()

    await saveCachedSubjectivTrustedSet(options, {
      hasDirectTrust: true,
      trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      directTrustMappings: {
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd': [
          { trustee: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', score: 90 },
        ],
      },
    })

    await expect(
      loadCachedSubjectivTrustedSet({
        ...options,
        address: options.address.toLowerCase(),
        contractAddresses: {
          trustRegistry: options.contractAddresses.trustRegistry.toUpperCase() as `0x${string}`,
        },
      })
    ).resolves.toEqual({
      hasDirectTrust: true,
      trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      directTrustMappings: {
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd': [
          { trustee: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', score: 90 },
        ],
      },
    })
  })

  it('keeps cache entries isolated by event cache url and trust registry', async () => {
    const { loadCachedSubjectivTrustedSet, saveCachedSubjectivTrustedSet } = await import(
      './subjectivTrustCache'
    )
    const options = createCacheOptions('isolation')

    await saveCachedSubjectivTrustedSet(options, {
      hasDirectTrust: false,
      trustedSet: [],
    })

    await expect(
      loadCachedSubjectivTrustedSet({
        ...options,
        eventCacheUrl: `${options.eventCacheUrl}/different`,
      })
    ).resolves.toBeNull()

    await expect(
      loadCachedSubjectivTrustedSet({
        ...options,
        contractAddresses: {
          trustRegistry: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        },
      })
    ).resolves.toBeNull()
  })

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDB
  })
})
