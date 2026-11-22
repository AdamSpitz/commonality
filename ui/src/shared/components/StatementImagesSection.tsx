import { useEffect, useState } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import type { PolicyRuntimeSnapshot } from '@commonality/sdk/policy-lists'
import {
  adoptStatementImage,
  believingAdoptionPointers,
  loadSignerImageAdoptions,
  loadStatementImageWall,
  mosaicTiles,
  revokeStatementImage,
  statementImageCidHiddenByPolicy,
  type AdoptionPointer,
  type MosaicTile,
} from '@commonality/sdk/statement-images'
import { loadOptionalPolicyBundle } from '../config/policyBundle'
import { getUserBeliefs } from '@commonality/sdk/conceptspace'
import { bytes32ToCid, cidToBytes32, type IpfsCidV1 } from '@commonality/sdk/utils'
import { getRuntimeConfigValue } from '../config/runtimeConfig'
import { useMachinery } from '../hooks/useMachinery'
import { useWriteClients } from '../hooks/useWriteClients'
import { AddressDisplay } from './AddressDisplay'

export type StatementImagePixels = 'never' | 'wall' | 'own'

interface StatementImagesSectionProps {
  statementCid?: string
  signer?: string
  /** never: CID text only. wall: attested mosaic. own: this signer's files, no safety gate. */
  pixels: StatementImagePixels
  sentence?: string
  allowAdopt?: boolean
}

function imageCid(imageId: string): string {
  try {
    return bytes32ToCid(imageId as `0x${string}`)
  } catch {
    return imageId
  }
}

function gatewayImageSrc(cid: string): string | null {
  const gateway = getRuntimeConfigValue('VITE_IPFS_GATEWAY')
  if (!gateway) return null
  return `${gateway.replace(/\/+$/, '')}/ipfs/${cid}`
}

function RevokeButton({
  pointer,
  onRevoked,
  onError,
}: {
  pointer: AdoptionPointer
  onRevoked: () => void
  onError: (message: string) => void
}) {
  const machinery = useMachinery()
  const writeClients = useWriteClients()
  if (!writeClients) return null
  return (
    <Button
      size="small"
      sx={{ textTransform: 'none' }}
      onClick={() => {
        const contract = machinery.contractAddresses?.statementImages
        if (!contract) return
        void revokeStatementImage(
          writeClients,
          { address: contract },
          pointer.statementId as `0x${string}`,
          pointer.imageId as `0x${string}`,
        )
          .then((txHash) => writeClients.publicClient.waitForTransactionReceipt({ hash: txHash }))
          .then((receipt) => {
            if (receipt.status !== 'success') throw new Error('Revoke transaction reverted')
            onRevoked()
          })
          .catch((err: unknown) => onError(err instanceof Error ? err.message : 'Failed to revoke'))
      }}
    >
      Revoke
    </Button>
  )
}

function AdoptCidForm({
  statementCid,
  onAdopted,
}: {
  statementCid: string
  onAdopted: () => void
}) {
  const machinery = useMachinery()
  const writeClients = useWriteClients()
  const [cid, setCid] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    const contract = machinery.contractAddresses?.statementImages
    if (!writeClients || !contract) {
      setError('Wallet is not ready yet')
      return
    }
    let imageId: `0x${string}`
    try {
      imageId = cidToBytes32(cid.trim())
    } catch {
      setError('Paste a CIDv1 you already published. This site does not upload files.')
      return
    }
    setBusy(true)
    try {
      const txHash = await adoptStatementImage(
        writeClients,
        { address: contract },
        cidToBytes32(statementCid),
        imageId,
      )
      const receipt = await writeClients.publicClient.waitForTransactionReceipt({ hash: txHash })
      if (receipt.status !== 'success') throw new Error('Adoption transaction reverted')
      setCid('')
      onAdopted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adopt image')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1} data-testid="statement-image-adopt">
      <TextField
        size="small"
        label="Image CID you already published"
        value={cid}
        onChange={(event) => setCid(event.target.value)}
        helperText="No file upload. Publish the picture yourself, then paste its CID."
      />
      <Button size="small" variant="outlined" disabled={busy || cid.trim() === ''} onClick={() => void submit()} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
        {busy ? 'Adopting…' : 'Adopt this CID'}
      </Button>
      {error && <Alert severity="warning">{error}</Alert>}
    </Stack>
  )
}

