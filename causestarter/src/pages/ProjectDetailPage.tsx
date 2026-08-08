/**
 * CauseStarter host for the shared lazy-giving {@link ProjectDetailPage}.
 * Project detail is first-class on CauseStarter (not a deep-link out to LazyGiving).
 * Error/not-found recovery goes to Momentum — there is no `/projects` index route.
 */
import { ProjectDetailPage as LazyGivingProjectDetailPage } from '@ui/lazy-giving/pages/ProjectDetailPage'

export function ProjectDetailPage() {
  return (
    <LazyGivingProjectDetailPage
      listPath="/momentum"
      listLabel="Back to momentum"
    />
  )
}
