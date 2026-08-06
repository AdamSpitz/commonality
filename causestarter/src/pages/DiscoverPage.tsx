import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { Link as RouterLink } from 'react-router-dom'
import { browseStatements, type StatementListItem } from '@commonality/sdk/conceptspace'
import { useMachinery } from '../lib/useMachinery'

type SortOption = 'mostSupporters' | 'newest'

export function DiscoverPage() {
  const machinery = useMachinery()
  const [statements, setStatements] = useState<StatementListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('mostSupporters')

  const load = useCallback(async (sort: SortOption) => {
    try {
      setLoading(true)
      setError(null)
      const orderBy = sort === 'mostSupporters' ? 'believerCount' : 'createdAt'
      const items = await browseStatements(machinery, { limit: 40, orderBy })
      setStatements(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load causes')
    } finally {
      setLoading(false)
    }
  }, [machinery])

  useEffect(() => {
    void load(sortBy)
  }, [load, sortBy])

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Discover
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Browse public pledges people are already standing behind. Support one that matches what
          you care about — or start your own if none fit.
        </Typography>
      </Box>

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={sortBy}
        onChange={(_, value: SortOption | null) => {
          if (value) setSortBy(value)
        }}
        sx={{
          '& .MuiToggleButton-root': {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 44,
          },
        }}
      >
        <ToggleButton value="mostSupporters">
          <TrendingUpIcon sx={{ mr: 0.75, fontSize: 18 }} />
          Momentum
        </ToggleButton>
        <ToggleButton value="newest">
          <AccessTimeIcon sx={{ mr: 0.75, fontSize: 18 }} />
          Newest
        </ToggleButton>
      </ToggleButtonGroup>

      {loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
          <Typography variant="body2" sx={{ mt: 1 }}>
            Discover needs the local event indexer (port 42069). Start it with:
          </Typography>
          <Typography
            component="pre"
            variant="caption"
            sx={{
              mt: 1,
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: 'action.hover',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            ./scripts/deploy-causestarter.sh{'\n'}# or: ./scripts/services.sh --start
          </Typography>
          <Button
            size="small"
            onClick={() => void load(sortBy)}
            sx={{ mt: 1.25, textTransform: 'none' }}
          >
            Retry
          </Button>
        </Alert>
      )}

      {!loading && !error && statements.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No public statements yet. Be the first founder — start a cause.
        </Alert>
      )}

      <Stack spacing={1.5}>
        {statements.map((statement) => (
          <Card
            key={statement.cid}
            elevation={0}
            sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <CardActionArea
              component={RouterLink}
              to={`/statement/${statement.cid}`}
              sx={{ alignItems: 'stretch' }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                  <Chip
                    size="small"
                    label={`${statement.believerCount ?? 0} supporters`}
                    color="primary"
                    variant="outlined"
                  />
                  {statement.createdAt && (
                    <Typography variant="caption" color="text.secondary">
                      {new Date(statement.createdAt).toLocaleDateString()}
                    </Typography>
                  )}
                </Stack>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                  {statement.title?.trim() || 'Untitled statement'}
                </Typography>
                {statement.excerpt && statement.excerpt !== statement.title && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.75,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {statement.excerpt}
                  </Typography>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}
