import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SupportMetrics } from './SupportMetrics'
import type { TieredHeadCount } from '@commonality/sdk/identity'

describe('SupportMetrics', () => {
  it('displays total supporters as sum of direct believers and indirect supporters', () => {
    render(
      <SupportMetrics
        directBelievers={3}
        directDisbelievers={0}
        indirectSupporters={7}
      />,
    )

    expect(screen.getByText('10 supporters')).toBeInTheDocument()
  })

  it('explains direct vs indirect support instead of showing a magical aggregate', () => {
    render(
      <SupportMetrics
        directBelievers={3}
        directDisbelievers={0}
        indirectSupporters={7}
      />,
    )

    expect(screen.getByText(/direct signers signed this exact statement/i)).toBeInTheDocument()
    expect(screen.getByText(/signed a different statement/i)).toBeInTheDocument()
    expect(screen.getByText(/trusted statement-connection sources/i)).toBeInTheDocument()
  })

  it('displays direct believers count', () => {
    render(
      <SupportMetrics
        directBelievers={5}
        directDisbelievers={0}
        indirectSupporters={0}
      />,
    )

    expect(screen.getByText('5 signers')).toBeInTheDocument()
  })

  it('uses singular form when count is 1', () => {
    render(
      <SupportMetrics
        directBelievers={1}
        directDisbelievers={0}
        indirectSupporters={0}
      />,
    )

    expect(screen.getByText('1 signer')).toBeInTheDocument()
    expect(screen.getByText('1 supporter')).toBeInTheDocument()
  })

  it('hides disbelievers section when count is 0', () => {
    render(
      <SupportMetrics
        directBelievers={1}
        directDisbelievers={0}
        indirectSupporters={0}
      />,
    )

    expect(screen.queryByText(/opposing signer/)).not.toBeInTheDocument()
  })

  it('shows disbelievers section when count is greater than 0', () => {
    render(
      <SupportMetrics
        directBelievers={1}
        directDisbelievers={2}
        indirectSupporters={0}
      />,
    )

    expect(screen.getByText('2 opposing signers')).toBeInTheDocument()
  })

  it('renders the asserted (“claimed one account”) line but no attestation line before any provider exists', () => {
    const tiered: TieredHeadCount = {
      total: 10,
      assertedOrHigher: 4,
      oneAttestationOrHigher: 0,
      multipleAttestationsOrHigher: 0,
    }
    render(
      <SupportMetrics
        directBelievers={3}
        directDisbelievers={0}
        indirectSupporters={7}
        tieredSupporters={tiered}
      />,
    )

    // Headline + the self-claim line both show, but no attestation breakdown.
    expect(screen.getByText('10 supporters')).toBeInTheDocument()
    expect(screen.getByText(/4 claimed this is their one account/i)).toBeInTheDocument()
    expect(screen.getByText(/self-assertion by each account/i)).toBeInTheDocument()
    expect(screen.queryByText(/attestation/i)).not.toBeInTheDocument()
  })

  it('stays entirely quiet on tiers when nobody has asserted or attested', () => {
    const tiered: TieredHeadCount = {
      total: 10,
      assertedOrHigher: 0,
      oneAttestationOrHigher: 0,
      multipleAttestationsOrHigher: 0,
    }
    render(
      <SupportMetrics
        directBelievers={3}
        directDisbelievers={0}
        indirectSupporters={7}
        tieredSupporters={tiered}
      />,
    )

    expect(screen.getByText('10 supporters')).toBeInTheDocument()
    expect(screen.queryByText(/claimed this is their one account/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/attestation/i)).not.toBeInTheDocument()
  })

  it('renders the tiered head-count breakdown when attestation-backed supporters exist', () => {
    const tiered: TieredHeadCount = {
      total: 100000,
      assertedOrHigher: 20000,
      oneAttestationOrHigher: 10000,
      multipleAttestationsOrHigher: 3000,
    }
    render(
      <SupportMetrics
        directBelievers={90000}
        directDisbelievers={0}
        indirectSupporters={10000}
        tieredSupporters={tiered}
      />,
    )

    expect(screen.getByText(/3,000 with ≥2 attestations/)).toBeInTheDocument()
    expect(screen.getByText(/10,000 with ≥1 attestation/)).toBeInTheDocument()
    // The asserted line also shows, with its self-claim caveat.
    expect(screen.getByText(/20,000 claimed this is their one account/i)).toBeInTheDocument()
  })

  it('renders only the ≥1 attestation count when nobody has multiple attestations', () => {
    const tiered: TieredHeadCount = {
      total: 50,
      assertedOrHigher: 20,
      oneAttestationOrHigher: 5,
      multipleAttestationsOrHigher: 0,
    }
    render(
      <SupportMetrics
        directBelievers={45}
        directDisbelievers={0}
        indirectSupporters={5}
        tieredSupporters={tiered}
      />,
    )

    expect(screen.getByText(/5 with ≥1 attestation/)).toBeInTheDocument()
    expect(screen.queryByText(/≥2 attestations/)).not.toBeInTheDocument()
  })
})
