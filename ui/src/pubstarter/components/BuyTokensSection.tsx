import { Paper, Typography, Stack, Box, TextField, Button, Alert, FormControlLabel, Switch, MenuItem, Select, FormControl, InputLabel, CircularProgress } from '@mui/material'
import { useWalletClient, usePublicClient } from 'wagmi'
import type { Project, ProjectToken, TestClients, AssuranceContract, Note } from '@commonality/sdk'
import { AssuranceContractAbi, buyProjectTokens, getNotesByOwner, getDelegationChain, purchaseFromPrimaryMarketWithNotes, DelegatableNotesAbi } from '@commonality/sdk'
import { useState, useEffect } from 'react'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { formatCurrencyAmount } from '../../shared/currency'

interface BuyTokensSectionProps {
  project: Project
  tokens: ProjectToken[]
  address: string | undefined
  onProjectRefresh: () => void
  tokenImages?: Record<string, string>
}

function getDelegatableNotesContract() {
  const addr = import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: DelegatableNotesAbi }
}

export function BuyTokensSection({ project, tokens, address, onProjectRefresh, tokenImages = {} }: BuyTokensSectionProps) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const machinery = useMachinery()

  // Direct purchase state
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [buySuccess, setBuySuccess] = useState<string | null>(null)

  // "Fund with delegatable note" state
  const [useNote, setUseNote] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string>('')
  const [noteQuantities, setNoteQuantities] = useState<Record<string, string>>({})

  const delegatableNotesEnabled = !!getDelegatableNotesContract()

  useEffect(() => {
    if (useNote && address && notes.length === 0) {
      loadNotes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNote, address])

  const loadNotes = async () => {
    if (!address) return
    try {
      setNotesLoading(true)
      const allNotes = await getNotesByOwner(machinery, address)
      // Only ETH notes (token === address(0)) for now
      const ethNotes = allNotes.filter(n =>
        n.active && n.token === '0x0000000000000000000000000000000000000000'
      )
      setNotes(ethNotes)
    } catch (err) {
      console.error('Error loading notes:', err)
    } finally {
      setNotesLoading(false)
    }
  }

  const handleQuantityChange = (tokenId: string, value: string) => {
    setQuantities(prev => ({ ...prev, [tokenId]: value }))
  }

  const handleNoteQuantityChange = (tokenId: string, value: string) => {
    setNoteQuantities(prev => ({ ...prev, [tokenId]: value }))
  }

  const getClients = (): TestClients | null => {
    if (!walletClient || !publicClient || !address) return null
    return {
      walletClient: walletClient as any,
      publicClient: publicClient as any,
      account: address as `0x${string}`,
    }
  }

  const handleBuy = async () => {
    if (!walletClient || !publicClient || !address) {
      setBuyError('Wallet is not ready. Please reconnect your wallet and try again.')
      return
    }

    const tokenIds: bigint[] = []
    const tokenCounts: bigint[] = []
    let totalCost = 0n

    for (const token of tokens) {
      const qty = parseInt(quantities[token.tokenId] || '0', 10)
      if (qty > 0) {
        tokenIds.push(BigInt(token.tokenId))
        tokenCounts.push(BigInt(qty))
        totalCost += BigInt(qty) * BigInt(token.price)
      }
    }

    if (tokenIds.length === 0) {
      setBuyError('Please enter a quantity for at least one token')
      return
    }

    try {
      setBuying(true)
      setBuyError(null)
      setBuySuccess(null)

      const assuranceContract: AssuranceContract = {
        address: project.id as `0x${string}`,
        abi: AssuranceContractAbi,
      }

      const clients: TestClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address as `0x${string}`,
      }

      await buyProjectTokens(clients, assuranceContract, {
        buyer: address as `0x${string}`,
        tokenAddress: project.erc1155Address as `0x${string}`,
        tokenIds,
        tokenCounts,
        totalCost,
      })

      setBuySuccess('Tokens purchased successfully!')
      setQuantities({})
      onProjectRefresh()
    } catch (err) {
      console.error('Error buying tokens:', err)
      setBuyError(err instanceof Error ? err.message : 'Failed to buy tokens')
    } finally {
      setBuying(false)
    }
  }

  const handleBuyWithNote = async () => {
    const clients = getClients()
    const contract = getDelegatableNotesContract()
    if (!clients || !contract || !selectedNoteId) return

    const selectedNote = notes.find(n => n.id === selectedNoteId)
    if (!selectedNote) return

    const tokenIds: bigint[] = []
    const tokenCounts: bigint[] = []
    let totalCost = 0n

    for (const token of tokens) {
      const qty = parseInt(noteQuantities[token.tokenId] || '0', 10)
      if (qty > 0) {
        tokenIds.push(BigInt(token.tokenId))
        tokenCounts.push(BigInt(qty))
        totalCost += BigInt(qty) * BigInt(token.price)
      }
    }

    if (tokenIds.length === 0) {
      setBuyError('Please enter a quantity for at least one token')
      return
    }

    if (totalCost > BigInt(selectedNote.amount)) {
      setBuyError('Insufficient note balance for this purchase')
      return
    }

    try {
      setBuying(true)
      setBuyError(null)
      setBuySuccess(null)

      // Get delegation chain for the note (leaf-first, root-last for the contract)
      const chain = await getDelegationChain(machinery, selectedNoteId)
      const owners = chain
        .sort((a, b) => b.position - a.position)
        .map(link => link.address as `0x${string}`)

      await purchaseFromPrimaryMarketWithNotes(clients, contract, {
        noteIds: [BigInt(selectedNoteId)],
        chains: [owners],
        paymentAmount: totalCost,
        primaryMarket: project.id as `0x${string}`,
        erc1155Contract: project.erc1155Address as `0x${string}`,
        tokenIds,
        counts: tokenCounts,
      })

      setBuySuccess('Tokens purchased successfully via delegatable note!')
      setNoteQuantities({})
      setSelectedNoteId('')
      onProjectRefresh()
    } catch (err) {
      console.error('Error buying tokens with note:', err)
      setBuyError(err instanceof Error ? err.message : 'Failed to buy tokens with note')
    } finally {
      setBuying(false)
    }
  }

  const selectedNote = notes.find(n => n.id === selectedNoteId)
  const fundingCurrency = project.fundingCurrency
  const noteTotalCost = tokens.reduce((sum, token) => {
    const qty = parseInt(noteQuantities[token.tokenId] || '0', 10)
    return sum + BigInt(qty) * BigInt(token.price)
  }, 0n)
  const noteBalanceSufficient = selectedNote ? noteTotalCost <= BigInt(selectedNote.amount) : true

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Buy Tokens
      </Typography>

      {delegatableNotesEnabled && (
        <FormControlLabel
          control={
            <Switch
              checked={useNote}
              onChange={(e) => {
                setUseNote(e.target.checked)
                setBuyError(null)
                setBuySuccess(null)
              }}
            />
          }
          label="Fund with delegatable note"
          sx={{ mb: 2 }}
        />
      )}

      <Stack spacing={2}>
        {useNote ? (
          <>
            {notesLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Loading your notes…</Typography>
              </Box>
            ) : notes.length === 0 ? (
              <Alert severity="info">
                You have no active ETH delegatable notes. Deposit ETH on the <a href="/notes/new">Notes page</a> to create one.
              </Alert>
            ) : (
              <>
                <FormControl size="small" sx={{ minWidth: 300 }}>
                  <InputLabel>Select Note</InputLabel>
                  <Select
                    value={selectedNoteId}
                    label="Select Note"
                    onChange={(e) => setSelectedNoteId(e.target.value)}
                  >
                    {notes.map(note => (
                      <MenuItem key={note.id} value={note.id}>
                        Note #{note.id} — {formatCurrencyAmount(note.amount, fundingCurrency)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {tokens.map((token) => (
                  <Box key={token.tokenId} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {tokenImages[token.tokenId] && (
                      <Box
                        component="img"
                        src={tokenImages[token.tokenId]}
                        alt={`Token #${token.tokenId}`}
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    <Typography variant="body1" sx={{ minWidth: 120 }}>
                      Token #{token.tokenId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                      {formatCurrencyAmount(token.price, token.currency)} each
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      label="Quantity"
                      value={noteQuantities[token.tokenId] || ''}
                      onChange={(e) => handleNoteQuantityChange(token.tokenId, e.target.value)}
                      inputProps={{ min: 0 }}
                      sx={{ width: 120 }}
                    />
                  </Box>
                ))}

                {noteTotalCost > 0n && (
                  <Box>
                    <Typography variant="body2">
                      Total cost: {formatCurrencyAmount(noteTotalCost, fundingCurrency)}
                    </Typography>
                    {selectedNote && !noteBalanceSufficient && (
                      <Typography variant="caption" color="error">
                        Exceeds note balance ({formatCurrencyAmount(selectedNote.amount, fundingCurrency)})
                      </Typography>
                    )}
                  </Box>
                )}

                <Button
                  variant="contained"
                  onClick={handleBuyWithNote}
                  disabled={buying || !selectedNoteId || !noteBalanceSufficient || noteTotalCost === 0n}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {buying ? 'Buying…' : 'Buy with Note'}
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            {tokens.map((token) => (
              <Box key={token.tokenId} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {tokenImages[token.tokenId] && (
                  <Box
                    component="img"
                    src={tokenImages[token.tokenId]}
                    alt={`Token #${token.tokenId}`}
                    sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                  />
                )}
                <Typography variant="body1" sx={{ minWidth: 120 }}>
                  Token #{token.tokenId}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                  {formatCurrencyAmount(token.price, token.currency)} each
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  label="Quantity"
                  value={quantities[token.tokenId] || ''}
                  onChange={(e) => handleQuantityChange(token.tokenId, e.target.value)}
                  inputProps={{ min: 0 }}
                  sx={{ width: 120 }}
                />
              </Box>
            ))}

            <Button
              variant="contained"
              onClick={handleBuy}
              disabled={buying}
              sx={{ alignSelf: 'flex-start' }}
            >
              {buying ? 'Buying...' : 'Buy'}
            </Button>
          </>
        )}

        {buyError && <Alert severity="error">{buyError}</Alert>}
        {buySuccess && <Alert severity="success">{buySuccess}</Alert>}
      </Stack>
    </Paper>
  )
}
