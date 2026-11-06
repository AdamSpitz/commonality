import { useEffect, useState } from 'react'
import { Box, CircularProgress, Link, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { formatUnits } from 'viem'
import {
  getImplicationsTo,
  getIndirectSupporters,
  getStatement,
} from '@commonality/sdk/conceptspace'
import { getStandingPledges } from '@commonality/sdk/delegation'
import { getAllAlignedProjectsForCause } from '@commonality/sdk/fundingportals'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { getRuntimeConfig, useMachinery } from '../../shared'
import {
  buildBridgeContributions,
  type BridgeContribution,
  type BridgeProject,
} from '../lib/bridgeContributions'

interface BridgeRow extends BridgeContribution {
  title: string
}

function formatRaised(row: BridgeContribution): string | null {
  if (row.raised.length === 0) return null
  return row.raised
    .map((amount) => `${formatUnits(amount.amount, amount.decimals)} ${amount.symbol} raised`)
    .join(', ')
}

/**
 * Ranked implying statements that bring indirect signers, pledges, or
 * indirectly aligned project funds onto the statements passed in.
 */
export function BridgeContributions({
  statementCids,
  trustedImplicationAttesters,
  trustedAlignmentAttesters,
}: {
  statementCids: string[]
  trustedImplicationAttesters?: string[]
  trustedAlignmentAttesters?: Iterable<string>
}) {
  const machinery = useMachinery()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<BridgeRow[]>([])
  const [omitted, setOmitted] = useState(0)
  const [pledgeSymbol, setPledgeSymbol] = useState('tokens')
  const [pledgeDecimals, setPledgeDecimals] = useState(18)
  const cidKey = statementCids.filter(Boolean).join('\n')

  useEffect(() => {
    const cids = cidKey ? cidKey.split('\n') : []
    if (cids.length === 0) {
      setRows([])
      setOmitted(0)
      return
    }
    let cancelled = false
    setLoading(true)

    void (async () => {
      try {
        const config = getRuntimeConfig()
        const paymentToken = config.VITE_PAYMENT_TOKEN_ADDRESS
        if (!cancelled) {
          setPledgeSymbol(config.VITE_PAYMENT_TOKEN_SYMBOL ?? 'tokens')
          setPledgeDecimals(Number(config.VITE_PAYMENT_TOKEN_DECIMALS ?? '18'))
        }
        const implicationLists = await Promise.all(cids.map((cid) =>
          getImplicationsTo(machinery, cid as IpfsCidV1, trustedImplicationAttesters)))
        const viaStatementCids = [...new Set(implicationLists.flat().map((implication) => implication.fromStatementCid))]
        if (viaStatementCids.length === 0) {
          if (!cancelled) {
            setRows([])
            setOmitted(0)
          }
          return
        }
        const [supporterLists, pledges, projectLists] = await Promise.all([
          Promise.all(cids.map((cid) =>
            getIndirectSupporters(machinery, cid as IpfsCidV1, trustedImplicationAttesters))),
          machinery.contractAddresses?.recurringPledges
            ? getStandingPledges(machinery).catch(() => [])
            : Promise.resolve([]),
          Promise.all(cids.map((cid) =>
            getAllAlignedProjectsForCause(
              machinery,
              cid as IpfsCidV1,
              trustedImplicationAttesters,
              trustedAlignmentAttesters,
            ).catch(() => [] as BridgeProject[]))),
        ])
        const built = buildBridgeContributions({
          supporters: supporterLists.flat(),
          pledges,
          paymentToken,
          projects: projectLists.flat(),
          viaStatementCids,
        })
        const titles = await Promise.all(built.rows.map(async (row) => {
          const statement = await getStatement(machinery, row.viaStatementCid as IpfsCidV1).catch(() => null)
          return statement?.title?.trim() || 'Untitled statement'
        }))
        if (cancelled) return
        setRows(built.rows.map((row, index) => ({ ...row, title: titles[index] ?? 'Untitled statement' })))
        setOmitted(built.omitted)
      } catch {
        if (!cancelled) {
          setRows([])
          setOmitted(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [cidKey, machinery, trustedImplicationAttesters, trustedAlignmentAttesters])

  if (!loading && rows.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid="bridge-contributions">
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Arriving through other statements
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        People who signed a different statement that your trusted sources say implies this one.
        Pledge amounts are what was pledged to that other statement. Raised amounts are projects
        counted here only because they are aligned with it. Each person, and each project, is
        counted on one statement.
      </Typography>
      {loading && rows.length === 0 ? (
        <CircularProgress size={18} aria-label="Loading statement contributions" />
      ) : (
        <Stack spacing={1.25}>
          {rows.map((row) => {
            const raised = formatRaised(row)
            return (
              <Box key={row.viaStatementCid}>
                <Link
                  component={RouterLink}
                  to={`/statement/${row.viaStatementCid}`}
                  underline="hover"
                  sx={{ fontWeight: 600 }}
                >
                  {row.title}
                </Link>
                <Typography variant="body2" color="text.secondary">
                  {row.indirectSigners.toLocaleString()} indirect signer{row.indirectSigners === 1 ? '' : 's'}
                  {' · '}
                  {formatUnits(row.pledgedMonthly, pledgeDecimals)} {pledgeSymbol}/month pledged to it
                  {raised ? ` · ${raised}` : ''}
                </Typography>
              </Box>
            )
          })}
          {omitted > 0 && (
            <Typography variant="caption" color="text.secondary">
              {omitted} more {omitted === 1 ? 'statement contributes' : 'statements contribute'} a small share of the signers.
            </Typography>
          )}
        </Stack>
      )}
    </Paper>
  )
}
