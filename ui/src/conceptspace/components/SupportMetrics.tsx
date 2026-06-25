import { Box, Paper, Typography, Chip, Stack, Divider } from '@mui/material'
import { People, PersonAdd, ThumbUp, ThumbDown, VerifiedUser, HowToReg } from '@mui/icons-material'
import type { TieredHeadCount } from '@commonality/sdk/identity'

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
 * Render the tiered head-count breakdown lines.
 *
 * Two lines, each shown only when its tier has supporters:
 *
 *   1. **Asserted (tier 1)** — "N claimed one account." This is a *self-claim*
 *      by each account, not a check by Commonality or anyone else (per
 *      unique-human-id.md caveat #1: tiers 0–1 provide essentially no real
 *      Sybil-resistance). The line is labelled "claimed" and carries a caption
 *      stating it is not verified, so the headline never reads as a verified
 *      human count. This is what lights up first, before any proof-of-personhood
 *      provider is wired up, to make the "sign once, we union your signatures"
 *      pitch demonstrable.
 *   2. **Attestation-backed (tier ≥ 2)** — "M with ≥1 attestation" (and "K with
 *      ≥2 attestations" when present). Only these thresholds carry real
 *      Sybil-resistance, so they are surfaced as a separate trust signal.
 */
function TieredSupportersLine({ tiered }: { tiered: TieredHeadCount }) {
  const hasAsserted = tiered.assertedOrHigher > 0
  const hasAttestations = tiered.oneAttestationOrHigher > 0
  if (!hasAsserted && !hasAttestations) return null

  return (
    <Box sx={{ mt: 1 }}>
      {hasAsserted && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HowToReg fontSize="small" color="action" />
          {`— ${tiered.assertedOrHigher.toLocaleString()} claimed this is their one account`}
        </Typography>
      )}
      {hasAttestations && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: hasAsserted ? 0.5 : 0 }}
        >
          <VerifiedUser fontSize="small" color="action" />
          {`— ${buildAttestationBreakdown(tiered)}`}
        </Typography>
      )}
      {hasAsserted && (
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
          “Claimed” is a self-assertion by each account, not something Commonality
          has checked. It does not prove unique humans.
        </Typography>
      )}
    </Box>
  )
}

function buildAttestationBreakdown(tiered: TieredHeadCount): string {
  const parts: string[] = []
  if (tiered.multipleAttestationsOrHigher > 0) {
    parts.push(`${tiered.multipleAttestationsOrHigher.toLocaleString()} with ≥2 attestations`)
  }
  parts.push(`${tiered.oneAttestationOrHigher.toLocaleString()} with ≥1 attestation`)
  return parts.join(', ')
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
