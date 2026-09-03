export interface SemanticCorpusCase {
  id: string
  category:
    | 'logical-weakening'
    | 'named-scope-restriction'
    | 'rhetoric-removal'
    | 'ambiguous-target'
    | 'concession'
    | 'reservation'
    | 'negotiated-compromise'
    | 'coalition-caption'
    | 'tighter-restatement'
  statement1: string
  statement2: string
  implies: boolean
  rationale: string
}

/**
 * Human-reviewed boundary cases for production-prompt evaluation. This is a
 * semantic corpus, not a mock of the model's JSON normalization. A live-model
 * rehearsal can feed these pairs through evaluateImplicationWithLLM and compare
 * its decisions with `implies`; the ordinary test suite keeps the corpus and the
 * rules represented in the production prompt from silently drifting apart.
 */
export const semanticImplicationCorpus: readonly SemanticCorpusCase[] = [
  {
    id: 'drop-secondary-tax-claim', category: 'logical-weakening', implies: true,
    statement1: 'I want taxes lower overall, especially capital-gains tax.',
    statement2: 'I want taxes lower overall.',
    rationale: 'The target retains a claim explicitly made by the source and drops only the secondary claim.',
  },
  {
    id: 'specific-tax-does-not-establish-overall-direction', category: 'logical-weakening', implies: false,
    statement1: 'I support cutting capital-gains tax.',
    statement2: 'I want taxes lower overall.',
    rationale: 'The target adds an aggregate-direction claim.',
  },
  {
    id: 'universal-to-named-time-scope', category: 'named-scope-restriction', implies: true,
    statement1: 'All abortions are morally wrong.',
    statement2: 'Abortions after 16 weeks are morally wrong.',
    rationale: 'The target restricts the same predicate to a named subset.',
  },
  {
    id: 'remove-urgency-and-rhetoric', category: 'rhetoric-removal', implies: true,
    statement1: 'We must immediately repeal this outrageous municipal parking tax.',
    statement2: 'The municipal parking tax should be repealed.',
    rationale: 'The explicit repeal position remains while urgency and rhetoric are removed.',
  },
  {
    id: 'attention-is-not-rhetoric-removal', category: 'rhetoric-removal', implies: false,
    statement1: 'Illegal immigration is a crisis.',
    statement2: 'Immigration policy deserves careful attention.',
    rationale: 'The target substitutes a new, underdetermined speech act rather than retaining a proposition.',
  },
  {
    id: 'reasonable-gun-control-is-underdetermined', category: 'ambiguous-target', implies: false,
    statement1: 'I support background checks for gun purchases.',
    statement2: 'I support reasonable gun control.',
    rationale: 'Readers can assign materially different policy propositions to the target.',
  },
  {
    id: 'added-acceptance', category: 'concession', implies: false,
    statement1: 'Late-term abortion is horrific.',
    statement2: 'I would accept abortion through 16 weeks.',
    rationale: 'The target adds acceptance of an outcome absent from the source.',
  },
  {
    id: 'added-reservation', category: 'reservation', implies: false,
    statement1: 'The municipal parking tax should be repealed.',
    statement2: 'The municipal parking tax should be repealed, provided replacement revenue is found.',
    rationale: 'The target adds a condition and therefore a reservation.',
  },
  {
    id: 'compromise-not-in-source', category: 'negotiated-compromise', implies: false,
    statement1: 'Late-term abortion is horrific.',
    statement2: 'I would accept abortion through 16 weeks as a compromise.',
    rationale: 'A plausible negotiated position is not already endorsed by the source.',
  },
  {
    id: 'explicit-compromise-can-be-retained', category: 'negotiated-compromise', implies: true,
    statement1: 'Late-term abortion is horrific, but I would accept abortion through 16 weeks as a compromise.',
    statement2: 'I would accept abortion through 16 weeks as a compromise.',
    rationale: 'The target is an explicit subset of the source claims.',
  },
  {
    id: 'coalition-caption-is-an-added-claim', category: 'coalition-caption', implies: false,
    statement1: 'Elective abortion is not ordinary health care. I believe that because the child is made in the image of God. I am not asking the state to make anyone pray.',
    statement2: 'Elective abortion is not ordinary health care. The civic job is to stop the euphemism, not to impose a church.',
    rationale: 'Commentary on whose civic job this is is an extra proposition, not a rephrasing of the health-care claim.',
  },
  {
    id: 'tighter-policy-spec-is-not-subset', category: 'tighter-restatement', implies: false,
    statement1: 'Private charity and local help should do more of providing for poor people than a larger welfare state.',
    statement2: 'Help should be time-limited, work-oriented where work is possible, and prefer knowledge close to the person over a distant office.',
    rationale: 'A more specific institutional design is an added claim, not a subset of the source.',
  },
]
