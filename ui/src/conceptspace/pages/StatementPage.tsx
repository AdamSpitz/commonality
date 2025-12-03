import { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, Alert } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  createGraphQLExecutor,
  getStatement,
  getUserBelief,
  getIndirectSupporterCount,
  type Statement,
} from '@commonality/sdk'
import { StatementRenderer } from '../components/StatementRenderer'
import { BeliefControls } from '../components/BeliefControls'
import { SupportMetrics } from '../components/SupportMetrics'

interface StatementContent {
  statementType: string
  content: string
  title?: string
  references?: Array<{
    statementId: string
    label?: string
    relationship?: string
  }>
  metadata?: {
    createdDate?: string
    version?: number
  }
}

export function StatementPage() {
  const { statementId } = useParams<{ statementId: string }>()
  const { address } = useAccount()

  const [statement, setStatement] = useState<Statement | null>(null)
  const [statementContent, setStatementContent] = useState<StatementContent | null>(null)
  const [userBeliefState, setUserBeliefState] = useState<number>(0)
  const [indirectSupporters, setIndirectSupporters] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)

  const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'
  const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'

  const loadStatementData = async () => {
    if (!statementId) {
      setError('No statement ID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const executor = createGraphQLExecutor(GRAPHQL_URL)

      // Load statement metadata
      const statementData = await getStatement(executor, statementId)
      if (!statementData) {
        setError('Statement not found')
        setLoading(false)
        return
      }
      setStatement(statementData)

      // Load user belief if connected
      if (address) {
        const belief = await getUserBelief(executor, address, statementId)
        setUserBeliefState(belief?.beliefState ?? 0)
      }

      // Load indirect supporter count
      const indirectCount = await getIndirectSupporterCount(executor, statementId)
      setIndirectSupporters(indirectCount)

      // Load statement content from IPFS if we have a CID
      if (statementData.cid) {
        try {
          const contentUrl = `${PINATA_GATEWAY}/${statementData.cid}`
          const response = await fetch(contentUrl)

          if (!response.ok) {
            throw new Error(`Failed to fetch statement content: ${response.statusText}`)
          }

          const content = await response.json()
          setStatementContent(content)
        } catch (err) {
          console.error('Error loading statement content from IPFS:', err)
          setContentError(err instanceof Error ? err.message : 'Failed to load statement content')
        }
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
    </Box>
  )
}
