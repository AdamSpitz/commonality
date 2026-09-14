import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Divider, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { shortAddress } from '../../shared/wallet/hardhatAccounts'
import {
  fetchEncryptedTestData,
  resolveRunUrl,
  testDataEnvironment,
  testDataRegistryUrl,
  type TestDataRegistry,
  type TestDataRun,
} from '../testData/testDataDocuments'

export function TestDataRunPage() {
  const { runId } = useParams()
  const [search] = useSearchParams()
  const capability = search.get('key') ?? ''
  const [run, setRun] = useState<TestDataRun | null>(null)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState<string | null>(null)
  const registryUrl = testDataRegistryUrl()
  const environment = testDataEnvironment()

  useEffect(() => {
    if (!registryUrl || !capability || !runId || environment === 'disabled') return
    let cancelled = false
    void fetchEncryptedTestData<TestDataRegistry>(registryUrl, capability)
      .then(registry => {
        const entry = registry.runs.find(candidate => candidate.runId === runId)
        if (!entry) throw new Error('That run is not present in the current registry.')
        return fetchEncryptedTestData<TestDataRun>(resolveRunUrl(registryUrl, entry.href), capability)
      })
      .then(value => { if (!cancelled) setRun(value) })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => { cancelled = true }
  }, [capability, environment, registryUrl, runId])

  const actionsByType = useMemo(() => {
    const counts = new Map<string, number>()
    for (const action of run?.actions ?? []) {
      const type = String(action.type ?? action.action ?? 'unknown')
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }
    return [...counts].sort((a, b) => b[1] - a[1])
  }, [run])

  if (environment === 'disabled') return <Alert severity="error">Test-data administration is disabled on mainnet.</Alert>
  if (!capability || !registryUrl) return <Alert severity="info">Open this run from the bookmarked test-data admin page.</Alert>
  if (error) return <Alert severity="error">{error}</Alert>
  if (!run) return <Typography>Loading run…</Typography>

  const connect = () => {
    const user = run.users.find(candidate => candidate.address === selected)
    if (!user) return
    window._setupTestDataWallet(user.privateKey, { chainId: run.chainId, label: user.label })
  }

  return (
    <Stack spacing={3} data-testid="test-data-run-page">
      <Box>
        <Button component={RouterLink} to={`/admin/test-data?key=${encodeURIComponent(capability)}`} sx={{ px: 0 }}>All runs</Button>
        <Typography variant="h4" component="h1">Run {run.runId}</Typography>
        <Typography color="text.secondary">{new Date(run.createdAt).toLocaleString()} · {run.network} · chain {run.chainId}</Typography>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">View as a fake user</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            The selected disposable key stays in memory. Never fund or use these accounts outside this run's test network.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <Select value={selected} onChange={event => setSelected(event.target.value)} displayEmpty sx={{ minWidth: 300 }}>
              <MenuItem value="" disabled>Select a fake user</MenuItem>
              {run.users.map(user => <MenuItem key={user.address} value={user.address}>{user.label} · {shortAddress(user.address)}</MenuItem>)}
            </Select>
            <Button variant="contained" disabled={!selected} onClick={connect}>Connect as selected user</Button>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
        <Card variant="outlined" sx={{ flex: 1 }}><CardContent><Typography variant="h5">{run.users.length}</Typography><Typography color="text.secondary">Fake users</Typography></CardContent></Card>
        <Card variant="outlined" sx={{ flex: 1 }}><CardContent><Typography variant="h5">{run.actions.length}</Typography><Typography color="text.secondary">Recorded actions</Typography></CardContent></Card>
        <Card variant="outlined" sx={{ flex: 1 }}><CardContent><Typography variant="h5">{String(run.metrics.errors instanceof Array ? run.metrics.errors.length : 0)}</Typography><Typography color="text.secondary">Errors</Typography></CardContent></Card>
      </Stack>

      <Card variant="outlined"><CardContent>
        <Typography variant="h6">Fake users</Typography><Divider sx={{ my: 2 }} />
        <Table size="small"><TableHead><TableRow><TableCell>User</TableCell><TableCell>Address</TableCell><TableCell>Engagement</TableCell><TableCell>Interests</TableCell></TableRow></TableHead>
          <TableBody>{run.users.map(user => <TableRow key={user.address}><TableCell>{user.label}</TableCell><TableCell sx={{ fontFamily: 'monospace' }}>{shortAddress(user.address)}</TableCell><TableCell>{user.engagement}</TableCell><TableCell>{Object.keys(user.interests).join(', ') || '—'}</TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>

      <Card variant="outlined"><CardContent>
        <Typography variant="h6">Activity by type</Typography><Divider sx={{ my: 2 }} />
        {actionsByType.map(([type, count]) => <Stack key={type} direction="row" justifyContent="space-between"><Typography>{type}</Typography><Typography>{count}</Typography></Stack>)}
      </CardContent></Card>

      <Card variant="outlined"><CardContent>
        <Typography variant="h6">All recorded activity</Typography><Divider sx={{ my: 2 }} />
        <Table size="small"><TableHead><TableRow><TableCell>#</TableCell><TableCell>Type</TableCell><TableCell>Actor</TableCell><TableCell>Transaction / details</TableCell></TableRow></TableHead>
          <TableBody>{run.actions.map((action, index) => {
            const type = String(action.type ?? action.action ?? 'unknown')
            const actor = String(action.userAddress ?? action.address ?? action.user ?? '—')
            const transaction = String(action.transactionHash ?? action.txHash ?? action.hash ?? '')
            return <TableRow key={`${index}-${transaction}`}>
              <TableCell>{index + 1}</TableCell><TableCell>{type}</TableCell><TableCell sx={{ fontFamily: 'monospace' }}>{actor.startsWith('0x') ? shortAddress(actor) : actor}</TableCell>
              <TableCell><Typography component="span" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{transaction ? shortAddress(transaction) : JSON.stringify(action)}</Typography></TableCell>
            </TableRow>
          })}</TableBody>
        </Table>
      </CardContent></Card>

      <Card variant="outlined"><CardContent>
        <Typography variant="h6">Run parameters</Typography>
        <Box component="pre" sx={{ overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(run.parameters, null, 2)}</Box>
      </CardContent></Card>

      <Card variant="outlined"><CardContent>
        <Typography variant="h6">Generated entities</Typography>
        <Typography color="text.secondary">Statements, projects, and contract bindings captured at the end of this run.</Typography>
        <Box component="pre" sx={{ overflow: 'auto', maxHeight: 560, whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(run.entities, null, 2)}</Box>
      </CardContent></Card>
    </Stack>
  )
}
