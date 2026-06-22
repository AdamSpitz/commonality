import { Box, Paper, Typography, Chip, Stack, Divider } from '@mui/material'
import { People, PersonAdd, ThumbUp, ThumbDown, VerifiedUser } from '@mui/icons-material'
import type { TieredHeadCount } from '@commonality/sdk'

interface SupportMetricsProps {
  directBelievers: number
  directDisbelievers: number
  indirectSupporters: number
  /**
   * Tiered head-count over the deduped supporter base (direct + indirect,
   * deduped by anonymized anchor ID). Optional — rendered only when present.
   */
  tieredSupporters?: TieredHeadCount
}

/**
 * Render the tiered head-count string: "N supporters — M with ≥1 attestation."
 *
 * Only the attestation-backed thresholds are shown (per unique-human-id.md
 * caveat #1, the "asserted" tier is a self-claim, not a check, so it is not
 * surfaced as a trust signal). The breakdown line appears only when at least
 * one supporter sits in an attestation-backed tier, so today — before any
 * proof-of-personhood provider is wired up — the UI stays quiet and the
 * headline number never reads as a verified-human count. When providers land
 * (or self-declaration tiers light up), the line appears automatically.
 */
function TieredSupportersLine({ tiered }: { tiered: TieredHeadCount }) {
  if (tiered.oneAttestationOrHigher <= 0) return null

  const parts: string[] = []
  if (tiered.multipleAttestationsOrHigher > 0) {
    parts.push(`${tiered.multipleAttestationsOrHigher.toLocaleString()} with ≥2 attestations`)
  }
  parts.push(`${tiered.oneAttestationOrHigher.toLocaleString()} with ≥1 attestation`)

  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}
    >
      <VerifiedUser fontSize="small" color="action" />
      {`— ${parts.join(', ')}`}
    </Typography>
  )
}

export function SupportMetrics({
  directBelievers,
  directDisbelievers,
  indirectSupporters,
  tieredSupporters,
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
          {tieredSupporters && <TieredSupportersLine tiered={tieredSupporters} />}
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
