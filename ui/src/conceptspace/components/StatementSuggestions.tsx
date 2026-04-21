import { useState, useEffect, useCallback } from 'react'
import { Box, Typography, Card, CardContent, CardActionArea, Chip, Alert, CircularProgress, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useNavigate } from 'react-router-dom'
import {
  getStatementNudges,
  getStatementWithContent,
  type FoldedNudge,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedNudgers } from '../../shared/hooks/useTrustedNudgers'
import { useNudgeIntensity } from '../../shared/hooks/useNudgeIntensity'
import { useMutedTopics } from '../../shared/hooks/useMutedTopics'
import { dismissNudge, getDismissedNudges } from '../../shared/nudgeStore'

interface StatementSuggestionsProps {
  statementCid: IpfsCidV1;
}

interface NudgeSuggestionCard {
  statementCid: IpfsCidV1;
  title: string;
  excerpt: string;
  believerCount: number;
  reason: string;
  confidence: number;
  nudger: `0x${string}`;
  topic?: string;
}

const MAX_NUDGES_BY_INTENSITY: Record<string, number> = {
  low: 3,
  medium: 5,
  high: 10,
}

function getStatementPreview(content: string | undefined): { title: string; excerpt: string } {
  const normalized = content?.trim() ?? ''
  if (!normalized) {
    return {
      title: '',
      excerpt: '',
    }
  }

  const [firstLine] = normalized.split('\n')
  return {
    title: firstLine?.trim().slice(0, 200) ?? '',
    excerpt: normalized.slice(0, 200),
  }
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}% confidence`
}

function formatNudgerAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

async function buildSuggestionCard(
  machinery: ReturnType<typeof useMachinery>,
  nudge: FoldedNudge,
): Promise<NudgeSuggestionCard | null> {
  const suggestion = await getStatementWithContent(machinery, nudge.suggestedStatementCid).catch(() => null)
  if (!suggestion) {
    return null
  }

  const preview = getStatementPreview(suggestion.content?.content)
  const topic = suggestion.content?.extras?.topic as string | undefined
  return {
    statementCid: nudge.suggestedStatementCid,
    title: preview.title,
    excerpt: preview.excerpt,
    believerCount: suggestion.statement.believerCount,
    reason: nudge.reason,
    confidence: nudge.confidence,
    nudger: nudge.nudger,
    topic: topic?.toLowerCase(),
  }
}

export function StatementSuggestions({ statementCid }: StatementSuggestionsProps) {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<NudgeSuggestionCard[]>([])
  const [nudges, setNudges] = useState<FoldedNudge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const machinery = useMachinery()
  const trustedNudgers = useTrustedNudgers()
  const { intensity } = useNudgeIntensity()
  const { mutedTopics } = useMutedTopics()

  const loadSuggestions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const dismissed = await getDismissedNudges()
      const dismissedSet = new Set(
        dismissed.map((d) => `${d.targetStatementCid}::${d.suggestedStatementCid}::${d.nudger.toLowerCase()}`),
      )

      const nudgers = trustedNudgers.length > 0 ? trustedNudgers.map((e) => e.address) : undefined
      const allNudges = await getStatementNudges(machinery, statementCid, nudgers)

      const filteredNudges = allNudges.filter(
        (nudge) => !dismissedSet.has(`${nudge.targetStatementCid}::${nudge.suggestedStatementCid}::${nudge.nudger.toLowerCase()}`),
      )

      setNudges(filteredNudges)

      const cards = await Promise.all(filteredNudges.map((nudge) => buildSuggestionCard(machinery, nudge)))
      const allCards = cards.filter((card): card is NudgeSuggestionCard => card !== null)

      const topicFiltered = mutedTopics.length > 0
        ? allCards.filter((card) => !card.topic || !mutedTopics.includes(card.topic))
        : allCards

      setSuggestions(topicFiltered)
    } catch (err) {
      console.error('Error loading statement nudges:', err)
      setError(err instanceof Error ? err.message : 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }, [statementCid, machinery, trustedNudgers, mutedTopics])

  useEffect(() => {
    void loadSuggestions()
  }, [loadSuggestions])

  const handleDismiss = async (nudge: FoldedNudge) => {
    await dismissNudge(nudge.targetStatementCid, nudge.suggestedStatementCid, nudge.nudger)
    setNudges((prev) => prev.filter((n) => n.suggestedStatementCid !== nudge.suggestedStatementCid || n.nudger !== nudge.nudger))
    setSuggestions((prev) => prev.filter((s) => s.statementCid !== nudge.suggestedStatementCid))
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    )
  }

  const maxNudges = MAX_NUDGES_BY_INTENSITY[intensity] ?? MAX_NUDGES_BY_INTENSITY.low
  const visibleSuggestions = suggestions.slice(0, maxNudges)

  if (visibleSuggestions.length === 0) {
    return null
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Suggested Statements
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Trusted nudgers published these suggestions for this statement
      </Typography>

      {visibleSuggestions.map((suggestion) => {
        const nudge = nudges.find(
          (n) => n.suggestedStatementCid === suggestion.statementCid && n.nudger === suggestion.nudger,
        )
        return (
          <Card key={`${suggestion.nudger}-${suggestion.statementCid}`} sx={{ mb: 2, position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  if (nudge) {
                    void handleDismiss(nudge)
                  }
                }}
                aria-label="Dismiss suggestion"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <CardActionArea onClick={() => navigate(`/statement/${suggestion.statementCid}`)}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={formatConfidence(suggestion.confidence)}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={`${suggestion.believerCount} supporters`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Nudger ${formatNudgerAddress(suggestion.nudger)}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Typography variant="h6" sx={{ mb: 1 }}>
                  {suggestion.title || 'Untitled Statement'}
                </Typography>

                {suggestion.excerpt && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {suggestion.excerpt}
                  </Typography>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {suggestion.reason}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        )
      })}
    </Box>
  )
}
