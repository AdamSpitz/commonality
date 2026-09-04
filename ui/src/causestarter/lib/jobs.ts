export type CrowdJobId = 'money' | 'attention' | 'work' | 'wording'

export interface CrowdJob {
  id: CrowdJobId
  title: string
  happyTo: string
  ugh: string
  soYou: string
  docsHash: string
  /** Daily workspace this job usually starts in (not a separate site). */
  workspacePath: string
  workspaceLabel: string
}

/** The four jobs the landing and in-product tips keep repeating. */
export const CROWD_JOBS: CrowdJob[] = [
  {
    id: 'money',
    title: 'Money',
    happyTo: 'I’d put in $X/month if enough others do too.',
    ugh: 'I will not read every project, and I do not trust a big org with a black box.',
    soYou: 'Pledge with a refund if the threshold is missed. Hand the picking to a person you already trust.',
    docsHash: 'money',
    workspacePath: '/dashboard',
    workspaceLabel: 'Open Fund',
  },
  {
    id: 'attention',
    title: 'Attention',
    happyTo: 'I’d watch for work worth funding.',
    ugh: 'I don’t know what’s out there, who’s a scam, or how to float early bets.',
    soYou: 'Follow statements you mean. Fund proven work, or fund early and ask to be reimbursed at cost.',
    docsHash: 'attention-and-judgment',
    workspacePath: '/dashboard',
    workspaceLabel: 'Open Fund',
  },
  {
    id: 'work',
    title: 'Work',
    happyTo: 'I’d do this project.',
    ugh: 'I can’t self-fund, and I don’t know a grant officer.',
    soYou: 'Publish it. A friend one hop better-connected can vouch that it advances a statement people already watch.',
    docsHash: 'work',
    workspacePath: '/causes',
    workspaceLabel: 'Open Organize',
  },
  {
    id: 'wording',
    title: 'Wording',
    happyTo: 'I’d stand behind an idea like that.',
    ugh: 'Not in those words — and my words will have zero signers.',
    soYou: 'Write yours. Similar signatures can still count. A bridge can invite people whose statement does not yet imply yours.',
    docsHash: 'wording',
    workspacePath: '/statements',
    workspaceLabel: 'Open Sign',
  },
]

export const JOBS_DOC_PATH = '/docs/the-jobs'

export function jobsDocHref(job?: CrowdJob): string {
  return job ? `${JOBS_DOC_PATH}#${job.docsHash}` : JOBS_DOC_PATH
}
