/**
 * CauseStarter host for the shared lazy-giving {@link ProjectDetailPage}.
 * Project detail is first-class on CauseStarter (not a deep-link out to LazyGiving).
 * Error/not-found recovery goes to home — there is no public `/projects` index.
 */
import { Stack } from '@mui/material'
import { ProjectDetailPage as LazyGivingProjectDetailPage } from '@ui/lazy-giving/pages/ProjectDetailPage'
import { ProjectBookmarkButton } from '../components/ProjectBookmarkButton'

export function ProjectDetailPage() {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="flex-end">
        <ProjectBookmarkButton />
      </Stack>
      <LazyGivingProjectDetailPage
        listPath="/dashboard"
        listLabel="Back to Fund"
      />
    </Stack>
  )
}

/** Full contributor table for a single project. */
export function ProjectLeaderboardPage() {
  return (
    <LazyGivingProjectDetailPage
      listPath="/causes"
      listLabel="Back to cause boards"
      variant="leaderboard"
    />
  )
}
