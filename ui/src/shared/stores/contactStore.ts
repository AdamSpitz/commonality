/**
 * Client-side contact store for saved recipient addresses.
 * Uses IndexedDB for persistence, following the same pattern as nudgeStore.ts.
 */

const CONTACT_STORE_DB_NAME = 'commonality-contact-store'
const CONTACT_STORE_DB_VERSION = 2
const CONTACT_STORE_NAME = 'contacts'

/**
 * What a saved address is used *for*. Addresses live in one flat store keyed by
 * address, but the pickers that read them are asking different questions —
 * "who do I pay?" vs. "who manages my fund?" vs. "which project am I vouching
 * for?" — and offering a project contract as a delegate would be nonsense.
 *
 * A single address can legitimately serve more than one role (you might both
 * give to and delegate to the same friend), so a contact carries a *set* of
 * kinds rather than one.
 */
export type ContactKind = 'recipient' | 'delegate' | 'project'

const DEFAULT_CONTACT_KIND: ContactKind = 'recipient'

export interface SavedContact {
  address: `0x${string}`
  label: string
  kinds: ContactKind[]
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
          store.createIndex('kinds', 'kinds', { unique: false, multiEntry: true })
          return
        }

        // v1 → v2: contacts predate `kinds`. Every v1 contact was saved by the
        // project-creation recipient picker, so backfill them as recipients.
        const upgradeTransaction = request.transaction
        if (!upgradeTransaction) return
        const store = upgradeTransaction.objectStore(CONTACT_STORE_NAME)
        if (!store.indexNames.contains('kinds')) {
          store.createIndex('kinds', 'kinds', { unique: false, multiEntry: true })
        }
        store.openCursor().addEventListener('success', (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
          if (!cursor) return
          const contact = cursor.value as SavedContact
          if (!Array.isArray(contact.kinds) || contact.kinds.length === 0) {
            cursor.update({ ...contact, kinds: [DEFAULT_CONTACT_KIND] })
          }
          cursor.continue()
        })
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

/** Contacts written before `kinds` existed read back as recipients. */
function kindsOf(contact: SavedContact): ContactKind[] {
  return Array.isArray(contact.kinds) && contact.kinds.length > 0
    ? contact.kinds
    : [DEFAULT_CONTACT_KIND]
}

/**
 * Get saved contacts, most recently used first. Pass a `kind` to get only the
 * contacts saved for that role; omit it for every contact.
 */
export async function getContacts(kind?: ContactKind): Promise<SavedContact[]> {
  const database = await openContactStoreDatabase()
  const transaction = database.transaction(CONTACT_STORE_NAME, 'readonly')
  const store = transaction.objectStore(CONTACT_STORE_NAME)
  const allContacts = await waitForRequest(store.getAll() as IDBRequest<SavedContact[]>)
  await waitForTransaction(transaction)
  return allContacts
    .filter((contact) => kind === undefined || kindsOf(contact).includes(kind))
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
}

/**
 * Add or update a contact. Re-saving a known address under a new `kind` adds
 * that role rather than replacing the existing ones.
 */
export async function addContact(
  address: `0x${string}`,
  label: string,
  kind: ContactKind = DEFAULT_CONTACT_KIND,
): Promise<void> {
  const database = await openContactStoreDatabase()
  const transaction = database.transaction(CONTACT_STORE_NAME, 'readwrite')
  const store = transaction.objectStore(CONTACT_STORE_NAME)

  const existing = await waitForRequest(store.get(address) as IDBRequest<SavedContact | undefined>)
  const now = Date.now()
  const existingKinds = existing ? kindsOf(existing) : []

  const contact: SavedContact = {
    address,
    label: label || address,
    kinds: existingKinds.includes(kind) ? existingKinds : [...existingKinds, kind],
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
