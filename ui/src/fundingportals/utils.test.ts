import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computeAvailableDelegatableFunding } from './utils'

const mockGetNoteIntentAttestationsByStatement = vi.fn()
const mockGetNote = vi.fn()

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual<typeof import('@commonality/sdk')>('@commonality/sdk')
  return {
    ...actual,
    getNoteIntentAttestationsByStatement: (...args: unknown[]) => mockGetNoteIntentAttestationsByStatement(...args),
    getNote: (...args: unknown[]) => mockGetNote(...args),
  }
})

const fakeMachinery = {} as import('@commonality/sdk').SDKMachinery

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const NOTE_CONTRACT = '0x1111111111111111111111111111111111111111'

function makeNoteIntentAttestation(noteId: string, statementId: string) {
  return {
    attester: '0xattester',
    noteContract: NOTE_CONTRACT,
    noteId,
    intendedStatementId: statementId,
    createdAt: '1000',
    blockNumber: '1',
  }
}

function makeNote(overrides: Partial<{
  id: string
  amount: string
  token: string
  tokenType: number
  tokenId: string
  active: boolean
}> = {}) {
  return {
    id: overrides.id ?? '1',
    chainHash: '0xchain',
    amount: overrides.amount ?? '1000000000000000000',
    token: overrides.token ?? ZERO_ADDRESS,
    tokenType: overrides.tokenType ?? 0,
    tokenId: overrides.tokenId ?? '',
    owner: '0xowner',
    rootOwner: '0xroot',
    active: overrides.active ?? true,
    createdAt: '1000',
    createdAtBlock: '1',
    updatedAt: '1000',
  }
}

describe('computeAvailableDelegatableFunding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no attestations exist', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([])
    const result = await computeAvailableDelegatableFunding(fakeMachinery, 'stmt-1')
    expect(result).toEqual([])
  })

  it('returns empty array when all notes are inactive', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      makeNoteIntentAttestation('1', 'stmt-1'),
    ])
    mockGetNote.mockResolvedValue(makeNote({ id: '1', active: false }))
    const result = await computeAvailableDelegatableFunding(fakeMachinery, 'stmt-1')
    expect(result).toEqual([])
  })

  it('returns empty array when all note fetches fail', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      makeNoteIntentAttestation('1', 'stmt-1'),
    ])
    mockGetNote.mockRejectedValue(new Error('not found'))
    const result = await computeAvailableDelegatableFunding(fakeMachinery, 'stmt-1')
    expect(result).toEqual([])
  })

  it('sums active notes for a single currency', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      makeNoteIntentAttestation('1', 'stmt-1'),
      makeNoteIntentAttestation('2', 'stmt-1'),
    ])
    mockGetNote.mockImplementation(async (_m: unknown, id: string) => {
      if (id === `${NOTE_CONTRACT.toLowerCase()}:1`) return makeNote({ id: '1', amount: '1000000000000000000' })
      if (id === `${NOTE_CONTRACT.toLowerCase()}:2`) return makeNote({ id: '2', amount: '500000000000000000' })
      return null
    })
    const result = await computeAvailableDelegatableFunding(fakeMachinery, 'stmt-1')
    expect(result).toHaveLength(1)
    expect(result[0].currency.symbol).toBe('ETH')
    expect(result[0].amount).toBe(BigInt('1500000000000000000'))
  })

  it('groups totals by currency', async () => {
    const erc20Token = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      makeNoteIntentAttestation('1', 'stmt-1'),
      makeNoteIntentAttestation('2', 'stmt-1'),
    ])
    mockGetNote.mockImplementation(async (_m: unknown, id: string) => {
      if (id === `${NOTE_CONTRACT.toLowerCase()}:1`) return makeNote({ id: '1', amount: '1000000000000000000' })
      if (id === `${NOTE_CONTRACT.toLowerCase()}:2`) return makeNote({ id: '2', amount: '2000000', token: erc20Token })
      return null
    })
    const result = await computeAvailableDelegatableFunding(fakeMachinery, 'stmt-1')
    expect(result).toHaveLength(2)
    const ethTotal = result.find((r) => r.currency.symbol === 'ETH')
    const erc20Total = result.find((r) => r.currency.tokenAddress === erc20Token)
    expect(ethTotal).toBeDefined()
    expect(ethTotal?.amount).toBe(BigInt('1000000000000000000'))
    expect(erc20Total).toBeDefined()
    expect(erc20Total?.amount).toBe(BigInt('2000000'))
  })

  it('filters out null note results from Promise.all', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      makeNoteIntentAttestation('1', 'stmt-1'),
      makeNoteIntentAttestation('2', 'stmt-1'),
    ])
    mockGetNote.mockImplementation(async (_m: unknown, id: string) => {
      if (id === `${NOTE_CONTRACT.toLowerCase()}:1`) return makeNote({ id: '1', amount: '1000000000000000000' })
      if (id === `${NOTE_CONTRACT.toLowerCase()}:2`) return null
      return null
    })
    const result = await computeAvailableDelegatableFunding(fakeMachinery, 'stmt-1')
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe(BigInt('1000000000000000000'))
  })

  it('handles mixed active and inactive notes correctly', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      makeNoteIntentAttestation('1', 'stmt-1'),
      makeNoteIntentAttestation('2', 'stmt-1'),
      makeNoteIntentAttestation('3', 'stmt-1'),
    ])
    mockGetNote.mockImplementation(async (_m: unknown, id: string) => {
      if (id === `${NOTE_CONTRACT.toLowerCase()}:1`) return makeNote({ id: '1', amount: '1000000000000000000', active: true })
      if (id === `${NOTE_CONTRACT.toLowerCase()}:2`) return makeNote({ id: '2', amount: '2000000000000000000', active: false })
      if (id === `${NOTE_CONTRACT.toLowerCase()}:3`) return makeNote({ id: '3', amount: '500000000000000000', active: true })
      return null
    })
    const result = await computeAvailableDelegatableFunding(fakeMachinery, 'stmt-1')
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe(BigInt('1500000000000000000'))
  })
})
