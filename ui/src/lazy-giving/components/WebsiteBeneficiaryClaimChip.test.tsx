import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { WebsiteBeneficiaryClaimChip } from './WebsiteBeneficiaryClaimChip'

const readContract = vi.fn()

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>()
  return {
    ...actual,
    usePublicClient: () => ({
      readContract,
    }),
  }
})

vi.mock('../../shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared')>()
  return {
    ...actual,
    getRuntimeConfigValue: (key: string) => {
      if (key === 'VITE_BENEFICIARY_REGISTRY_ADDRESS') return '0x2222222222222222222222222222222222222222'
      return undefined
    },
  }
})

describe('WebsiteBeneficiaryClaimChip', () => {
  beforeEach(() => {
    readContract.mockReset()
  })

  it('shows Unclaimed for an unverified website', async () => {
    readContract.mockResolvedValue(0n)
    render(<WebsiteBeneficiaryClaimChip domain="example.org" />)
    expect(await screen.findByText('Unclaimed')).toBeInTheDocument()
  })

  it('shows Domain-controlled after a claim', async () => {
    readContract.mockResolvedValue(1n)
    render(<WebsiteBeneficiaryClaimChip domain="example.org" />)
    expect(await screen.findByText('Domain-controlled')).toBeInTheDocument()
  })

  it('shows Beneficiary-controlled after take-control', async () => {
    readContract.mockResolvedValue(2n)
    render(<WebsiteBeneficiaryClaimChip domain="example.org" />)
    expect(await screen.findByText('Beneficiary-controlled')).toBeInTheDocument()
  })
})
