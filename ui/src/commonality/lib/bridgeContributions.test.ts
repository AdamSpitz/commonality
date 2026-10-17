import { describe, expect, it } from 'vitest'
import { buildBridgeContributions } from './bridgeContributions'

const eth = { symbol: 'ETH', decimals: 18 }

describe('buildBridgeContributions', () => {
  it('credits each signer once and keeps pledge and raised totals on the bridge', () => {
    const { rows, omitted } = buildBridgeContributions({
      viaStatementCids: ['bridge-a', 'bridge-b', 'bridge-c'],
      supporters: [
        { user: '0xA', viaStatementCid: 'bridge-a' },
        { user: '0xa', viaStatementCid: 'bridge-b' },
        { user: '0xB', viaStatementCid: 'bridge-a' },
        { user: '0xC', viaStatementCid: 'bridge-c' },
      ],
      pledges: [
        { active: true, token: '0xToken', causeRef: 'bridge-b', period: '2592000', amountPerPeriod: '5' },
        { active: false, token: '0xToken', causeRef: 'bridge-b', period: '2592000', amountPerPeriod: '9' },
        { active: true, token: '0xOther', causeRef: 'bridge-a', period: '2592000', amountPerPeriod: '100' },
        { active: true, token: '0xToken', causeRef: 'target', period: '2592000', amountPerPeriod: '50' },
      ],
      paymentToken: '0xToken',
      projects: [
        {
          projectAddress: '0xP1',
          alignmentType: 'indirect',
          viaStatementCids: ['bridge-b', 'bridge-a'],
          totalReceived: '7',
          fundingCurrency: eth,
        },
        {
          projectAddress: '0xP1',
          alignmentType: 'indirect',
          viaStatementCids: ['bridge-c'],
          totalReceived: '7',
          fundingCurrency: eth,
        },
        {
          projectAddress: '0xP2',
          alignmentType: 'direct',
          viaStatementCids: [],
          totalReceived: '99',
          fundingCurrency: eth,
        },
      ],
    })

    expect(omitted).toBe(0)
    const byVia = Object.fromEntries(rows.map((row) => [row.viaStatementCid, row]))
    expect(byVia['bridge-a']?.indirectSigners).toBe(2)
    expect(byVia['bridge-b']?.indirectSigners).toBe(0)
    expect(byVia['bridge-b']?.pledgedMonthly).toBe(5n)
    expect(byVia['bridge-a']?.raised).toEqual([{ symbol: 'ETH', decimals: 18, amount: 7n }])
    expect(byVia['bridge-c']?.indirectSigners).toBe(1)
    expect(rows.map((row) => row.viaStatementCid)).toEqual(['bridge-a', 'bridge-c', 'bridge-b'])
  })

  it('omits bridges that are small next to the largest signer count', () => {
    const supporters = [
      ...Array.from({ length: 20 }, (_, i) => ({ user: `big-${i}`, viaStatementCid: 'big' })),
      { user: 'tiny', viaStatementCid: 'tiny' },
    ]
    const { rows, omitted } = buildBridgeContributions({
      viaStatementCids: ['big', 'tiny'],
      supporters,
      pledges: [],
      projects: [],
    })
    expect(rows.map((row) => row.viaStatementCid)).toEqual(['big'])
    expect(omitted).toBe(1)
  })

  it('excludes projects directly aligned with another statement on the same board', () => {
    const project = {
      projectAddress: '0xProject',
      totalReceived: '99',
      fundingCurrency: eth,
    }
    const { rows } = buildBridgeContributions({
      viaStatementCids: ['bridge'],
      supporters: [],
      pledges: [],
      projects: [
        { ...project, alignmentType: 'indirect', viaStatementCids: ['bridge'] },
        { ...project, projectAddress: '0xproject', alignmentType: 'direct' },
      ],
    })
    expect(rows).toEqual([])
  })

  it('normalizes pledge periods to 30 days and requires the configured token', () => {
    const input = {
      viaStatementCids: ['bridge'],
      supporters: [],
      projects: [],
      pledges: [{ active: true, token: '0xToken', causeRef: 'bridge', amountPerPeriod: '7', period: '604800' }],
    }
    expect(buildBridgeContributions({ ...input, paymentToken: '0xToken' }).rows[0]?.pledgedMonthly).toBe(30n)
    expect(buildBridgeContributions(input).rows).toEqual([])
  })
})
