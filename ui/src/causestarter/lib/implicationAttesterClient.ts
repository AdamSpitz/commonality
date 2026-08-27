/**
 * Pay the implication attester and submit plank pairs.
 *
 * The attester judges statements and writes ImplicationAttestation events.
 * This client does not invent arrows: a refused pair is reported, not forced.
 */

import { parseEther } from 'viem'
import type { WriteClients } from '@commonality/sdk/utils'
import { getRuntimeConfigValue } from '../../shared'

export interface AttesterPair {
  fromCid: string
  toCid: string
}

export interface AttesterPairResult {
  fromCid: string
  toCid: string
  success: boolean
  decision?: boolean
  confidence?: 'high' | 'medium' | 'low'
  explanation?: string
  transactionHash?: string | null
  error?: string
}

export interface SubmitPairsResult {
  paid: boolean
  paymentTxHash?: string
  results: AttesterPairResult[]
}

interface PaymentDetails {
  amount: string
  amountUsd?: string
  currency?: string
  address: string
  paymentId: string
}

const BATCH_SIZE = 10

export function implicationAttesterBaseUrl(): string {
  const configured = getRuntimeConfigValue('VITE_IMPLICATION_ATTESTER_URL')
  if (configured?.trim()) return configured.replace(/\/$/, '')
  return '/api/implication-attester'
}

function formatPairSummary(results: AttesterPairResult[]): string {
  if (results.length === 0) return 'No pairs submitted.'
  return results.map((result) => {
    if (!result.success) {
      return `Refused or failed ${result.fromCid.slice(0, 10)}… → ${result.toCid.slice(0, 10)}…: ${result.error ?? 'unknown error'}`
    }
    if (result.decision && result.transactionHash) {
      return `Attested ${result.fromCid.slice(0, 10)}… → ${result.toCid.slice(0, 10)}… (${result.confidence ?? 'n/a'})`
    }
    if (result.decision) {
      return `Would imply ${result.fromCid.slice(0, 10)}… → ${result.toCid.slice(0, 10)}… but no on-chain write (${result.explanation ?? 'no explanation'})`
    }
    return `Does not imply ${result.fromCid.slice(0, 10)}… → ${result.toCid.slice(0, 10)}… (${result.confidence ?? 'n/a'}): ${result.explanation ?? ''}`
  }).join('\n')
}

export { formatPairSummary }

function parsePaymentDetails(body: unknown): PaymentDetails | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  const details = (record.paymentDetails && typeof record.paymentDetails === 'object')
    ? record.paymentDetails as Record<string, unknown>
    : record
  const amount = typeof details.amount === 'string' ? details.amount : ''
  const address = typeof details.address === 'string' ? details.address : ''
  const paymentId = typeof details.paymentId === 'string' ? details.paymentId : ''
  if (!amount || !address.startsWith('0x') || !paymentId) return null
  return {
    amount,
    amountUsd: typeof details.amountUsd === 'string' ? details.amountUsd : undefined,
    currency: typeof details.currency === 'string' ? details.currency : 'ETH',
    address,
    paymentId,
  }
}

async function postBatch(
  url: string,
  evaluations: AttesterPair[],
  paymentProof?: string,
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (paymentProof) headers['x-payment-proof'] = paymentProof
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      evaluations: evaluations.map((pair) => ({
        fromStatementCid: pair.fromCid,
        toStatementCid: pair.toCid,
      })),
    }),
  })
  const body = await response.json().catch(() => null)
  return { status: response.status, body }
}

function parseResults(body: unknown): AttesterPairResult[] {
  if (!body || typeof body !== 'object') return []
  const results = (body as { results?: unknown }).results
  if (!Array.isArray(results)) return []
  return results.flatMap((item): AttesterPairResult[] => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const fromCid = typeof record.fromStatementCid === 'string' ? record.fromStatementCid : ''
    const toCid = typeof record.toStatementCid === 'string' ? record.toStatementCid : ''
    if (!fromCid || !toCid) return []
    return [{
      fromCid,
      toCid,
      success: record.success === true,
      decision: typeof record.decision === 'boolean' ? record.decision : undefined,
      confidence: record.confidence === 'high' || record.confidence === 'medium' || record.confidence === 'low'
        ? record.confidence
        : undefined,
      explanation: typeof record.explanation === 'string' ? record.explanation : undefined,
      transactionHash: typeof record.transactionHash === 'string' ? record.transactionHash : null,
      error: typeof record.error === 'string' ? record.error : undefined,
    }]
  })
}

async function payQuote(
  writeClients: WriteClients,
  details: PaymentDetails,
): Promise<`0x${string}`> {
  const hash = await writeClients.walletClient.sendTransaction({
    to: details.address as `0x${string}`,
    value: parseEther(details.amount),
    account: writeClients.account,
    chain: writeClients.walletClient.chain,
  })
  await writeClients.publicClient.waitForTransactionReceipt({ hash })
  return hash
}

export async function submitPairsToAttester(args: {
  writeClients: WriteClients
  pairs: AttesterPair[]
}): Promise<SubmitPairsResult> {
  const { writeClients, pairs } = args
  if (pairs.length === 0) {
    throw new Error('Record at least one plank pair before paying the attester.')
  }
  const endpoint = `${implicationAttesterBaseUrl()}/evaluate-implications-batch`
  const allResults: AttesterPairResult[] = []
  let paid = false
  let paymentTxHash: string | undefined
  let reusedProof: string | undefined

  for (let offset = 0; offset < pairs.length; offset += BATCH_SIZE) {
    const batch = pairs.slice(offset, offset + BATCH_SIZE)
    const first = await postBatch(endpoint, batch, reusedProof)
    let proof = reusedProof
    if (first.status === 402) {
      const details = parsePaymentDetails(first.body)
      if (!details) {
        throw new Error('Implication attester asked for payment but did not return a quote.')
      }
      paymentTxHash = await payQuote(writeClients, details)
      paid = true
      proof = `payment:${details.paymentId}`
      reusedProof = proof
    } else if (first.status >= 200 && first.status < 300) {
      allResults.push(...parseResults(first.body))
      continue
    } else {
      const message = first.body && typeof first.body === 'object' && 'message' in first.body
        ? String((first.body as { message: unknown }).message)
        : `Attester returned HTTP ${first.status}`
      throw new Error(message)
    }

    const second = await postBatch(endpoint, batch, proof)
    if (second.status < 200 || second.status >= 300) {
      const message = second.body && typeof second.body === 'object' && 'message' in second.body
        ? String((second.body as { message: unknown }).message)
        : `Attester returned HTTP ${second.status} after payment`
      throw new Error(message)
    }
    allResults.push(...parseResults(second.body))
  }

  return { paid, paymentTxHash, results: allResults }
}
