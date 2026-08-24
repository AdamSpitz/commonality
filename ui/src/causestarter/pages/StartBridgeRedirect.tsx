import { useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createBridgePath } from '../lib/bridgeStore'

/**
 * StrictMode remounts this redirect in development, and `useState`/`useRef`
 * reset on that remount. Seeded drafts now persist immediately, so a second
 * `createBridgePath` would leave an extra Untitled bridge on the parent cause.
 * Reuse a mint from the same seed if it happened in the last half-second.
 */
let lastSeededMint: { key: string; path: string; at: number } | null = null

export function seededBridgePath(seed: { owner: string; slug: string; title: string }): string {
  const key = `${seed.owner}\0${seed.slug}\0${seed.title}`
  const now = Date.now()
  if (lastSeededMint && lastSeededMint.key === key && now - lastSeededMint.at < 500) {
    return lastSeededMint.path
  }
  const path = createBridgePath(seed)
  lastSeededMint = { key, path, at: now }
  return path
}

/** Test helper: forget the StrictMode reuse window. */
export function resetSeededBridgePathReuse(): void {
  lastSeededMint = null
}

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
      seededBridgePath({ owner: parentOwner, slug: parentSlug, title: parentTitle }),
      { replace: true },
    )
  }, [navigate, parentOwner, parentSlug, parentTitle])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} data-testid="start-bridge-redirect">
      <CircularProgress size={28} />
    </Box>
  )
}
