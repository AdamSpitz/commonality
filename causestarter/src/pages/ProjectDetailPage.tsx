/**
 * CauseStarter host for the shared lazy-giving {@link ProjectDetailPage}.
 * Project detail is first-class on CauseStarter (not a deep-link out to LazyGiving).
 * Error/not-found recovery goes to Causes — there is no `/projects` index route.
 */
import { ProjectDetailPage as LazyGivingProjectDetailPage } from '@ui/lazy-giving/pages/ProjectDetailPage'

export function ProjectDetailPage() {
  return (
    <LazyGivingProjectDetailPage
      listPath="/causes"
      listLabel="Back to causes"
    />
  )
}

/** Full contributor table for a single project. */
export function ProjectLeaderboardPage() {
  return (
    <LazyGivingProjectDetailPage
      listPath="/causes"
      listLabel="Back to causes"
      variant="leaderboard"
    />
  )
}
