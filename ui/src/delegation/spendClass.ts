/** Contract classes: 0 unmarked, 1 unsuspicious. Anything else is the reserved suspicious class. */
export function spendClassLabel(spendClass: number): 'Unsuspicious' | 'Unmarked' | 'Suspicious' {
  if (spendClass === 1) return 'Unsuspicious'
  if (spendClass === 0) return 'Unmarked'
  return 'Suspicious'
}

export function isSuspiciousClass(spendClass: number): boolean {
  return spendClassLabel(spendClass) === 'Suspicious'
}

export function secondsToHourInput(seconds: bigint): string {
  if (seconds % 3600n === 0n) return (seconds / 3600n).toString()
  return (Number(seconds) / 3600).toFixed(2)
}

export function hoursInputToSeconds(input: string): bigint | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const hours = Number(trimmed)
  const seconds = Math.round(hours * 3600)
  if (!Number.isSafeInteger(seconds)) return null
  return BigInt(seconds)
}

export function formatPendingSpendDeadline(deadlineSeconds: bigint, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const when = new Date(Number(deadlineSeconds) * 1000).toLocaleString()
  if (Number(deadlineSeconds) <= nowSeconds) {
    return `Due ${when}. Anyone can complete it. It can still be cancelled, and it is not counted as raised.`
  }
  return `Waiting until ${when}. It can still be cancelled, and it is not counted as raised.`
}
