import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import {
  fetchEncryptedTestData,
  testDataEnvironment,
  testDataRegistryUrl,
  type TestDataRegistry,
} from '../testData/testDataDocuments'

export function TestDataAdminPage() {
  const [search] = useSearchParams()
  const capability = search.get('key') ?? ''
  const [registry, setRegistry] = useState<TestDataRegistry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const environment = testDataEnvironment()
  const registryUrl = testDataRegistryUrl()

  useEffect(() => {
    if (environment === 'disabled' || !capability || !registryUrl) return
    let cancelled = false
    void fetchEncryptedTestData<TestDataRegistry>(registryUrl, capability)
      .then(value => { if (!cancelled) setRegistry(value) })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => { cancelled = true }
  }, [capability, environment, registryUrl])

  if (environment === 'disabled') return <Alert severity="error">Test-data administration is disabled on mainnet.</Alert>
  if (!capability) return <Alert severity="info">Open the bookmarked admin capability URL to view test-data runs.</Alert>
  if (!registryUrl) return <Alert severity="warning">No test-data registry is configured for this testnet build.</Alert>
  if (error) return <Alert severity="error">{error}</Alert>
  if (!registry) return <Typography>Loading test-data runs…</Typography>

  return (
    <Stack spacing={3} data-testid="test-data-admin-page">
      <Box>
        <Typography variant="h4" component="h1">Test-data runs</Typography>
        <Typography color="text.secondary">
          An operator-only view of generated activity. Newest runs appear first.
        </Typography>
      </Box>
      {registry.runs.length === 0 ? <Alert severity="info">No generated runs have been recorded yet.</Alert> : null}
      {registry.runs.map(run => (
        <Card key={run.runId} variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography variant="h6">{new Date(run.createdAt).toLocaleString()}</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  <Chip size="small" label={run.network} />
                  <Chip size="small" label={`${run.userCount} fake users`} />
                  <Chip size="small" label={`${run.actionCount} actions`} />
                  <Chip size="small" label={`chain ${run.chainId}`} />
                </Stack>
              </Box>
              <Button
                component={RouterLink}
                to={`/admin/test-data/${encodeURIComponent(run.runId)}?key=${encodeURIComponent(capability)}`}
                variant="contained"
              >
                Open run
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
