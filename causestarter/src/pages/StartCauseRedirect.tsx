import { useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { createCausePath } from '../lib/causeStore'

/**
 * Legacy `/start` entry: create a draft and open its editor. There is no
 * intermediate start form — founders land on the cause page immediately.
 */
export function StartCauseRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(createCausePath(), { replace: true })
  }, [navigate])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} data-testid="start-cause-redirect">
      <CircularProgress size={28} />
    </Box>
  )
}
