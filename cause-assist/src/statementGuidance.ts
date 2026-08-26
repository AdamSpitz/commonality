/**
 * Shared guidance for what CauseStarter statements should look like.
 * Aligned with the Implication Attester criteria
 * (`@commonality/implication-attester` IMPLICATION_EVALUATOR_SYSTEM_PROMPT).
 */

export const STATEMENT_QUALITY_GUIDANCE = `What a statement is (Commonality / CauseStarter):
- A statement is a plain-English proposition a real person would sincerely say "yes, I believe this" to — and sign in public. A cause publication selects an ordered roster of these independent statements; it is not itself a statement.
- Aim for determinate meaning, not exhaustive detail. A broad proposition may leave implementation open and still be clear. Reject wording only when sincere readers could assign materially different propositions to it.
- Statements must be self-contained. Do not use slogans, tribe-markers, or shorthand that needs unstated background context (e.g. reject "I am pro-choice" as not clear enough by itself).
- Prefer concrete, signable claims over marketing fluff, mission slogans, or vague aspirations.
- Statements are public and permanent. Do not invent illegal, fraudulent, hateful, doxxing, sanctions-evading, or election-campaign-fundraising content. No personal contact details or private identifiers.
- Prefer 1–2 sentences per statement.

Implication rule for supporting statements (critical):
- The main statement (S1) must logically imply each supporting statement (S2).
- S1 implies S2 iff anyone who sincerely believes S1 is already committed to the proposition in S2 and S2 adds no new claim.
- Accept strict subsets of claims; scope restrictions; safe logical weakenings; same-meaning rephrasings; and rhetoric/urgency removal when a clearly asserted proposition remains unchanged.
- Reject additions of policy, acceptance, concessions, reservations, bilateral commitments, or ambiguous speech acts; changes of strength or quantifier; and claims that depend on guessed context.
- Do not reject merely because S2 is broad, permits multiple implementations, or leaves details unsettled.
- Implication is stronger than topical relatedness. Do not draft "drivers," "principles," or "why it matters" extras unless they are already entailed by the main wording.
- A supporting statement should feel redundant to sign separately: a reasonable signer of the main statement would be annoyed at being asked to also sign it ("I already said that"). If they would not be annoyed, you invented a new claim — drop it or keep it off the implication path.
- When in doubt, do not suggest the supporting statement.`
