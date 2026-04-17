import { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, CardActionArea, Chip, Alert, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  getStatementSuggestions,
  type IpfsCidV1,
  type StatementSuggestion,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedNudgers } from '../../shared/hooks/useTrustedNudgers'

interface StatementSuggestionsProps {
  statementCid: IpfsCidV1;
}

export function StatementSuggestions({ statementCid }: StatementSuggestionsProps) {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<StatementSuggestion[]>([])
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
        const data = await getStatementSuggestions(machinery, statementCid, nudgers)
        setSuggestions(data)
      } catch (err) {
        console.error('Error loading statement suggestions:', err)
        setError(err instanceof Error ? err.message : 'Failed to load suggestions')
      } finally {
        setLoading(false)
      }
    }

    loadSuggestions()
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
        These statements are related to the current statement and have more supporters
      </Typography>

      {suggestions.map((suggestion, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardActionArea onClick={() => navigate(`/statement/${suggestion.statement.cid}`)}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                <Chip
                  label={suggestion.relationshipType === 'implies' ? 'Implied by this' : 'Implies this'}
                  size="small"
                  color={suggestion.relationshipType === 'implies' ? 'primary' : 'secondary'}
                />
                <Chip
                  label={`${suggestion.statement.believerCount} supporters`}
                  size="small"
                  variant="outlined"
                />
              </Box>

              <Typography variant="h6" sx={{ mb: 1 }}>
                {suggestion.statement.title || 'Untitled Statement'}
              </Typography>

              {suggestion.statement.excerpt && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {suggestion.statement.excerpt}
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
