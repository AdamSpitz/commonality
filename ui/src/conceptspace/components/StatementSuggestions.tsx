import { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, CardActionArea, Chip, Alert, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  getStatementNudges,
  getStatementWithContent,
  type FoldedNudge,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedNudgers } from '../../shared/hooks/useTrustedNudgers'

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
  return {
    statementCid: nudge.suggestedStatementCid,
    title: preview.title,
    excerpt: preview.excerpt,
    believerCount: suggestion.statement.believerCount,
    reason: nudge.reason,
    confidence: nudge.confidence,
    nudger: nudge.nudger,
  }
}

export function StatementSuggestions({ statementCid }: StatementSuggestionsProps) {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<NudgeSuggestionCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const machinery = useMachinery()
  const trustedNudgers = useTrustedNudgers()

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        setLoading(true)
        setError(null)

        const nudgers = trustedNudgers.length > 0 ? trustedNudgers : undefined
        const nudges = await getStatementNudges(machinery, statementCid, nudgers)
        const cards = await Promise.all(nudges.map((nudge) => buildSuggestionCard(machinery, nudge)))
        setSuggestions(cards.filter((card): card is NudgeSuggestionCard => card !== null))
      } catch (err) {
        console.error('Error loading statement nudges:', err)
        setError(err instanceof Error ? err.message : 'Failed to load suggestions')
      } finally {
        setLoading(false)
      }
    }

    void loadSuggestions()
  }, [statementCid, machinery, trustedNudgers])

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

  if (suggestions.length === 0) {
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

      {suggestions.map((suggestion) => (
        <Card key={`${suggestion.nudger}-${suggestion.statementCid}`} sx={{ mb: 2 }}>
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
      ))}
    </Box>
  )
}
