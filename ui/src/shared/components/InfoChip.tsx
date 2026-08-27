import type { ReactNode } from 'react'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Box, Chip, IconButton, Tooltip, type ChipProps } from '@mui/material'

/** Shared trailing-info-icon look. Change here to restyle every explainer chip/label. */
export const INFO_HINT_ICON_SX = {
  fontSize: '1.05em',
  ml: 0.25,
  opacity: 0.85,
} as const

function TrailingInfoIcon() {
  return <InfoOutlinedIcon aria-hidden sx={INFO_HINT_ICON_SX} />
}

type InfoChipProps = Omit<ChipProps, 'icon' | 'deleteIcon' | 'title'> & {
  /** Tooltip explaining the chip. */
  title: ReactNode
}

/**
 * Chip with a trailing circled-i and a tooltip. Use this instead of a raw Chip
 * whenever the label needs an explanation.
 */
export function InfoChip({ title, label, ...chipProps }: InfoChipProps) {
  return (
    <Tooltip title={title}>
      <Chip
        {...chipProps}
        label={(
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
            {label}
            <TrailingInfoIcon />
          </Box>
        )}
      />
    </Tooltip>
  )
}

/** Icon-only header tip (section titles). Same circled-i as InfoChip/InfoLabel. */
export function HeaderInfoTip({
  title,
  label,
}: {
  title: string
  label: string
}) {
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        aria-label={label}
        sx={{ ml: 0.25, color: 'text.secondary' }}
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}

/** Inline text + trailing circled-i + tooltip (for non-chip labels like “No minimum”). */
export function InfoLabel({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Tooltip title={title}>
      <Box
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
      >
        {children}
        <TrailingInfoIcon />
      </Box>
    </Tooltip>
  )
}
