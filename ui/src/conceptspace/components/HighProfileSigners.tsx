import { useState, useEffect } from 'react'
import { Box, Typography, Chip, Paper } from '@mui/material'
import { getHighProfileSigners, type HighProfileSigner, type IpfsCidV1 } from '@commonality/sdk'
import { useMachinery } from '../../shared'
import { useNavigate } from 'react-router-dom'

interface HighProfileSignersProps {
  statementCid: IpfsCidV1
  minFollowers?: number
}

function formatFollowerCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

function formatFollowerCountShort(count: number): string {
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`
  return String(count)
}

export function HighProfileSigners({ statementCid, minFollowers = 10000 }: HighProfileSignersProps) {
  const machinery = useMachinery()
  const navigate = useNavigate()
  const [signers, setSigners] = useState<HighProfileSigner[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getHighProfileSigners(machinery, statementCid, { minFollowers })
      .then((result) => {
        setSigners(result)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [machinery, statementCid, minFollowers])

  // Show empty state message when loaded but no high-profile signers
  if (loaded && signers.length === 0) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          High-Profile Supporters
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            No high-profile supporters yet. If you can get someone with {formatFollowerCountShort(minFollowers)}+ Twitter followers to sign this statement and link their account, they'll show up here!
          </Typography>
        </Paper>
      </Box>
    )
  }

  // Show nothing while loading
  if (!loaded) return null

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        High-Profile Supporters
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {signers.map((signer) => (
            <Chip
              key={signer.address}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{signer.twitterHandle ? `@${signer.twitterHandle}` : signer.ensName || `${signer.address.slice(0, 8)}...`}</span>
                  {signer.followerCount != null && (
                    <Typography variant="caption" color="text.secondary">
                      ({formatFollowerCount(signer.followerCount)} followers)
                    </Typography>
                  )}
                </Box>
              }
              variant="outlined"
              color="primary"
              onClick={() => {
                if (signer.twitterHandle) {
                  window.open(`https://x.com/${signer.twitterHandle}`, '_blank')
                } else {
                  navigate(`/user/${signer.address}`)
                }
              }}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  )
}
