import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { actionDetail, formatScalar, humanizeKey, KeyValueTable } from './prettyJson'

describe('prettyJson helpers', () => {
  it('humanizes camelCase keys', () => {
    expect(humanizeKey('numUsers')).toBe('Num users')
    expect(humanizeKey('maxActionsPerUserPerRound')).toBe('Max actions per user per round')
  })

  it('formats booleans, numbers, and addresses', () => {
    expect(formatScalar(true)).toBe('Yes')
    expect(formatScalar(false)).toBe('No')
    expect(formatScalar(1000)).toBe('1,000')
    expect(formatScalar('0x1234567890abcdef1234567890abcdef12345678')).toMatch(/^0x1234…/)
  })

  it('prefers a transaction hash for action details', () => {
    expect(actionDetail({ type: 'sign', userAddress: '0xabc', transactionHash: '0xdead' })).toBe('0xdead')
  })

  it('drops actor/type fields when summarizing an action without a hash', () => {
    expect(actionDetail({ type: 'sign', userAddress: '0xabc', cid: 'bafy1' })).toEqual({ cid: 'bafy1' })
  })

  it('renders parameters as labeled rows instead of JSON', () => {
    render(<KeyValueTable record={{ numUsers: 100, testnetRun: true }} />)
    expect(screen.getByText('Num users')).toBeTruthy()
    expect(screen.getByText('100')).toBeTruthy()
    expect(screen.getByText('Testnet run')).toBeTruthy()
    expect(screen.getByText('Yes')).toBeTruthy()
    expect(screen.queryByText(/"numUsers"/)).toBeNull()
  })

  it('renders statement lists as full-width tables, not a nested side column', () => {
    const { container } = render(<KeyValueTable record={{
      statements: [{
        domain: 'politics',
        position: 'economic-left',
        statementType: 'simple',
        content: { text: 'Wealth should be redistributed', domain: 'politics', position: 'economic-left' },
        cid: 'bafy1',
      }],
    }} />)
    expect(container.querySelectorAll('table table')).toHaveLength(0)
    expect(screen.getByText('Statements')).toBeTruthy()
    expect(screen.getByText('Wealth should be redistributed')).toBeTruthy()
    expect(screen.getAllByText('politics')).toHaveLength(1)
  })

  it('renders CID fields as IPFS gateway links without the full CID text', () => {
    render(<KeyValueTable record={{
      statements: [{
        text: 'Wealth should be redistributed',
        cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      }],
    }} />)
    const link = screen.getByRole('link', { name: 'IPFS' })
    expect(link.getAttribute('href')).toMatch(/\/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi$/)
    expect(screen.queryByText(/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/)).toBeNull()
  })
})
