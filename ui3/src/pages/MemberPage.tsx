import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi'
import { getUserBeliefs, type StatementListItem } from '@commonality/sdk/conceptspace'
import { getProjectsByDate, type ProjectWithMetrics } from '@commonality/sdk/lazy-giving'
import { getNotesByOwner, getNotesByRoot, type Note } from '@commonality/sdk/delegation'
import { CauseCard } from '../components/CauseCard'
import { WalletButton } from '../components/WalletButton'
import {
  authoredStatementsForMember,
  causesForMember,
  engagementTimeline,
  listCauses,
  type TimelineItem,
} from '../lib/causeModel'
import {
  getMember,
  getMemberByWallet,
  memberLabel,
  memberShortLabel,
  normalizeUsername,
  validateUsername,
} from '../lib/memberIdentity'
import { useSession } from '../lib/session'
import { useMachinery } from '../lib/useMachinery'
import { getDomainUrl } from '../lib/domainUrls'
import { shortAddress } from '../lib/hardhatAccounts'

/**
 * Profile / login. Username is primary identity.
 * Wallet connect + link only happens here.
 */
export function MemberPage() {
  const { address: addressParam } = useParams<{ address?: string }>()
  const {
    user,
    isLoggedIn,
    accounts,
    login,
    switchAccount,
    logout,
    setDisplayName,
    linkWallet,
    unlinkWallet,
  } = useSession()
  const { address: connected, isConnected } = useAccount()
  const { disconnectAsync } = useDisconnect()
  const machinery = useMachinery()

  // View by username param, wallet param (legacy), or self
  const param = addressParam
  const viewedMember = param
    ? (/^0x[0-9a-fA-F]{40}$/.test(param)
      ? getMemberByWallet(param)
      : getMember(param))
    : user

  const isSelf = Boolean(
    isLoggedIn && user && viewedMember && viewedMember.username === user.username,
  )

  const profileWallet = viewedMember?.walletAddress?.toLowerCase() ?? null

  const [loginDraft, setLoginDraft] = useState('')
  const [displayDraft, setDisplayDraft] = useState(user?.displayName ?? '')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [walletMsg, setWalletMsg] = useState<string | null>(null)

  const [beliefs, setBeliefs] = useState<StatementListItem[]>([])
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([])
  const [notesOwned, setNotesOwned] = useState<Note[]>([])
  const [notesRoot, setNotesRoot] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Causes founded: by username (and legacy wallet match)
  const founded = viewedMember
    ? causesForMember(viewedMember.username).concat(
      viewedMember.walletAddress
        ? causesForMember(viewedMember.walletAddress).filter(
          (c) => !causesForMember(viewedMember.username).some((x) => x.id === c.id),
        )
        : [],
    )
    : []
  const authored = profileWallet
    ? authoredStatementsForMember(profileWallet)
    : viewedMember
      ? authoredStatementsForMember(viewedMember.username)
      : []
  const timeline: TimelineItem[] = profileWallet
    ? engagementTimeline(profileWallet)
    : viewedMember
      ? engagementTimeline(viewedMember.username)
      : []
  const localCauses = listCauses()

  const supportedCauseIds = new Set(
    localCauses
      .filter((c) =>
        Boolean(c.goal.cid && beliefs.some((b) => b.cid === c.goal.cid)),
      )
      .map((c) => c.id),
  )
  const supportedCauses = localCauses.filter((c) => supportedCauseIds.has(c.id))

  useEffect(() => {
    setDisplayDraft(user?.displayName ?? '')
  }, [user?.username, user?.displayName])

  // Auto-link wallet when user connects on this page while logged in
  useEffect(() => {
    if (!isSelf || !isLoggedIn || !user || !isConnected || !connected) return
    if (user.walletAddress?.toLowerCase() === connected.toLowerCase()) return
    try {
      linkWallet(connected)
      setWalletMsg(`Wallet linked to @${user.username}.`)
    } catch (err) {
      setWalletMsg(err instanceof Error ? err.message : 'Could not link wallet')
    }
  }, [isSelf, isLoggedIn, user, isConnected, connected, linkWallet])

  useEffect(() => {
    if (!profileWallet) {
      setBeliefs([])
      setProjects([])
      setNotesOwned([])
      setNotesRoot([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const [userBeliefs, recentProjects, owned, rooted] = await Promise.all([
          getUserBeliefs(machinery, profileWallet).catch(() => [] as StatementListItem[]),
          getProjectsByDate(machinery, 'desc').catch(() => [] as ProjectWithMetrics[]),
          getNotesByOwner(machinery, profileWallet).catch(() => [] as Note[]),
          getNotesByRoot(machinery, profileWallet).catch(() => [] as Note[]),
        ])
        if (cancelled) return
        setBeliefs(userBeliefs.slice(0, 20))
        const led = recentProjects.filter(
          (p) => p.recipient?.toLowerCase() === profileWallet,
        )
        setProjects((led.length > 0 ? led : recentProjects).slice(0, 8))
        setNotesOwned(owned.slice(0, 10))
        setNotesRoot(rooted.slice(0, 10))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load activity')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [profileWallet, machinery])

  const switchTo = (username: string) => {
    setLoginError(null)
    setWalletMsg(null)
    try {
      switchAccount(username)
      // Avoid acting as the previous account's wallet after a switch.
      void disconnectAsync().catch(() => {})
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : 'Could not switch account')
    }
  }

  // Login gate for "self" view without session
  if (!param && !isLoggedIn) {
    return (
      <Stack spacing={2.5} data-testid="member-page">
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Log in
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use a username to identify yourself across causes. No password — accounts stay on this
          device. Connect a wallet only on this page when you need on-chain actions.
        </Typography>

        {accounts.length > 0 && (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Accounts on this device
            </Typography>
            <Stack spacing={1} data-testid="account-picker">
              {accounts.map((m) => (
                <Button
                  key={m.username}
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    try {
                      switchAccount(m.username)
                      void disconnectAsync().catch(() => {})
                    } catch (e) {
                      setLoginError(e instanceof Error ? e.message : 'Switch failed')
                    }
                  }}
                  sx={{
                    justifyContent: 'flex-start',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.25,
                  }}
                  data-testid={`switch-account-${m.username}`}
                >
                  <Stack alignItems="flex-start" spacing={0.25}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      @{m.username}
                    </Typography>
                    {m.displayName && (
                      <Typography variant="caption" color="text.secondary">{m.displayName}</Typography>
                    )}
                  </Stack>
                </Button>
              ))}
            </Stack>
          </Paper>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {accounts.length > 0 ? 'Or create / resume another username' : 'Choose a username'}
        </Typography>
        <TextField
          size="small"
          fullWidth
          label="Username"
          placeholder="e.g. river_sam"
          value={loginDraft}
          onChange={(e) => setLoginDraft(e.target.value)}
          inputProps={{ 'data-testid': 'login-username', autoCapitalize: 'none' }}
          helperText="Letters, numbers, underscore · 2–24 characters"
        />
        {loginError && <Alert severity="error">{loginError}</Alert>}
        <Button
          variant="contained"
          data-testid="login-submit"
          sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none', fontWeight: 700, minHeight: 44 }}
          onClick={() => {
            setLoginError(null)
            const err = validateUsername(loginDraft)
            if (err) {
              setLoginError(err)
              return
            }
            try {
              login(loginDraft)
              void disconnectAsync().catch(() => {})
            } catch (e) {
              setLoginError(e instanceof Error ? e.message : 'Login failed')
            }
          }}
        >
          Log in / Create account
        </Button>
      </Stack>
    )
  }

  if (param && !viewedMember) {
    return (
      <Stack spacing={2} data-testid="member-page">
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Member not found</Typography>
        <Typography variant="body2" color="text.secondary">
          No local profile for {param.startsWith('0x') ? 'that wallet' : `@${normalizeUsername(param)}`}.
        </Typography>
        <Button component={RouterLink} to="/member" sx={{ textTransform: 'none' }}>Your profile</Button>
      </Stack>
    )
  }

  const member = viewedMember!

  return (
    <Stack spacing={2.5} data-testid="member-page">
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          {member.displayName || memberShortLabel(member.username)}
        </Typography>
        <Typography variant="body1" color="primary.main" sx={{ fontWeight: 700 }}>
          @{member.username}
        </Typography>
      </Stack>

      {isSelf && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Your account</Typography>
            <TextField
              size="small"
              fullWidth
              label="Display name (optional)"
              value={displayDraft}
              onChange={(e) => setDisplayDraft(e.target.value)}
              onBlur={() => setDisplayName(displayDraft)}
            />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, pt: 0.5 }}>
              Wallet (profile only)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect and link a wallet here when you need to publish statements or stand by them
              on-chain. Elsewhere we identify you as @{member.username}.
            </Typography>
            <WalletButton />
            {member.walletAddress && (
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                Linked: {shortAddress(member.walletAddress)}
                {isConnected && connected?.toLowerCase() === member.walletAddress.toLowerCase()
                  ? ' · connected'
                  : isConnected
                    ? ' · different wallet connected'
                    : ' · not connected'}
              </Typography>
            )}
            {walletMsg && (
              <Alert severity="info" onClose={() => setWalletMsg(null)}>{walletMsg}</Alert>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {member.walletAddress && (
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  sx={{ textTransform: 'none' }}
                  onClick={() => {
                    unlinkWallet()
                    void disconnectAsync().catch(() => {})
                    setWalletMsg('Wallet unlinked.')
                  }}
                >
                  Unlink wallet
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                sx={{ textTransform: 'none', borderRadius: 999 }}
                onClick={() => {
                  logout()
                  void disconnectAsync().catch(() => {})
                }}
                data-testid="logout"
              >
                Log out
              </Button>
            </Stack>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, pt: 1 }}>
              Switch account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Password-less — pick any account already used on this device, or create another username.
            </Typography>
            <Stack spacing={0.75} data-testid="account-switcher">
              {accounts
                .filter((m) => m.username !== member.username)
                .map((m) => (
                  <Button
                    key={m.username}
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => switchTo(m.username)}
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                    data-testid={`switch-account-${m.username}`}
                  >
                    @{m.username}
                    {m.displayName ? ` · ${m.displayName}` : ''}
                  </Button>
                ))}
              {accounts.filter((m) => m.username !== member.username).length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No other accounts yet.
                </Typography>
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="New or other username"
                placeholder="e.g. founder_two"
                value={loginDraft}
                onChange={(e) => setLoginDraft(e.target.value)}
                inputProps={{ autoCapitalize: 'none', 'data-testid': 'switch-username-input' }}
              />
              <Button
                variant="contained"
                size="small"
                sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700, minHeight: 40, whiteSpace: 'nowrap' }}
                data-testid="switch-create-submit"
                onClick={() => {
                  setLoginError(null)
                  const err = validateUsername(loginDraft)
                  if (err) {
                    setLoginError(err)
                    return
                  }
                  try {
                    login(loginDraft)
                    void disconnectAsync().catch(() => {})
                    setLoginDraft('')
                    setWalletMsg(`Switched to @${normalizeUsername(loginDraft)}.`)
                  } catch (e) {
                    setLoginError(e instanceof Error ? e.message : 'Failed')
                  }
                }}
              >
                Switch / create
              </Button>
            </Stack>
            {loginError && <Alert severity="error" onClose={() => setLoginError(null)}>{loginError}</Alert>}
          </Stack>
        </Paper>
      )}

      {loading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Loading activity…</Typography>
        </Stack>
      )}
      {error && <Alert severity="warning">{error}</Alert>}

      {!profileWallet && isSelf && (
        <Alert severity="info">
          Link a wallet above to load on-chain supports, projects, and delegation for this profile.
        </Alert>
      )}

      <Section title="Causes founded">
        {founded.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No causes yet{isSelf ? ' — launch one from Home.' : '.'}
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {founded.map((c) => <CauseCard key={c.id} cause={c} />)}
          </Stack>
        )}
      </Section>

      <Section title="Causes supported">
        {supportedCauses.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No matching local causes for on-chain goal support yet.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {supportedCauses.map((c) => <CauseCard key={c.id} cause={c} />)}
          </Stack>
        )}
      </Section>

      <Section title="Statements authored">
        {authored.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No goals or beliefs authored on this device for this member.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {authored.slice(0, 15).map(({ causeId, causeTitle, statement }) => (
              <Paper
                key={statement.id}
                component={RouterLink}
                to={`/cause/${causeId}`}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <Stack direction="row" spacing={0.75} sx={{ mb: 0.5 }}>
                  <Chip size="small" label={statement.role} />
                  <Chip
                    size="small"
                    label={statement.cid ? 'Published' : 'Draft'}
                    color={statement.cid ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {statement.text || '(empty)'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  on {causeTitle}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Section>

      <Section title="Statements supported (on-chain)">
        {beliefs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {profileWallet ? 'None found (or indexer offline).' : 'Link a wallet to load on-chain support.'}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {beliefs.map((b) => (
              <Paper key={b.cid} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {b.title || b.excerpt || 'Statement'}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Section>

      <Section title="Projects">
        {projects.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No projects loaded.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {projects.map((p) => (
              <Paper key={p.id} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {shortAddress(p.id)}
                  {p.recipient?.toLowerCase() === profileWallet ? ' · led' : ''}
                </Typography>
                <Button
                  component="a"
                  href={getDomainUrl('lazyGiving', `/projects/${p.id}`, '#')}
                  target="_blank"
                  rel="noreferrer"
                  size="small"
                  sx={{ textTransform: 'none', mt: 0.5 }}
                >
                  Open project
                </Button>
              </Paper>
            ))}
          </Stack>
        )}
      </Section>

      <Section title="Delegation">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Notes held and deposited (requires linked wallet).
        </Typography>
        {notesOwned.length === 0 && notesRoot.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            No delegation notes found.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            {notesOwned.slice(0, 5).map((n) => (
              <Paper key={`own-${n.id}`} elevation={0} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Chip size="small" label="Held" sx={{ mb: 0.5 }} />
                <Typography variant="caption" color="text.secondary" display="block">
                  from {memberLabel(n.rootOwner)}
                </Typography>
              </Paper>
            ))}
            {notesRoot.slice(0, 5).map((n) => (
              <Paper key={`root-${n.id}`} elevation={0} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Chip size="small" label="Deposited" variant="outlined" sx={{ mb: 0.5 }} />
                <Typography variant="caption" color="text.secondary" display="block">
                  current owner {memberLabel(n.owner)}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
        <Button
          component="a"
          href={getDomainUrl('lazyGiving', '/delegation/notes', '#')}
          target="_blank"
          rel="noreferrer"
          variant="outlined"
          sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
        >
          Open delegation tool
        </Button>
      </Section>

      <Section title="Timeline">
        {timeline.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No local engagement yet.</Typography>
        ) : (
          <Stack spacing={1}>
            {timeline.slice(0, 20).map((item) => (
              <Paper
                key={item.id}
                component={item.href ? RouterLink : 'div'}
                to={item.href || undefined}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {new Date(item.at).toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
                  {item.label}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Section>
    </Stack>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
      {children}
    </Box>
  )
}