export function StatementImagesSection({
  statementCid,
  signer,
  pixels,
  sentence,
  allowAdopt = false,
}: StatementImagesSectionProps) {
  const machinery = useMachinery()
  const { address } = useAccount()
  const [pointers, setPointers] = useState<AdoptionPointer[]>([])
  const [tiles, setTiles] = useState<MosaicTile[]>([])
  const [believes, setBelieves] = useState(false)
  const [showAdopt, setShowAdopt] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const policyUrl = getRuntimeConfigValue('VITE_POLICY_BUNDLE_URL')
  const [policyReady, setPolicyReady] = useState(!policyUrl)
  const [policySnapshot, setPolicySnapshot] = useState<PolicyRuntimeSnapshot | undefined>()

  const contract = machinery.contractAddresses?.statementImages
  const attester = getRuntimeConfigValue('VITE_MOSAIC_SAFETY_ATTESTER')
  const showWallPixels = pixels === 'wall' && Boolean(attester)
  const showOwnPixels = pixels === 'own'

  useEffect(() => {
    if (!policyUrl) {
      setPolicySnapshot(undefined)
      setPolicyReady(true)
      return
    }
    let cancelled = false
    setPolicyReady(false)
    void loadOptionalPolicyBundle().then((snapshot) => {
      if (cancelled) return
      setPolicySnapshot(snapshot)
      setPolicyReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [policyUrl])

  useEffect(() => {
    if (!contract || (!statementCid && !signer)) return
    let cancelled = false
    setError(null)
    void (async () => {
      try {
        if (statementCid) {
          const wall = await loadStatementImageWall(machinery, statementCid as IpfsCidV1)
          if (cancelled) return
          setPointers(believingAdoptionPointers(wall))
          setTiles(attester ? mosaicTiles({ ...wall, attester }) : [])
          const mine = address?.toLowerCase()
          setBelieves(Boolean(mine && wall.beliefs[mine] === 1))
          return
        }
        if (!signer) return
        const [adoptions, beliefs] = await Promise.all([
          loadSignerImageAdoptions(machinery, signer as `0x${string}`),
          getUserBeliefs(machinery, signer),
        ])
        if (cancelled) return
        const beliefRecord: Record<string, number> = {}
        const byStatement = new Map(beliefs.map((belief) => [belief.cid.toLowerCase(), 1]))
        const visible = adoptions.filter((adoption: { adopted: boolean; statementId: string; signer: string }) => {
          if (!adoption.adopted) return false
          let cid = ''
          try {
            cid = bytes32ToCid(adoption.statementId as `0x${string}`).toLowerCase()
          } catch {
            return false
          }
          return byStatement.get(cid) === 1
        })
        for (const adoption of visible) beliefRecord[adoption.signer.toLowerCase()] = 1
        setPointers(believingAdoptionPointers({ beliefs: beliefRecord, adoptions: visible }))
        setTiles([])
        setBelieves(false)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load image pointers')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [address, attester, contract, machinery, reloadKey, signer, statementCid])

  if (!contract || (!statementCid && !signer)) return null

  const renderPointer = (pointer: AdoptionPointer) => {
    const cid = imageCid(pointer.imageId)
    const hidden = statementImageCidHiddenByPolicy(policySnapshot, cid)
    const mayFetchPixels = policyReady && (showWallPixels || showOwnPixels) && !hidden
    const src = mayFetchPixels ? gatewayImageSrc(cid) : null
    const mine = address?.toLowerCase() === pointer.signer
    return (
      <Box key={`${pointer.signer}:${pointer.statementId}:${pointer.imageId}`} data-testid="statement-image-pointer">
        {src ? (
          <Box
            component="img"
            src={src}
            alt=""
            sx={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 1, display: 'block' }}
          />
        ) : null}
        <AddressDisplay address={pointer.signer} />
        <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }} data-testid="statement-image-cid">
          {cid}
        </Typography>
        {sentence && src && (
          <Typography variant="body2">{sentence}</Typography>
        )}
        {!statementCid && (
          <Button component={RouterLink} to={`/statement/${imageCid(pointer.statementId)}`} sx={{ px: 0, textTransform: 'none' }}>
            Statement
          </Button>
        )}
        {mine && (
          <RevokeButton pointer={pointer} onRevoked={() => setReloadKey((key) => key + 1)} onError={setError} />
        )}
      </Box>
    )
  }

  const wallTiles = showWallPixels
    ? tiles.flatMap((tile) => {
      const cid = imageCid(tile.imageId)
      if (policyReady && statementImageCidHiddenByPolicy(policySnapshot, cid)) return []
      return [{
        signer: tile.signers[0] ?? '',
        statementId: tile.statementId,
        imageId: tile.imageId,
        extraSigners: Math.max(0, tile.signers.length - 1),
      }]
    })
    : []

  return (
    <Stack spacing={1.25} data-testid="statement-images" sx={{ mt: 2 }}>
      <Typography variant="h6" component="h2">Picture pointers</Typography>
      <Typography variant="body2" color="text.secondary">
        {pixels === 'never'
          ? 'This site does not upload, pin, or fetch these files. A line is only the content address a signer adopted.'
          : 'Pictures appear only from a gateway this site configured. Commonality does not upload or pin them.'}
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {showWallPixels && wallTiles.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5 }} data-testid="statement-image-mosaic">
          {wallTiles.map((tile) => (
            <Box key={tile.imageId}>
              {renderPointer(tile)}
              {tile.extraSigners > 0 && (
                <Typography variant="caption">{tile.extraSigners + 1} signers</Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
      {!(showWallPixels && wallTiles.length > 0) && pointers.map(renderPointer)}
      {allowAdopt && believes && !showAdopt && (
        <Button size="small" onClick={() => setShowAdopt(true)} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
          Attach a CID you already published
        </Button>
      )}
      {allowAdopt && believes && showAdopt && statementCid && (
        <AdoptCidForm statementCid={statementCid} onAdopted={() => setReloadKey((key) => key + 1)} />
      )}
    </Stack>
  )
}
