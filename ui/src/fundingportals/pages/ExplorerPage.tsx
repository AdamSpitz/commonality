// Fundable Project Explorer — the Aligning site's "Explore Causes" surface (mounted at
// /explore in domains/alignment/manifest.tsx). It lives in the shared fundingportals/ module,
// but the design lives under conceptspace because the explorer is a conceptspace nudger pattern:
// see specs/tech/subsystems/conceptspace/explorer.md and specs/tech/ui-domains.md (Aligning /explore).
import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Button,
  Divider,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { BeliefsAbi } from '@commonality/sdk/abis'
import { getStatementWithContent, getUserBelief, getUserBeliefs, believeStatement, type Statement, type StatementWithContent, type BeliefsContract, BeliefStates } from '@commonality/sdk/conceptspace'
import { getCuratedCollections, type CuratedCollectionEntry, type FoldedCuratedCollection } from '@commonality/sdk/nudger-publications'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../../shared'
import { useWriteClients } from '../../shared'
import { useTrustedNudgers } from '../../shared'
import { StatementRenderer } from '../../conceptspace'
import { getDomainUrl } from '../../domains/domainUrls'

const EXPLORER_STREAM = 'fundable-project-explorer'

interface EnrichedEntry extends CuratedCollectionEntry {
  statement: Statement | null
  content: StatementWithContent['content']
  believerCount: number
  disbelieverCount: number
  userBeliefState: number
  suggestionReason?: string
  loading: boolean
}

interface ExplorerSuggestionResponse {
  suggestions?: Array<{
    cid?: string
    reason?: string
  }>
}

