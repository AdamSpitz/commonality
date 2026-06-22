import { Paper, Typography, Stack, Box, TextField, Button, Alert, FormControlLabel, Switch, MenuItem, Select, FormControl, InputLabel, CircularProgress, Card, CardActionArea, Chip } from '@mui/material'
import type { Project, ProjectToken, AssuranceContract, Note } from '@commonality/sdk'
import { AssuranceContractAbi, buyProjectTokens, getNotesByOwner, getDelegationChain, purchaseFromPrimaryMarketWithNotes, DelegatableNotesAbi, ETH_CURRENCY } from '@commonality/sdk'
import { useState, useEffect } from 'react'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useWriteClients } from '../../shared/hooks/useWriteClients'
import { formatCurrencyAmount } from '../../shared/currency'
import { getDomainUrl } from '../../domains/domainUrls'
import { noteScopedKey } from '../../delegation/utils'
import { parseUnits } from 'viem'
import { allocatePurchaseAmount } from '../purchaseAllocation'

interface BuyTokensSectionProps {
  project: Project
  tokens: ProjectToken[]
  address: string | undefined
  onProjectRefresh: () => void
  tokenImages?: Record<string, string>
}

function getDelegatableNotesContract(address?: string) {
  const addr = address ?? import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: DelegatableNotesAbi }
}

