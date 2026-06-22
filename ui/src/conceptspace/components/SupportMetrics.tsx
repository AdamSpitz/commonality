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
            Total Supporters (direct signers + indirect supporters)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Direct signers signed this exact statement. Indirect supporters signed a different statement that your trusted implication sources say entails this one.
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

        {/* Direct Signers */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Signed this statement
          </Typography>
          <Chip
            icon={<ThumbUp />}
            label={`${directBelievers} signer${directBelievers !== 1 ? 's' : ''}`}
            color="success"
            variant="outlined"
          />
        </Box>

        {/* Indirect Supporters */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Also support this (via related statements)
          </Typography>
          <Chip
            icon={<PersonAdd />}
            label={`${indirectSupporters} indirect supporter${indirectSupporters !== 1 ? 's' : ''}`}
            color="info"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            People who signed related statements that imply this one; implication edges come from your trusted statement-connection sources.
          </Typography>
        </Box>

        {/* Opposing Signers */}
        {directDisbelievers > 0 && (
          <>
            <Divider />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Opposed this statement
              </Typography>
              <Chip
                icon={<ThumbDown />}
                label={`${directDisbelievers} opposing signer${directDisbelievers !== 1 ? 's' : ''}`}
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
