import { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, Alert } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  getStatementWithContent,
  getUserBelief,
  type Statement,
  type DisplayableDocument,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { StatementRenderer } from '../components/StatementRenderer'
import { BeliefControls } from '../components/BeliefControls'
import { SupportMetrics } from '../components/SupportMetrics'
import { StatementSuggestions } from '../components/StatementSuggestions'
import { AvailableDelegatableFunding } from '../../delegation/components'
import { FundingPortalSummary } from '../../fundingportal/components'

export function StatementPage() {
  const { statementCid } = useParams<{ statementCid: IpfsCidV1 }>()
  const { address } = useAccount()

  const [statement, setStatement] = useState<Statement | null>(null)
  const [statementContent, setStatementContent] = useState<DisplayableDocument | null>(null)
  const [userBeliefState, setUserBeliefState] = useState<number>(0)
  const [indirectSupporters, setIndirectSupporters] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)

  const machinery = useMachinery()

  const loadStatementData = async () => {
    if (!statementCid) {
      setError('No statement CID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      setContentError(null)

      // Load statement with content and metrics using the new SDK function
      // IPFS gateway is configured via VITE_IPFS_GATEWAY env var
      const result = await getStatementWithContent(machinery, statementCid, {
        includeMetrics: true,
      })

      if (!result) {
        setError('Statement not found')
        setLoading(false)
        return
      }

      setStatement(result.statement)
      setStatementContent(result.content)

      // Set content error if content failed to load but statement exists
      if (!result.content && result.statement.cid) {
        console.log('Statement content failed to load from IPFS:', result)
        setContentError('Failed to load statement content from IPFS')
      }

      // Set metrics if available
      if (result.metrics) {
        setIndirectSupporters(result.metrics.indirectSupporters)
      }

      // Load user belief if connected
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
  }

  useEffect(() => {
    loadStatementData()
  }, [statementCid, address])

  const handleBeliefChanged = () => {
    // Reload statement data after belief change
    loadStatementData()
  }

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
      />

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

      {/* Statement Suggestions */}
      <StatementSuggestions
        statementCid={statementCid as IpfsCidV1}
        userAddress={address}
      />

      {/* Available Delegatable Funding */}
      <AvailableDelegatableFunding statementCid={statementCid || ''} />

      {/* Funding Portal Summary */}
      <FundingPortalSummary statementCid={statementCid || ''} />
    </Box>
  )
}
