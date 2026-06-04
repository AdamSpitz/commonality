import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { getStatementSupportingContent, getContentSubjectId, type IpfsCidV1, type StatementSupportingContentRecord } from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { getRuntimeConfigValue } from '../../shared/runtimeConfig'
import { useTrustedContentAttesters } from '../../shared/hooks/useTrustedContentAttesters'
import { ContentAttestationSummary } from '../../content-funding/components/ContentAttestationSummary'
import type { ContentAttestationInfo } from '../../content-funding/hooks/useContentFundingState'

interface StatementSupportingContentProps {
  statementCid: IpfsCidV1
}

function toAttestationInfo(canonicalId: string, record: StatementSupportingContentRecord): ContentAttestationInfo[] {
  const subjectId = getContentSubjectId(canonicalId)
  return [...record.noninflammatoryAttestations, ...record.supportAttestations].map((attestation) => ({
    canonicalId,
    subjectId,
    attested: attestation.attested,
    attester: attestation.attester,
    statementCid: attestation.statementCid,
  }))
}

export function StatementSupportingContent({ statementCid }: StatementSupportingContentProps) {
  const machinery = useMachinery()
  const trustedContentAttesters = useTrustedContentAttesters()
  const trustedAddresses = useMemo(() => trustedContentAttesters.map(attester => attester.address), [trustedContentAttesters])
  const [records, setRecords] = useState<StatementSupportingContentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const result = await getStatementSupportingContent(machinery, statementCid, {
          noninflammatoryTopicCid: getRuntimeConfigValue('VITE_NONINFLAMMATORY_TOPIC_CID') as IpfsCidV1 | undefined,
          trustedAttesters: trustedAddresses.length > 0 ? trustedAddresses : undefined,
        })
        if (!cancelled) setRecords(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load supporting content')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [machinery, statementCid, trustedAddresses])

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Noninflammatory writeups supporting this statement
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        These content items have both a civility attestation and a separate attestation that they actually argue for this statement.
      </Typography>

      {loading && <CircularProgress size={24} />}
      {error && <Alert severity="warning">{error}</Alert>}
      {!loading && !error && records.length === 0 && (
        <Typography variant="body2" color="text.secondary">No attested supporting writeups yet.</Typography>
      )}
      <Stack spacing={1}>
        {records.map((record) => {
          const canonicalId = record.contentItem.canonicalId
          return (
            <Card key={record.contentItem.contentId.toString()} variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                  <Chip label="Noninflammatory" color="success" size="small" />
                  <Chip label="Supports statement" color="primary" size="small" />
                  {record.contentItem.status === 'released' && <Chip label="Released" size="small" variant="outlined" />}
                </Stack>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mb: 1 }}>
                  {canonicalId}
                </Typography>
                <ContentAttestationSummary attestations={toAttestationInfo(canonicalId, record)} />
              </CardContent>
            </Card>
          )
        })}
      </Stack>
    </Box>
  )
}
