import { useState, useEffect } from 'react'
import { Box, Typography, Chip, Paper } from '@mui/material'
import { getHighProfileSigners, type HighProfileSigner, type IpfsCidV1 } from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
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

  // Don't render anything if no high-profile signers or still loading
  if (!loaded || signers.length === 0) return null

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
                  <span>{signer.ensName || signer.twitterHandle ? `@${signer.twitterHandle}` : `${signer.address.slice(0, 8)}...`}</span>
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
