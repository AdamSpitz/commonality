import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import { createGraphQLExecutor, executeQuery } from '@commonality/sdk'

interface StatementListItem {
  id: string
  cid: string | null
  statementType: string | null
  title: string | null
  excerpt: string | null
  believerCount: number
  disbelieverCount: number
  createdAt: string | null
}

type SortOption = 'mostSupporters' | 'newest'

export function BrowseStatementsPage() {
  const [statements, setStatements] = useState<StatementListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('mostSupporters')

  const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'

  const loadStatements = async (sort: SortOption) => {
    try {
      setLoading(true)
      setError(null)

      const executor = createGraphQLExecutor(GRAPHQL_URL)

      const queryName = sort === 'mostSupporters'
        ? 'browseStatementsByMostSupporters'
        : 'browseStatementsByNewest'

      const result = await executeQuery<{ [key: string]: StatementListItem[] }>(
        executor,
        `
          query BrowseStatements($options: BrowseStatementsOptions) {
            ${queryName}(options: $options) {
              id
              cid
              statementType
              title
              excerpt
              believerCount
              disbelieverCount
              createdAt
            }
          }
        `,
        { options: { limit: 50 } }
      )

      setStatements(result[queryName] || [])
      setLoading(false)
    } catch (err) {
      console.error('Error loading statements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statements')
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatements(sortBy)
  }, [sortBy])

  const handleSortChange = (_: React.MouseEvent<HTMLElement>, newSort: SortOption | null) => {
    if (newSort !== null) {
      setSortBy(newSort)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown date'
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return 'Unknown date'
    }
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Browse Statements
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Sort by:
          </Typography>
          <ToggleButtonGroup
            value={sortBy}
            exclusive
            onChange={handleSortChange}
            size="small"
          >
            <ToggleButton value="mostSupporters">
              <TrendingUpIcon sx={{ mr: 1 }} />
              Most Supporters
            </ToggleButton>
            <ToggleButton value="newest">
              <NewReleasesIcon sx={{ mr: 1 }} />
              Newest
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && statements.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No statements found. Be the first to create one!
          </Typography>
        </Paper>
      )}

      {!loading && !error && statements.length > 0 && (
        <Stack spacing={2}>
          {statements.map((statement) => (
            <Card key={statement.id}>
              <CardActionArea
                component={RouterLink}
                to={`/statement/${statement.id}`}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {statement.title || 'Untitled Statement'}
                    </Typography>
                    <Chip
                      label={`${statement.believerCount} supporter${statement.believerCount !== 1 ? 's' : ''}`}
                      color="primary"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  {statement.excerpt && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {statement.excerpt}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={2} alignItems="center">
                    {statement.statementType && (
                      <Chip
                        label={statement.statementType}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(statement.createdAt)}
                    </Typography>
                    {statement.disbelieverCount > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {statement.disbelieverCount} disbeliever{statement.disbelieverCount !== 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  )
}
