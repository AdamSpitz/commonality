# Hints / nudges

The point of the implication system is to allow us to *not* bother coordinating on a particular statement... but OTOH, it is still kinda *nice* to know that a statement has direct (rather than indirect) support.

So to try to nudge the system gently in the direction of avoiding unneeded proliferation of very-similar statements, there should be a suggestion system: the UI can offer the user hints/nudges of the form "you signed S1, and there's a statement S2 that is implied by S1 and is more popular than S1; maybe you'd like to sign S2 as well."

It might also be useful to offer hints regarding *related* statements, even if they don't mean quite the same thing.

The UI could be a simple list of related statements. Or an "autocomplete" sort of thing. Or a visual map that shows related statements nearby.

Do we have anything like that?
  - We have partial coverage: There's a `StatementSuggestions` component (`ui/src/conceptspace/components/StatementSuggestions.tsx`) that shows statements that are implied by or imply the current statement, filtered to those with more supporters than the current one. The underlying SDK function `getStatementSuggestions` (`sdk/src/subsystems/conceptspace/queries.ts:754`) only finds related statements through on-chain implication attestations. Missing: autocomplete when creating/searching, broader relatedness beyond attested implications (semantic similarity, domain-based), and any graph/map visualization.
