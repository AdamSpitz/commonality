import { describe, expect, it } from 'vitest'
import { getMediatorOptInPath, mediatorNudgerFromCause } from './mediatorNudger'

describe('cause mediator reusable configuration', () => {
  it('takes identity and service location entirely from cause config', () => {
    const mediator = mediatorNudgerFromCause({
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      name: 'Housing mediator',
      description: 'Bridges homeowners and renters.',
      serviceUrl: 'https://housing.example/mediator/',
    })
    expect(mediator).toMatchObject({ name: 'Housing mediator', serviceUrl: 'https://housing.example/mediator' })
    const url = new URL(getMediatorOptInPath(mediator!), 'https://tally.example')
    expect(url.searchParams.get('nudgerName')).toBe('Housing mediator')
    expect(url.searchParams.get('nudgerServiceUrl')).toBe('https://housing.example/mediator')
  })

  it('rejects incomplete or invalid cause identity rather than inventing one', () => {
    expect(mediatorNudgerFromCause({ address: 'bad', name: 'X', description: 'Y', serviceUrl: 'https://x.example' })).toBeNull()
  })
})
