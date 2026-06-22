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

export function formatCurrencyAmount(amount: bigint, decimals: number, symbol: string): string {
  const scale = 10n ** BigInt(decimals)
  const whole = amount / scale
  const fraction = amount % scale
  if (fraction === 0n) return `${whole.toString()} ${symbol}`

  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole.toString()}.${fractionText} ${symbol}`
}
