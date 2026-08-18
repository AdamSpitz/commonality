import { useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { createBridgePath } from '../lib/bridgeStore'

export function StartBridgeRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(createBridgePath(), { replace: true })
  }, [navigate])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} data-testid="start-bridge-redirect">
      <CircularProgress size={28} />
    </Box>
  )
}
