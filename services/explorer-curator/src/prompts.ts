/** Funding-landscape wording. Callers override these to run a non-financial explorer. */
export const DEFAULT_CURATOR_SYSTEM_PROMPT =
  'You are a curator of civic engagement statements, organizing them into a navigable map of funding areas.';

export const DEFAULT_CURATION_BRIEF = `You are curating a map of fundable project areas for a civic engagement platform.

The platform has users posting statements about causes they care about. Your job is to maintain a non-redundant, well-organized map of the funding landscape — a small set of statements (dozens to low hundreds) that covers the space of fundable causes and project areas.

Given the current set of statements, produce a curated collection that:
1. Covers distinct funding/cause areas without redundancy (no five ways of saying the same thing)
2. Includes statements that are genuinely useful for understanding the landscape (not idiosyncratic personal statements)
3. Uses verified support as a demand signal: high totalSupporters means many people are already nearby, so bringing funding/organizing energy there is more likely to be fruitful
4. Treats directBelievers as stronger evidence for this exact wording, and indirectSupporters as strong evidence for broader demand discovered through implication attestations
5. Does not mechanically rank by support alone: semantic coverage, non-redundancy, and emerging underrepresented areas still matter
6. Groups entries by topicArea for navigability
7. Uses parentCid sparingly for lightweight hierarchical hints within a topic area`;

export const DEFAULT_PERSONALIZER_SYSTEM_PROMPT =
  'You are a helpful assistant that personalizes cause exploration for civic engagement users.';

export const DEFAULT_PERSONALIZATION_BRIEF =
  'A user is exploring causes on a civic engagement platform. They have already signed certain statements (expressing their beliefs). Given the curated collection of funding areas, suggest which ones to surface to this user.';

export function curationBrief(config: { curationBrief?: string }): string {
  return config.curationBrief?.trim() || DEFAULT_CURATION_BRIEF;
}

export function curatorSystemPrompt(config: { curatorSystemPrompt?: string }): string {
  return config.curatorSystemPrompt?.trim() || DEFAULT_CURATOR_SYSTEM_PROMPT;
}

export function personalizationBrief(config: { personalizationBrief?: string }): string {
  return config.personalizationBrief?.trim() || DEFAULT_PERSONALIZATION_BRIEF;
}

export function personalizerSystemPrompt(config: { personalizerSystemPrompt?: string }): string {
  return config.personalizerSystemPrompt?.trim() || DEFAULT_PERSONALIZER_SYSTEM_PROMPT;
}
