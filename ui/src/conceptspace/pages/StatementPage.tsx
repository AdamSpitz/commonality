import { useState, useEffect, useCallback } from 'react'
import { Box, Typography, CircularProgress, Alert } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getStatementWithContent, getUserBelief, type Statement, type StatementContentStatus } from '@commonality/sdk/conceptspace'
import type { DisplayableDocument } from '@commonality/sdk/displayable-documents'
import type { TieredHeadCount } from '@commonality/sdk/identity'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../../shared'
import { useTrustedAttesters } from '../../shared'
import { useTrustedSet } from '../../shared'
import { StatementRenderer } from '../components/StatementRenderer'
import { BeliefControls } from '../components/BeliefControls'
import { SupportMetrics } from '../components/SupportMetrics'
import { StatementSuggestions } from '../components/StatementSuggestions'
import { HighProfileSigners } from '../components/HighProfileSigners'
import { AvailableDelegatableFunding } from '../../delegation'
import { FundingPortalSummary } from '../../fundingportals'
import { ContentSubmissionForm } from '../../content-funding'
import { StatementSupportingContent } from '../components/StatementSupportingContent'

export function StatementPage() {
  const { statementCid } = useParams<{ statementCid: IpfsCidV1 }>()
  const { address } = useAccount()

  const [statement, setStatement] = useState<Statement | null>(null)
  const [statementContent, setStatementContent] = useState<DisplayableDocument | null>(null)
  const [userBeliefState, setUserBeliefState] = useState<number>(0)
  const [indirectSupporters, setIndirectSupporters] = useState<number>(0)
  const [tieredSupporters, setTieredSupporters] = useState<TieredHeadCount | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)
  const [contentStatus, setContentStatus] = useState<StatementContentStatus>('unavailable')

  const machinery = useMachinery()
  const trustedAttesters = useTrustedAttesters()
  const { trustedSet: trustedAlignmentAttesters } = useTrustedSet(address)

  const loadStatementData = useCallback(async () => {
    if (!statementCid) {
      setError('No statement CID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      setContentError(null)

      const result = await getStatementWithContent(machinery, statementCid, {
        includeMetrics: true,
        trustedAttesters,
      })

      if (!result) {
        setError('Statement not found')
        setLoading(false)
        return
      }

      setStatement(result.statement)
      setStatementContent(result.content)
      setContentStatus(result.contentStatus)

      if (!result.content && result.statement.cid) {
        setContentError(
          result.contentStatus === 'retracted'
            ? 'This statement was retracted by its publisher. Its support attestations remain on-chain, but the statement is no longer displayed or counted by default.'
            : 'Statement content is unavailable. It may not have a live honored publication, or the content host may be temporarily unreachable.'
        )
      }

      if (result.metrics) {
        setIndirectSupporters(result.metrics.indirectSupporters)
        setTieredSupporters(result.metrics.tieredSupporters)
      }

      if (address) {
        const belief = await getUserBelief(machinery, address, statementCid)
        setUserBeliefState(belief?.beliefState ?? 0)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading statement:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statement')
      setLoading(false)
    }
  }, [statementCid, address, machinery, trustedAttesters])

  useEffect(() => {
    loadStatementData()
  }, [loadStatementData])

  const handleBeliefChanged = useCallback(() => {
    loadStatementData()
  }, [loadStatementData])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Statement
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!statement) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Statement
        </Typography>
        <Alert severity="warning">Statement not found</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Statement
      </Typography>

      {/* Statement Content */}
      <StatementRenderer
        statementCid={statementCid || ''}
        content={statementContent}
        error={contentError}
        unavailableSeverity={contentStatus === 'retracted' ? 'warning' : 'error'}
      />

      {/* Support Metrics */}
      {contentStatus === 'active' && (
        <SupportMetrics
          directBelievers={statement.believerCount}
          directDisbelievers={statement.disbelieverCount}
          indirectSupporters={indirectSupporters}
          tieredSupporters={tieredSupporters}
        />
      )}

      {/* High-Profile Supporters */}
      <HighProfileSigners statementCid={statementCid as IpfsCidV1} />

      {/* Belief Controls */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your Opinion
        </Typography>
        <BeliefControls
          statementCid={(statement.cid ?? statementCid) as IpfsCidV1}
          currentBeliefState={userBeliefState}
          onBeliefChanged={handleBeliefChanged}
        />
      </Box>

      {/* Supporting Content */}
      <StatementSupportingContent statementCid={statementCid as IpfsCidV1} />

      {/* Statement Suggestions */}
      <StatementSuggestions statementCid={statementCid as IpfsCidV1} />

      {/* Available Delegatable Funding */}
      <AvailableDelegatableFunding statementCid={statementCid || ''} />

      {/* Cause Board Summary */}
      <FundingPortalSummary
        statementCid={statementCid || ''}
        trustedImplicationAttesters={trustedAttesters}
        trustedAlignmentAttesters={trustedAlignmentAttesters}
      />

      <ContentSubmissionForm statementCid={statementCid as IpfsCidV1} />
    </Box>
  )
}
