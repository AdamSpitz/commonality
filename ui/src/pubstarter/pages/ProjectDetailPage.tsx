import { useState, useEffect, useCallback } from 'react'
import { Box, CircularProgress, Alert } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  getProject,
  getProjectTokens,
  getProjectContributions,
  getProjectRefunds,
  getActiveSaleListings,
  getActiveBuyOrders,
  getMarketplaceTrades,
  getTokenBurnsByUser,
  getPurchasedNoteEventsByTxHashes,
  getDelegationChainsForNotes,
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
import { useMachinery } from '../../shared/hooks/useMachinery'
import { AlignmentAttestationsSection } from '../../fundingportal/components'
import { ContentFundingProjectSection } from '../../content-funding/components/ContentFundingProjectSection'

type ProjectMetadata = { name?: string; description?: string; tokens?: Record<string, string> }

export function ProjectDetailPage() {
  const { projectAddress } = useParams<{ projectAddress: string }>()
  const { address, isConnected } = useAccount()

  const [project, setProject] = useState<Project | null>(null)
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null)
  const [tokens, setTokens] = useState<ProjectToken[]>([])
  const [tokenImages, setTokenImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [saleListings, setSaleListings] = useState<SaleListing[]>([])
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [userBurns, setUserBurns] = useState<TokenBurn[]>([])
  // txHash → sorted delegation chain (root → leaf addresses) for note-based contributions
  const [contributionChains, setContributionChains] = useState<Record<string, string[]>>({})

  const machinery = useMachinery()

  const loadProjectData = useCallback(async () => {
    if (!projectAddress) return

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

    // Fetch delegation chains for note-based contributions (best-effort, don't block on failure)
    try {
      const txHashes = projContributions.map(c => c.transactionHash)
      if (txHashes.length > 0) {
        const noteEvents = await getPurchasedNoteEventsByTxHashes(machinery, txHashes)
        if (noteEvents.length > 0) {
          // Collect all input note IDs from the purchased events
          const noteIds = noteEvents.flatMap(evt => {
            const data = evt.data ? JSON.parse(evt.data) : null
            return (data?.inputNoteIds ?? []) as string[]
          })
          const chainLinks = await getDelegationChainsForNotes(machinery, noteIds)

          // Group chain links by noteId, sorted by position (root first)
          const noteChainMap: Record<string, string[]> = {}
          for (const link of chainLinks) {
            if (!noteChainMap[link.noteId]) noteChainMap[link.noteId] = []
            noteChainMap[link.noteId].push(link.address)
          }
          // Links already come sorted asc by position from the query

          // Build txHash → chain using the first input note of each purchased event
          const txChainMap: Record<string, string[]> = {}
          for (const evt of noteEvents) {
            const data = evt.data ? JSON.parse(evt.data) : null
            const firstNoteId = data?.inputNoteIds?.[0] as string | undefined
            if (firstNoteId && noteChainMap[firstNoteId]) {
              txChainMap[evt.transactionHash] = noteChainMap[firstNoteId]
            }
          }
          setContributionChains(txChainMap)
        }
      }
    } catch (err) {
      // Non-critical: delegation chain enrichment failed, leaderboard still works without it
      console.warn('Failed to fetch delegation chains for contributions:', err)
    }

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
      if (data) {
        const meta = data as ProjectMetadata
        setMetadata(meta)

        // Fetch per-token metadata (images) if present
        if (meta.tokens && Object.keys(meta.tokens).length > 0) {
          const images: Record<string, string> = {}
          await Promise.all(
            Object.entries(meta.tokens).map(async ([tokenId, cid]) => {
              const tokenMeta = await fetchFromIPFS(ipfsConfig, cid)
              const img = (tokenMeta as Record<string, string> | null)?.image
              if (img) images[tokenId] = img
            })
          )
          setTokenImages(images)
        }
      }
    }

    return proj
  }, [projectAddress, address, machinery])

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
  }, [projectAddress, loadProjectData])

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
          tokenImages={tokenImages}
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
          tokenImages={tokenImages}
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
          tokenImages={tokenImages}
        />
      )}

      {project.marketplaceAddress && trades.length > 0 && (
        <TradeHistory trades={trades} />
      )}

      <Leaderboard contributions={contributions} refunds={refunds} contributionChains={contributionChains} />

      {projectAddress && (
        <>
          <AlignmentAttestationsSection projectAddress={projectAddress} />
          <ContentFundingProjectSection projectAddress={projectAddress} />
        </>
      )}
    </Box>
  )
}
