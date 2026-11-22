import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useAccount } from 'wagmi'
import { PublishedDataAbi } from '@commonality/sdk/abis'
import { publishDocumentToPublishedData } from '@commonality/sdk/displayable-documents'
import {
  buildWorkPledgeDocument,
  buildWorkSkillRequestDocument,
  loadVolunteerDiscovery,
  skillMatches,
  splitByTrust,
  type VolunteerDiscoveryKind,
  type VolunteerDiscoveryRecord,
  type VolunteerDiscoveryTiers,
} from '@commonality/sdk/volunteer-discovery'
import { useMachinery, useWriteClients } from '../../shared'
import { copyableAnnouncement, matchSummary, recordLabel } from './volunteerDiscoveryCopy'

interface Props {
  statementCids: string[]
  /** Viewer network, or the operator seed when the viewer has none. Includes the viewer. */
  trustedAuthors?: ReadonlySet<string>
}

const EMPTY: VolunteerDiscoveryTiers = { inNetwork: [], others: [] }

function RecordList({ records }: { records: VolunteerDiscoveryRecord[] }) {
  if (records.length === 0) {
    return <Typography variant="body2" color="text.secondary">Nothing here yet.</Typography>
  }
  return (
    <Stack spacing={1}>
      {records.map((record) => (
        <Box key={`${record.author}:${record.cid}`}>
          <Typography variant="body2">
            {recordLabel(record)} {record.skills.join(', ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">{record.note}</Typography>
        </Box>
      ))}
    </Stack>
  )
}

function Tier({ title, countLabel, records }: { title: string; countLabel: string; records: VolunteerDiscoveryRecord[] }) {
  return (
    <Box>
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="caption" color="text.secondary" data-testid={`${title}-count`}>{countLabel}</Typography>
      <Box sx={{ mt: 1 }}><RecordList records={records} /></Box>
    </Box>
  )
}

/**
 * Work-pledges and work-requests for these statements, split by the trust graph.
 * Headline numbers count the first tier only. Contact and notifications are out of scope.
 */
export function VolunteerDiscoverySection({ statementCids, trustedAuthors }: Props) {
  const machinery = useMachinery()
  const { address } = useAccount()
  const writeClients = useWriteClients(address)
  const cidsKey = statementCids.join('\0')
  const [tiers, setTiers] = useState<VolunteerDiscoveryTiers>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<VolunteerDiscoveryKind>('commonality.work-pledge')
  const [skills, setSkills] = useState('')
  const [note, setNote] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const cids = cidsKey.split('\0').filter(Boolean)
    loadVolunteerDiscovery(machinery, cids)
      .then((records) => {
        if (!cancelled) setTiers(splitByTrust(records, trustedAuthors ?? new Set()))
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load work-pledges.')
      })
    return () => { cancelled = true }
  }, [machinery, cidsKey, trustedAuthors, reloadKey])

  const matches = useMemo(() => skillMatches(tiers.inNetwork), [tiers])
  const headline = `${tiers.inNetwork.length} in your network, ${tiers.others.length} others`

  const publish = useCallback(async () => {
    if (!writeClients) return
    const publishedData = machinery.contractAddresses?.publishedData
    if (!publishedData) {
      setError('PublishedData contract is not configured.')
      return
    }
    const statementCid = cidsKey.split('\0').find(Boolean)
    if (!statementCid) return
    const input = { statementCid, skills: skills.split(','), note }
    const document = kind === 'commonality.work-pledge'
      ? buildWorkPledgeDocument(input)
      : buildWorkSkillRequestDocument(input)
    setPublishing(true)
    setError(null)
    try {
      await publishDocumentToPublishedData(writeClients, { address: publishedData, abi: PublishedDataAbi }, document)
      setSkills('')
      setNote('')
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish.')
    } finally {
      setPublishing(false)
    }
  }, [writeClients, machinery, cidsKey, skills, note, kind])

  const copyAnnouncement = useCallback(async () => {
    if (matches.length === 0) return
    await navigator.clipboard.writeText(matches.map(copyableAnnouncement).join('\n'))
    setCopied(true)
  }, [matches])

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} data-testid="volunteer-discovery">
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">People and skills</Typography>
          <Typography variant="body2" color="text.secondary">{headline}</Typography>
        </Box>

        {matches.length > 0 && (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            {matches.map((match) => (
              <Chip key={match.skill} label={matchSummary(match)} size="small" data-testid="skill-match" />
            ))}
            <Button size="small" onClick={() => void copyAnnouncement()} data-testid="copy-announcement">
              {copied ? 'Copied' : 'Copy announcement'}
            </Button>
          </Stack>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Tier
          title="In your network"
          countLabel={`${tiers.inNetwork.length} in your network`}
          records={tiers.inNetwork}
        />
        <Tier
          title="Others"
          countLabel={`${tiers.others.length} others`}
          records={tiers.others}
        />

        <Stack spacing={1} data-testid="volunteer-discovery-form">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={kind}
            onChange={(_, value: VolunteerDiscoveryKind | null) => { if (value) setKind(value) }}
          >
            <ToggleButton value="commonality.work-pledge">I can help</ToggleButton>
            <ToggleButton value="commonality.work-request-for-skill">I need someone</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            size="small"
            label="Skills"
            placeholder="grant writing, design"
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            helperText="A few short skills, separated by commas."
          />
          <TextField
            size="small"
            label="Note"
            placeholder="One line about how you'd help, or what you need."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Box>
            <Button
              variant="contained"
              disabled={!writeClients || publishing || !skills.trim() || !note.trim()}
              onClick={() => void publish()}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  )
}
