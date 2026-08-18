import { Box, FormLabel, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import {
  ALIGNMENT_FILTERS,
  ALIGNMENT_FILTER_LABELS,
  type AlignmentFilter,
} from './alignmentFilter'

interface AlignmentFilterToggleProps {
  value: AlignmentFilter
  onChange: (filter: AlignmentFilter) => void
}

/** Settings control: show every aligned project, or only directly vouched ones. */
export function AlignmentFilterToggle({ value, onChange }: AlignmentFilterToggleProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <FormLabel id="alignment-filter-label" sx={{ display: 'block', mb: 0.5 }}>
        Alignment
      </FormLabel>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Include projects vouched against related statements, or only those vouched
        against this statement itself.
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, next: AlignmentFilter | null) => {
          if (next) onChange(next)
        }}
        aria-labelledby="alignment-filter-label"
      >
        {ALIGNMENT_FILTERS.map((filter) => (
          <ToggleButton key={filter} value={filter}>
            {ALIGNMENT_FILTER_LABELS[filter]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}
