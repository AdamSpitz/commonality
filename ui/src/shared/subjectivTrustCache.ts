import type { ContractAddresses } from '@commonality/sdk'
import type {
  SubjectivCachedDirectTrustMappings,
  SubjectivTrustWeights,
  SubjectivTrustedSetComputationResult,
} from './subjectivTrust'

const SUBJECTIV_TRUST_DB_NAME = 'commonality-subjectiv'
const SUBJECTIV_TRUST_DB_VERSION = 2
const SUBJECTIV_TRUST_STORE_NAME = 'trusted-set-cache'
const SUBJECTIV_TRUST_CACHE_VERSION = 'v3'

interface SubjectivTrustCacheRecord {
  cacheKey: string
  hasDirectTrust: boolean
  trustedSet: string[]
  trustWeights?: SubjectivTrustWeights
  directTrustMappings?: SubjectivCachedDirectTrustMappings
  updatedAt: number
}

export interface SubjectivTrustCacheOptions {
  address: string
  eventCacheUrl: string
  contractAddresses: Pick<ContractAddresses, 'trustRegistry'>
  /** Maximum trust-graph hops the cached result was computed with. */
  maxHops?: number
}

let openDatabasePromise: Promise<IDBDatabase> | null = null

function getCacheKey({
  address,
  eventCacheUrl,
  contractAddresses,
  maxHops,
}: SubjectivTrustCacheOptions): string {
  return [
    SUBJECTIV_TRUST_CACHE_VERSION,
    eventCacheUrl,
    contractAddresses.trustRegistry.toLowerCase(),
    address.toLowerCase(),
    `maxHops=${maxHops ?? 'default'}`,
  ].join('::')
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => {
      resolve(request.result)
    })
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB request failed'))
    })
  })
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => {
      resolve()
    })
    transaction.addEventListener('abort', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    })
    transaction.addEventListener('error', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    })
  })
}

async function openSubjectivTrustDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable in this environment')
  }

  if (!openDatabasePromise) {
    openDatabasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(SUBJECTIV_TRUST_DB_NAME, SUBJECTIV_TRUST_DB_VERSION)

      request.addEventListener('upgradeneeded', () => {
        const database = request.result
        if (!database.objectStoreNames.contains(SUBJECTIV_TRUST_STORE_NAME)) {
          database.createObjectStore(SUBJECTIV_TRUST_STORE_NAME, {
            keyPath: 'cacheKey',
          })
        } else if (request.transaction) {
          // Cache key shape changed (e.g. maxHops added): clear stale records.
          database.deleteObjectStore(SUBJECTIV_TRUST_STORE_NAME)
          database.createObjectStore(SUBJECTIV_TRUST_STORE_NAME, {
            keyPath: 'cacheKey',
          })
        }
      })

      request.addEventListener('success', () => {
        resolve(request.result)
      })

      request.addEventListener('error', () => {
        openDatabasePromise = null
        reject(request.error ?? new Error('Failed to open IndexedDB'))
      })
    })
  }

  return openDatabasePromise
}

export async function loadCachedSubjectivTrustedSet(
  options: SubjectivTrustCacheOptions
): Promise<SubjectivTrustedSetComputationResult | null> {
  const database = await openSubjectivTrustDatabase()
  const transaction = database.transaction(SUBJECTIV_TRUST_STORE_NAME, 'readonly')
  const store = transaction.objectStore(SUBJECTIV_TRUST_STORE_NAME)
  const record = await waitForRequest(
    store.get(getCacheKey(options)) as IDBRequest<SubjectivTrustCacheRecord | undefined>
  )
  await waitForTransaction(transaction)

  if (!record) {
    return null
  }

  return {
    hasDirectTrust: record.hasDirectTrust,
    trustedSet: record.trustedSet,
    trustWeights: record.trustWeights,
    directTrustMappings: record.directTrustMappings,
  }
}

export async function saveCachedSubjectivTrustedSet(
  options: SubjectivTrustCacheOptions,
  result: SubjectivTrustedSetComputationResult
): Promise<void> {
  const database = await openSubjectivTrustDatabase()
  const transaction = database.transaction(SUBJECTIV_TRUST_STORE_NAME, 'readwrite')
  const store = transaction.objectStore(SUBJECTIV_TRUST_STORE_NAME)
  const record: SubjectivTrustCacheRecord = {
    cacheKey: getCacheKey(options),
    hasDirectTrust: result.hasDirectTrust,
    trustedSet: result.trustedSet,
    trustWeights: result.trustWeights,
    directTrustMappings: result.directTrustMappings,
    updatedAt: Date.now(),
  }

  await waitForRequest(store.put(record))
  await waitForTransaction(transaction)
}
