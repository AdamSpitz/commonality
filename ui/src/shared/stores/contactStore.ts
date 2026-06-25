/**
 * Client-side contact store for saved recipient addresses.
 * Uses IndexedDB for persistence, following the same pattern as nudgeStore.ts.
 */

const CONTACT_STORE_DB_NAME = 'commonality-contact-store'
const CONTACT_STORE_DB_VERSION = 1
const CONTACT_STORE_NAME = 'contacts'

export interface SavedContact {
  address: `0x${string}`
  label: string
  addedAt: number
  lastUsedAt: number
}

let openDatabasePromise: Promise<IDBDatabase> | null = null

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

async function openContactStoreDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable in this environment')
  }

  if (!openDatabasePromise) {
    openDatabasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(CONTACT_STORE_DB_NAME, CONTACT_STORE_DB_VERSION)

      request.addEventListener('upgradeneeded', () => {
        const database = request.result
        if (!database.objectStoreNames.contains(CONTACT_STORE_NAME)) {
          const store = database.createObjectStore(CONTACT_STORE_NAME, { keyPath: 'address' })
          store.createIndex('lastUsedAt', 'lastUsedAt', { unique: false })
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

/**
 * Get all saved contacts, sorted by most recently used first.
 */
export async function getContacts(): Promise<SavedContact[]> {
  const database = await openContactStoreDatabase()
  const transaction = database.transaction(CONTACT_STORE_NAME, 'readonly')
  const store = transaction.objectStore(CONTACT_STORE_NAME)
  const allContacts = await waitForRequest(store.getAll() as IDBRequest<SavedContact[]>)
  await waitForTransaction(transaction)
  return allContacts.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
}

/**
 * Add or update a contact.
 */
export async function addContact(address: `0x${string}`, label: string): Promise<void> {
  const database = await openContactStoreDatabase()
  const transaction = database.transaction(CONTACT_STORE_NAME, 'readwrite')
  const store = transaction.objectStore(CONTACT_STORE_NAME)

  const existing = await waitForRequest(store.get(address) as IDBRequest<SavedContact | undefined>)
  const now = Date.now()

  const contact: SavedContact = {
    address,
    label: label || address,
    addedAt: existing?.addedAt ?? now,
    lastUsedAt: now,
  }

  await waitForRequest(store.put(contact))
  await waitForTransaction(transaction)
}

/**
 * Remove a contact by address.
 */
export async function removeContact(address: `0x${string}`): Promise<void> {
  const database = await openContactStoreDatabase()
  const transaction = database.transaction(CONTACT_STORE_NAME, 'readwrite')
  const store = transaction.objectStore(CONTACT_STORE_NAME)
  await waitForRequest(store.delete(address))
  await waitForTransaction(transaction)
}

/**
 * Update the lastUsedAt timestamp for a contact.
 */
export async function touchContact(address: `0x${string}`): Promise<void> {
  const database = await openContactStoreDatabase()
  const transaction = database.transaction(CONTACT_STORE_NAME, 'readwrite')
  const store = transaction.objectStore(CONTACT_STORE_NAME)

  const existing = await waitForRequest(store.get(address) as IDBRequest<SavedContact | undefined>)
  if (existing) {
    existing.lastUsedAt = Date.now()
    await waitForRequest(store.put(existing))
  }

  await waitForTransaction(transaction)
}

/**
 * Clear all contacts (useful for testing).
 */
export async function clearContacts(): Promise<void> {
  const database = await openContactStoreDatabase()
  const transaction = database.transaction(CONTACT_STORE_NAME, 'readwrite')
  const store = transaction.objectStore(CONTACT_STORE_NAME)
  await waitForRequest(store.clear())
  await waitForTransaction(transaction)
}
