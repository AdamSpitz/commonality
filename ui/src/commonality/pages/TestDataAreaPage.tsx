import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { boardRoleLabel, statementRoleRank, testDataRunAreas, type TestDataArea, type TestDataUser } from '../testData/testDataDocuments'
import { useTestDataRun } from '../testData/useTestDataRun'

function partKey(item: { causeId?: string; partTitle?: string }): string {
  return item.causeId ?? item.partTitle ?? ''
}

function boardForStatement(boards: TestDataArea['causeBoards'], statement: TestDataArea['statements'][number]) {
  const role = statement.role || 'plain'
  return boards.find(board => (board.role || 'plain') === role)
    ?? boards.find(board => (board.role || 'plain') === 'plain')
}

/** One line for how this fake user behaves. Prefers campaign persona roles over the coarse engagement bucket. */
export function fakeUserPosture(user: TestDataUser): string | null {
  const roles = Array.isArray(user.roles) ? user.roles.filter((role): role is string => typeof role === 'string') : []
  const role = ['mediator', 'attester', 'delegate', 'project-founder', 'cause-founder', 'power-user', 'lurker', 'supporter']
    .find(candidate => roles.includes(candidate))
  const byRole: Record<string, string> = {
    mediator: 'Follows both sides closely enough to record how the statements relate.',
    attester: 'Follows statements closely enough to record how they relate.',
    delegate: 'Follows shared causes closely enough to hold other people\'s notes.',
    'project-founder': 'Starts projects and stays with that work.',
    'cause-founder': 'Starts boards and stays with those causes.',
    'power-user': 'Uses most of the product, from funding through organizing.',
    lurker: 'May send a little money without following the work.',
    supporter: 'Sends money to projects without organizing them.',
  }
  if (role) return byRole[role] ?? null
  if (user.engagement === 'LURKER') return 'Mostly watches.'
  if (user.engagement === 'CASUAL') return 'Sends some money without staying deeply involved.'
  if (user.engagement === 'ACTIVE') return 'Follows projects more closely than a one-time donor.'
  if (user.engagement === 'POWER_USER') return 'Uses most of the product, from funding through organizing.'
  return null
}

function compareLabels(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true })
}

function AreaStatements({ area }: { area: TestDataArea }) {
  const keys: string[] = []
  for (const item of [...area.statements, ...area.causeBoards, ...area.bridges]) {
    const key = partKey(item)
    if (!keys.includes(key)) keys.push(key)
  }
  const parts = (keys.length ? keys : ['']).map(key => ({
    key,
    title: [...area.statements, ...area.causeBoards, ...area.bridges].find(item => partKey(item) === key)?.partTitle,
    statements: [...area.statements.filter(statement => partKey(statement) === key)].sort((left, right) => statementRoleRank(left.role) - statementRoleRank(right.role) || left.id.localeCompare(right.id)),
    boards: area.causeBoards.filter(board => partKey(board) === key),
    bridge: area.bridges.find(bridge => partKey(bridge) === key),
  }))
  return <Card variant="outlined"><CardContent>
    <Typography variant="h6" component="h2">Statements ({area.statements.length})</Typography>
    <Stack spacing={3} sx={{ mt: 2, maxHeight: 520, overflow: 'auto' }}>
      {parts.map(part => {
        const showHeading = parts.length > 1 && part.title && part.title !== area.title
        const roles = [...new Set(part.statements.map(statement => statement.role ?? ''))]
        return <Box key={part.key || 'statements'}>
          {showHeading && <Typography variant="subtitle1">{part.bridge ? part.bridge.title.replace(/ bridge$/, '') : part.title}</Typography>}
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
            {part.bridge && <Button component={RouterLink} to={part.bridge.path} size="small" variant="contained">Open bridge</Button>}
          </Stack>
          <Stack spacing={2}>
            {roles.map(role => {
              const roleStatements = part.statements.filter(statement => (statement.role ?? '') === role)
              const linkedBoards = new Set(roleStatements.map(statement => boardForStatement(part.boards, statement)?.path).filter((path): path is string => Boolean(path)))
              const unlinkedBoards = part.boards.filter(board => (board.role ?? '') === role && !linkedBoards.has(board.path))
              return <Box key={role || 'plain'}>
                {role && <Typography variant="overline" color="text.secondary">{boardRoleLabel(role)}</Typography>}
                {unlinkedBoards.map(board => <Box key={board.path} sx={{ mt: 0.5 }}>
                  <Typography variant="subtitle2">{board.title}</Typography>
                  <Button component={RouterLink} to={board.path} size="small" sx={{ px: 0 }}>Open cause board</Button>
                </Box>)}
                {roleStatements.map(statement => {
                  const board = boardForStatement(part.boards, statement)
                  const header = board?.title ?? (statement.role ? boardRoleLabel(statement.role) : undefined)
                  return <Box key={statement.id} sx={{ mt: 0.5 }}>
                    {header && <Typography variant="subtitle2">{header}</Typography>}
                    <Typography>{statement.text}</Typography>
                    <Stack direction="row" gap={1} sx={{ mt: 0.5 }}>
                      {statement.path && <Button component={RouterLink} to={statement.path} size="small">Open statement</Button>}
                      {board && <Button component={RouterLink} to={board.path} size="small">Open cause board</Button>}
                    </Stack>
                  </Box>
                })}
              </Box>
            })}
          </Stack>
        </Box>
      })}
      {!area.statements.length && <Typography color="text.secondary">No statements recorded in this area.</Typography>}
    </Stack>
  </CardContent></Card>
}

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
  const users = run.users.filter(user => area.activeUserIds.includes(user.id)).sort((left, right) => {
    const starred = (user: TestDataUser) => user.label.includes('★') ? 0 : 1
    return starred(left) - starred(right) || compareLabels(left.label, right.label)
  })
  const projects = [...area.projects].sort((left, right) => compareLabels(left.title, right.title))
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
    <AreaStatements area={area} />
    <Card variant="outlined"><CardContent><Typography variant="h6" component="h2">Projects ({area.projects.length})</Typography>
      <Stack alignItems="flex-start" sx={{ maxHeight: 280, overflow: 'auto' }}>{projects.map(project => <Button component={RouterLink} key={project.assuranceContract} to={project.path}>{project.title}</Button>)}</Stack>
      {!projects.length && <Typography color="text.secondary">No projects recorded in this area.</Typography>}
    </CardContent></Card>
    <Card variant="outlined"><CardContent><Typography variant="h6" component="h2">Active fake users ({users.length})</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>People who acted in this area during the run. Connect as someone, then open a board, statement, project, or their dashboard.</Typography>
      {connection.error && <Alert severity="error">{connection.error}</Alert>}
      {(connectedUser || connection.label) && <Alert severity="success">Connected as {connectedUser?.label ?? connection.label}. <RouterLink to="/dashboard">Open dashboard</RouterLink></Alert>}
      <Stack spacing={2} sx={{ mt: 2, maxHeight: 420, overflow: 'auto' }}>{users.map(user => <Box key={user.id}>
        <Typography fontWeight="bold">{user.label}</Typography>
        {fakeUserPosture(user) && <Typography variant="body2" color="text.secondary">{fakeUserPosture(user)}</Typography>}
        {typeof user.bio === 'string' && <Typography variant="body2">{user.bio}</Typography>}
        <Button onClick={() => connect(user)}>Connect as {user.label}</Button>
      </Box>)}</Stack>
    </CardContent></Card>
  </Stack>
}
