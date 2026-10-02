/** Curated synthetic deliverables for the strategy-led v2 campaign. These are not real projects. */
export interface CampaignProjectStory {
  title: string;
  outcome: string;
  statementRefs: string[];
  blocker: string;
}

export const CAMPAIGN_PROJECT_STORIES: Record<string, CampaignProjectStory[]> = {
  'open-source': [
    { title: 'Keep the shared dependency maintained', outcome: 'Pay two maintainers to resolve security reports and publish supported releases of a library used by many small teams. No one team can justify the whole cost.', statementRefs: ['fund-critical-maintainers', 'oss-libraries-kept-up'], blocker: 'Scale mismatch across users and organizations' },
    { title: 'Independent Linux maintenance fund', outcome: 'Fund upstream fixes and public release notes for neglected Linux components used across distributions. The fixes remain available to everyone.', statementRefs: ['linux-kept-up', 'oss-not-single-vendor-capture'], blocker: 'Self-financing a non-excludable shared tool' },
  ],
  'local-food': [
    { title: 'Shared cold storage for three farm markets', outcome: 'Equip a shared cold-storage hub serving growers and markets in three neighboring towns; publish usage and spoilage figures after one season.', statementRefs: ['farmers-markets-direct-connect', 'shorter-food-supply-chains'], blocker: 'Beneficiaries span municipal boundaries' },
    { title: 'Neighborhood growing beds', outcome: 'Build and maintain publicly accessible growing beds on a permitted site, with an open volunteer schedule and harvest log.', statementRefs: ['neighborhood-growing'], blocker: 'Too small for a municipal capital program' },
  ],
  'open-science': [
    { title: 'Independent replication of a promising result', outcome: 'Run a preregistered replication, publish the methods and raw data, and release the result whether it confirms the original finding or not.', statementRefs: ['independent-replication-studies', 'conflict-free-scientific-research'], blocker: 'Gatekept work whose value is clearest after completion' },
    { title: 'Open neglected-disease dataset', outcome: 'Clean and release an openly licensed dataset for a disease with little commercial research incentive, with an independent audit of the collection method.', statementRefs: ['research-neglected-diseases', 'open-access-scientific-publishing'], blocker: 'Commercial funders cannot capture the public benefit' },
  ],
  education: [
    { title: 'Open trades curriculum for small colleges', outcome: 'Produce and openly license a modular trades curriculum that several small colleges can use and revise together.', statementRefs: ['vocational-training'], blocker: 'Shared benefit across institutions without one budget owner' },
    { title: 'Publish an independent tutoring evaluation', outcome: 'Evaluate a pilot tutoring method for disadvantaged students and release the results and materials even if the method fails.', statementRefs: ['educational-support-for-disadvantaged-kids', 'learning-outcomes-research'], blocker: 'Uncertain result that can be judged after the attempt' },
  ],
  environment: [
    { title: 'Watershed sensor network', outcome: 'Install permitted water-quality sensors across three towns and publish an open dataset that residents and researchers can inspect.', statementRefs: ['independent-environmental-monitoring', 'conservation-of-local-natural-areas'], blocker: 'Watershed crosses jurisdictions' },
    { title: 'Replicate low-cost soil practices', outcome: 'Test a low-cost soil practice at several farms and publish the protocol, costs, and measured results for other growers.', statementRefs: ['sustainable-agriculture-research'], blocker: 'Useful result is uncertain before the trial' },
  ],
  'digital-rights': [
    { title: 'Mirror a threatened public archive', outcome: 'Maintain redundant, lawful mirrors of a public-interest archive and publish availability reports so readers can verify access.', statementRefs: ['censorship-resistant-publishing'], blocker: 'Publishing access can be suppressed' },
    { title: 'Privacy guide and tool audit', outcome: 'Audit an everyday privacy tool, publish reproducible findings, and maintain a free plain-language guide to safe use.', statementRefs: ['privacy-tools-for-ordinary-people', 'protect-from-surveillance'], blocker: 'Public benefits exceed any one vendor’s incentive' },
  ],
  'abortion-common-ground': [
    { title: 'Map the gestational cutoff options', outcome: 'Publish a neutral, sourced comparison of concrete gestational cutoff proposals and their effects. Supporters from both sides can fund the same public resource.', statementRefs: ['commonality'], blocker: 'Polarized institutions cannot credibly own a shared resource' },
    { title: 'Facilitated cutoff briefings', outcome: 'Hold public briefings where participants from both camps can examine the same cutoff options, with notes and disagreements published openly.', statementRefs: ['commonality'], blocker: 'Bridging communication across a divide' },
  ],
  'immigration-common-ground': [
    { title: 'Audit criminal-priority enforcement', outcome: 'Publish a transparent audit of how criminal-priority enforcement treats peaceful and criminal cases, including errors and appeal paths.', statementRefs: ['commonality'], blocker: 'Polarized funders need a shared accountability outcome' },
    { title: 'Cross-camp enforcement explainer', outcome: 'Produce a sourced public explainer of the shared criminal-priority proposal and the questions each camp still disputes.', statementRefs: ['commonality'], blocker: 'Bridging communication across a divide' },
  ],
  'violent-crime-common-ground': [
    { title: 'Verify repeat-violence concentration', outcome: 'Commission an independent local analysis of repeat violent offenses, publish its methods, and state plainly whether the premise holds.', statementRefs: ['commonality'], blocker: 'Agreement depends on a disputed empirical premise' },
    { title: 'Publish a conditional safety options brief', outcome: 'Compare targeted interventions and safeguards for repeat violent offenders if local evidence supports the concentration claim.', statementRefs: ['commonality'], blocker: 'Cross-camp action is blocked by distrust and uncertainty' },
  ],
  'schools-common-ground': [
    { title: 'Independent school-practice review', outcome: 'Review actual school policies against a published definition of support versus pressure, report evidence and limits, and invite both camps to check the method.', statementRefs: ['commonality'], blocker: 'Shared concern depends on a disputed factual claim' },
    { title: 'Parent and student listening sessions', outcome: 'Facilitate structured listening sessions about school practices and publish an anonymized account of points of agreement and disagreement.', statementRefs: ['commonality'], blocker: 'Bridging communication across a divide' },
  ],
};
