import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StatementSupportingContentRecord } from '@commonality/sdk/content-funding'
import type { IpfsCidV1 } from '@commonality/sdk/utils'

vi.mock('@commonality/sdk/content-funding', async () => {
  const actual = await vi.importActual('@commonality/sdk/content-funding')
  return {
    ...actual,
    getStatementSupportingContent: vi.fn(),
  }
})

const MACHINERY_MOCK = {}
vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: vi.fn(() => MACHINERY_MOCK),
}))

const TRUSTED_ATTESTERS_MOCK: { address: string }[] = []
vi.mock('../../shared/hooks/useTrustedContentAttesters', () => ({
  useTrustedContentAttesters: vi.fn(() => TRUSTED_ATTESTERS_MOCK),
}))

vi.mock('../../shared/runtimeConfig', () => ({
  getRuntimeConfigValue: vi.fn(),
}))

vi.mock('../../content-funding/components/ContentAttestationSummary', () => ({
  ContentAttestationSummary: () => <div data-testid="attestation-summary" />,
}))

import { getStatementSupportingContent } from '@commonality/sdk/content-funding'
import { getRuntimeConfigValue } from '../../shared'
import { StatementSupportingContent } from './StatementSupportingContent'

const STATEMENT_CID = 'bafystatement' as IpfsCidV1
const TOPIC_CID = 'bafytopic'

function makeRecord(canonicalId: string): StatementSupportingContentRecord {
  return {
    contentItem: {
      contentId: 1n,
      canonicalId,
      contractAddress: '0xabc',
      status: 'active',
    } as StatementSupportingContentRecord['contentItem'],
    supportAttestations: [
      { attested: true, attester: '0xattester', statementCid: STATEMENT_CID, blockNumber: 1n },
    ],
    noninflammatoryAttestations: [
      { attested: true, attester: '0xattester', statementCid: TOPIC_CID, blockNumber: 1n },
    ],
  }
}

describe('StatementSupportingContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRuntimeConfigValue).mockReturnValue(TOPIC_CID)
  })

  it('renders content that has both support and noninflammatory attestations', async () => {
    vi.mocked(getStatementSupportingContent).mockResolvedValue([makeRecord('twitter:uid:creator:1')])

    render(<StatementSupportingContent statementCid={STATEMENT_CID} />)

    expect(await screen.findByText('twitter:uid:creator:1')).toBeInTheDocument()
    expect(screen.getByText('Noninflammatory')).toBeInTheDocument()
    expect(screen.getByText('Supports statement')).toBeInTheDocument()
  })

  it('shows an empty-state message when there is no supporting content', async () => {
    vi.mocked(getStatementSupportingContent).mockResolvedValue([])

    render(<StatementSupportingContent statementCid={STATEMENT_CID} />)

    expect(await screen.findByText('No attested supporting writeups yet.')).toBeInTheDocument()
  })

  it('warns and skips the query when the noninflammatory topic is not configured', async () => {
    vi.mocked(getRuntimeConfigValue).mockReturnValue(undefined)

    render(<StatementSupportingContent statementCid={STATEMENT_CID} />)

    expect(await screen.findByText(/noninflammatory meta-statement is not configured/i)).toBeInTheDocument()
    expect(getStatementSupportingContent).not.toHaveBeenCalled()
  })
})
