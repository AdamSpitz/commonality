import type { Project } from '@commonality/sdk'

export type ProjectStatus = 'active' | 'succeeded' | 'refunding'

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
