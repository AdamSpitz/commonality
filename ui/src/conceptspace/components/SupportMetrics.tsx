import { Box, Paper, Typography, Chip, Stack, Divider } from '@mui/material'
import { People, PersonAdd, ThumbUp, ThumbDown } from '@mui/icons-material'

interface SupportMetricsProps {
  directBelievers: number
  directDisbelievers: number
  indirectSupporters: number
}

export function SupportMetrics({
  directBelievers,
  directDisbelievers,
  indirectSupporters,
}: SupportMetricsProps) {
  const totalSupporters = directBelievers + indirectSupporters

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <People /> Support Metrics
      </Typography>

      <Stack spacing={2} sx={{ mt: 2 }}>
        {/* Total Supporters */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Supporters (Direct + Indirect)
          </Typography>
          <Chip
            icon={<People />}
            label={`${totalSupporters} supporter${totalSupporters !== 1 ? 's' : ''}`}
            color="primary"
            size="medium"
            sx={{ fontSize: '1rem', py: 2.5 }}
          />
        </Box>

        <Divider />

        {/* Direct Believers */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Direct Believers
          </Typography>
          <Chip
            icon={<ThumbUp />}
            label={`${directBelievers} direct believer${directBelievers !== 1 ? 's' : ''}`}
            color="success"
            variant="outlined"
          />
        </Box>

        {/* Indirect Supporters */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Indirect Supporters
          </Typography>
          <Chip
            icon={<PersonAdd />}
            label={`${indirectSupporters} indirect supporter${indirectSupporters !== 1 ? 's' : ''}`}
            color="info"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            People who believe statements that imply this one
          </Typography>
        </Box>

        {/* Direct Disbelievers */}
        {directDisbelievers > 0 && (
          <>
            <Divider />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Direct Disbelievers
              </Typography>
              <Chip
                icon={<ThumbDown />}
                label={`${directDisbelievers} disbeliever${directDisbelievers !== 1 ? 's' : ''}`}
                color="error"
                variant="outlined"
              />
            </Box>
          </>
        )}
      </Stack>
    </Paper>
  )
}
