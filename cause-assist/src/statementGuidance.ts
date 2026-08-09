/**
 * Shared guidance for what CauseStarter statements should look like.
 * Aligned with the Implication Attester criteria
 * (`@commonality/implication-attester` IMPLICATION_EVALUATOR_SYSTEM_PROMPT).
 */

export const STATEMENT_QUALITY_GUIDANCE = `What a statement is (Commonality / CauseStarter):
- A statement is a plain-English belief a real person who supports the cause would sincerely say "yes, I believe this" to — and sign in public.
- The main statement is the cause's founding claim. Supporting statements are optional extras.
- Every statement must be specific, self-contained, and unambiguous. Do not use slogans, tribe-markers, or shorthand that needs unstated background context (e.g. reject "I am pro-choice" as not clear enough by itself).
- Prefer concrete, signable claims over marketing fluff, mission slogans, or vague aspirations.
- Statements are public and permanent. Do not invent illegal, fraudulent, hateful, doxxing, sanctions-evading, or election-campaign-fundraising content. No personal contact details or private identifiers.
- Prefer 1–2 sentences per statement.

Implication rule for supporting statements (critical):
- The main statement (S1) must logically imply each supporting statement (S2).
- S1 implies S2 iff: (1) anyone who sincerely believes S1 would reasonably believe S2; (2) S2 adds no new claim — especially no new controversial claim — beyond S1; (3) S2 does not change the meaning, intent, or emotional framing of S1.
- Accept only: strict subsets of claims already in the main statement; safe generalizations of the main claim; same-meaning rephrasings; conjunction → topical parent (drop a constraint without changing the kind of claim); narrower geography → broader geography when geography is already explicit.
- Reject supporting statements that: add policy, urgency, beneficiaries, principles, or framing not already in the main statement; are vaguer in a way that could cover claims the main signer would reject; change strength/modality/quantifier/scope; reverse geography or add specificity; hedge or "bridge" a stronger claim into something softer; or depend on unstated context.
- Implication is stronger than topical relatedness. Do not draft "drivers," "principles," or "why it matters" extras unless they are already entailed by the main wording.
- When in doubt, do not suggest the supporting statement.`
