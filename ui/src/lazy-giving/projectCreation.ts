export interface ProjectTokenDraft {
  tokenId: string
  supply: string
  price: string
  name?: string
}

export interface ProjectTokenPreviewRow {
  tokenId: string
  supply: bigint | null
  price: bigint | null
  capacity: bigint | null
  label: string
}

export interface ProjectTokenCapacitySummary {
  rows: ProjectTokenPreviewRow[]
  totalCapacity: bigint
  smallestPrice: bigint | null
}

export interface SuggestedGivingLevelDraft extends ProjectTokenDraft {
  imageFile?: unknown
  imagePreviewUrl?: string | null
}

export const SUGGESTED_GIVING_LEVELS = [25, 50, 100] as const
export const KEEP_ACCEPTING_DEFAULT_SUPPLY = '1000000'

export function parseDecimalAmount(value: string, decimals: number): bigint | null {
  const trimmed = value.trim()
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return null

  const [whole, fraction = ''] = trimmed.split('.')
  if (fraction.length > decimals) return null

  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0')
}

function parsePositiveInteger(value: string): bigint | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = BigInt(trimmed)
  return parsed > 0n ? parsed : null
}

export function summarizeProjectTokenCapacity(tokens: ProjectTokenDraft[], decimals: number): ProjectTokenCapacitySummary {
  let totalCapacity = 0n
  let smallestPrice: bigint | null = null

  const rows = tokens.map(token => {
    const supply = parsePositiveInteger(token.supply)
    const price = parseDecimalAmount(token.price, decimals)
    const capacity = supply !== null && price !== null ? supply * price : null

    if (capacity !== null) totalCapacity += capacity
    if (price !== null && price > 0n && (smallestPrice === null || price < smallestPrice)) {
      smallestPrice = price
    }

    return {
      tokenId: token.tokenId,
      supply,
      price,
      capacity,
      label: token.name?.trim() || `Token #${token.tokenId}`,
    }
  })

  return { rows, totalCapacity, smallestPrice }
}

export function formatTokenCapacityPreviewRows(tokens: ProjectTokenDraft[], decimals: number, symbol: string): string[] {
  return summarizeProjectTokenCapacity(tokens, decimals).rows.map(row => {
    const price = row.price === null ? '—' : formatCurrencyAmount(row.price, decimals, symbol)
    const capacity = row.capacity === null ? '—' : formatCurrencyAmount(row.capacity, decimals, symbol)
    const supply = row.supply === null ? '—' : row.supply.toString()
    return `${row.label}: ${supply} × ${price} = ${capacity}`
  })
}

export function suggestGivingLevels<T extends SuggestedGivingLevelDraft>(tokens: T[], goal: string, stopAtGoal: boolean, decimals: number): T[] {
  const existingIds = tokens.map(token => Number.parseInt(token.tokenId, 10)).filter(Number.isFinite)
  let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0

  const suggestedAmounts = stopAtGoal ? suggestedAmountsWithinGoal(goal, decimals) : [...SUGGESTED_GIVING_LEVELS]
  const suggestedTiers = suggestedAmounts.map(amount => ({
    tokenId: String(nextId++),
    supply: stopAtGoal ? '1' : KEEP_ACCEPTING_DEFAULT_SUPPLY,
    price: String(amount),
    name: `$${amount} Supporter`,
    imageFile: null,
    imagePreviewUrl: null,
  }) as T)

  const updatedTokens = tokens.map(token => isOneUnitToken(token, decimals)
    ? { ...token, supply: supplyForSmallDonationToken(goal, stopAtGoal, decimals, suggestedTiers) }
    : token)

  return [...updatedTokens, ...suggestedTiers]
}

export function hasOneUnitDonationOption(tokens: ProjectTokenDraft[], decimals: number): boolean {
  return tokens.some(token => isOneUnitToken(token, decimals))
}

function suggestedAmountsWithinGoal(goal: string, decimals: number): number[] {
  const goalAmount = parseDecimalAmount(goal, decimals)
  if (goalAmount === null || goalAmount <= 0n) return [...SUGGESTED_GIVING_LEVELS]

  let reserved = 0n
  const selected: number[] = []
  for (const amount of SUGGESTED_GIVING_LEVELS) {
    const parsedAmount = parseDecimalAmount(String(amount), decimals)
    if (parsedAmount !== null && reserved + parsedAmount <= goalAmount) {
      selected.push(amount)
      reserved += parsedAmount
    }
  }
  return selected
}

function isOneUnitToken(token: ProjectTokenDraft, decimals: number): boolean {
  return parseDecimalAmount(token.price, decimals) === 10n ** BigInt(decimals)
}

function supplyForSmallDonationToken(goal: string, stopAtGoal: boolean, decimals: number, suggestedTiers: ProjectTokenDraft[]): string {
  if (!stopAtGoal) return KEEP_ACCEPTING_DEFAULT_SUPPLY

  const goalAmount = parseDecimalAmount(goal, decimals)
  if (goalAmount === null || goalAmount <= 0n) return ''

  const reservedCapacity = summarizeProjectTokenCapacity(suggestedTiers, decimals).totalCapacity
  const oneUnit = 10n ** BigInt(decimals)
  const remainder = goalAmount > reservedCapacity ? goalAmount - reservedCapacity : 0n
  return (remainder / oneUnit).toString()
}

export function formatCurrencyAmount(amount: bigint, decimals: number, symbol: string): string {
  const scale = 10n ** BigInt(decimals)
  const whole = amount / scale
  const fraction = amount % scale
  if (fraction === 0n) return `${whole.toString()} ${symbol}`

  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole.toString()}.${fractionText} ${symbol}`
}
