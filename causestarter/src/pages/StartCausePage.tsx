import { useState } from 'react'
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { createCause } from '../lib/causeStore'

/**
 * Starting a cause is one step, because there is nothing to commit to yet.
 *
 * A cause is a set of single-issue planks, each published separately whenever
 * it's ready, so there is no main statement to author up front and no launch to
 * stage. This page only mints the cause and hands the founder to its page,
 * where the issues are written, edited, and published in place. The description
 * is kept as a seed for suggesting issues — it is never published, and never
 * displayed as page content.
 */
export function StartCausePage() {
  const navigate = useNavigate()
  const [seed, setSeed] = useState('')

  const handleCreate = () => {
    const cause = createCause(seed)
    navigate(`/cause/${cause.id}`)
  }

  return (
    <Stack spacing={2.5} data-testid="start-cause-page">
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>Start a cause</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Describe what your cause is about. Next you'll turn it into clear issues people can
          support one at a time — and you can change them whenever you like.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2}>
          <TextField
            label="Describe your cause in your own words"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            multiline
            minRows={3}
            autoFocus
            fullWidth
            slotProps={{ htmlInput: { 'data-testid': 'start-cause-goal' } }}
            helperText="A rough description is fine — it is only used to suggest issues, and is never published."
          />
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', borderRadius: 999, px: 3 }}
            data-testid="start-cause-continue"
          >
            Continue
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
