import { useState, useEffect, useCallback } from 'react'
import { Box, Typography, CircularProgress, Alert } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  getStatementWithContent,
  getUserBelief,
  type Statement,
  type DisplayableDocument,
  type IpfsCidV1,
  type TieredHeadCount,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedAttesters } from '../../shared/hooks/useTrustedAttesters'
import { useTrustedSet } from '../../shared/hooks/useTrustedSet'
import { StatementRenderer } from '../components/StatementRenderer'
import { BeliefControls } from '../components/BeliefControls'
import { SupportMetrics } from '../components/SupportMetrics'
import { StatementSuggestions } from '../components/StatementSuggestions'
import { HighProfileSigners } from '../components/HighProfileSigners'
import { AvailableDelegatableFunding } from '../../delegation'
import { FundingPortalSummary } from '../../fundingportals/components'
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

      if (!result.content && result.statement.cid) {
        setContentError('Failed to load statement content from IPFS')
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
      />

      {/* Support Metrics */}
      <SupportMetrics
        directBelievers={statement.believerCount}
        directDisbelievers={statement.disbelieverCount}
        indirectSupporters={indirectSupporters}
        tieredSupporters={tieredSupporters}
      />

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
