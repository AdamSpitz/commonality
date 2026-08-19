# Founder-level documentation

  - [Standing up a vertical](/docs/founder/standing-up-a-vertical.md) — the "now actually build one" guide, using Civility/CSM as worked examples
  - [Shaping your cause's statements](/docs/founder/shaping-your-cause-statements.md) — what a cause is made of: planks, views, and anchors, and how implication direction constrains each (working proposal, still open)
  - [Helping a human write a bridge cluster](/docs/founder/bridge-cluster-wording-help.md) — one-shot wording help + export-to-your-LLM; not a hosted mediation chat
  - [docs/end-user/commonality/vision-and-strategy/](/docs/end-user/commonality/vision-and-strategy/)
  - [specs/README.md](/specs/README.md)
  - [Verifier workspace](/verifier/README.md) (for when you want to know "is this thing actually *ready*?")

## Adam's role and strategy: platform for founders, not direct end-user adoption

*Summary below; the decision is frozen in [ADR 0005](/specs/decisions/0005-founder-first-verticals.md) and the living spec + consolidated backlog is [specs/product/founder-first.md](/specs/product/founder-first.md).*

Adam's role on Commonality is to **build the platform** and **run Civility and CSM as reference verticals** whose purpose is to recruit *other* founders. He is deliberately **not** driving direct end-user adoption of the "Commonality" umbrella — distribution is vertical-specific and is each vertical founder's job. **The founder is therefore the platform's real customer.**

This answers the standing objection "you've done nothing about distribution": that's intentional, because umbrella-level marketing is the wrong altitude.

**Triage rule for platform work:**
- Generic umbrella end-user growth → **not** his job.
- Making a founder's job easier → **core** job.
- Making Civility/CSM exemplary as reference verticals → **core** job.

A vertical is a `DomainManifest` under [`ui/src/domains/<id>/`](/ui/src/domains/) (see [standing up a vertical](/docs/founder/standing-up-a-vertical.md)). The marketing backlog in [inbox.md](/inbox.md) is split A/B/C along this rule.
