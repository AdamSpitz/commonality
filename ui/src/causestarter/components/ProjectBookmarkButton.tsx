import { useCallback, useEffect, useState } from 'react'
import { IconButton, Tooltip } from '@mui/material'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import { useAccount } from 'wagmi'
import { useParams } from 'react-router-dom'
import { tryParseChainAddressRef } from '@ui/shared'
import {
  bookmarkProject,
  hydrateProjectBookmarks,
  isProjectBookmarked,
  persistProjectBookmarks,
  unbookmarkProject,
} from '../lib/projectBookmarks'
import { useMachinery, useWriteClients } from '../../shared'

export function ProjectBookmarkButton() {
  const { projectAddress } = useParams<{ projectAddress: string }>()
  const parsed = tryParseChainAddressRef(projectAddress)
  const address = parsed?.address
  const { address: wallet } = useAccount()
  const machinery = useMachinery()
  const writeClients = useWriteClients(wallet)
  const [kept, setKept] = useState(() => (address ? isProjectBookmarked(address) : false))

  useEffect(() => {
    if (!wallet || !address) return
    let cancelled = false
    void hydrateProjectBookmarks(machinery, wallet).then(() => {
      if (!cancelled) setKept(isProjectBookmarked(address))
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [machinery, wallet, address])

  const toggle = useCallback(() => {
    if (!address) return
    const next = kept ? unbookmarkProject(address) : bookmarkProject(address)
    setKept(next.includes(address.toLowerCase()))
    if (writeClients) void persistProjectBookmarks(writeClients).catch(() => undefined)
  }, [address, kept, writeClients])

  if (!address) return null

  return (
    <Tooltip title={kept ? 'Remove bookmark' : 'Bookmark this project'}>
      <IconButton
        data-testid={kept ? 'project-unbookmark' : 'project-bookmark'}
        onClick={toggle}
        aria-label={kept ? 'Remove bookmark' : 'Bookmark'}
        aria-pressed={kept}
        sx={{ color: kept ? 'primary.main' : 'text.secondary' }}
      >
        {kept ? <BookmarkIcon /> : <BookmarkBorderIcon />}
      </IconButton>
    </Tooltip>
  )
}
