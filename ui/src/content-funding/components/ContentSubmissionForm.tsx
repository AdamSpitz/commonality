import { useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { usePlatformApi } from '../hooks/usePlatformApi'

interface ContentSubmissionFormProps {
  statementCid: IpfsCidV1
}

export function ContentSubmissionForm({ statementCid }: ContentSubmissionFormProps) {
  const { submitContentSubmission, isLoading, error, clearError } = usePlatformApi()
  const [contentUrl, setContentUrl] = useState('')
  const [declaredPerspective, setDeclaredPerspective] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedUrl = contentUrl.trim()
    if (!trimmedUrl) {
      return
    }

    clearError()
    setSuccessMessage(null)

    try {
      await submitContentSubmission({
        contentUrl: trimmedUrl,
        statementCid,
        declaredPerspective: declaredPerspective.trim() || undefined,
      })
      setContentUrl('')
      setDeclaredPerspective('')
      setSuccessMessage('Queued for content-attester review.')
    } catch {
      setSuccessMessage(null)
    }
  }

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Submit Content for Evaluation
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Queue a post, video, or article that should be evaluated against this statement by the content attester.
      </Typography>

      <Stack spacing={2}>
        {successMessage && <Alert severity="success">{successMessage}</Alert>}
        {error && <Alert severity="error">{error.message}</Alert>}

        <TextField
          label="Content URL"
          placeholder="https://x.com/alice/status/123"
          value={contentUrl}
          onChange={(event) => {
            setContentUrl(event.target.value)
            if (successMessage) {
              setSuccessMessage(null)
            }
            if (error) {
              clearError()
            }
          }}
          fullWidth
          required
        />

        <TextField
          label="Perspective"
          placeholder="Optional context for the attester"
          value={declaredPerspective}
          onChange={(event) => setDeclaredPerspective(event.target.value)}
          fullWidth
        />

        <Box>
          <Button type="submit" variant="contained" disabled={isLoading || !contentUrl.trim()}>
            {isLoading ? 'Submitting...' : 'Submit Content'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  )
}
