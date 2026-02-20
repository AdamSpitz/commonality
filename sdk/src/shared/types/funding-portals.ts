
export interface ContributorStats {
  participant: string;
  totalContributed: bigint;
  totalRefunded: bigint;
  netContribution: bigint;
  contributionCount: number;
  firstContributionAt?: bigint;
  lastContributionAt?: bigint;
  projectsContributedTo: number;
}
