import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { shortAddress } from '../../shared/wallet/hardhatAccounts'
import { testDataPageGroups, testDataRunProjects, testDataRunAreas, type TestDataUser } from '../testData/testDataDocuments'
import { useTestDataRun } from '../testData/useTestDataRun'
import { KeyValueTable } from '../testData/prettyJson'

function userRank(user: TestDataUser): number {
  return typeof user.spotlightOrder === 'number' ? user.spotlightOrder : (user.label.includes('★') ? 1_000 : 10_000) + user.id
}

export function TestDataRunPage() {
  const { runId } = useParams()
  const [search, setSearch] = useSearchParams()
  const capability = search.get('key') ?? ''
  const { run, error, environment, registryUrl } = useTestDataRun(runId, capability)
  const { address, isConnected } = useAccount()
  const [showAllUsers, setShowAllUsers] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  if (environment === 'disabled') return <Alert severity="error">Test-data administration is disabled on mainnet.</Alert>
  if (!capability || !registryUrl) return <Alert severity="info">Open this run from the bookmarked test-data admin page.</Alert>
  if (error) return <Alert severity="error">{error}</Alert>
  if (!run) return <Typography>Loading run…</Typography>

  const areas = [...testDataRunAreas(run.entities)].sort((a, b) => a.title.localeCompare(b.title))
  const areaId = search.get('area') ?? ''
  const area = areas.find(candidate => candidate.id === areaId)
  const missingArea = Boolean(areaId && !area)
  const groups = testDataPageGroups(run.entities)
  const bridges = area ? area.bridges : groups.filter(group => group.kind === 'bridge')
  const boards = area ? area.causeBoards.filter(board => !area.bridges.some(bridge => bridge.causeId && bridge.causeId === board.causeId))
    : groups.filter(group => group.kind === 'cause')
  const statements = area?.statements.filter(statement => !area.bridges.some(bridge => bridge.causeId && bridge.causeId === statement.causeId)) ?? []
  const projects = [...(area ? area.projects : testDataRunProjects(run.entities))].sort((a, b) => a.title.localeCompare(b.title))
  const users = [...run.users].filter(user => !area || showAllUsers || area.activeUserIds.includes(user.id)).sort((a, b) => userRank(a) - userRank(b))
  const connectedUser = isConnected ? run.users.find(user => user.address.toLowerCase() === address?.toLowerCase()) : undefined
  const connect = (user: TestDataUser) => {
    try {
      window._setupTestDataWallet(user.privateKey, { chainId: Number(run.chainId), label: user.label })
      setConnectError(null)
    } catch (reason) {
      setConnectError(reason instanceof Error ? reason.message : String(reason))
    }
  }
  const selectArea = (id: string) => {
    setSearch(previous => {
      const next = new URLSearchParams(previous)
      if (id) next.set('area', id)
      else next.delete('area')
      return next
    })
    setShowAllUsers(false)
    setConnectError(null)
  }

  return <Stack spacing={3} data-testid="test-data-run-page">
    <Box>
      <Button component={RouterLink} to={`/admin/test-data?key=${encodeURIComponent(capability)}`} sx={{ px: 0 }}>All runs</Button>
      <Typography variant="h4" component="h1">Demo launcher</Typography>
      <Typography color="text.secondary">Synthetic demo · {run.network} · {new Date(run.createdAt).toLocaleString()}</Typography>
    </Box>
    {areas.length > 0 && <FormControl fullWidth>
      <InputLabel id="demo-area-label" shrink>Demo area</InputLabel>
      <Select labelId="demo-area-label" label="Demo area" displayEmpty value={area?.id ?? ''} onChange={event => selectArea(event.target.value)}>
        <MenuItem value="">All areas</MenuItem>
        {areas.map(item => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}
      </Select>
    </FormControl>}
    {missingArea ? <Alert severity="warning">This run has no recorded area with that name. <Button onClick={() => selectArea('')}>Show all areas</Button></Alert> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 3, alignItems: 'start' }}>
      <Stack spacing={3}>
        <Card variant="outlined"><CardContent>
          <Typography variant="h6" component="h2">{area?.title ?? 'Pages in this run'}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Open a page to continue the demo in the normal UI.</Typography>
          <Stack spacing={2} alignItems="flex-start">
            {bridges.map(bridge => <Box key={bridge.path}>
              <Typography variant="overline" color="text.secondary">Bridge</Typography>
              <Box><Button component={RouterLink} to={bridge.path} variant="contained">{groups.find(group => group.path === bridge.path)?.title ?? bridge.title.replace(/ bridge$/i, '')}</Button></Box>
            </Box>)}
            {boards.map(board => <Box key={board.path}>
              <Typography variant="overline" color="text.secondary">Cause board</Typography>
              <Box><Button component={RouterLink} to={board.path} sx={{ textAlign: 'left' }}>{board.title}</Button></Box>
            </Box>)}
            {statements.map(statement => <Box key={statement.id}>
              <Typography>{statement.text}</Typography>
              {statement.path && <Button component={RouterLink} to={statement.path} size="small">Open statement</Button>}
            </Box>)}
            {!bridges.length && !boards.length && !statements.length && <Typography color="text.secondary">No boards, bridges, or statements recorded here.</Typography>}
          </Stack>
        </CardContent></Card>
        <Card variant="outlined"><CardContent>
          <Typography variant="h6" component="h2">Projects ({projects.length})</Typography>
          <Stack alignItems="flex-start" spacing={1} sx={{ mt: 1 }}>{projects.map(project => <Button key={project.path} component={RouterLink} to={project.path} sx={{ textAlign: 'left' }}>{project.title}</Button>)}</Stack>
          {!projects.length && <Typography color="text.secondary">No projects recorded here.</Typography>}
        </CardContent></Card>
      </Stack>
      <Card variant="outlined" sx={{ order: { xs: -1, md: 0 } }}><CardContent>
        <Typography variant="h6" component="h2">View as a fake user</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>{area ? 'People who acted in this area. Connect, then open a page or their dashboard.' : 'Connect as someone, then open a page or their dashboard.'}</Typography>
        {connectedUser && <Alert severity="success" sx={{ mb: 2 }}>Connected as {connectedUser.label}. <RouterLink to="/dashboard">Open dashboard</RouterLink></Alert>}
        {isConnected && !connectedUser && <Alert severity="info" sx={{ mb: 2 }}>Connected wallet: {shortAddress(address ?? '')}. Choose a fake user to switch.</Alert>}
        {connectError && <Alert severity="error" sx={{ mb: 2 }}>{connectError}</Alert>}
        {area && <Button size="small" onClick={() => setShowAllUsers(!showAllUsers)}>{showAllUsers ? 'Show active users only' : `Show all users (${run.users.length})`}</Button>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{users.length} fake users · Disposable keys stay in memory.</Typography>
        <Stack spacing={2} sx={{ maxHeight: 560, overflow: 'auto' }}>{users.map(user => <Box key={user.id}>
          <Stack direction="row" gap={1} alignItems="center"><Typography fontWeight="bold">{user.label}</Typography>{connectedUser?.id === user.id && <Chip size="small" label="Connected" color="success" />}</Stack>
          {typeof user.bio === 'string' && <Typography variant="body2">{user.bio}</Typography>}
          {Array.isArray(user.roles) && <Typography variant="caption" color="text.secondary">{user.roles.filter(role => typeof role === 'string').join(' · ')}</Typography>}
          <Box><Button size="small" onClick={() => connect(user)} disabled={connectedUser?.id === user.id}>Connect as {user.label}</Button></Box>
        </Box>)}</Stack>
        {!users.length && <Typography color="text.secondary">No active fake users recorded in this area.</Typography>}
      </CardContent></Card>
    </Box>}
    <Card variant="outlined"><CardContent><Box component="details">
      <Typography component="summary" variant="h6" sx={{ cursor: 'pointer' }}>Run diagnostics</Typography>
      <Stack spacing={2} sx={{ mt: 2, overflowX: 'auto' }}>
        <Typography>Run {run.runId} · chain {run.chainId} · {run.users.length} fake users · {run.actions.length} recorded actions · {Array.isArray(run.metrics.errors) ? run.metrics.errors.length : 0} errors</Typography>
        <Typography color="text.secondary">Campaign action logs may contain only board and bridge setup, rather than every mined action.</Typography>
        <Typography variant="subtitle1">Run parameters</Typography><KeyValueTable record={run.parameters} />
        <Typography variant="subtitle1">Metrics</Typography><KeyValueTable record={run.metrics} />
        <Box component="details"><Typography component="summary">Recorded activity</Typography><KeyValueTable record={Object.fromEntries(run.actions.map((action, index) => [String(index + 1), action]))} /></Box>
        <Box component="details"><Typography component="summary">Generated entities</Typography><KeyValueTable record={run.entities} /></Box>
      </Stack>
    </Box></CardContent></Card>
  </Stack>
}
