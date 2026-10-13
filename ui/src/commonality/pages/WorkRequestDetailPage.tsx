import {
  decisionFor,
  publishContributionLink,
  publishWorkAcceptance,
  publishWorkDecision,
  publishWorkOffer,
  publishWorkResponse,
  requestVersionCids,
  totalsForRequest,
  type WorkRequestBoard,
} from '@commonality/sdk/work-requests'
import { MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import { Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import type { Abi } from 'viem'
import { useAccount } from 'wagmi'
import { useMachinery, useWriteClients } from '../../shared'
import { useWorkRequests } from '../hooks/useWorkRequests'

function formatTotals(board: WorkRequestBoard, request: WorkRequestBoard['requests'][number]): string[] {
  return totalsForRequest(board, request, Date.now()).map((totals) =>
    `${totals.verifiedBacking} base units backed on chain ${totals.chainId}, ${totals.unfundedIntention} unfunded intention, ${totals.approved} recorded as approved, ${totals.contributed} contributed, ${totals.refunded} later refunded. Token ${totals.token}.`,
  )
}

export function WorkRequestDetailPage() {
  const { author = '', slug = '' } = useParams()
  const { board, loading, error, reload } = useWorkRequests()
  const machinery = useMachinery()
  const clients = useWriteClients()
  const { address } = useAccount()
  const [message, setMessage] = useState<string | null>(null)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerToken, setOfferToken] = useState('')
  const [offerExpiry, setOfferExpiry] = useState('')
  const [offerNote, setOfferNote] = useState('')
  const [project, setProject] = useState('')
  const [provider, setProvider] = useState('')
  const [workItems, setWorkItems] = useState('')
  const [scope, setScope] = useState('')
  const [exceptions, setExceptions] = useState('')
  const [contributionTx, setContributionTx] = useState('')
  const [refundTx, setRefundTx] = useState('')

  const request = board?.requests.find((item) => item.actor === author.toLowerCase() && item.slug === slug)
  const contracts = machinery.contractAddresses?.publishedData && machinery.contractAddresses.mutableRefUpdater
    ? {
        publishedData: { address: machinery.contractAddresses.publishedData, abi: PublishedDataAbi as Abi },
        mutableRefUpdater: { address: machinery.contractAddresses.mutableRefUpdater, abi: MutableRefUpdaterAbi as Abi },
      }
    : null

  async function run(action: () => Promise<unknown>) {
    setMessage(null)
    try {
      await action()
      setMessage('Published. Refreshing.')
      reload()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Publish failed.')
    }
  }

  if (loading) return <Typography>Loading request…</Typography>
  if (error) return <Typography color="error">{error}</Typography>
  if (!request?.current || !board) return <Typography>This request is not published.</Typography>

  const versionCids = requestVersionCids(request)
  const offers = board.offers.filter((offer) => offer.current && versionCids.has(offer.current.body.requestVersionCid))
  const responses = board.responses.filter((response) => response.current && versionCids.has(response.current.body.requestVersionCid))
  const current = request.current

  return (
    <Stack spacing={2} data-testid="work-request-detail" sx={{ maxWidth: 760 }}>
      <Typography variant="h6">{current.body.outcome}</Typography>
      <Typography variant="body2" color="text.secondary">
        Offers name an exact version. Revising this request does not change them. Approval is not payment.
        Backing is shared across responses and can be withdrawn. A project&apos;s raised total is unchanged by offers.
      </Typography>
      <Typography variant="body2">Requirements: {current.body.requirements.join('; ') || 'none'}</Typography>
      <Typography variant="body2">Participation limits: {current.body.participationLimits.join('; ') || 'none'}</Typography>
      {formatTotals(board, request).map((line) => <Typography key={line} variant="body2">{line}</Typography>)}
      <Typography variant="subtitle2">Versions</Typography>
      {request.versions.map((version) => (
        <Typography key={version.cid} variant="caption" display="block">
          {version.cid} · {version.body.outcome}{version.retracted ? ' · retracted' : ''}
        </Typography>
      ))}

      <Typography variant="subtitle2">Offers</Typography>
      {offers.map((offer) => {
        const slice = board.backing.find((item) => item.offerActor === offer.actor && item.offerSlug === offer.slug)
        return (
          <Typography key={`${offer.actor}:${offer.slug}`} variant="body2">
            {offer.actor} offers {offer.current?.body.amount} until {offer.current?.body.expiry}
            {offer.current?.body.status === 'withdrawn' ? ' (withdrawn)' : ''}.
            {slice ? ` Verified backing ${slice.recognized.toString()}${slice.unavailableReason ? ` (${slice.unavailableReason})` : ''}.` : ' No current backing slice.'}
            {' '}This amount is not available separately to every response.
          </Typography>
        )
      })}
      {clients && contracts && (
        <Stack spacing={1}>
          <TextField label="Offer amount (base units)" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} />
          <TextField label="Settlement token" value={offerToken} onChange={(event) => setOfferToken(event.target.value)} />
          <TextField label="Expiry ISO time" value={offerExpiry} onChange={(event) => setOfferExpiry(event.target.value)} />
          <TextField label="Backing note id (optional)" value={offerNote} onChange={(event) => setOfferNote(event.target.value)} />
          <Button variant="outlined" onClick={() => void run(() => publishWorkOffer(clients, contracts, {
            slug: `offer-${Date.now()}`,
            requestVersionCid: current.cid,
            amount: offerAmount,
            token: offerToken,
            chainId: clients.walletClient.chain?.id ?? 0,
            expiry: offerExpiry,
            approvalAuthority: 'offer-author',
            conditions: '',
            backingNoteId: offerNote || null,
            status: 'open',
            previousCid: null,
          }))}>Publish offer on the current version</Button>
        </Stack>
      )}

      <Typography variant="subtitle2">Responses</Typography>
      {responses.map((response) => {
        const acceptance = board.acceptances.find((item) => item.responseOwner === response.actor && item.responseSlug === response.slug && item.authorityMatchesProvider)
        return (
          <Stack key={`${response.actor}:${response.slug}`} spacing={0.5}>
            <Typography variant="body2">
              {response.actor} responds with project{' '}
              <Button component={RouterLink} to={`/projects/${response.current?.body.projectAddress}`} sx={{ px: 0, minWidth: 0 }}>
                {response.current?.body.projectAddress}
              </Button>
              {' '}for work {response.current?.body.workItemIds.join(', ')}.
              Scope: {response.current?.body.scope}. Exceptions: {response.current?.body.exceptions || 'none'}.
              {acceptance?.current ? ` Provider accepted: ${acceptance.current.body.capacity}.` : ' Provider has not accepted these terms.'}
            </Typography>
            {offers.map((offer) => {
              const decision = decisionFor(board, offer, response)
              return (
                <Typography key={`${offer.slug}:${response.slug}`} variant="caption">
                  {offer.slug}: {decision?.current ? decision.current.body.outcome : 'no recorded decision'}.
                  {decision?.current?.body.explanation ? ` ${decision.current.body.explanation}` : ''}
                </Typography>
              )
            })}
            {clients && contracts && address && address.toLowerCase() === offerAuthor(offers, address) && offers[0] && response.current && (
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => void run(() => publishWorkDecision(clients, contracts, {
                  offerOwner: address!,
                  offerSlug: offers[0]!.slug,
                  responseOwner: response.actor,
                  responseSlug: response.slug,
                  offerVersionCid: offers[0]!.current!.cid,
                  responseVersionCid: response.current!.cid,
                  outcome: 'approve',
                  explanation: '',
                  previousCid: null,
                }))}>Approve first offer</Button>
                <Button size="small" onClick={() => void run(() => publishWorkDecision(clients, contracts, {
                  offerOwner: address!,
                  offerSlug: offers[0]!.slug,
                  responseOwner: response.actor,
                  responseSlug: response.slug,
                  offerVersionCid: offers[0]!.current!.cid,
                  responseVersionCid: response.current!.cid,
                  outcome: 'decline',
                  explanation: '',
                  previousCid: null,
                }))}>Decline first offer</Button>
              </Stack>
            )}
          </Stack>
        )
      })}

      {clients && contracts && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Link a project</Typography>
          <TextField label="Project address" value={project} onChange={(event) => setProject(event.target.value)} />
          <TextField label="Provider address" value={provider} onChange={(event) => setProvider(event.target.value)} />
          <TextField label="Work item ids, comma separated" value={workItems} onChange={(event) => setWorkItems(event.target.value)} />
          <TextField label="Scope" value={scope} onChange={(event) => setScope(event.target.value)} />
          <TextField label="Exceptions" value={exceptions} onChange={(event) => setExceptions(event.target.value)} />
          <Button variant="outlined" onClick={() => void run(async () => {
            const responseSlug = `response-${Date.now()}`
            await publishWorkResponse(clients, contracts, {
              slug: responseSlug,
              requestVersionCid: current.cid,
              chainId: clients.walletClient.chain?.id ?? 0,
              projectAddress: project,
              providerAddress: provider,
              workItemIds: workItems.split(',').map((item) => item.trim()),
              scope,
              exceptions,
              capacity: '',
              previousCid: null,
            })
          })}>Publish response</Button>
          <Button variant="outlined" onClick={() => void run(() => publishWorkAcceptance(clients, contracts, {
            responseOwner: address ?? provider,
            responseSlug: responses.find((response) => response.actor === (address ?? '').toLowerCase())?.slug ?? '',
            responseVersionCid: responses.find((response) => response.actor === (address ?? '').toLowerCase())?.current?.cid ?? current.cid,
            capacity: 'I accept these terms',
            previousCid: null,
          }))}>Accept my response as provider</Button>
          <TextField label="Contribution transaction hash" value={contributionTx} onChange={(event) => setContributionTx(event.target.value)} />
          <TextField label="Refund transaction hash, if the contribution was later refunded" value={refundTx} onChange={(event) => setRefundTx(event.target.value)} />
          <Button variant="outlined" onClick={() => void run(() => publishContributionLink(clients, contracts, {
            slug: `link-${Date.now()}`,
            offerVersionCid: offers[0]?.current?.cid ?? current.cid,
            responseVersionCid: responses[0]?.current?.cid ?? current.cid,
            chainId: clients.walletClient.chain?.id ?? 0,
            projectAddress: project || responses[0]?.current?.body.projectAddress || `0x${'11'.repeat(20)}`,
            txHash: contributionTx,
            amount: offerAmount || '1',
            token: offerToken || `0x${'11'.repeat(20)}`,
            refundTxHash: refundTx || null,
            previousCid: null,
          }))}>Record a contribution link</Button>
        </Stack>
      )}
      {message && <Typography variant="body2">{message}</Typography>}
      <Button component={RouterLink} to="/work/requests" sx={{ px: 0, alignSelf: 'flex-start' }}>All requests</Button>
    </Stack>
  )
}

function offerAuthor(offers: WorkRequestBoard['offers'], address: string | undefined): string | undefined {
  if (!address) return undefined
  return offers.some((offer) => offer.actor === address.toLowerCase()) ? address.toLowerCase() : undefined
}
