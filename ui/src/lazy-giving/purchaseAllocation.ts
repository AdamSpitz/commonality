export interface PurchaseAllocationToken {
  tokenId: string
  price: string | bigint
  /** Optional primary-market availability. Omit when the UI does not know the remaining supply. */
  availableCount?: string | bigint | number | null
}

export type PurchaseAllocationStatus = 'exact' | 'snapped' | 'impossible'

export interface PurchaseAllocationResult {
  status: PurchaseAllocationStatus
  tokenIds: bigint[]
  tokenCounts: bigint[]
  totalCost: bigint
  requestedAmount: bigint
  message?: string
}

export interface PurchaseAllocationOptions {
  /** Token counts the donor explicitly selected first, e.g. an add-on reward tier. */
  addOns?: Record<string, bigint | number | string>
}

interface NormalizedToken {
  tokenId: string
  tokenIdBigInt: bigint
  price: bigint
  maxCount: bigint | null
}

function toBigInt(value: string | bigint | number): bigint {
  return typeof value === 'bigint' ? value : BigInt(value)
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    const next = x % y
    x = y
    y = next
  }
  return x
}

function normalizeTokens(tokens: PurchaseAllocationToken[]): NormalizedToken[] {
  return tokens
    .map(token => ({
      tokenId: token.tokenId,
      tokenIdBigInt: BigInt(token.tokenId),
      price: toBigInt(token.price),
      maxCount: token.availableCount == null ? null : toBigInt(token.availableCount),
    }))
    .filter(token => token.price > 0n && token.maxCount !== 0n)
    .sort((a, b) => a.price === b.price ? Number(a.tokenIdBigInt - b.tokenIdBigInt) : (a.price > b.price ? -1 : 1))
}

function mergeCounts(counts: Map<string, bigint>, tokenId: string, count: bigint) {
  if (count <= 0n) return
  counts.set(tokenId, (counts.get(tokenId) ?? 0n) + count)
}

function countsToResult(tokens: NormalizedToken[], counts: Map<string, bigint>, requestedAmount: bigint, status: PurchaseAllocationStatus, message?: string): PurchaseAllocationResult {
  const tokenIds: bigint[] = []
  const tokenCounts: bigint[] = []
  let totalCost = 0n
  const byId = new Map(tokens.map(token => [token.tokenId, token]))

  for (const token of tokens) {
    const count = counts.get(token.tokenId) ?? 0n
    if (count <= 0n) continue
    tokenIds.push(token.tokenIdBigInt)
    tokenCounts.push(count)
    totalCost += count * (byId.get(token.tokenId)?.price ?? 0n)
  }

  return { status, tokenIds, tokenCounts, totalCost, requestedAmount, message }
}

/**
 * Allocate a donor-entered amount across fixed-price ERC-1155 token types.
 *
 * The helper is deliberately UI-agnostic: amounts are already in the project's
 * smallest currency unit (wei/base units). If an exact allocation is impossible,
 * it returns the largest reachable amount below the request as `snapped` rather
 * than pretending the typed amount can be charged.
 */
export function allocatePurchaseAmount(
  tokens: PurchaseAllocationToken[],
  desiredAmount: string | bigint | number,
  options: PurchaseAllocationOptions = {},
): PurchaseAllocationResult {
  const requestedAmount = toBigInt(desiredAmount)
  const normalized = normalizeTokens(tokens)
  if (requestedAmount <= 0n) {
    return { status: 'impossible', tokenIds: [], tokenCounts: [], totalCost: 0n, requestedAmount, message: 'Enter an amount greater than zero.' }
  }
  if (normalized.length === 0) {
    return { status: 'impossible', tokenIds: [], tokenCounts: [], totalCost: 0n, requestedAmount, message: 'No contribution options are available.' }
  }

  const counts = new Map<string, bigint>()
  const remainingAvailability = new Map(normalized.map(token => [token.tokenId, token.maxCount]))
  let addOnCost = 0n
  for (const [tokenId, rawCount] of Object.entries(options.addOns ?? {})) {
    const count = toBigInt(rawCount)
    if (count <= 0n) continue
    const token = normalized.find(candidate => candidate.tokenId === tokenId)
    if (!token) continue
    const available = remainingAvailability.get(tokenId)
    const usable = available == null ? count : count <= available ? count : available
    mergeCounts(counts, tokenId, usable)
    if (available != null) remainingAvailability.set(tokenId, available - usable)
    addOnCost += usable * token.price
  }

  if (addOnCost > requestedAmount) {
    return countsToResult(normalized, counts, requestedAmount, 'impossible', 'Selected add-ons cost more than the desired amount.')
  }

  const fillTarget = requestedAmount - addOnCost
  if (fillTarget === 0n) return countsToResult(normalized, counts, requestedAmount, 'exact')

  const fillTokens = normalized.map(token => ({ ...token, maxCount: remainingAvailability.get(token.tokenId) ?? null }))
  const divisor = fillTokens.reduce((acc, token) => gcd(acc, token.price), fillTokens[0].price)
  const targetUnits = fillTarget / divisor
  const canRepresentRequestedAmount = fillTarget % divisor === 0n
  const dpLimit = 10000n
  if (targetUnits > dpLimit) {
    const smallest = [...fillTokens].sort((a, b) => a.price < b.price ? -1 : 1)[0]
    const count = fillTarget / smallest.price
    const cappedCount = smallest.maxCount == null || count <= smallest.maxCount ? count : smallest.maxCount
    if (cappedCount > 0n) mergeCounts(counts, smallest.tokenId, cappedCount)
    const status = cappedCount * smallest.price === fillTarget ? 'exact' : 'snapped'
    return countsToResult(normalized, counts, requestedAmount, status, status === 'snapped' ? 'Amount snapped to the nearest reachable contribution.' : undefined)
  }

  const target = Number(targetUnits)
  const dp: Array<Map<string, bigint> | null> = Array(target + 1).fill(null)
  dp[0] = new Map()
  for (const token of fillTokens) {
    const priceUnits = Number(token.price / divisor)
    const maxByAmount = BigInt(Math.floor(target / priceUnits))
    const maxCount = token.maxCount == null || token.maxCount > maxByAmount ? maxByAmount : token.maxCount
    for (let used = 0n; used < maxCount; used++) {
      for (let amount = target - priceUnits; amount >= 0; amount--) {
        const prev = dp[amount]
        if (!prev || dp[amount + priceUnits]) continue
        const next = new Map(prev)
        mergeCounts(next, token.tokenId, 1n)
        dp[amount + priceUnits] = next
      }
    }
  }

  for (let amount = target; amount >= 1; amount--) {
    const fillCounts = dp[amount]
    if (!fillCounts) continue
    for (const [tokenId, count] of fillCounts) mergeCounts(counts, tokenId, count)
    const status = amount === target && canRepresentRequestedAmount ? 'exact' : 'snapped'
    return countsToResult(normalized, counts, requestedAmount, status, status === 'snapped' ? 'Amount snapped to the nearest reachable contribution.' : undefined)
  }

  return countsToResult(normalized, counts, requestedAmount, 'impossible', 'No available contribution option can fit this amount.')
}
