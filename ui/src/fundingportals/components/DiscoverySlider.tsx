import { Box, FormLabel, Slider, Typography } from '@mui/material'
import {
  DISCOVERY_LEVELS,
  DISCOVERY_LEVEL_INDEX,
  DISCOVERY_INDEX_LEVEL,
  DISCOVERY_LEVEL_LABELS,
  type DiscoveryLevel,
} from './discoveryLevels'

const MARKS = DISCOVERY_LEVELS.map(level => ({
  value: DISCOVERY_LEVEL_INDEX[level],
  label: DISCOVERY_LEVEL_LABELS[level],
}))

interface DiscoverySliderProps {
  value: DiscoveryLevel
  onChange: (level: DiscoveryLevel) => void
  /** Disable the control (e.g. when the viewer is not signed in). */
  disabled?: boolean
}

/**
 * A three-stop slider that loosens the trust-graph filter on a cause-board view:
 * "My network" → "+1 hop" → "Anyone". Surfaces new vouchers the viewer might want
 * to add to their network, turning trust-graph maintenance into a byproduct of browsing.
 */
export function DiscoverySlider({ value, onChange, disabled }: DiscoverySliderProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <FormLabel id="discovery-slider-label" sx={{ display: 'block', mb: 0.5 }}>
        Discovery
      </FormLabel>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        How far beyond your direct trust network to look for success vouches.
      </Typography>
      <Slider
        aria-labelledby="discovery-slider-label"
        value={DISCOVERY_LEVEL_INDEX[value]}
        onChange={(_, index) => onChange(DISCOVERY_INDEX_LEVEL[index as number])}
        disabled={disabled}
        min={0}
        max={2}
        step={null}
        marks={MARKS}
        track={false}
        sx={{ maxWidth: 360 }}
      />
      {disabled && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Sign in and build a trust network to filter by who you trust.
        </Typography>
      )}
    </Box>
  )
}
