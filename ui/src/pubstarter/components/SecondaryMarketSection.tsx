import { useState } from 'react'
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Alert,
} from '@mui/material'
import { formatEther, parseEther } from 'viem'
import { useWalletClient, usePublicClient } from 'wagmi'
import type {
  Project,
  SaleListing,
  BuyOrder,
  TestClients,
  SecondaryMarketContract,
} from '@commonality/sdk'
import {
  ERC1155SecondaryMarketAbi,
  fulfillSaleListing,
  fulfillBuyOrder,
  createSaleListing,
  createBuyOrder,
  approveERC1155ForMarketplace,
} from '@commonality/sdk'

interface SecondaryMarketSectionProps {
  project: Project
  saleListings: SaleListing[]
  buyOrders: BuyOrder[]
  isConnected: boolean
  address: string | undefined
  onRefresh: () => void
  tokenImages?: Record<string, string>
}

export function SecondaryMarketSection({
  project,
  saleListings,
  buyOrders,
  isConnected,
  address,
  onRefresh,
  tokenImages = {},
}: SecondaryMarketSectionProps) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [fulfillingSale, setFulfillingSale] = useState<string | null>(null)
  const [fulfillingOrder, setFulfillingOrder] = useState<string | null>(null)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [marketSuccess, setMarketSuccess] = useState<string | null>(null)

  const [saleQuantities, setSaleQuantities] = useState<Record<string, string>>({})
  const [orderQuantities, setOrderQuantities] = useState<Record<string, string>>({})

  const [orderType, setOrderType] = useState<'sale' | 'buy'>('sale')
  const [orderTokenId, setOrderTokenId] = useState('')
  const [orderQuantity, setOrderQuantity] = useState('')
  const [orderPrice, setOrderPrice] = useState('')
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [createOrderError, setCreateOrderError] = useState<string | null>(null)
  const [createOrderSuccess, setCreateOrderSuccess] = useState<string | null>(null)

  const makeMarketplaceContract = (): SecondaryMarketContract | null => {
    if (!project?.marketplaceAddress) return null
    return {
      address: project.marketplaceAddress as `0x${string}`,
      abi: ERC1155SecondaryMarketAbi,
    }
  }

  const makeClients = (): TestClients | null => {
    if (!walletClient || !publicClient || !address) return null
    return {
      walletClient: walletClient as any,
      publicClient: publicClient as any,
      account: address as `0x${string}`,
    }
  }

  const refreshMarketData = onRefresh

  const handleFulfillSale = async (listing: SaleListing) => {
    const clients = makeClients()
    const marketplace = makeMarketplaceContract()
    if (!clients || !marketplace) return

    try {
      setFulfillingSale(listing.listingId)
      setMarketError(null)
      setMarketSuccess(null)

      const qtyStr = saleQuantities[listing.listingId]
      const count = qtyStr ? BigInt(qtyStr) : BigInt(listing.remainingCount)
      const totalCost = count * BigInt(listing.pricePerToken)

      await fulfillSaleListing(clients, marketplace, {
        saleListingId: BigInt(listing.listingId),
        count,
        totalCost,
      })

      setMarketSuccess('Tokens purchased from listing!')
      refreshMarketData()
    } catch (err) {
      console.error('Error fulfilling sale listing:', err)
      setMarketError(err instanceof Error ? err.message : 'Failed to buy from listing')
    } finally {
      setFulfillingSale(null)
    }
  }

  const handleFulfillBuyOrder = async (order: BuyOrder) => {
    const clients = makeClients()
    const marketplace = makeMarketplaceContract()
    if (!clients || !marketplace || !project) return

    try {
      setFulfillingOrder(order.orderId)
      setMarketError(null)
      setMarketSuccess(null)

      await approveERC1155ForMarketplace(
        clients,
        project.erc1155Address as `0x${string}`,
        project.marketplaceAddress as `0x${string}`,
      )

      const qtyStr = orderQuantities[order.orderId]
      const count = qtyStr ? BigInt(qtyStr) : BigInt(order.remainingCount)

      await fulfillBuyOrder(clients, marketplace, {
        buyOrderId: BigInt(order.orderId),
        count,
      })

      setMarketSuccess('Tokens sold to buy order!')
      refreshMarketData()
    } catch (err) {
      console.error('Error fulfilling buy order:', err)
      setMarketError(err instanceof Error ? err.message : 'Failed to sell to buy order')
    } finally {
      setFulfillingOrder(null)
    }
  }

  const handleCreateOrder = async () => {
    const clients = makeClients()
    const marketplace = makeMarketplaceContract()
    if (!clients || !marketplace || !project) return

    if (!orderTokenId || !orderQuantity || !orderPrice) {
      setCreateOrderError('Please fill in all fields')
      return
    }

    try {
      setCreatingOrder(true)
      setCreateOrderError(null)
      setCreateOrderSuccess(null)

      const params = {
        tokenId: BigInt(orderTokenId),
        count: BigInt(orderQuantity),
        pricePerToken: parseEther(orderPrice),
      }

      if (orderType === 'sale') {
        await approveERC1155ForMarketplace(
          clients,
          project.erc1155Address as `0x${string}`,
          project.marketplaceAddress as `0x${string}`,
        )
        await createSaleListing(clients, marketplace, params)
        setCreateOrderSuccess('Sale listing created!')
      } else {
        await createBuyOrder(clients, marketplace, params)
        setCreateOrderSuccess('Buy order created!')
      }

      setOrderTokenId('')
      setOrderQuantity('')
      setOrderPrice('')
      refreshMarketData()
    } catch (err) {
      console.error('Error creating order:', err)
      setCreateOrderError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setCreatingOrder(false)
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Secondary Market
      </Typography>

      {marketError && <Alert severity="error" sx={{ mb: 2 }}>{marketError}</Alert>}
      {marketSuccess && <Alert severity="success" sx={{ mb: 2 }}>{marketSuccess}</Alert>}

      <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }}>
        Sale Listings
      </Typography>
      {saleListings.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No active sale listings.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Seller</TableCell>
                <TableCell>Token ID</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Price per Token</TableCell>
                {isConnected && <TableCell align="right">Action</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {saleListings.map((listing) => (
                <TableRow key={listing.listingId}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tokenImages[listing.tokenId] && (
                        <Box
                          component="img"
                          src={tokenImages[listing.tokenId]}
                          alt={`Token #${listing.tokenId}`}
                          sx={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 0.5 }}
                        />
                      )}
                      {listing.tokenId}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{listing.remainingCount}</TableCell>
                  <TableCell align="right">{formatEther(BigInt(listing.pricePerToken))} ETH</TableCell>
                  {isConnected && (
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <TextField
                          type="number"
                          size="small"
                          label="Qty"
                          value={saleQuantities[listing.listingId] || ''}
                          onChange={(e) => setSaleQuantities(prev => ({ ...prev, [listing.listingId]: e.target.value }))}
                          placeholder={listing.remainingCount}
                          inputProps={{ min: 1, max: Number(listing.remainingCount) }}
                          sx={{ width: 80 }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleFulfillSale(listing)}
                          disabled={fulfillingSale === listing.listingId}
                        >
                          {fulfillingSale === listing.listingId ? 'Buying...' : 'Buy'}
                        </Button>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 1 }}>
        Buy Orders
      </Typography>
      {buyOrders.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No active buy orders.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Buyer</TableCell>
                <TableCell>Token ID</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Price per Token</TableCell>
                {isConnected && <TableCell align="right">Action</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {buyOrders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {order.buyer.slice(0, 6)}...{order.buyer.slice(-4)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tokenImages[order.tokenId] && (
                        <Box
                          component="img"
                          src={tokenImages[order.tokenId]}
                          alt={`Token #${order.tokenId}`}
                          sx={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 0.5 }}
                        />
                      )}
                      {order.tokenId}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{order.remainingCount}</TableCell>
                  <TableCell align="right">{formatEther(BigInt(order.pricePerToken))} ETH</TableCell>
                  {isConnected && (
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <TextField
                          type="number"
                          size="small"
                          label="Qty"
                          value={orderQuantities[order.orderId] || ''}
                          onChange={(e) => setOrderQuantities(prev => ({ ...prev, [order.orderId]: e.target.value }))}
                          placeholder={order.remainingCount}
                          inputProps={{ min: 1, max: Number(order.remainingCount) }}
                          sx={{ width: 80 }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleFulfillBuyOrder(order)}
                          disabled={fulfillingOrder === order.orderId}
                        >
                          {fulfillingOrder === order.orderId ? 'Selling...' : 'Sell'}
                        </Button>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isConnected && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            Create Order
          </Typography>

          <ToggleButtonGroup
            value={orderType}
            exclusive
            onChange={(_, val) => { if (val) setOrderType(val) }}
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="sale">Sale Listing</ToggleButton>
            <ToggleButton value="buy">Buy Order</ToggleButton>
          </ToggleButtonGroup>

          <Stack spacing={2}>
            <TextField
              type="number"
              size="small"
              label="Token ID"
              value={orderTokenId}
              onChange={(e) => setOrderTokenId(e.target.value)}
              sx={{ width: 200 }}
            />
            <TextField
              type="number"
              size="small"
              label="Quantity"
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(e.target.value)}
              sx={{ width: 200 }}
            />
            <TextField
              type="number"
              size="small"
              label="Price per Token (ETH)"
              value={orderPrice}
              onChange={(e) => setOrderPrice(e.target.value)}
              sx={{ width: 200 }}
            />

            <Button
              variant="contained"
              onClick={handleCreateOrder}
              disabled={creatingOrder}
              sx={{ alignSelf: 'flex-start' }}
            >
              {creatingOrder ? 'Creating...' : orderType === 'sale' ? 'Create Sale Listing' : 'Create Buy Order'}
            </Button>

            {createOrderError && <Alert severity="error">{createOrderError}</Alert>}
            {createOrderSuccess && <Alert severity="success">{createOrderSuccess}</Alert>}
          </Stack>
        </Box>
      )}
    </Paper>
  )
}
