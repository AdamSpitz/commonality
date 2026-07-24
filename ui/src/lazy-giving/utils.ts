import type { Project, Contribution, Refund } from '@commonality/sdk/lazy-giving'
import { ETH_CURRENCY } from '@commonality/sdk/utils'

export type ProjectStatus = 'active' | 'succeeded' | 'refunding'

export type TokenBalance = { tokenId: string; count: bigint }

export function getProjectStatus(project: Pick<Project, 'totalReceived' | 'threshold' | 'deadline'>): ProjectStatus {
  const now = Math.floor(Date.now() / 1000)
  const deadline = Number(project.deadline)
  const thresholdMet = BigInt(project.totalReceived) >= BigInt(project.threshold)

  if (thresholdMet) return 'succeeded'
  if (deadline < now) return 'refunding'
  return 'active'
}

export const STATUS_COLORS: Record<ProjectStatus, 'success' | 'warning' | 'info'> = {
  active: 'info',
  succeeded: 'success',
  refunding: 'warning',
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Funding',
  succeeded: 'Succeeded',
  refunding: 'Refunding',
}

export function formatRelativeDeadline(deadlineStr: string): string {
  const deadline = Number(deadlineStr)
  const now = Math.floor(Date.now() / 1000)
  const diff = deadline - now

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export function computeUserTokenBalance(
  address: string | undefined,
  contributions: Contribution[],
  refunds: Refund[],
): TokenBalance[] {
  if (!address) return []
  const userAddr = address.toLowerCase()

  const held = new Map<string, bigint>()

  for (const c of contributions) {
    if (c.participant.toLowerCase() !== userAddr) continue
    const ids: string[] = JSON.parse(c.tokenIds)
    const counts: string[] = JSON.parse(c.tokenCounts)
    for (let i = 0; i < ids.length; i++) {
      const prev = held.get(ids[i]) ?? 0n
      held.set(ids[i], prev + BigInt(counts[i]))
    }
  }

  for (const r of refunds) {
    if (r.participant.toLowerCase() !== userAddr) continue
    const ids: string[] = JSON.parse(r.tokenIds)
    const counts: string[] = JSON.parse(r.tokenCounts)
    for (let i = 0; i < ids.length; i++) {
      const prev = held.get(ids[i]) ?? 0n
      held.set(ids[i], prev - BigInt(counts[i]))
    }
  }

  return Array.from(held.entries())
    .filter(([, count]) => count > 0n)
    .map(([tokenId, count]) => ({ tokenId, count }))
}

export function computeContributorStats(contributions: Contribution[], refunds: Refund[]) {
  const stats = new Map<string, { contributed: bigint; refunded: bigint; currency: Contribution['currency'] | Refund['currency'] }>()

  for (const c of contributions) {
    const addr = c.participant.toLowerCase()
    const entry = stats.get(addr) ?? { contributed: 0n, refunded: 0n, currency: c.currency }
    entry.contributed += BigInt(c.totalCost)
    stats.set(addr, entry)
  }

  for (const r of refunds) {
    const addr = r.participant.toLowerCase()
    const entry = stats.get(addr) ?? { contributed: 0n, refunded: 0n, currency: r.currency }
    entry.refunded += BigInt(r.totalRefund)
    stats.set(addr, entry)
  }

  return Array.from(stats.entries())
    .map(([address, { contributed, refunded, currency }]) => ({
      address,
      currency: currency ?? ETH_CURRENCY,
      contributed,
      refunded,
      net: contributed - refunded,
    }))
    .filter(e => e.net > 0n)
    .sort((a, b) => (b.net > a.net ? 1 : b.net < a.net ? -1 : 0))
}
