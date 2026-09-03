import { describe, expect, it } from 'vitest'
import { getMediatorOptInPath, mediatorNudgerFromCause, serviceMediatorFromCause } from './mediatorNudger'

const address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'

describe('cause mediator reusable configuration', () => {
  it('takes identity and service location entirely from cause config', () => {
    const mediator = mediatorNudgerFromCause({
      address,
      name: 'Housing mediator',
      description: 'Bridges homeowners and renters.',
      serviceUrl: 'https://housing.example/mediator/',
    })
    expect(mediator).toMatchObject({
      name: 'Housing mediator',
      serviceUrl: 'https://housing.example/mediator',
      sourceType: 'bridge-creator',
    })
    const url = new URL(getMediatorOptInPath(mediator!), 'https://tally.example')
    expect(url.searchParams.get('nudgerName')).toBe('Housing mediator')
    expect(url.searchParams.get('nudgerServiceUrl')).toBe('https://housing.example/mediator')
    expect(url.searchParams.get('nudgerSourceType')).toBe('bridge-creator')
  })

  it('accepts an address and name with no service URL (human cluster publisher)', () => {
    const mediator = mediatorNudgerFromCause({
      address,
      name: 'Ada Mediator',
      description: 'Hand-authored settlement.',
    })
    expect(mediator).toEqual({
      address,
      name: 'Ada Mediator',
      description: 'Hand-authored settlement.',
    })
    expect(mediator?.serviceUrl).toBeUndefined()
    expect(mediator?.sourceType).toBeUndefined()
    const url = new URL(getMediatorOptInPath(mediator!), 'https://tally.example')
    expect(url.searchParams.get('addNudger')).toBe(address)
    expect(url.searchParams.get('nudgerName')).toBe('Ada Mediator')
    expect(url.searchParams.has('nudgerServiceUrl')).toBe(false)
    expect(url.searchParams.has('nudgerSourceType')).toBe(false)
  })

  it('rejects incomplete or invalid cause identity rather than inventing one', () => {
    expect(mediatorNudgerFromCause({ address: 'bad', name: 'X', description: 'Y', serviceUrl: 'https://x.example' })).toBeNull()
    expect(mediatorNudgerFromCause({ address, name: '  ', description: 'Y' })).toBeNull()
  })

  it('serviceMediatorFromCause still requires a live service URL', () => {
    expect(serviceMediatorFromCause({
      address,
      name: 'Ada Mediator',
      description: 'Hand-authored settlement.',
    })).toBeNull()
    expect(serviceMediatorFromCause({
      address,
      name: 'Housing mediator',
      description: 'Bridges homeowners and renters.',
      serviceUrl: 'https://housing.example/mediator',
    })).toMatchObject({ serviceUrl: 'https://housing.example/mediator' })
  })
})
