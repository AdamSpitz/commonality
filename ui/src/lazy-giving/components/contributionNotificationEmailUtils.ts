import type { Project } from '@commonality/sdk/lazy-giving'

export type ContributionNotificationKind = 'confirmation' | 'refund-available'

function projectLabel(project: Project) {
  return `project ${project.id}`
}

export function fundingSymbol(project: Project) {
  return project.fundingCurrency?.symbol ?? 'USDC'
}

export function buildContributionNotificationEmail(kind: ContributionNotificationKind, project: Project, txUrl?: string | null) {
  const label = projectLabel(project)
  const subject = kind === 'confirmation'
    ? `Your Commonality contribution to ${label}`
    : `Refund available for your Commonality contribution to ${label}`

  const bodyLines = kind === 'confirmation'
    ? [
        `Your contribution to ${label} was sent onchain.`,
        '',
        'Commonality does not custody card/on-ramp contributions: your payment became your own wallet transaction for receipt tokens.',
        txUrl ? `Transaction: ${txUrl}` : null,
        '',
        `If the project does not reach its funding goal by the deadline, return to the project page to refund the receipt tokens back to ${fundingSymbol(project)}.`,
      ]
    : [
        `${label} did not reach its funding goal, so your onchain receipt tokens are refundable.`,
        '',
        `Return to the project page and use Refund All to receive ${fundingSymbol(project)} back into your wallet.`,
        txUrl ? `Refund transaction: ${txUrl}` : null,
        '',
        `After refunding, you can keep the ${fundingSymbol(project)}, re-contribute, or use a licensed off-ramp/KYC flow supported by your wallet or on-ramp provider.`,
      ]

  const body = bodyLines.filter((line): line is string => line != null).join('\n')
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
