import { useEffect, useState } from 'react'
import { Box, CircularProgress, Link, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { listCauses, type CauseDraft } from '../lib/causeStore'
import { loadClusterDocument, resolveClusterCid, type BridgeClusterFields } from '../lib/bridgeCluster'
import { useMachinery } from '../../shared'
import { ClusterMediatorOptIn } from '../components/ClusterMediatorOptIn'

interface MediatorBridge {
  cause: CauseDraft
  fields: BridgeClusterFields
  path: string
}

/**
 * Lists all bridges created by a specific mediator address.
 */
export function MediatorPage() {
  const params = useParams<{ address: string }>()
  const machinery = useMachinery()
  const [bridges, setBridges] = useState<MediatorBridge[]>([])
  const [loading, setLoading] = useState(true)
  const [mediatorName, setMediatorName] = useState<string>('')

  useEffect(() => {
    const address = params.address?.toLowerCase()
    if (!address) return

    let cancelled = false
    void (async () => {
      try {
        const causes = listCauses()
        const mediatorBridges: MediatorBridge[] = []

        for (const cause of causes) {
          if (!cause.bridgeCluster) continue

          try {
            const clusterCid = await resolveClusterCid(
              machinery,
              cause.bridgeCluster.clusterOwner,
              cause.bridgeCluster.clusterSlug,
            )
            if (cancelled || !clusterCid) continue

            const loaded = await loadClusterDocument(machinery, clusterCid)
            if (cancelled || !loaded) continue

            if (loaded.fields.mediatorAddress?.toLowerCase() !== address) continue

            if (!mediatorName && loaded.fields.mediatorName) {
              setMediatorName(loaded.fields.mediatorName)
            }

            mediatorBridges.push({
              cause,
              fields: loaded.fields,
              path: `/bridge/${cause.bridgeCluster.clusterOwner}/${encodeURIComponent(cause.bridgeCluster.clusterSlug)}`,
            })
          } catch (err) {
            console.error('Failed to load bridge for cause:', cause.id, err)
          }
        }

        if (!cancelled) {
          setBridges(mediatorBridges)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load mediator bridges:', err)
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [params.address, machinery]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          Mediator
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}>
          {mediatorName || 'Mediator'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {params.address}
        </Typography>
      </Box>

      {bridges[0] && <ClusterMediatorOptIn fields={bridges[0].fields} />}

      {bridges.length === 0 ? (
        <Typography color="text.secondary">No bridges found for this mediator.</Typography>
      ) : (
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Bridges ({bridges.length})
          </Typography>
          {bridges.map((bridge) => (
            <Paper key={bridge.path} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Stack spacing={1}>
                <Link component={RouterLink} to={bridge.path} variant="h6" sx={{ fontWeight: 700, textDecoration: 'none' }}>
                  Bridge cluster
                </Link>
                {bridge.fields.mediatorNote && (
                  <Typography variant="body2" color="text.secondary">
                    {bridge.fields.mediatorNote}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  For: {bridge.cause.title}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
