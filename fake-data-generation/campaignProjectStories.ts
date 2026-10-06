/** Curated synthetic deliverables for the strategy-led v2 campaign. These are not real projects. */
export interface CampaignProjectStory {
  title: string;
  outcome: string;
  statementRefs: string[];
  blocker: string;
}

/** The first pledge to show for each walkthrough profile and cause. */
export const SPOTLIGHT_PROJECTS: Record<string, Record<string, string>> = {
  Kurt: {
    'car-repair': 'Parts that fit the cars dealers dropped',
    'gluten-free-cooking': 'What actually substitutes',
    'game-commons': 'Keep the community game server alive',
    'music-learning': 'Music theory you can hear',
  },
  Fred: {
    'game-commons': 'Keep the community game server alive',
    'small-trades': 'What is behind Grey County plaster',
    'congregational-music': 'A substitute can play on Sunday',
  },
  Sean: {
    'local-food': 'Which varieties survived here',
    'staying-productive': 'A work-rest trial you can rerun',
  },
};

export const CAMPAIGN_PROJECT_STORIES: Record<string, CampaignProjectStory[]> = {
  'open-source': [
    { title: 'Keep the shared dependency maintained', outcome: 'Pay two maintainers to resolve security reports and publish supported releases of a library used by many small teams. No one team can justify the whole cost.', statementRefs: ['fund-critical-maintainers', 'oss-libraries-kept-up'], blocker: 'Scale mismatch across users and organizations' },
    { title: 'Independent Linux maintenance fund', outcome: 'Fund upstream fixes and public release notes for neglected Linux components used across distributions. The fixes remain available to everyone.', statementRefs: ['linux-kept-up', 'oss-not-single-vendor-capture'], blocker: 'Self-financing a non-excludable shared tool' },
  ],
  'local-food': [
    { title: 'Shared cold storage for three farm markets', outcome: 'Equip a shared cold-storage hub serving growers and markets in three neighboring towns; publish usage and spoilage figures after one season.', statementRefs: ['farmers-markets-direct-connect', 'shorter-food-supply-chains'], blocker: 'Beneficiaries span municipal boundaries' },
    { title: 'Which varieties survived here', outcome: 'Three Grey County farms will trial the same crop varieties for one season under a published protocol. Growers pledge before planting; the farms publish costs, yields, and failures for anyone to use.', statementRefs: ['working-local-farms'], blocker: 'No grower can know the useful answer before paying for a trial that other farms can copy' },
    { title: 'The implement three farms share', outcome: 'Buy and maintain one piece of equipment that three neighboring farms book together, and publish the schedule, repair costs, and hours used.', statementRefs: ['working-local-farms', 'shorter-food-supply-chains'], blocker: 'Each farm needs the machine some days and none can justify owning it' },
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
  'music-learning': [
    { title: 'Grey County guitar songbook', outcome: 'Record local players teaching 30 beginner songs; release free videos, chord charts, and transcripts for learners across the county.', statementRefs: ['free-guitar-lessons', 'grey-county-music-learning'], blocker: 'Learners across towns benefit, but no one teacher can fund the open library' },
    { title: 'Music theory you can hear', outcome: 'Build and openly release a browser tool that lets beginner guitarists hear and change intervals, chords, and progressions. Local teachers pledge toward a working first release and reusable lessons; every learner can use them afterward.', statementRefs: ['interactive-music-theory'], blocker: 'Several small teachers want the same free tool, but none can justify commissioning it alone' },
  ],
  'car-repair': [
    { title: 'Parts that fit the cars dealers dropped', outcome: 'Independent shops and drivers pledge toward a checked, versioned parts-interchange table for older vehicles common in Grey County. Publish tested fits, misfits, evidence, and corrections openly so every later repair can use it.', statementRefs: ['repair-guides', 'grey-county-repair'], blocker: 'No shop can recover the cost of checking a reference that every other shop and driver can copy' },
    { title: 'Open car repair workshop kit', outcome: 'Publish a reusable beginner workshop plan with practice exercises, diagrams, and a safe-tool checklist for community groups.', statementRefs: ['repair-training'], blocker: 'Small workshops need the same material but cannot each pay to develop it' },
  ],
  'gluten-free-cooking': [
    { title: 'What actually substitutes', outcome: 'Cooks with celiac disease pledge toward a reproducible test of ordinary gluten-free ingredient substitutions. Publish exact measurements, failures, and cross-contact precautions in a free table anyone can reuse.', statementRefs: ['tested-open-recipes', 'grey-county-gluten-free'], blocker: 'Testing takes time and care, while every household can copy the resulting table' },
    { title: 'Which products are safe this month', outcome: 'Recheck ordinary Grey County grocery products on a published schedule and maintain a free list of which ones are gluten-free right now, including products whose labels changed.', statementRefs: ['affordable-ingredients', 'tested-open-recipes'], blocker: 'No one household can recheck the aisle for everyone else' },
  ],
  'game-commons': [
    { title: 'Keep the community game server alive', outcome: 'Players from several small communities pledge toward the next supported release of the open-source server they share: security fixes, compatibility checks, and a setup guide. The release is public even for servers that did not pay.', statementRefs: ['open-game-infrastructure'], blocker: 'Each community needs the release, but none can cover the maintainer milestone alone' },
    { title: 'The accessible games test bench', outcome: 'Pay players with varied access needs to test open game tools; publish reproducible findings and reusable fixes.', statementRefs: ['game-accessibility-tools'], blocker: 'The public test results help many small studios after the work is proven' },
    { title: 'Games you can still play', outcome: 'Build a lawful open-source compatibility tool for older games and publish public documentation and test results.', statementRefs: ['lawful-game-preservation'], blocker: 'Fans benefit from preservation work that no single publisher will own' },
  ],
  'small-trades': [
    { title: 'The small-job sheet', outcome: 'Publish one open scope, safety, and hours sheet for the small jobs Grey County handymen keep re-explaining. Every contractor can copy it, and none of them will get paid to write it.', statementRefs: ['shared-job-sheets'], blocker: 'The sheet is useful to every small contractor and owned by none of them' },
    { title: 'The lift that sits in one shop', outcome: 'Keep one lift or scaffold booked across independent Grey County contractors, and publish the schedule, upkeep, and hours it actually ran.', statementRefs: ['shared-contractor-tools'], blocker: 'Each shop needs the machine some days and none can justify owning it' },
    { title: 'What is behind Grey County plaster', outcome: 'Local contractors and homeowners pledge toward a photographed, reviewed field guide to common older Grey County house types, hidden construction details, and safe repair approaches. Publish corrections as new walls are opened so the next job need not start from a hole in the wall.', statementRefs: ['local-building-details', 'shared-job-sheets'], blocker: 'Every contractor benefits from the shared knowledge, but no one is paid to document it for competitors' },
  ],
  'congregational-music': [
    { title: 'Charts for the songs this church sings', outcome: 'Write chord charts in the keys a volunteer guitarist can play for the songs a small congregation actually sings, and release them for any other congregation to copy.', statementRefs: ['songs-this-church-sings'], blocker: 'A minority wants a public music resource that no publisher owns' },
    { title: 'A substitute can play on Sunday', outcome: 'Several small congregations pledge toward openly reusable practice tracks and chord charts in singable keys, starting with songs they actually share. Volunteer substitutes can rehearse without the regular musician present.', statementRefs: ['substitute-accompanist', 'songs-this-church-sings'], blocker: 'Each church has too few substitutes to commission the library alone, while every church can copy it' },
  ],
  'staying-productive': [
    { title: 'A work-rest trial you can rerun', outcome: 'Sole proprietors pledge toward a preregistered four-week comparison of two work-rest schedules during busy weeks. Publish the measures, adherence, limitations, and results even if neither schedule helps, so other workers can rerun the test.', statementRefs: ['published-work-rest-trial'], blocker: 'The answer is uncertain before the trial, and a public result cannot be reserved for the first payers' },
    { title: 'The quiet morning three shops share', outcome: 'Rent one quiet work room for a published morning block that sole proprietors book together, and log whether the block was actually quiet.', statementRefs: ['shared-quiet-block'], blocker: 'Too small for a town program, and useless unless the whole block is funded' },
  ],
};
