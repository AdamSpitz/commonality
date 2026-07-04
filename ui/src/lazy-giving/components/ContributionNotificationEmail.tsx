import { Alert, Link } from '@mui/material'
import type { Project } from '@commonality/sdk/lazy-giving'
import { buildContributionNotificationEmail, fundingSymbol, type ContributionNotificationKind } from './contributionNotificationEmailUtils'

interface ContributionNotificationEmailProps {
  kind: ContributionNotificationKind
  project: Project
  txUrl?: string | null
}

export function ContributionNotificationEmail({ kind, project, txUrl }: ContributionNotificationEmailProps) {
  const href = buildContributionNotificationEmail(kind, project, txUrl)

  if (kind === 'confirmation') {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Walletless/on-ramp contributor? Send yourself a confirmation email with the onchain transaction link and refund reminder:{' '}
        <Link href={href}>email confirmation receipt</Link>.
      </Alert>
    )
  }

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      Walletless/on-ramp contributor? Send yourself a refund-available notice for this project. The draft explains that refunded {fundingSymbol(project)} returns to your wallet and lists next steps:{' '}
      <Link href={href}>email refund notice</Link>.
    </Alert>
  )
}
