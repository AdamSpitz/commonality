import { useState, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Button,
} from '@mui/material'
import { formatEther } from 'viem'
import {
  getStatementWithContent,
  getTotalFundingForCause,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { computeAvailableDelegatableFunding } from '../utils'
import { AlignedProjectsList } from '../components/AlignedProjectsList'
import { AttestAlignmentForm } from '../components/AttestAlignmentForm'
import { DelegatableNotesSection } from '../components/DelegatableNotesSection'

export function StatementFundingPortalPage() {
  const { statementCid } = useParams<{ statementCid: string }>()
  const machinery = useMachinery()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [totalRaised, setTotalRaised] = useState<bigint>(0n)
  const [availableDelegatable, setAvailableDelegatable] = useState<bigint>(0n)
  const [projectCount, setProjectCount] = useState<number>(0)

  useEffect(() => {
    if (!statementCid) return
    const cid: string = statementCid
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [stmtResult, fundingMetrics] = await Promise.all([
          getStatementWithContent(machinery, cid as IpfsCidV1),
          getTotalFundingForCause(machinery, cid as IpfsCidV1),
        ])

        if (cancelled) return

        if (stmtResult) {
          const t =
            stmtResult.statement.title ??
            (stmtResult.content?.content
              ? stmtResult.content.content.split('\n')[0].replace(/^#+\s*/, '').trim()
              : null) ??
            `Statement ${cid.slice(0, 12)}...`
          setTitle(t)
          setSummary(stmtResult.statement.excerpt ?? null)
        }

        setTotalRaised(fundingMetrics.totalRaisedAcrossProjects)
        setProjectCount(fundingMetrics.projectCount)

        const total = await computeAvailableDelegatableFunding(machinery, cid)
        if (cancelled) return
        setAvailableDelegatable(total)
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading funding portal:', err)
          setError(err instanceof Error ? err.message : 'Failed to load funding portal')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [statementCid])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button component={RouterLink} to={`/statement/${statementCid}`} size="small">
            ← Back to Statement
          </Button>
          <Button
            component={RouterLink}
            to={`/portal/${statementCid}/leaderboard`}
            size="small"
            variant="outlined"
          >
            View Leaderboard
          </Button>
        </Stack>

        <Typography variant="h4" component="h1" gutterBottom>
          Funding Portal
        </Typography>

        {title && (
          <Typography variant="h5" gutterBottom>
            {title}
          </Typography>
        )}

        {summary && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {summary}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={4} flexWrap="wrap">
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total Funding Raised
            </Typography>
            <Typography variant="h6">{formatEther(totalRaised)} ETH</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Available Delegatable Funding
            </Typography>
            <Typography variant="h6">{formatEther(availableDelegatable)} ETH</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Aligned Projects
            </Typography>
            <Typography variant="h6">{projectCount}</Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Aligned Projects */}
      <AlignedProjectsList statementCid={statementCid!} />

      {/* Attest Project Alignment */}
      <AttestAlignmentForm statementCid={statementCid!} />

      {/* Available Delegatable Notes */}
      <DelegatableNotesSection statementCid={statementCid!} />
    </Box>
  )
}
