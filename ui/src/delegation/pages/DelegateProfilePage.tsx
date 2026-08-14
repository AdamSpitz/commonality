import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Link, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useSearchParams, useParams } from 'react-router-dom'
import { formatEther, isAddress } from 'viem'
import { getNotesByOwner, type Note } from '@commonality/sdk/delegation'
import { getStatementWithContent, type StatementPickerSelection } from '@commonality/sdk/conceptspace'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useAccount } from 'wagmi'
import { StatementPicker, useMachinery, useWriteClients } from '../../shared'
import { formatNoteAmount, isDelegate, noteDetailPath, truncateAddress } from '../utils'
import {
  loadDelegateOffering,
  previewDelegateOfferingCid,
  publishDelegateOffering,
  withdrawDelegateOffering,
  type DelegateOffering,
} from '../delegateOffering'

interface Scope { cid: string; text: string }

function DelegateNoteCard({ note }: { note: Note }) {
  const isDelegatedFromSomeoneElse = isDelegate(note)

  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="subtitle1">
                <Link component={RouterLink} to={noteDetailPath(note)} underline="hover">
                  Fund #{note.id}
                </Link>
              </Typography>
              <Typography variant="h6">{formatNoteAmount(note)}</Typography>
            </Box>
            <Chip
              label={isDelegatedFromSomeoneElse ? `Delegated from ${truncateAddress(note.rootOwner)}` : 'Own fund'}
              color={isDelegatedFromSomeoneElse ? 'info' : 'default'}
              size="small"
            />
          </Box>
          {note.tokenId !== '0' && (
            <Typography variant="body2" color="text.secondary">
              Holds project/content token {note.tokenId} from {truncateAddress(note.token)}.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export function DelegateProfilePage() {
  const { address: routeAddress } = useParams<{ address: string }>()
  const [searchParams] = useSearchParams()
  const { address: connectedAddress, isConnected } = useAccount()
  const address = routeAddress === 'offer' ? connectedAddress : routeAddress
  const machinery = useMachinery()
  const writeClients = useWriteClients(connectedAddress)
  const [notes, setNotes] = useState<Note[]>([])
  const [offering, setOffering] = useState<DelegateOffering | null>(null)
  const [offeringCid, setOfferingCid] = useState<string | null>(null)
  const [publishedScopes, setPublishedScopes] = useState<Scope[]>([])
  const [scopes, setScopes] = useState<Scope[]>([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const isOwner = Boolean(address && connectedAddress && address.toLowerCase() === connectedAddress.toLowerCase())
  const requestedStatement = searchParams.get('statement')?.trim() || ''

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!address || !isAddress(address)) {
        setNotes([])
        if (routeAddress === 'offer' && !address) {
          setError(null)
          return
        }
        setError('Invalid delegate address')
        return
      }

      setLoading(true)
      setError(null)
      try {
        const [ownedNotes, loadedOffering] = await Promise.all([
          getNotesByOwner(machinery, address),
          loadDelegateOffering(machinery, address),
        ])
        if (!cancelled) {
          setNotes(ownedNotes)
          setOffering(loadedOffering?.offering ?? null)
          setOfferingCid(loadedOffering?.cid ?? null)
          setSummary(loadedOffering?.offering.summary ?? '')
          const loadedScopes = await Promise.all((loadedOffering?.offering.statementCids ?? []).map(async (cid) => {
            const statement = await getStatementWithContent(machinery, cid as IpfsCidV1).catch(() => null)
            const content = statement?.content?.content
            return { cid, text: typeof content === 'string' && content.trim() ? content.trim() : cid }
          }))
          if (!cancelled) {
            setPublishedScopes(loadedScopes)
            setScopes(loadedScopes)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load delegate track record')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [address, machinery, routeAddress])

  useEffect(() => {
    if (!isOwner || !requestedStatement || scopes.some((scope) => scope.cid === requestedStatement)) return
    let cancelled = false
    void getStatementWithContent(machinery, requestedStatement as IpfsCidV1).then((statement) => {
      const content = statement?.content?.content
      if (!cancelled && typeof content === 'string' && content.trim()) {
        setScopes((current) => [...current, { cid: requestedStatement, text: content.trim() }])
      }
    }).catch(() => setError('The requested funding scope could not be loaded for deterministic review.'))
    return () => { cancelled = true }
  }, [isOwner, machinery, requestedStatement, scopes])

  const delegatedNotes = notes.filter(isDelegate)
  const totalControlled = notes.reduce((sum, note) => sum + BigInt(note.amount), 0n)
  const draftOffering = useMemo(() => ({ statementCids: scopes.map((scope) => scope.cid), summary }), [scopes, summary])
  const changed = offeringCid !== (scopes.length > 0 ? previewDelegateOfferingCid(draftOffering) : null)

  const addScope = (selection: StatementPickerSelection) => {
    setScopes((current) => current.some((scope) => scope.cid === selection.cid)
      ? current
      : [...current, { cid: selection.cid, text: selection.text }])
  }

  const publish = async () => {
    if (!writeClients) return setError('Connect the delegate wallet to publish this offering.')
    setPublishing(true)
    setError(null)
    setNotice(null)
    try {
      const cid = await publishDelegateOffering(machinery, writeClients, draftOffering)
      setOffering(draftOffering)
      setOfferingCid(cid)
      setPublishedScopes(scopes)
      setNotice('Delegate offering published. This address can now share this profile link with donors.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish delegate offering')
    } finally {
      setPublishing(false)
    }
  }

  const withdraw = async () => {
    if (!writeClients) return setError('Connect the delegate wallet to withdraw this offering.')
    setPublishing(true)
    setError(null)
    setNotice(null)
    try {
      await withdrawDelegateOffering(machinery, writeClients)
      setOffering(null)
      setOfferingCid(null)
      setPublishedScopes([])
      setScopes([])
      setSummary('')
      setNotice('Delegate offering withdrawn. Immutable old versions remain auditable but are no longer current.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw delegate offering')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            LazyGiving delegate profile
          </Typography>
          <Typography variant="h4" component="h1" gutterBottom>
            Delegate {address && isAddress(address) ? truncateAddress(address) : 'profile'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This funding-specific page shows the immutable statement scopes this address has publicly offered to serve and the funds it currently controls. An offering is not an endorsement, identity profile, or promise that the delegate will accept funds.
          </Typography>
        </Box>

        {routeAddress === 'offer' && !isConnected && (
          <Alert severity="info">Connect the wallet that will act as delegate to publish an offering.</Alert>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading delegate track record…</Typography>
          </Box>
        )}

        {!loading && address && isAddress(address) && (
          <>
            {offering && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Public funding scopes</Typography>
                  {offering.summary && <Typography sx={{ mb: 2 }}>{offering.summary}</Typography>}
                  <Stack spacing={1}>
                    {publishedScopes.map((scope) => (
                      <Box key={scope.cid}>
                        <Typography>{scope.text}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>CID: {scope.cid}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, overflowWrap: 'anywhere' }}>
                    Current offering version: {offeringCid}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {isOwner && (
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6">{offering ? 'Revise your delegate offering' : 'Offer to act as a delegate'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose immutable statements that define what donors may ask you to fund. Donors still earmark each fund separately and choose whether to delegate it to this address.
                      </Typography>
                    </Box>
                    <TextField label="How you approach funding decisions (optional)" multiline minRows={2} value={summary} onChange={(event) => setSummary(event.target.value)} inputProps={{ maxLength: 1000 }} />
                    {scopes.map((scope) => (
                      <Alert key={scope.cid} severity="info" icon={false} action={<Button color="inherit" size="small" onClick={() => setScopes((current) => current.filter((item) => item.cid !== scope.cid))}>Remove</Button>}>
                        <Typography>{scope.text}</Typography>
                        <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>CID: {scope.cid}</Typography>
                      </Alert>
                    ))}
                    <StatementPicker intent="delegation" disabled={publishing} onSelect={addScope} />
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" disabled={publishing || scopes.length === 0 || !changed} onClick={() => void publish()}>
                        {publishing ? 'Publishing…' : offering ? 'Publish revision' : 'Publish offering'}
                      </Button>
                      {offering && <Button color="error" disabled={publishing} onClick={() => void withdraw()}>Withdraw offering</Button>}
                    </Stack>
                    {notice && <Alert severity="success">{notice}</Alert>}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {!offering && !isOwner && <Alert severity="info">This address has not published a current delegate offering.</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Controlled funds</Typography>
                  <Typography variant="h5">{notes.length}</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Acting as delegate</Typography>
                  <Typography variant="h5">{delegatedNotes.length}</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Current ETH balance</Typography>
                  <Typography variant="h5">{formatEther(totalControlled)} ETH</Typography>
                </CardContent>
              </Card>
            </Stack>

            {notes.length === 0 ? (
              <Alert severity="info">No active funds are currently controlled by this address.</Alert>
            ) : (
              <Stack spacing={2}>
                {notes.map((note) => (
                  <DelegateNoteCard key={note.id} note={note} />
                ))}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Box>
  )
}

export default DelegateProfilePage
