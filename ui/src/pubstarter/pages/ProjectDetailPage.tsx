import { useState, useEffect, useCallback } from 'react'
import { Box, CircularProgress, Alert } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  createSDKMachinery,
  getProject,
  getProjectTokens,
  getProjectContributions,
  getProjectRefunds,
  getActiveSaleListings,
  getActiveBuyOrders,
  getMarketplaceTrades,
  getTokenBurnsByUser,
  fetchFromIPFS,
  type Project,
  type ProjectToken,
  type Contribution,
  type Refund,
  type SaleListing,
  type BuyOrder,
  type Trade,
  type TokenBurn,
} from '@commonality/sdk'
import {
  ProjectHeader,
  BuyTokensSection,
  ConnectWalletPrompt,
  RefundSection,
  WithdrawSection,
  BurnTokensSection,
  SecondaryMarketSection,
  TradeHistory,
  Leaderboard,
} from '../components'
import { getProjectStatus, computeUserTokenBalance } from '../utils'

type ProjectMetadata = { name?: string; description?: string }

export function ProjectDetailPage() {
  const { projectAddress } = useParams<{ projectAddress: string }>()
  const { address, isConnected } = useAccount()

  const [project, setProject] = useState<Project | null>(null)
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null)
  const [tokens, setTokens] = useState<ProjectToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [saleListings, setSaleListings] = useState<SaleListing[]>([])
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [userBurns, setUserBurns] = useState<TokenBurn[]>([])

  const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'

  const loadProjectData = useCallback(async () => {
    if (!projectAddress) return

    const machinery = createSDKMachinery(GRAPHQL_URL)

    const [proj, projTokens, projContributions, projRefunds] = await Promise.all([
      getProject(machinery, projectAddress),
      getProjectTokens(machinery, projectAddress),
      getProjectContributions(machinery, projectAddress),
      getProjectRefunds(machinery, projectAddress),
    ])

    if (!proj) {
      setError('Project not found')
      return null
    }

    setProject(proj)
    setTokens(projTokens)
    setContributions(projContributions)
    setRefunds(projRefunds)

    if (proj.marketplaceAddress) {
      const [listings, orders, marketTrades] = await Promise.all([
        getActiveSaleListings(machinery, proj.marketplaceAddress),
        getActiveBuyOrders(machinery, proj.marketplaceAddress),
        getMarketplaceTrades(machinery, proj.marketplaceAddress),
      ])
      setSaleListings(listings)
      setBuyOrders(orders)
      setTrades(marketTrades)
    }

    if (address && proj.erc1155Address) {
      const burns = await getTokenBurnsByUser(machinery, proj.erc1155Address, address)
      setUserBurns(burns)
    }

    if (proj.metadataCid) {
      const ipfsConfig = { gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY }
      const data = await fetchFromIPFS(ipfsConfig, proj.metadataCid)
      if (data) setMetadata(data as ProjectMetadata)
    }

    return proj
  }, [projectAddress, address, GRAPHQL_URL])

  useEffect(() => {
    if (!projectAddress) return

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        await loadProjectData()
      } catch (err) {
        console.error('Error loading project:', err)
        setError(err instanceof Error ? err.message : 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [projectAddress])

  const handleRefresh = useCallback(async () => {
    await loadProjectData()
  }, [loadProjectData])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!project) {
    return <Alert severity="error">Project not found</Alert>
  }

  const status = getProjectStatus(project)

  const userRefundableTokens = computeUserTokenBalance(address, contributions, refunds)
  const userBurnableTokens = computeUserTokenBalance(address, contributions, refunds, userBurns)

  return (
    <Box>
      <ProjectHeader project={project} metadata={metadata} />

      {isConnected && status === 'active' && tokens.length > 0 && (
        <BuyTokensSection
          project={project}
          tokens={tokens}
          address={address}
          onProjectRefresh={handleRefresh}
        />
      )}

      {!isConnected && status === 'active' && (
        <ConnectWalletPrompt />
      )}

      {isConnected && status === 'refunding' && userRefundableTokens.length > 0 && (
        <RefundSection
          project={project}
          contributions={contributions}
          refunds={refunds}
          address={address}
          onRefresh={handleRefresh}
        />
      )}

      {isConnected && status === 'succeeded' && address?.toLowerCase() === project.recipient.toLowerCase() && (
        <WithdrawSection
          project={project}
          address={address}
          onRefresh={handleRefresh}
        />
      )}

      {isConnected && status === 'succeeded' && userBurnableTokens.length > 0 && (
        <BurnTokensSection
          project={project}
          contributions={contributions}
          refunds={refunds}
          userBurns={userBurns}
          address={address}
          onRefresh={handleRefresh}
        />
      )}

      {project.marketplaceAddress && (
        <SecondaryMarketSection
          project={project}
          saleListings={saleListings}
          buyOrders={buyOrders}
          isConnected={isConnected}
          address={address}
          onRefresh={handleRefresh}
        />
      )}

      {project.marketplaceAddress && trades.length > 0 && (
        <TradeHistory trades={trades} />
      )}

      <Leaderboard contributions={contributions} refunds={refunds} />
    </Box>
  )
}
