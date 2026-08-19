import { useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createBridgePath } from '../lib/bridgeStore'

/**
 * Creates a draft cluster and opens the editor, with no intermediate form.
 *
 * `parentOwner` / `parentSlug` / `parentTitle` prefill natural parent 1 when
 * the bridge was started from a cause page — the editor then loads that
 * parent's roster itself, so the mediator never retypes a cause they arrived
 * from. Without them the editor opens blank, as `/bridge/new` always has.
 */
export function StartBridgeRedirect() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const parentOwner = searchParams.get('parentOwner') ?? ''
  const parentSlug = searchParams.get('parentSlug') ?? ''
  const parentTitle = searchParams.get('parentTitle') ?? ''

  useEffect(() => {
    navigate(
      createBridgePath({ owner: parentOwner, slug: parentSlug, title: parentTitle }),
      { replace: true },
    )
  }, [navigate, parentOwner, parentSlug, parentTitle])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} data-testid="start-bridge-redirect">
      <CircularProgress size={28} />
    </Box>
  )
}
