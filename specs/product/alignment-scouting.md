# Alignment attestation as scouting

Status: next [focus](/focus.md) after the [claimable-beneficiary primitive](/specs/tech/subsystems/claimable-beneficiaries.md). Product context: [fund-now-claim-later.md](/specs/product/fund-now-claim-later.md). Trust filter: [Subjectiv](/specs/tech/subsystems/subjectiv/README.md). Adoption story: [claiming-an-org.md](/docs/end-user/commonality/vision-and-strategy/ease-of-adoption/claiming-an-org.md).

This is not an implementation plan. It is the product consequence of letting third parties pool money for public identities that are not on Commonality yet.

## What alignment used to be

Someone already on the system creates a project (assurance contract already exists). Categorizing it is bookkeeping: get someone generally transitively trusted in the relevant ecosystem to post “project P is aligned with statements S1, S2, S3.”

That is easier than finding a grant-committee member. The trust network can be large; a friend or a friend of a friend is usually enough. Necessary (spam and abuse), not particularly hard, not particularly interesting. The project creator who already knows about Commonality does it, or someone a hop or two away.

## What it becomes

Once funding can target orgs that *already exist* in the world and do not know about us, alignment is no longer a last form field on a self-started project.

There is a job: **go looking** for aligned orgs or projects, bind them to a claimable public identity (`dns:example.org`, later other namespaces), open a third-party project the initiator cannot loot, and **vouch** that this identity’s work belongs on those statements. Creating the escrow is cheap. The judgment is the product.

Two jobs that used to be one person:

1. **Scout / initiator** — notices an aligned org, opens a not-affiliated project pointed at their public identity.
2. **Alignment attester** — says this payout target is in-scope for S1/S2/S3, which is what makes it appear on anyone’s funding map.

Those can be the same person. They often should not be. Self-attestation of your own scouted project is exactly the spam case Subjectiv exists for. When the project creator is a stranger to the org *and* to the funder, the trust graph is not a light anti-spam filter; it is the only reason the listing is worth looking at.

## Why the judgment is heavier

Attesting “my friend’s new contract is about climate” is cheap social knowledge.

Attesting “the controller of this domain (or this mid-size NGO you found) is aligned with *this* statement, and this escrow is honestly for them” is research: what they actually do, whether the domain is the right identity, whether the project text is bait, whether you are laundering a lookalike.

Bots can *propose* candidates (registries, sites, filings). They should not be what a careful funder transitively trusts without a human — or a very well-specified specialist attester — in the loop.

Expect **specialist attesters** (people or orgs known for actually checking alignment) rather than “a friend of a friend rubber-stamps.” The graph already allows that. The current UX still assumes the creator will go get a stamp.

## What not to do

This role is interesting because it is judgment under a trust graph, not because Commonality should staff an alignment committee. Subjectiv is meant to feel like word-of-mouth, not a credentialing desk. Scouts and attester-bots are supply of candidates; each user’s graph is still the filter.

Do not collapse “I found them” into “they are aligned.” Keep not-affiliated loud on the project; keep alignment as a separate speech act.

Reputation on attesters gets more load-bearing than reputation on project creators. Creators cannot steal the pot; attesters can still waste attention and mis-route intent.

## When we pick this up

After the beneficiary primitive is real enough that a third-party project can actually pay `BeneficiaryEscrow` for an unclaimed `dns:` id.

Likely product work (not committed): a discover-and-nominate job (search / import public orgs → pick `beneficiaryId` → draft project + suggested statements → someone in the funder’s graph attests); UX that treats alignment attesters as curators of the funding map rather than the project creator’s last checkbox; seed/demo data that includes scouted, not-self-attested projects.

Do not start that UX while the contracts are still the main focus.
