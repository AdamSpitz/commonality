import { useState, useEffect, useCallback, useMemo } from 'react'
import { Box, CircularProgress, Alert, Button, Paper, Typography } from '@mui/material'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getPurchasedNoteEventsByTxHashes, getDelegationChainsForNotes } from '@commonality/sdk/delegation'
import { getProjectTokens, getProjectContributions, getProjectRefunds, getTokenBurnsByUser, type ProjectToken, type Contribution, type Refund, type TokenBurn } from '@commonality/sdk/lazy-giving'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import {
  ProjectHeader,
  BuyTokensSection,
  PledgePreviewPanel,
  RefundSection,
  WithdrawSection,
  BurnTokensSection,
  Leaderboard,
} from '../components'
import { getProjectStatus, computeUserTokenBalance } from '../utils'
import { getEventCacheUrl, useMachinery } from '../../shared'
import { useCachedProject } from '../../shared'
import { AlignmentAttestationsSection } from '../../fundingportals'
import { ContentFundingProjectSection } from '../../content-funding'
import { getRuntimeConfigValue, isCidDeniedByDisplayDenylist, loadDisplayDenylist } from '../../shared'
import { tryParseChainAddressRef } from '../../shared'
import { readLazyGivingProjectMetadata, readLazyGivingTokenMetadata, type ProjectMetadata } from '../metadata'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export function ProjectDetailPage() {
  const { projectAddress } = useParams<{ projectAddress: string }>()
  const [searchParams] = useSearchParams()
  const causeCid = searchParams.get('causeCid') ?? undefined
  const { address, isConnected } = useAccount()
  const machinery = useMachinery()
  const machineryDefaultChainId = (machinery as { defaultChainId?: number }).defaultChainId
  const parsedProjectRef = useMemo(
    () => tryParseChainAddressRef(projectAddress, machineryDefaultChainId ?? 31337),
    [projectAddress, machineryDefaultChainId],
  )
  const projectContractAddress = parsedProjectRef?.address ?? ''
  const cacheOptions = useMemo(() => ({
    eventCacheUrl: getEventCacheUrl(),
    contractAddresses: {
      assuranceContractFactory: (getRuntimeConfigValue('VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS') ??
        ZERO_ADDRESS) as `0x${string}`,
    },
    foldType: 'project' as const,
  }), [])
  const {
    project,
    loading: projectLoading,
    error: projectError,
    reload: reloadProject,
  } = useCachedProject({
    projectAddress: projectContractAddress,
    cacheOptions,
  })

  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null)
  const [metadataWarning, setMetadataWarning] = useState<string | null>(null)
  const [tokens, setTokens] = useState<ProjectToken[]>([])
  const [tokenImages, setTokenImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [userBurns, setUserBurns] = useState<TokenBurn[]>([])
  // txHash → sorted delegation chain (root → leaf addresses) for note-based contributions
  const [contributionChains, setContributionChains] = useState<Record<string, string[]>>({})

  const loadProjectData = useCallback(async () => {
    if (!projectContractAddress) return

    if (!project) {
      return null
    }

    setMetadataWarning(null)

    const [projTokens, projContributions, projRefunds] = await Promise.all([
      getProjectTokens(machinery, projectContractAddress),
      getProjectContributions(machinery, projectContractAddress),
      getProjectRefunds(machinery, projectContractAddress),
    ])

    setTokens(projTokens)
    setContributions(projContributions)
    setRefunds(projRefunds)

    // Fetch delegation chains for note-based contributions (best-effort, don't block on failure)
    try {
      const txHashes = projContributions.map(c => c.transactionHash)
      if (txHashes.length > 0) {
        const noteEvents = await getPurchasedNoteEventsByTxHashes(machinery, txHashes)
        if (noteEvents.length > 0) {
          // Collect input notes using contract-scoped keys so future DelegatableNotes
          // versions cannot collide when numeric note IDs restart at 1.
          const noteIds = noteEvents.flatMap(evt => {
            const data = evt.data ? JSON.parse(evt.data) : null
            return ((data?.inputNoteIds ?? []) as string[]).map(noteId => `${evt.noteContract.toLowerCase()}:${noteId}`)
          })
          const chainLinks = await getDelegationChainsForNotes(machinery, noteIds)

          // Group chain links by contract-scoped note key, sorted by position (root first)
          const noteChainMap: Record<string, string[]> = {}
          for (const link of chainLinks) {
            const key = `${link.noteContract.toLowerCase()}:${link.noteId}`
            if (!noteChainMap[key]) noteChainMap[key] = []
            noteChainMap[key].push(link.address)
          }
          // Links already come sorted asc by position from the query

          // Build txHash → chain using the first input note of each purchased event
          const txChainMap: Record<string, string[]> = {}
          for (const evt of noteEvents) {
            const data = evt.data ? JSON.parse(evt.data) : null
            const firstNoteId = data?.inputNoteIds?.[0] as string | undefined
            const firstNoteKey = firstNoteId ? `${evt.noteContract.toLowerCase()}:${firstNoteId}` : null
            if (firstNoteKey && noteChainMap[firstNoteKey]) {
              txChainMap[evt.transactionHash] = noteChainMap[firstNoteKey]
            }
          }
          setContributionChains(txChainMap)
        }
      }
    } catch (err) {
      // Non-critical: delegation chain enrichment failed, leaderboard still works without it
      console.warn('Failed to fetch delegation chains for contributions:', err)
    }

    if (address && project.erc1155Address) {
      const burns = await getTokenBurnsByUser(machinery, project.erc1155Address, address)
      setUserBurns(burns)
    }

    if (project.metadataCid) {
      try {
        const displayDenylist = await loadDisplayDenylist()
        const meta = await readLazyGivingProjectMetadata(machinery, project.metadataCid as IpfsCidV1, displayDenylist)
        if (!meta) {
          setMetadata(null)
          setTokenImages({})
          setMetadataWarning('Project metadata could not be loaded from IPFS/PublishedData. Showing on-chain project data instead.')
        } else {
          setMetadata(meta)

          // Fetch per-token metadata (images) if present. Missing token metadata should not
          // block funding actions on the project page.
          if (meta.tokens && Object.keys(meta.tokens).length > 0) {
            const tokenMetadataResults = await Promise.all(
              Object.entries(meta.tokens).map(async ([tokenId, cid]) => {
                try {
                  const tokenMeta = await readLazyGivingTokenMetadata(machinery, cid as IpfsCidV1, displayDenylist)
                  return { tokenId, image: tokenMeta?.image ?? null, unavailable: !tokenMeta }
                } catch (err) {
                  console.warn('Failed to fetch token metadata:', err)
                  return { tokenId, image: null, unavailable: true }
                }
              })
            )
            const images: Record<string, string> = {}
            let missingTokenMetadata = false
            for (const result of tokenMetadataResults) {
              if (result.image && !isCidDeniedByDisplayDenylist(result.image, displayDenylist)) images[result.tokenId] = result.image
              if (result.unavailable) missingTokenMetadata = true
            }
            setTokenImages(images)
            if (missingTokenMetadata) {
              setMetadataWarning('Some token metadata could not be loaded from IPFS/PublishedData. Funding actions remain available with token IDs and prices.')
            }
          } else {
            setTokenImages({})
          }
        }
      } catch (err) {
        console.warn('Failed to fetch project metadata:', err)
        setMetadata(null)
        setTokenImages({})
        setMetadataWarning('Project metadata could not be loaded from IPFS/PublishedData. Showing on-chain project data instead.')
      }
    } else {
      setMetadata(null)
      setTokenImages({})
    }

    return project
  }, [address, machinery, project, projectContractAddress] )

  useEffect(() => {
    if (!projectContractAddress) return
    if (!project) {
      setLoading(false)
      return
    }

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
  }, [project, projectContractAddress, loadProjectData])

  const handleRefresh = useCallback(async () => {
    await reloadProject()
    await loadProjectData()
  }, [loadProjectData, reloadProject])

  if (projectLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (projectError || error) {
    return (
      <Box sx={{ maxWidth: 720 }}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            We couldn&apos;t load this project
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Something went wrong while fetching this project. Please try again in a moment.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
            <Button variant="contained" onClick={handleRefresh}>
              Retry
            </Button>
            <Button component={RouterLink} to="/projects" variant="outlined">
              Back to projects
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" component="div">
            {projectError ?? error}
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (!project) {
    return (
      <Box sx={{ maxWidth: 720 }}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Project not found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            This project may not exist on the current network, or the indexer may not have seen it yet.
          </Typography>
          <Button component={RouterLink} to="/projects" variant="contained">
            Back to projects
          </Button>
        </Paper>
      </Box>
    )
  }

  const status = getProjectStatus(project)
  const fundingCurrency = project.fundingCurrency
  const cardOnrampSupported = fundingCurrency?.kind === 'erc20' && fundingCurrency.symbol.toUpperCase() === 'USDC' && fundingCurrency.decimals === 6

  const userRefundableTokens = computeUserTokenBalance(address, contributions, refunds)
  const userBurnableTokens = computeUserTokenBalance(address, contributions, refunds, userBurns)

  return (
    <Box>
      <ProjectHeader project={project} metadata={metadata} />

      {metadataWarning && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {metadataWarning}
        </Alert>
      )}

      {status === 'active' && tokens.length > 0 && (isConnected || cardOnrampSupported) && (
        <BuyTokensSection
          project={project}
          tokens={tokens}
          address={address}
          onProjectRefresh={handleRefresh}
          tokenImages={tokenImages}
        />
      )}

      {!isConnected && status === 'active' && !(tokens.length > 0 && cardOnrampSupported) && (
        <PledgePreviewPanel tokens={tokens} tokenImages={tokenImages} />
      )}

      {isConnected && status === 'active' && tokens.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          This project is still funding, but no giving options are indexed yet. Check back after the project creator finishes setup or after the indexer catches up.
        </Alert>
      )}

      {isConnected && status === 'refunding' && userRefundableTokens.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          This project missed its goal and is in refund mode, but this wallet has no refundable tokens left for it.
        </Alert>
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

      {isConnected && status === 'succeeded' && address?.toLowerCase() !== project.recipient.toLowerCase() && (
        <Alert severity="success" sx={{ mb: 3 }}>
          This project reached its funding goal. Only the recipient wallet can withdraw the pooled funds; contributor tokens remain as onchain receipts/rewards.
        </Alert>
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

      <Leaderboard contributions={contributions} refunds={refunds} contributionChains={contributionChains} />

      {projectContractAddress && (
        <>
          <AlignmentAttestationsSection projectAddress={projectContractAddress} initialStatementCid={causeCid} />
          <ContentFundingProjectSection projectAddress={projectContractAddress} />
        </>
      )}
    </Box>
  )
}
