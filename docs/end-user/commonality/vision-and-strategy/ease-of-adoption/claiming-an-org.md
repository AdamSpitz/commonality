# Collecting money for an org before the org is on board

Product design: `specs/product/fund-now-claim-later.md`. Technical design: `specs/tech/subsystems/claimable-beneficiaries.md`. This page is the adoption-story half.

Someone who is *not* the org can start a project whose payout is "this money is for the controller of that org's public name" (MVP: their website). Contributors put money in. The third party cannot take it. Commonality is not a custodian. The org claims later by proving control of that name — the same viral loop as channel claiming (`specs/tech/subsystems/content-funding/channel-claiming.md`) for creators who have never heard of us.

This is an on-ramp for [established orgs](./for-established-orgs.md) that are not willing yet. It is not a substitute for the org eventually [using the rails](./rails.md).

Status: website MVP can be claimed; third-party proposals, reversible
beneficiary control, and project-specific disavowal are in the product.
User how-to: [Propose a project for an organization](../../../lazyGiving/propose-a-project.md).

## Why not "I'll donate it via PayPal"

If the collector is honest, that works. If not, contributors have no enforcement. Do not "fix" that by routing funds through us.

The content-funding answer is the right one: **escrow keyed to a public identity, not to the project creator.** Success pays whoever later proves they own that identity. Failure (or claim timeout) refunds contributors.

## Why a website, not "the charity"

There is no clean global primary key for a legal entity that you can post a signed challenge to. What exists is a **controllable public identity** — the same thing we already use for `twitter:uid:…` / YouTube / Substack.

A domain is the name donors already type. DNS + HTTPS is the world's existing claim system. The enforceable sentence is "funds reserved for the controller of `example.org`," not "funds legally reserved for Example Charity, Inc." Legal-entity IDs (EIN, charity-commission number) are layered later, and only when a verifier still has a writable proof (e.g. the official registry lists that domain). The assurance levels are defined in `specs/product/fund-now-claim-later.md`.

The claim page / letter is the creator claim page with different nouns: **"People pooled $X because they like the work at example.org. Publish this one file to receive it."** After that, the [dial](./dial-not-switch.md) is available. If they never claim, contributors get the money back and we never had it.

Claiming the site proves control of the name. It does **not** mean the org wrote the project copy, and it does not stop other people from proposing new projects about the same site. The payout wallet can separately **restrict future project creation to us**. That lock is reversible: the same wallet can reopen third-party proposals later. Neither action rewrites existing projects' authorship or escrow.

The payout wallet can also **disavow a particular project**. Discovery and reuse prompts stop promoting that project, and the project page shows the disavowal. Disavowal does not cancel the contract, change escrow, or rewrite who wrote the copy. Withdrawing a disavowal is not an endorsement.
