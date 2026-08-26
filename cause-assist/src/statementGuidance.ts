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
- Prefer 1–2 sentences per statement. This bar is for ordinary cause planks and uniques. Modified/bridge wording may be longer when the extra words are load-bearing — see bridge guidance if this task is mediation.

Implication rule for supporting statements (critical):
- The main statement (S1) must logically imply each supporting statement (S2).
- S1 implies S2 iff anyone who sincerely believes S1 is already committed to the proposition in S2 and S2 adds no new claim.
- Accept strict subsets of claims; scope restrictions; safe logical weakenings; same-meaning rephrasings; and rhetoric/urgency removal when a clearly asserted proposition remains unchanged.
- Reject additions of policy, acceptance, concessions, reservations, bilateral commitments, or ambiguous speech acts; changes of strength or quantifier; and claims that depend on guessed context.
- Do not reject merely because S2 is broad, permits multiple implementations, or leaves details unsettled.
- Implication is stronger than topical relatedness. Do not draft "drivers," "principles," or "why it matters" extras unless they are already entailed by the main wording.
- A supporting statement should feel redundant to sign separately: a reasonable signer of the main statement would be annoyed at being asked to also sign it ("I already said that"). If they would not be annoyed, you invented a new claim — drop it or keep it off the implication path.
- When in doubt, do not suggest the supporting statement.`

/** Extra rules for human-authored bridge clusters. Do not use this as a drafting algorithm for attester subset. */
export const BRIDGE_STATEMENT_GUIDANCE = `Modified and shared (bridge) planks:
- Signature, not column: one register, one speech act, short enough that a real person would sign the paragraph. Not an op-ed. Not three slogans stacked.
- Name the gap first. If both camps already share the civic conclusion, the shared plank is that conclusion with both *whys* omitted. Do not invent a compromise, a deal, or a narrator to make the implication system look busy.
- Containment is a check after drafting, not a method. Do not paste the shared sentences into each modified so the attester's subset rule fires.
- Parents/naturals are how that camp talks. Do not withhold a civic line from the parent so the modified can "add" it. If the parent already contains the shared claim, say so in warnings (the triple may be decorative).
- If the shared claim is not in the parent, that extra is a real ask. Warn. Do not disguise a belief jump as a small edit. Unbundling must reaffirm the rest of that camp's bundle.
- First-person limits belong on that side's modified ("I am not asking the state to make anyone pray"). Do not put coalition captions on the shared plank — not "we come from different places," "I don't need your reasons," "people who get here from biology are not my enemy," or "the civic job is not to impose a church / wait for religion to disappear."
- The shared plank must not require either side's justification (no theology a secular signer must affirm; no reducing faith to "studies show"). Also strip commentary on whose project this is.
- Routing: a reasonable signer of the modified should be annoyed at being asked to also sign the shared plank ("I already said that"). If they would not, the modified does not contain it — thicken the modified or keep it a nudge. Do not fatten the shared plank.`
