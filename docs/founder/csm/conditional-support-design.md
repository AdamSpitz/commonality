# Conditional support — design notes

Mechanism-design reasoning behind the bilateral-assurance structure. The public [conditional-support doc](../../end-user/csm/conditional-support.md) explains the concept to a layperson (people won't concede unless they're confident the other side is conceding too, so commonality statements are framed as mutual assurances). This covers two design questions: does it need a formal mechanism, and why it makes the implication attester's job legitimate.

## Does this need a formal assurance mechanism?

Probably not. The natural instinct is to reach for something like an assurance contract for mutual commitments — "my concession activates only once N people on the other side have made theirs." But the condition in these statements ("as long as the right is taking the abuse problem seriously") is inherently subjective. Any formal mechanism enforcing it would need a subjective evaluator to decide whether the condition is met — which puts you right back in attester territory, with all the trust questions that entails, for no real gain.

Instead, the statement language itself does the work, and the **supporter counts on both sides' nudged statements provide the confidence**. If you can see that 500,000 people from the other side signed their version of the bilateral statement, that *is* your assurance — no contract required. The legibility of the counts substitutes for a formal commitment device.

## Why the bilateral framing makes the implication attester's job legitimate

The "I'm primarily concerned with X, but I also agree with Y as long as you also agree with X" structure isn't just rhetoric — it's what makes cross-partisan implication attestation genuine rather than a stretch.

Here's the mechanic. The nudged statement explicitly contains *both* X and Y, with priority given to the signer's own side. The common-ground statement also contains both X and Y, but *without* priority. So the implication is straightforward and honest: the nudged statement really does imply the common-ground statement — it contains everything the common-ground statement contains, plus a priority ordering the common-ground statement drops. The implication attester isn't papering over a disagreement; it's recognizing a real entailment.

Without the bilateral framing, you'd be asking the attester to bridge "I care about X" and "I care about Y" into "I care about X and Y" — which isn't an implication at all, it's a synthesis the signer never assented to. The conditional structure is precisely what closes that gap: each side has already, in their own words, assented to both X and Y (in their preferred order). That's why the structure is load-bearing for the whole implication-graph approach to cross-partisan bridging.
