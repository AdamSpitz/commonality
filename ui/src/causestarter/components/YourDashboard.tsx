import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { getStatementWithContent } from '@commonality/sdk/conceptspace'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { CauseBoard } from '@ui/fundingportals'
import { TrustNetworkRefreshIndicator, useMachinery, useWriteClients } from '@ui/shared'
import { AlignmentTrustGate } from './AlignmentTrustGate'
import { ConnectWalletHint } from './ConnectWalletHint'
import { HeaderInfoTip } from '../../shared'
import { StarterNetworkFilterCopy } from './StarterNetworkFilterNotice'
import { useAlignmentTrust } from '../hooks/useAlignmentTrust'
import { useUserStatements } from '../hooks/useUserStatements'
import {
  persistPersonalFundingBoard,
  readPersonalFundingBoard,
  readRemotePersonalFundingBoard,
  serializePersonalFundingBoard,
  writePersonalFundingBoard,
  type PersonalFundingBoard,
} from '../lib/personalFundingBoard'

const sectionHeadingSx = { fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }

export const PERSONAL_DASHBOARD_PATH = '/dashboard'
const HOME_PREVIEW_LIMIT = 3

export function YourDashboard({
  layout = 'preview',
}: {
  layout?: 'preview' | 'page'
}) {
  const { statements, loading, connected, error, refresh } = useUserStatements()
  const { address } = useAccount()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()
  const [board, setBoard] = useState<PersonalFundingBoard | null>(() => readPersonalFundingBoard(address))
  const [editing, setEditing] = useState(false)
  const [selectedCids, setSelectedCids] = useState<string[]>([])
  const [geography, setGeography] = useState('')
  const [statementCid, setStatementCid] = useState('')
  const [statementCidError, setStatementCidError] = useState<string | null>(null)
  const [addingStatement, setAddingStatement] = useState(false)
  const [remoteBoard, setRemoteBoard] = useState<PersonalFundingBoard | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const {
    trustedAlignmentAttesters,
    alignmentTrustUnavailable,
    showInitialTrustLoad,
    trustError,
  } = useAlignmentTrust()
  const statementCids = board?.statementCids ?? []

  useEffect(() => {
    const next = readPersonalFundingBoard(address)
    setBoard(next)
    setSelectedCids(next?.statementCids ?? [])
    setGeography(next?.geographicWithin?.join(', ') ?? '')
  }, [address])

  useEffect(() => {
    let cancelled = false
    if (!address) return
    void readRemotePersonalFundingBoard(machinery, address)
      .then((remote) => {
        if (cancelled) return
        const local = readPersonalFundingBoard(address)
        setRemoteBoard(remote)
        if (!local && remote) {
          writePersonalFundingBoard(address, remote)
          setBoard(remote)
          setSelectedCids(remote.statementCids)
          setGeography(remote.geographicWithin?.join(', ') ?? '')
          setSynced(true)
        } else {
          setSynced(Boolean(local && remote && serializePersonalFundingBoard(local) === serializePersonalFundingBoard(remote)))
        }
      })
      .catch((cause) => {
        if (!cancelled) setSyncError(cause instanceof Error ? cause.message : 'Could not read the wallet copy')
      })
    return () => { cancelled = true }
  }, [address, machinery])

  const beginSetup = (startWithSigned = false) => {
    const cids = startWithSigned ? statements.map((statement) => statement.cid) : board?.statementCids ?? []
    setSelectedCids(cids)
    setGeography(board?.geographicWithin?.join(', ') ?? '')
    setEditing(true)
  }

  const saveBoard = () => {
    if (!address) return
    const geographicWithin = geography.split(',').map((part) => part.trim()).filter(Boolean)
    const next = { statementCids: selectedCids, ...(geographicWithin.length ? { geographicWithin } : {}) }
    writePersonalFundingBoard(address, next)
    setBoard(next)
    setEditing(false)
    setSynced(false)
  }

  const syncBoard = async () => {
    if (!board || !writeClients) return
    setSyncing(true)
    setSyncError(null)
    try {
      await persistPersonalFundingBoard(writeClients, board)
      setRemoteBoard(board)
      setSynced(true)
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : 'Could not sync the board')
    } finally {
      setSyncing(false)
    }
  }

  const useWalletBoard = () => {
    if (!address || !remoteBoard) return
    writePersonalFundingBoard(address, remoteBoard)
    setBoard(remoteBoard)
    setSelectedCids(remoteBoard.statementCids)
    setGeography(remoteBoard.geographicWithin?.join(', ') ?? '')
    setSynced(true)
  }

  const addStatement = async () => {
    const cid = statementCid.trim()
    if (!cid || selectedCids.includes(cid)) return
    setAddingStatement(true)
    setStatementCidError(null)
    try {
      const statement = await getStatementWithContent(machinery, cid as IpfsCidV1)
      if (!statement) throw new Error('Statement not found')
      setSelectedCids((current) => [...current, cid])
      setStatementCid('')
    } catch (cause) {
      setStatementCidError(cause instanceof Error ? cause.message : 'Could not load that statement')
    } finally {
      setAddingStatement(false)
    }
  }

  const preview = layout === 'preview'
  const headingId = preview ? 'home-dashboard-board' : 'personal-dashboard-page'

  return (
    <Stack spacing={1.5} data-testid={headingId}>
      <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
        <Typography variant="h4" component={preview ? 'h2' : 'h1'} sx={sectionHeadingSx}>
          Fundable projects
        </Typography>
        <HeaderInfoTip
          title="Projects vouched for as advancing the statements explicitly included in this personal board."
          label="About your fundable-projects board"
        />
      </Stack>

      {connected && !loading && !error && !editing && board && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid="funding-board-parameters">
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>Board parameters</Typography>
              <Typography variant="body2" color="text.secondary">
                {statementCids.length === 1 ? '1 statement' : `${statementCids.length} statements`}
                {board.geographicWithin?.length ? ` · ${board.geographicWithin.join(', ')}` : ' · Anywhere'}
              </Typography>
            </Box>
            <Button onClick={() => beginSetup()} sx={{ alignSelf: { sm: 'center' } }}>Edit board</Button>
          </Stack>
        </Paper>
      )}

      {connected && board && remoteBoard && !synced && (
        <Alert severity="warning" data-testid="funding-board-conflict">
          This device and your wallet have different funding boards. Use the wallet copy, or review this device's board and sync it to replace the wallet copy.
          <Typography variant="body2" sx={{ mt: 1 }}>
            This device: {board.statementCids.length} statements · {board.geographicWithin?.join(', ') || 'Anywhere'}
          </Typography>
          <Typography variant="body2">
            Wallet copy: {remoteBoard.statementCids.length} statements · {remoteBoard.geographicWithin?.join(', ') || 'Anywhere'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" onClick={useWalletBoard}>Use wallet copy</Button>
            <Button size="small" variant="outlined" onClick={() => void syncBoard()} disabled={!writeClients || syncing}>
              Keep this device and sync
            </Button>
          </Stack>
        </Alert>
      )}

      {connected && board && (!remoteBoard || synced) && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>Use this board on other devices</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {synced
              ? 'This public board definition is linked to your wallet.'
              : 'Syncing publicly associates this board’s statements, filters, and preferred fund with your wallet.'}
          </Typography>
          {!synced && (
            <Button sx={{ mt: 1 }} variant="outlined" onClick={() => void syncBoard()} disabled={!writeClients || syncing}>
              {syncing ? 'Syncing…' : 'Sync across devices'}
            </Button>
          )}
        </Paper>
      )}

      {syncError && <Alert severity="warning" onClose={() => setSyncError(null)}>{syncError}</Alert>}

      {connected && !loading && !error && (editing || !board) && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }} data-testid="funding-board-setup">
          <Typography variant="h6" component="h2" sx={{ fontWeight: 750 }}>Set up your funding board</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Choose the statements and place that define which projects you want to consider. Signing remains independent.
          </Typography>
          {selectedCids.length > 0 && (
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} sx={{ mb: 2 }} data-testid="funding-board-selected-statements">
              {selectedCids.map((cid) => {
                const signed = statements.find((statement) => statement.cid === cid)
                return (
                  <Chip
                    key={cid}
                    label={signed?.title?.trim() || cid}
                    title={cid}
                    onDelete={() => setSelectedCids((current) => current.filter((selected) => selected !== cid))}
                  />
                )
              })}
            </Stack>
          )}
          {statements.length > 0 && (
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Statements you've signed</Typography>
              {statements.map((statement) => (
                <FormControlLabel
                  key={statement.cid}
                  control={<Checkbox checked={selectedCids.includes(statement.cid)} onChange={(_, checked) => setSelectedCids((current) => checked ? [...new Set([...current, statement.cid])] : current.filter((cid) => cid !== statement.cid))} />}
                  label={statement.title?.trim() || 'Untitled statement'}
                />
              ))}
            </Stack>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }} alignItems={{ sm: 'flex-start' }}>
            <TextField
              fullWidth
              size="small"
              label="Add a statement by CID"
              value={statementCid}
              onChange={(event) => { setStatementCid(event.target.value); setStatementCidError(null) }}
              error={Boolean(statementCidError)}
              helperText={statementCidError ?? 'Use any published statement, whether or not you signed it.'}
            />
            <Button
              variant="outlined"
              onClick={() => void addStatement()}
              disabled={!statementCid.trim() || selectedCids.includes(statementCid.trim()) || addingStatement}
              sx={{ minWidth: 120 }}
            >
              {addingStatement ? <CircularProgress size={18} /> : 'Add statement'}
            </Button>
          </Stack>
          <TextField fullWidth size="small" label="Geographic scope (optional)" value={geography} onChange={(event) => setGeography(event.target.value)} helperText="Specific to broad, separated by commas — for example Toronto, Ontario, Canada." />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            {!board && statements.length > 0 && <Button variant="outlined" onClick={() => beginSetup(true)}>Use all signed statements</Button>}
            <Button variant="contained" onClick={saveBoard} disabled={selectedCids.length === 0}>Save board</Button>
            {board && <Button onClick={() => setEditing(false)}>Cancel</Button>}
          </Stack>
        </Paper>
      )}

      {!connected && (
        <ConnectWalletHint>
          Connect a wallet to configure your personal funding board and see its fundable projects.
        </ConnectWalletHint>
      )}

      {connected && loading && (
        <Stack direction="row" spacing={1} alignItems="center" data-testid="home-dashboard-loading">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading signed statements…
          </Typography>
        </Stack>
      )}

      {connected && !loading && error && (
        <Alert severity="error" sx={{ borderRadius: 2 }} data-testid="home-dashboard-error">
          {error}
          <Button onClick={refresh} sx={{ display: 'block', mt: 0.5, textTransform: 'none', px: 0 }}>
            Try again
          </Button>
        </Alert>
      )}

      {connected && !loading && !error && board && statementCids.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }} data-testid="home-dashboard-empty">
          Add at least one statement to this board to see relevant projects.
        </Alert>
      )}

      {connected && !loading && !error && statementCids.length > 0 && (
        <>
          {showInitialTrustLoad && (
            <Box sx={{ position: 'relative', height: 0 }}>
              <TrustNetworkRefreshIndicator title="Refreshing your trust network before listing projects." />
            </Box>
          )}
          {(trustError || alignmentTrustUnavailable) && (
            <AlignmentTrustGate error={trustError} />
          )}
          <CauseBoard
            statementCids={statementCids}
            trustedAlignmentAttesters={trustedAlignmentAttesters}
            inclusionRules={board?.geographicWithin?.length ? { geographic: { within: board.geographicWithin } } : undefined}
            embedded
            surfaceTitle="Fundable Projects"
            projectLinks="local"
            preview={
              preview
                ? { limit: HOME_PREVIEW_LIMIT, fullPageTo: PERSONAL_DASHBOARD_PATH }
                : undefined
            }
            projectsHelp={
              preview ? undefined : (
              <Stack spacing={1}>
                <Typography variant="body2">
                  Union of projects vouched as advancing any statement included in this board.
                  Alignment attaches to a statement, never to a cause board as a club.
                </Typography>
                <StarterNetworkFilterCopy />
              </Stack>
              )
            }
          />
        </>
      )}
    </Stack>
  )
}
