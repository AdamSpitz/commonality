import { useEffect, useState } from 'react'
import { Box, CircularProgress, Link, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { listCauses } from '../lib/causeStore'
import { listBridges } from '../lib/bridgeStore'
import { loadClusterDocument, resolveClusterCid, type BridgeClusterFields } from '../lib/bridgeCluster'
import { useMachinery } from '../../shared'
import { ClusterMediatorOptIn } from '../components/ClusterMediatorOptIn'

interface MediatorBridge {
  causeTitle?: string
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
    setLoading(true)
    setBridges([])
    setMediatorName('')
    if (!address) {
      setLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const candidates = new Map<string, { owner: string; slug: string; causeTitle?: string }>()
        for (const cause of listCauses()) {
          if (!cause.bridgeCluster) continue
          const { clusterOwner: owner, clusterSlug: slug } = cause.bridgeCluster
          candidates.set(`${owner.toLowerCase()}/${slug}`, { owner, slug, causeTitle: cause.title })
        }
        for (const bridge of listBridges()) {
          if (!bridge.founderAddress || !bridge.slug || !bridge.clusterCid) continue
          const key = `${bridge.founderAddress.toLowerCase()}/${bridge.slug}`
          if (!candidates.has(key)) candidates.set(key, { owner: bridge.founderAddress, slug: bridge.slug })
        }
        const mediatorBridges: MediatorBridge[] = []
        let name = ''

        for (const candidate of candidates.values()) {
          try {
            const clusterCid = await resolveClusterCid(
              machinery,
              candidate.owner,
              candidate.slug,
            )
            if (cancelled || !clusterCid) continue

            const loaded = await loadClusterDocument(machinery, clusterCid)
            if (cancelled || !loaded) continue

            if (loaded.fields.mediatorAddress?.toLowerCase() !== address) continue

            if (!name) name = loaded.fields.mediatorName

            mediatorBridges.push({
              causeTitle: candidate.causeTitle,
              fields: loaded.fields,
              path: `/bridge/${candidate.owner}/${encodeURIComponent(candidate.slug)}`,
            })
          } catch (err) {
            console.error('Failed to load bridge:', candidate.slug, err)
          }
        }

        if (!cancelled) {
          setBridges(mediatorBridges)
          setMediatorName(name)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load mediator bridges:', err)
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [params.address, machinery])

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
                {bridge.causeTitle && <Typography variant="caption" color="text.secondary">
                  For: {bridge.causeTitle}
                </Typography>}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
