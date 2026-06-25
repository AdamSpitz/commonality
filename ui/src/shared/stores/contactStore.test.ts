import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getContacts,
  addContact,
  removeContact,
  touchContact,
  clearContacts,
} from './contactStore'

describe('contactStore', () => {
  beforeEach(async () => {
    await clearContacts()
  })

  afterEach(async () => {
    await clearContacts()
  })

  it('returns empty list when no contacts exist', async () => {
    const contacts = await getContacts()
    expect(contacts).toEqual([])
  })

  it('adds a contact', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`
    await addContact(address, 'Test Contact')

    const contacts = await getContacts()
    expect(contacts).toHaveLength(1)
    expect(contacts[0].address).toBe(address)
    expect(contacts[0].label).toBe('Test Contact')
  })

  it('defaults label to address when label is empty', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`
    await addContact(address, '')

    const contacts = await getContacts()
    expect(contacts[0].label).toBe(address)
  })

  it('returns contacts sorted by lastUsedAt descending', async () => {
    const addr1 = '0x1111111111111111111111111111111111111111' as `0x${string}`
    const addr2 = '0x2222222222222222222222222222222222222222' as `0x${string}`
    const addr3 = '0x3333333333333333333333333333333333333333' as `0x${string}`

    await addContact(addr3, 'Third')
    await addContact(addr1, 'First')
    await addContact(addr2, 'Second')

    // Touch addr1 to make it most recent
    await touchContact(addr1)

    const contacts = await getContacts()
    expect(contacts[0].address).toBe(addr1) // most recently used
    expect(contacts[1].address).toBe(addr2)
    expect(contacts[2].address).toBe(addr3)
  })

  it('updates lastUsedAt when adding an existing contact', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`

    await addContact(address, 'Original')
    const originalAddedAt = (await getContacts())[0].addedAt

    // Wait a tick then add again
    await new Promise((r) => setTimeout(r, 10))
    await addContact(address, 'Updated')

    const contacts = await getContacts()
    expect(contacts).toHaveLength(1)
    expect(contacts[0].label).toBe('Updated')
    expect(contacts[0].addedAt).toBe(originalAddedAt) // preserved from original
    expect(contacts[0].lastUsedAt).toBeGreaterThan(originalAddedAt)
  })

  it('removes a contact', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`
    await addContact(address, 'To Remove')
    expect(await getContacts()).toHaveLength(1)

    await removeContact(address)
    expect(await getContacts()).toHaveLength(0)
  })

  it('removing a non-existent contact does nothing', async () => {
    const address = '0x0000000000000000000000000000000000000000' as `0x${string}`
    await expect(removeContact(address)).resolves.toBeUndefined()
  })

  it('adds multiple contacts', async () => {
    await addContact('0x1111111111111111111111111111111111111111' as `0x${string}`, 'A')
    await addContact('0x2222222222222222222222222222222222222222' as `0x${string}`, 'B')
    await addContact('0x3333333333333333333333333333333333333333' as `0x${string}`, 'C')

    const contacts = await getContacts()
    expect(contacts).toHaveLength(3)
  })

  it('touching a non-existent contact does nothing', async () => {
    const address = '0x0000000000000000000000000000000000000000' as `0x${string}`
    await expect(touchContact(address)).resolves.toBeUndefined()
  })

  it('allows addresses with uppercase characters', async () => {
    // Ethereum addresses are case-insensitive, but we store them as-is
    const address = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`
    const upperAddress = '0x1234567890ABCDEF1234567890ABCDEF12345678' as `0x${string}`

    await addContact(address, 'Lower')
    await addContact(upperAddress, 'Upper')

    // These are different keys in IndexedDB
    const contacts = await getContacts()
    expect(contacts).toHaveLength(2)
  })
})