export function BuyTokensSection({ project, tokens, address, onProjectRefresh, tokenImages = {} }: BuyTokensSectionProps) {
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()

  // Direct purchase state
  const [giveAmount, setGiveAmount] = useState('')
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, boolean>>({})
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
      const fundingCurrency = project.fundingCurrency ?? ETH_CURRENCY
      const settlementToken = fundingCurrency.tokenAddress ?? '0x0000000000000000000000000000000000000000'
      const settlementNotes = allNotes.filter(n =>
        n.active &&
        n.tokenType === fundingCurrency.tokenType &&
        n.token.toLowerCase() === settlementToken.toLowerCase()
      )
      setNotes(settlementNotes)
    } catch (err) {
      console.error('Error loading notes:', err)
    } finally {
      setNotesLoading(false)
    }
  }

  const handleNoteQuantityChange = (tokenId: string, value: string) => {
    setNoteQuantities(prev => ({ ...prev, [tokenId]: value }))
  }

  const getClients = () => {
    if (!writeClients || !address) return null
    return writeClients
  }

  const handleBuy = async () => {
    if (!writeClients || !address) {
      setBuyError('Wallet is not ready. Please reconnect your wallet and try again.')
      return
    }

    let requestedAmount: bigint
    try {
      requestedAmount = parseUnits(giveAmount || '0', fundingCurrency.decimals)
    } catch {
      setBuyError('Enter a valid contribution amount.')
      return
    }

    const allocation = allocatePurchaseAmount(tokens, requestedAmount, {
      addOns: Object.fromEntries(Object.entries(selectedAddOns).filter(([, selected]) => selected).map(([tokenId]) => [tokenId, 1n])),
    })

    if (allocation.status === 'impossible' || allocation.tokenIds.length === 0) {
      setBuyError(allocation.message ?? 'Choose a contribution amount that matches the available giving options.')
      return
    }

    if (allocation.status === 'snapped' && allocation.totalCost !== requestedAmount) {
      setBuyError(`That exact amount is not available. Try ${formatCurrencyAmount(allocation.totalCost, fundingCurrency)} instead.`)
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

      const clients = writeClients!

      await buyProjectTokens(clients, assuranceContract, {
        buyer: address as `0x${string}`,
        tokenAddress: project.erc1155Address as `0x${string}`,
        tokenIds: allocation.tokenIds,
        tokenCounts: allocation.tokenCounts,
        totalCost: allocation.totalCost,
      })

      setBuySuccess('Contribution sent successfully!')
      setGiveAmount('')
      setSelectedAddOns({})
      onProjectRefresh()
    } catch (err) {
      console.error('Error sending contribution:', err)
      setBuyError(err instanceof Error ? err.message : 'Failed to send contribution')
    } finally {
      setBuying(false)
    }
  }

  const handleBuyWithNote = async () => {
    const clients = getClients()
    if (!clients || !selectedNoteId) return

    const selectedNote = notes.find(n => noteScopedKey(n) === selectedNoteId)
    if (!selectedNote) return

    const contract = getDelegatableNotesContract(selectedNote.contractAddress)
    if (!contract) return

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
      setBuyError('Please enter a quantity for one token')
      return
    }

    if (tokenIds.length > 1) {
      setBuyError('Delegatable-note purchases can buy only one token type at a time')
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
      const chain = await getDelegationChain(machinery, noteScopedKey(selectedNote))
      const owners = chain
        .sort((a, b) => b.position - a.position)
        .map(link => link.address as `0x${string}`)

      await purchaseFromPrimaryMarketWithNotes(clients, contract, {
        purchaseShares: [{ noteId: BigInt(selectedNote.id), chain: owners, shares: tokenCounts[0] }],
        primaryMarket: project.id as `0x${string}`,
        erc1155Contract: project.erc1155Address as `0x${string}`,
        tokenId: tokenIds[0],
        count: tokenCounts[0],
      })

      setBuySuccess('Contribution sent successfully via delegatable note!')
      setNoteQuantities({})
      setSelectedNoteId('')
      onProjectRefresh()
    } catch (err) {
      console.error('Error sending contribution with note:', err)
      setBuyError(err instanceof Error ? err.message : 'Failed to send contribution with note')
    } finally {
      setBuying(false)
    }
  }

  const selectedNote = notes.find(n => noteScopedKey(n) === selectedNoteId)
  const fundingCurrency = project.fundingCurrency ?? ETH_CURRENCY
  const noteTotalCost = tokens.reduce((sum, token) => {
    const qty = parseInt(noteQuantities[token.tokenId] || '0', 10)
    return sum + BigInt(qty) * BigInt(token.price)
  }, 0n)
  const noteBalanceSufficient = selectedNote ? noteTotalCost <= BigInt(selectedNote.amount) : true
  const cheapestTokenPrice = tokens.reduce<bigint | null>((min, token) => {
    const price = BigInt(token.price)
    return min == null || price < min ? price : min
  }, null)
  const addOnTokens = tokens.filter(token => cheapestTokenPrice != null && BigInt(token.price) > cheapestTokenPrice)
  let directAllocationPreview: ReturnType<typeof allocatePurchaseAmount> | null = null
  try {
    const requested = parseUnits(giveAmount || '0', fundingCurrency.decimals)
    directAllocationPreview = requested > 0n
      ? allocatePurchaseAmount(tokens, requested, {
        addOns: Object.fromEntries(Object.entries(selectedAddOns).filter(([, selected]) => selected).map(([tokenId]) => [tokenId, 1n])),
      })
      : null
  } catch {
    directAllocationPreview = null
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Give to this project
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Enter the amount you want to give. Your contribution counts toward the funding goal; if the project does not reach its goal by the deadline, you can get a refund. If it succeeds, the creator can withdraw the pooled funds and your onchain tokens remain your receipt/reward.
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
                You have no active {fundingCurrency.symbol} delegatable notes. Deposit {fundingCurrency.symbol} on the <a href={getDomainUrl('lazyGiving', '/delegation/notes/new', { fallbackHref: '/delegation/notes/new' })}>Delegation tab</a> to create one.
              </Alert>
            ) : (
              <>
                <FormControl size="small" sx={{ minWidth: 300 }}>
                  <InputLabel>Select note to spend</InputLabel>
                  <Select
                    value={selectedNoteId}
                    label="Select note to spend"
                    onChange={(e) => setSelectedNoteId(e.target.value)}
                  >
                    {notes.map(note => (
                      <MenuItem key={noteScopedKey(note)} value={noteScopedKey(note)}>
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
                        alt={`Giving option #${token.tokenId}`}
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    <Typography variant="body1" sx={{ minWidth: 120 }}>
                      Giving option #{token.tokenId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                      {formatCurrencyAmount(token.price, token.currency)} each
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      label="Count"
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
                  {buying ? 'Giving…' : 'Give with Note'}
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <TextField
              type="number"
              label={`Give amount (${fundingCurrency.symbol})`}
              value={giveAmount}
              onChange={(e) => setGiveAmount(e.target.value)}
              inputProps={{ min: 0, step: fundingCurrency.decimals === 0 ? 1 : 'any' }}
              sx={{ maxWidth: 280 }}
            />

            {addOnTokens.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Optional reward add-ons</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {addOnTokens.map((token) => (
                    <Card key={token.tokenId} variant={selectedAddOns[token.tokenId] ? 'elevation' : 'outlined'} sx={{ width: 220 }}>
                      <CardActionArea onClick={() => setSelectedAddOns(prev => ({ ...prev, [token.tokenId]: !prev[token.tokenId] }))} sx={{ p: 2 }}>
                        <Stack spacing={1}>
                          {tokenImages[token.tokenId] && (
                            <Box component="img" src={tokenImages[token.tokenId]} alt={`Reward option #${token.tokenId}`} sx={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 1 }} />
                          )}
                          <Typography variant="body1">Reward #{token.tokenId}</Typography>
                          <Typography variant="body2" color="text.secondary">Adds {formatCurrencyAmount(token.price, token.currency)}</Typography>
                          {selectedAddOns[token.tokenId] && <Chip size="small" color="primary" label="Included" sx={{ alignSelf: 'flex-start' }} />}
                        </Stack>
                      </CardActionArea>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {directAllocationPreview && (
              <Alert severity={directAllocationPreview.status === 'exact' ? 'info' : 'warning'}>
                {directAllocationPreview.status === 'exact'
                  ? `You'll give ${formatCurrencyAmount(directAllocationPreview.totalCost, fundingCurrency)} in one wallet transaction. Your wallet may also show a small network fee.`
                  : directAllocationPreview.status === 'snapped'
                    ? `That exact amount is not available. The nearest available contribution is ${formatCurrencyAmount(directAllocationPreview.totalCost, fundingCurrency)}.`
                    : directAllocationPreview.message}
              </Alert>
            )}

            <Typography variant="caption" color="text.secondary">
              Wallet confirmations are permanent onchain transactions. If the project misses its funding goal, you can come back and claim a refund.
            </Typography>

            <Button variant="contained" onClick={handleBuy} disabled={buying || !giveAmount} sx={{ alignSelf: 'flex-start' }}>
              {buying ? 'Giving…' : 'Give'}
            </Button>
          </>
        )}

        {buyError && <Alert severity="error">{buyError}</Alert>}
        {buySuccess && <Alert severity="success">{buySuccess}</Alert>}
      </Stack>
    </Paper>
  )
}
