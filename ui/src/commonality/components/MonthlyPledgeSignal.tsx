import { useEffect, useMemo, useState } from 'react'
import { Box, CircularProgress, Paper, Typography } from '@mui/material'
import { getMonthlyPledgedByCauseForToken } from '@commonality/sdk/delegation'
import { formatUnits } from 'viem'
import { getRuntimeConfig, useMachinery } from '../../shared'

export function MonthlyPledgeSignal({ statementCids }: { statementCids: string[] }) {
  const machinery = useMachinery()
  const [monthlyPledged, setMonthlyPledged] = useState<bigint>(0n)
  const [loading, setLoading] = useState(false)
  const uniqueCids = useMemo(() => [...new Set(statementCids.filter(Boolean))], [statementCids])
  const cidKey = uniqueCids.join('\n')
  const config = getRuntimeConfig()
  const paymentToken = config.VITE_PAYMENT_TOKEN_ADDRESS

  useEffect(() => {
    let cancelled = false

    if (!machinery.contractAddresses?.recurringPledges || !paymentToken || uniqueCids.length === 0) {
      setMonthlyPledged(0n)
      setLoading(false)
      return () => { cancelled = true }
    }

    setLoading(true)
    void getMonthlyPledgedByCauseForToken(machinery, paymentToken)
      .then((totals) => {
        if (cancelled) return
        setMonthlyPledged(uniqueCids.reduce((sum, cid) => sum + (totals.get(cid) ?? 0n), 0n))
      })
      .catch(() => {
        if (!cancelled) setMonthlyPledged(0n)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  // cidKey is a stable value dependency for callers that construct arrays while rendering.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machinery, cidKey, paymentToken])

  if (!machinery.contractAddresses?.recurringPledges || !paymentToken || uniqueCids.length === 0) return null

  const symbol = config.VITE_PAYMENT_TOKEN_SYMBOL ?? 'tokens'
  const decimals = Number(config.VITE_PAYMENT_TOKEN_DECIMALS ?? '18')
  return (
    <Paper
      elevation={0}
      sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      data-testid="monthly-pledge-signal"
    >
      <Typography variant="caption" color="text.secondary" display="block">
        Ongoing monthly pledges
      </Typography>
      {loading ? (
        <Box sx={{ py: 0.5 }}><CircularProgress size={20} aria-label="Loading monthly pledges" /></Box>
      ) : (
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {formatUnits(monthlyPledged, decimals)} {symbol}/month
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        Revocable auto-pull pledges in {symbol}; an interest signal, not guaranteed funding.
      </Typography>
    </Paper>
  )
}
