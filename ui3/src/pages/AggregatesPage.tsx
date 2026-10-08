import { useState } from 'react'
import {
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import {
  aggregateReadiness,
  createAggregate,
  listAggregates,
  listCauses,
} from '../lib/causeModel'

export function AggregatesPage() {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [tick, setTick] = useState(0)
  void tick
  const aggregates = listAggregates()
  const causes = listCauses()

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <Stack spacing={2.5} data-testid="aggregates-page">
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Aggregates
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Causes can be aggregated and supported in aggregate — think tranches in finance.
          Bundle related causes so members can back a set at once.
        </Typography>
      </Stack>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25 }}>
          New bundle
        </Typography>
        <Stack spacing={1.25}>
          <TextField
            size="small"
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            size="small"
            fullWidth
            label="Summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          {causes.length > 0 && (
            <FormGroup>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                Include causes (optional)
              </Typography>
              {causes.map((c) => (
                <FormControlLabel
                  key={c.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={selected.includes(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                  }
                  label={c.title}
                />
              ))}
            </FormGroup>
          )}
          <Button
            variant="contained"
            disabled={!title.trim()}
            onClick={() => {
              createAggregate(title, summary, selected)
              setTitle('')
              setSummary('')
              setSelected([])
              setTick((n) => n + 1)
            }}
            sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none', fontWeight: 700, minHeight: 40 }}
          >
            Create aggregate
          </Button>
          {causes.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Tip: launch causes first, then bundle them here.
            </Typography>
          )}
        </Stack>
      </Paper>

      {aggregates.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No aggregates yet.</Typography>
      ) : (
        <Stack spacing={1.25}>
          {aggregates.map((agg) => {
            const ready = aggregateReadiness(agg)
            return (
              <Paper
                key={agg.id}
                component={RouterLink}
                to={`/aggregate/${agg.id}`}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>{agg.title}</Typography>
                {agg.summary && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {agg.summary}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                  {ready.causeCount} cause{ready.causeCount === 1 ? '' : 's'}
                  {' · '}
                  {ready.goalsPublished}/{ready.goalsTotal} goals published
                  {ready.goalsPublished > 0 ? ' · ready to support' : ''}
                </Typography>
              </Paper>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