async function fetchPersonalizedSuggestions(serviceUrl: string, signedStatementCids: string[]) {
  const response = await fetch(`${serviceUrl.replace(/\/+$/, '')}/suggest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stream: EXPLORER_STREAM,
      signedStatementCids,
    }),
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    throw new Error(`Explorer personalization request failed with status ${response.status}`)
  }

  const data = await response.json() as ExplorerSuggestionResponse
  return Array.isArray(data.suggestions) ? data.suggestions : []
}

export function ExplorerPage() {
  const { address } = useAccount()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()
  const trustedNudgers = useTrustedNudgers()

  const BELIEFS_CONTRACT_ADDRESS = import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS as `0x${string}` | undefined

  const [collections, setCollections] = useState<FoldedCuratedCollection[]>([])
  const [enrichedEntries, setEnrichedEntries] = useState<EnrichedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingCid, setSigningCid] = useState<string | null>(null)

  const loadCollections = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const collections = await getCuratedCollections(
        machinery,
        trustedNudgers.map((e) => e.address),
        EXPLORER_STREAM,
      )

      setCollections(collections)

      if (collections.length === 0) {
        setEnrichedEntries([])
        setLoading(false)
        return
      }

      const latestCollection = collections[0]

      if (latestCollection.entries.length === 0) {
        setEnrichedEntries([])
        setLoading(false)
        return
      }

      const entriesByCid = new Map(latestCollection.entries.map((entry) => [entry.cid, entry]))

      const signedStatementCids = address
        ? (await getUserBeliefs(machinery, address).catch(() => [])).map((belief) => belief.cid)
        : []

      const serviceUrl = trustedNudgers.find(
        (entry) => entry.address.toLowerCase() === latestCollection.nudger.toLowerCase(),
      )?.serviceUrl

      let entries = latestCollection.entries.map((entry) => ({ entry, suggestionReason: undefined as string | undefined }))

      if (serviceUrl) {
        const suggestions = await fetchPersonalizedSuggestions(serviceUrl, signedStatementCids).catch((err) => {
          console.warn('Falling back to unpersonalized explorer collection:', err)
          return null
        })

        if (suggestions && suggestions.length > 0) {
          const personalizedEntries = suggestions.flatMap((suggestion) => {
            if (!suggestion.cid) return []

            const entry = entriesByCid.get(suggestion.cid as IpfsCidV1)
            if (!entry) return []

            return [{
              entry,
              suggestionReason: suggestion.reason?.trim() || undefined,
            }]
          })

          const personalizedCids = new Set(personalizedEntries.map(({ entry }) => entry.cid))
          const remainingEntries = latestCollection.entries
            .filter((entry) => !personalizedCids.has(entry.cid))
            .map((entry) => ({ entry, suggestionReason: undefined as string | undefined }))

          entries = [...personalizedEntries, ...remainingEntries]
        }
      }

      const enriched = await Promise.all(
        entries.map(async ({ entry, suggestionReason }) => {
          const [statementWithContent, userBelief] = await Promise.all([
            getStatementWithContent(machinery, entry.cid).catch(() => null),
            address
              ? getUserBelief(machinery, address, entry.cid).catch(() => ({ beliefState: 0 }))
              : Promise.resolve({ beliefState: 0 }),
          ])

          const stmt = statementWithContent?.statement ?? null

          return {
            ...entry,
            statement: stmt,
            content: statementWithContent?.content ?? null,
            believerCount: stmt?.believerCount ?? 0,
            disbelieverCount: stmt?.disbelieverCount ?? 0,
            userBeliefState: userBelief?.beliefState ?? 0,
            suggestionReason,
            loading: false,
          }
        }),
      )

      setEnrichedEntries(enriched)
      setLoading(false)
    } catch (err) {
      console.error('Error loading explorer collections:', err)
      setError(err instanceof Error ? err.message : 'Failed to load explorer data')
      setLoading(false)
    }
  }, [machinery, trustedNudgers, address])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  const handleSign = async (cid: IpfsCidV1) => {
    if (!address || !writeClients || !BELIEFS_CONTRACT_ADDRESS) return
    setSigningCid(cid)
    try {
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      }

      const clients = writeClients!

      await believeStatement(clients, beliefsContract, cid)

      setEnrichedEntries((prev) =>
        prev.map((entry) =>
          entry.cid === cid
            ? {
                ...entry,
                userBeliefState: BeliefStates.BELIEVES,
                believerCount: entry.believerCount + 1,
              }
            : entry,
        ),
      )
    } catch (err) {
      console.error('Error signing statement:', err)
    } finally {
      setSigningCid(null)
    }
  }

  const groupedByTopic = enrichedEntries.reduce<Record<string, EnrichedEntry[]>>(
    (groups, entry) => {
      const topic = entry.topicArea || 'Other'
      if (!groups[topic]) groups[topic] = []
      groups[topic].push(entry)
      return groups
    },
    {},
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Explore Causes
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (collections.length === 0) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Explore Causes
        </Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No curated cause collection is available yet, but you can still discover causes without configuring anything: browse public cause statements on Tally, open a statement you care about, then use its cause board link to continue.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            If you want a personalized explorer later, add a trusted explorer nudger in Tally's trust settings.
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'center' }} flexWrap="wrap">
            <Button component="a" href={getDomainUrl('tally', '/statements', { fallbackHref: '/statements' })} variant="contained">
              Browse public cause statements on Tally
            </Button>
            <Button component="a" href={getDomainUrl('tally', '/settings', { fallbackHref: '/settings' })} variant="outlined">
              Configure explorer nudgers
            </Button>
          </Stack>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Explore Causes
      </Typography>

      {!address && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Connect your wallet (top-right button) to sign cause statements and track what you believe.
        </Alert>
      )}

      {enrichedEntries.length < 3 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          The cause map is still sparse while the explorer catches up with new activity. You can use the entries below now, or browse Tally statements for a wider view.
        </Alert>
      )}

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 680 }}>
        Discover funding areas and causes that match your values. Sign statements to express what you care about, or navigate to learn more about any cause.
      </Typography>

      {enrichedEntries.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            The explorer nudger is trusted, but its current cause map is empty. This is normal early in a low-activity launch while the curator waits for enough public statements to build a useful map.
          </Typography>
          <Button component="a" href={getDomainUrl('tally', '/statements', { fallbackHref: '/statements' })} variant="contained" sx={{ mt: 2 }}>
            Browse public cause statements on Tally
          </Button>
        </Paper>
      ) : Object.entries(groupedByTopic).map(([topic, entries]) => (
        <Box key={topic} sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
            {topic}
          </Typography>

          <Stack spacing={2}>
            {entries.map((entry) => (
              <Card key={entry.cid}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {entry.label}
                    </Typography>
                    <Chip
                      label={`${entry.believerCount} supporter${entry.believerCount !== 1 ? 's' : ''}`}
                      color="primary"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  {entry.statement && (
                    <Box sx={{ mb: 2 }}>
                      <StatementRenderer statementCid={entry.cid} content={entry.content} />
                    </Box>
                  )}

                  {entry.suggestionReason && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                      {entry.suggestionReason}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} alignItems="center">
                    {entry.disbelieverCount > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {entry.disbelieverCount} opposed
                      </Typography>
                    )}
                    {entry.userBeliefState === BeliefStates.BELIEVES && (
                      <Chip label="You signed" color="success" size="small" />
                    )}
                    {entry.userBeliefState === BeliefStates.DISBELIEVES && (
                      <Chip label="You opposed" color="error" size="small" />
                    )}
                  </Stack>
                </CardContent>

                <Divider />

                <CardActions>
                  {entry.userBeliefState !== BeliefStates.BELIEVES && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleSign(entry.cid as IpfsCidV1)}
                      disabled={signingCid === entry.cid || !address}
                    >
                      {!address ? 'Connect wallet to sign' : signingCid === entry.cid ? 'Signing...' : 'Sign'}
                    </Button>
                  )}
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/portal/${entry.cid}`}
                  >
                    Open Cause Board
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  )
}
