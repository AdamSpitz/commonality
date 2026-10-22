import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { testDataRunAreas, type TestDataUser } from '../testData/testDataDocuments'
import { useTestDataRun } from '../testData/useTestDataRun'

export function TestDataAreaPage() {
  const { runId, areaId } = useParams()
  const [search] = useSearchParams()
  const capability = search.get('key') ?? ''
  const { run, error, environment, registryUrl } = useTestDataRun(runId, capability)
  const { address, isConnected } = useAccount()
  const [connection, setConnection] = useState<{ label?: string; error?: string }>({})
  if (environment === 'disabled') return <Alert severity="error">Test-data administration is disabled on mainnet.</Alert>
  if (!capability || !registryUrl) return <Alert severity="info">Open this area from the bookmarked test-data admin page.</Alert>
  if (error) return <Alert severity="error">{error}</Alert>
  if (!run) return <Typography>Loading area…</Typography>
  const runPath = `/admin/test-data/${encodeURIComponent(run.runId)}?key=${encodeURIComponent(capability)}`
  const area = testDataRunAreas(run.entities).find(candidate => candidate.id === areaId)
  if (!area) return <Stack spacing={2}><Alert severity="warning">This run has no recorded area with that name.</Alert><Button component={RouterLink} to={runPath}>Back to run</Button></Stack>
  const users = run.users.filter(user => area.activeUserIds.includes(user.id))
  const connectedUser = isConnected ? run.users.find(user => user.address.toLowerCase() === address?.toLowerCase()) : undefined
  const connect = (user: TestDataUser) => {
    try {
      window._setupTestDataWallet(user.privateKey, { chainId: Number(run.chainId), label: user.label })
      setConnection({ label: user.label })
    } catch (reason) {
      setConnection({ error: reason instanceof Error ? reason.message : String(reason) })
    }
  }
  return <Stack spacing={3} data-testid="test-data-area-page">
    <Box><Button component={RouterLink} to={runPath}>All areas in this run</Button>
      <Typography variant="h4" component="h1">{area.title}</Typography>
      <Typography color="text.secondary">Synthetic demo · {run.network} · {new Date(run.createdAt).toLocaleString()}</Typography>
    </Box>
    <Card variant="outlined"><CardContent><Typography variant="h6" component="h2">Boards and bridges</Typography>
      <Stack alignItems="flex-start" spacing={1}>
        {area.bridges.map(link => <Button component={RouterLink} key={link.path} to={link.path} variant="contained">Bridge · {link.title}</Button>)}
        {area.causeBoards.map(link => <Button component={RouterLink} key={link.path} to={link.path}>{link.title}</Button>)}
      </Stack>
    </CardContent></Card>
    <Card variant="outlined"><CardContent><Typography variant="h6" component="h2">Statements ({area.statements.length})</Typography>
      <Stack spacing={2} sx={{ mt: 2 }}>{area.statements.map(statement => <Box key={statement.id}>
        {statement.path ? <Typography component={RouterLink} to={statement.path}>{statement.text}</Typography> : <Typography>{statement.text}</Typography>}
      </Box>)}</Stack>
    </CardContent></Card>
    <Card variant="outlined"><CardContent><Typography variant="h6" component="h2">Projects ({area.projects.length})</Typography>
      <Stack alignItems="flex-start">{area.projects.map(project => <Button component={RouterLink} key={project.assuranceContract} to={project.path}>{project.title}</Button>)}</Stack>
      {!area.projects.length && <Typography color="text.secondary">No projects recorded in this area.</Typography>}
    </CardContent></Card>
    <Card variant="outlined"><CardContent><Typography variant="h6" component="h2">Active fake users ({users.length})</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>People who acted in this area during the run. Connect as someone, then open a board, statement, project, or their dashboard.</Typography>
      {connection.error && <Alert severity="error">{connection.error}</Alert>}
      {(connectedUser || connection.label) && <Alert severity="success">Connected as {connectedUser?.label ?? connection.label}. <RouterLink to="/dashboard">Open dashboard</RouterLink></Alert>}
      <Stack spacing={2} sx={{ mt: 2 }}>{users.map(user => <Box key={user.id}>
        <Typography fontWeight="bold">{user.label}</Typography>
        {typeof user.bio === 'string' && <Typography variant="body2">{user.bio}</Typography>}
        <Button onClick={() => connect(user)}>Connect as {user.label}</Button>
      </Box>)}</Stack>
    </CardContent></Card>
  </Stack>
}
