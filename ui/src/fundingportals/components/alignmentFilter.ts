/** How a cause-board project list treats implied (indirect) alignment. */
export type AlignmentFilter = 'all' | 'direct'

export const ALIGNMENT_FILTERS: readonly AlignmentFilter[] = ['all', 'direct'] as const

export const ALIGNMENT_FILTER_LABELS: Record<AlignmentFilter, string> = {
  all: 'All',
  direct: 'Direct only',
}
