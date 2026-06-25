import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material'
import { HowToReg, CheckCircle, Cancel } from '@mui/icons-material'
import { useAccount } from 'wagmi'
import { AccountAssertionsAbi } from '@commonality/sdk/abis'
import { assertSingleAccount, revokeAssertion, getAccountAssertion } from '@commonality/sdk/identity'
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync'
import { useMachinery } from '../../../shared'
import { useWriteClients } from '../../../shared'

/**
 * Settings section for the tier-0/1 proof-of-personhood self-declaration.
 *
 * An account publicly asserts "this is my one Commonality account," which moves
 * it from tier 0 → 1 in the tiered head-count model. This is a *self-claim*, not
 * a check by Commonality — copy throughout reads "assert"/"claim," never "we
 * verified," per specs/tech/shared/unique-human-id.md caveat #1.
 */
export function SingleAccountAssertionSection() {
  const { address, isConnected } = useAccount()
  const machinery = useMachinery()
  const writeClients = useWriteClients(address)

  const [asserted, setAsserted] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const contractAddress = import.meta.env.VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS as
    | `0x${string}`
    | undefined

  const loadStatus = useCallback(async () => {
    if (!address) {
      setAsserted(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    let cancelled = false
    try {
      const isAsserted = await getAccountAssertion(machinery, address)
      if (!cancelled) setAsserted(isAsserted)
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Failed to load assertion status')
      }
    } finally {
      if (!cancelled) setLoading(false)
    }
    return () => { cancelled = true }
  }, [address, machinery])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleAssert = async () => {
    setError(null)
    setSuccessMessage(null)
    if (!isConnected || !address || !writeClients) {
      setError('Please connect your wallet first')
      return
    }
    if (!contractAddress) {
      setError('Account assertions contract not configured (VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS)')
      return
    }
    setProcessing(true)
    try {
      const txHash = await assertSingleAccount(writeClients, {
        address: contractAddress,
        abi: AccountAssertionsAbi,
      })
      await waitForIndexerToSyncToTxHash(machinery, writeClients.publicClient, txHash)
      setAsserted(true)
      setSuccessMessage('Assertion recorded onchain')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record assertion')
    } finally {
      setProcessing(false)
    }
  }

  const handleRevoke = async () => {
    setError(null)
    setSuccessMessage(null)
    if (!isConnected || !address || !writeClients) {
      setError('Please connect your wallet first')
      return
    }
    if (!contractAddress) {
      setError('Account assertions contract not configured (VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS)')
      return
    }
    setProcessing(true)
    try {
      const txHash = await revokeAssertion(writeClients, {
        address: contractAddress,
        abi: AccountAssertionsAbi,
      })
      await waitForIndexerToSyncToTxHash(machinery, writeClients.publicClient, txHash)
      setAsserted(false)
      setSuccessMessage('Assertion revoked')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke assertion')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HowToReg /> Single-Account Assertion
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Publicly assert that this is your one Commonality account. When you do,
        signature counts on statements can show that you claimed one account —
        making the “sign once, we union your signatures” pitch honest before any
        proof-of-personhood provider is wired up.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        This is a <strong>self-claim</strong>, not a check. Commonality does not
        verify that one account equals one human. The tier-1 (“asserted”) count
        is labelled as a claim everywhere it appears.
      </Alert>

      {!isConnected ? (
        <Alert severity="info">Connect your wallet to make a single-account assertion.</Alert>
      ) : !contractAddress ? (
        <Alert severity="warning">
          The account-assertions contract is not configured for this environment.
        </Alert>
      ) : (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {loading ? (
              <CircularProgress size={18} />
            ) : asserted ? (
              <>
                <CheckCircle color="success" fontSize="small" />
                <Typography variant="body2">
                  You have asserted this is your one Commonality account.
                </Typography>
              </>
            ) : (
              <>
                <Cancel color="disabled" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  You have not asserted this is your one account.
                </Typography>
              </>
            )}
          </Box>

          {asserted ? (
            <Button
              variant="outlined"
              color="error"
              onClick={handleRevoke}
              disabled={processing || loading}
              startIcon={processing ? <CircularProgress size={16} /> : undefined}
            >
              Revoke assertion
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleAssert}
              disabled={processing || loading}
              startIcon={processing ? <CircularProgress size={16} /> : <HowToReg />}
            >
              Assert this is my one account
            </Button>
          )}
        </Box>
      )}
    </Paper>
  )
}
