import { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, Alert } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  createGraphQLExecutor,
  getStatementWithContent,
  getUserBelief,
  type Statement,
  type StatementContent,
  type DisplayableDocument,
} from '@commonality/sdk'
import { StatementRenderer } from '../components/StatementRenderer'
import { BeliefControls } from '../components/BeliefControls'
import { SupportMetrics } from '../components/SupportMetrics'
import { StatementSuggestions } from '../components/StatementSuggestions'

export function StatementPage() {
  const { statementId } = useParams<{ statementId: string }>()
  const { address } = useAccount()

  const [statement, setStatement] = useState<Statement | null>(null)
  const [statementContent, setStatementContent] = useState<StatementContent | DisplayableDocument | null>(null)
  const [userBeliefState, setUserBeliefState] = useState<number>(0)
  const [indirectSupporters, setIndirectSupporters] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)

  const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'

  const loadStatementData = async () => {
    if (!statementId) {
      setError('No statement ID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      setContentError(null)

      const executor = createGraphQLExecutor(GRAPHQL_URL)

      // Load statement with content and metrics using the new SDK function
      // IPFS gateway is configured via VITE_IPFS_GATEWAY env var
      const result = await getStatementWithContent(executor, statementId, {
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
        setContentError('Failed to load statement content from IPFS')
      }

      // Set metrics if available
      if (result.metrics) {
        setIndirectSupporters(result.metrics.indirectSupporters)
      }

      // Load user belief if connected
      if (address) {
        const belief = await getUserBelief(executor, address, statementId)
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
  }, [statementId, address])

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
        statementId={statementId || ''}
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
          statementCid={statement.cid || statementId || ''}
          currentBeliefState={userBeliefState}
          onBeliefChanged={handleBeliefChanged}
        />
      </Box>

      {/* Statement Suggestions */}
      <StatementSuggestions
        statementId={statementId || ''}
        userAddress={address}
      />
    </Box>
  )
}
