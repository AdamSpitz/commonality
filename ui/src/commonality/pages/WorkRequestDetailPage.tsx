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
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import type { Abi } from 'viem'
import { useAccount } from 'wagmi'
import { useMachinery, useWriteClients } from '../../shared'
import { useWorkRequests } from '../hooks/useWorkRequests'

function formatTotals(board: WorkRequestBoard, request: WorkRequestBoard['requests'][number]): string[] {
  return totalsForRequest(board, request, Date.now()).map((totals) =>
    `${totals.verifiedBacking} base units backed on chain ${totals.chainId}, ${totals.unfundedIntention} unfunded intention, ${totals.approved} recorded as approved, ${totals.contributed} reported as contributed, ${totals.refunded} reported as refunded (transactions unverified). Token ${totals.token}.`,
  )
}

export function WorkRequestDetailPage() {
  const { author = '', slug = '' } = useParams()
  const { board, loading, error, reload } = useWorkRequests()
  const machinery = useMachinery()
  const clients = useWriteClients()
  const { address } = useAccount()
  const [pending, setPending] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState('')
  const [selectedResponse, setSelectedResponse] = useState('')
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
    setPending(true)
    try {
      await action()
      setMessage('Published. Refreshing.')
      reload()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Publish failed.')
    } finally {
      setPending(false)
    }
  }

  if (loading) return <Typography>Loading request…</Typography>
  if (error) return <Typography color="error">{error}</Typography>
  if (!request?.current || !board) return <Typography>This request is not published.</Typography>

  const versionCids = requestVersionCids(request)
  const offers = board.offers.filter((offer) => offer.current && versionCids.has(offer.current.body.requestVersionCid))
  const responses = board.responses.filter((response) => response.current && versionCids.has(response.current.body.requestVersionCid))
  const current = request.current
  const linkedOffer = offers.find((offer) => `${offer.actor}:${offer.slug}` === selectedOffer)
  const linkedResponse = responses.find((response) => `${response.actor}:${response.slug}` === selectedResponse)
  const linkMatches = linkedOffer?.current && linkedResponse?.current
    && linkedOffer.current.body.requestVersionCid === linkedResponse.current.body.requestVersionCid
    && linkedOffer.actor === address?.toLowerCase()
    && linkedOffer.current.body.chainId === linkedResponse.current.body.chainId

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
          <Button variant="outlined" disabled={pending} onClick={() => void run(() => publishWorkOffer(clients, contracts, {
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
            {clients && contracts && offers.filter((offer) => offer.actor === address?.toLowerCase()
              && offer.current?.body.requestVersionCid === response.current?.body.requestVersionCid).map((offer) => (
              <Stack key={`${offer.actor}:${offer.slug}`} direction="row" spacing={1}>
                {(['approve', 'decline'] as const).map((outcome) => (
                  <Button key={outcome} size="small" disabled={pending} onClick={() => void run(() => publishWorkDecision(clients, contracts, {
                    offerOwner: offer.actor,
                    offerSlug: offer.slug,
                    responseOwner: response.actor,
                    responseSlug: response.slug,
                    offerVersionCid: offer.current!.cid,
                    responseVersionCid: response.current!.cid,
                    outcome,
                    explanation: '',
                    previousCid: decisionFor(board, offer, response)?.current?.cid ?? null,
                  }))}>{outcome === 'approve' ? 'Approve' : 'Decline'} {offer.slug}</Button>
                ))}
              </Stack>
            ))}
            {clients && contracts && response.current?.body.providerAddress.toLowerCase() === address?.toLowerCase() && (
              <Button disabled={pending} onClick={() => void run(() => publishWorkAcceptance(clients, contracts, {
                responseOwner: response.actor,
                responseSlug: response.slug,
                responseVersionCid: response.current!.cid,
                capacity: 'I accept these terms',
                previousCid: acceptance?.current?.cid ?? null,
              }))}>Accept {response.slug} as provider</Button>
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
          <Button variant="outlined" disabled={pending} onClick={() => void run(async () => {
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
          <Typography variant="subtitle2">Report a contribution</Typography>
          <Typography variant="body2">These links are claims by the publisher. Contribution and refund transactions are not yet verified.</Typography>
          <TextField select label="Offer" value={selectedOffer} onChange={(event) => setSelectedOffer(event.target.value)}>
            {offers.map((offer) => <MenuItem key={`${offer.actor}:${offer.slug}`} value={`${offer.actor}:${offer.slug}`}>{offer.actor} · {offer.slug}</MenuItem>)}
          </TextField>
          <TextField select label="Response" value={selectedResponse} onChange={(event) => setSelectedResponse(event.target.value)}>
            {responses.map((response) => <MenuItem key={`${response.actor}:${response.slug}`} value={`${response.actor}:${response.slug}`}>{response.actor} · {response.slug}</MenuItem>)}
          </TextField>
          <TextField label="Contribution amount (base units)" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} />
          <TextField label="Contribution transaction hash" value={contributionTx} onChange={(event) => setContributionTx(event.target.value)} />
          <TextField label="Refund transaction hash, if the contribution was later refunded" value={refundTx} onChange={(event) => setRefundTx(event.target.value)} />
          <Button variant="outlined" disabled={pending || !linkMatches} onClick={() => void run(() => publishContributionLink(clients, contracts, {
            slug: `link-${Date.now()}`,
            offerVersionCid: linkedOffer!.current!.cid,
            responseVersionCid: linkedResponse!.current!.cid,
            chainId: linkedOffer!.current!.body.chainId,
            projectAddress: linkedResponse!.current!.body.projectAddress,
            txHash: contributionTx,
            amount: offerAmount,
            token: linkedOffer!.current!.body.token,
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
