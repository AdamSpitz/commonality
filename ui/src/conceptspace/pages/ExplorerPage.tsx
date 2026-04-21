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
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  getCuratedCollections,
  getStatement,
  getUserBelief,
  believeStatement,
  BeliefsAbi,
  type CuratedCollectionEntry,
  type FoldedCuratedCollection,
  type Statement,
  type StatementWithContent,
  type IpfsCidV1,
  type BeliefsContract,
  type TestClients,
  BeliefStates,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedNudgers } from '../../shared/hooks/useTrustedNudgers'
import { StatementRenderer } from '../components/StatementRenderer'

const EXPLORER_STREAM = 'fundable-project-explorer'

interface EnrichedEntry extends CuratedCollectionEntry {
  statement: Statement | null
  content: StatementWithContent['content']
  believerCount: number
  disbelieverCount: number
  userBeliefState: number
  loading: boolean
}

export function ExplorerPage() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
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
        trustedNudgers,
        EXPLORER_STREAM,
      )

      setCollections(collections)

      if (collections.length === 0) {
        setEnrichedEntries([])
        setLoading(false)
        return
      }

      const latestCollection = collections[0]
      const entries = latestCollection.entries

      const enriched = await Promise.all(
        entries.map(async (entry) => {
          const [stmt, userBelief] = await Promise.all([
            getStatement(machinery, entry.cid).catch(() => null),
            address
              ? getUserBelief(machinery, address, entry.cid).catch(() => ({ beliefState: 0 }))
              : Promise.resolve({ beliefState: 0 }),
          ])

          return {
            ...entry,
            statement: stmt,
            content: null,
            believerCount: stmt?.believerCount ?? 0,
            disbelieverCount: stmt?.disbelieverCount ?? 0,
            userBeliefState: userBelief?.beliefState ?? 0,
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
    if (!address || !walletClient || !publicClient || !BELIEFS_CONTRACT_ADDRESS) return
    setSigningCid(cid)
    try {
      const beliefsContract: BeliefsContract = {
        address: BELIEFS_CONTRACT_ADDRESS,
        abi: BeliefsAbi,
      }

      const clients: TestClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

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
          <Typography variant="body1" color="text.secondary">
            No curated collection is available yet. Check back later or browse statements directly.
          </Typography>
          <Button component={RouterLink} to="/statements" sx={{ mt: 2 }}>
            Browse Statements
          </Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Explore Causes
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 680 }}>
        Discover funding areas and causes that match your values. Sign statements to express what you care about, or navigate to learn more about any cause.
      </Typography>

      {Object.entries(groupedByTopic).map(([topic, entries]) => (
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
                      <StatementRenderer
                        statementCid={entry.cid}
                        content={entry.content}
                      />
                    </Box>
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
                      {signingCid === entry.cid ? 'Signing...' : 'Sign'}
                    </Button>
                  )}
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/statement/${entry.cid}`}
                  >
                    Navigate
                  </Button>
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/portal/${entry.cid}`}
                  >
                    Funding Portal
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
