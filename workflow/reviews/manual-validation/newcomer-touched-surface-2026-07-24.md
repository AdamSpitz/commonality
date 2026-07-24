# Newcomer touched-surface report — 2026-07-24 — deployed testnet and repository entry docs

## Scope actually covered
A cold-start path from the top-level README into the product, followed by the deployed Commonality, LazyGiving, Aligning, Tally, Content Funding, Civility, and Common Sense Majority landing pages.

## Evidence I used the system / inspected the code or docs
- Started from `README.md`, followed its product overview and role-based guidance, and used the developer guidance to identify the supported validation loop.
- Opened the deployed Commonality home page and inspected its visible thesis, founder pitch, docs, participation, and product links.
- Opened each linked product origin in Chromium and recorded titles, primary copy, and visible navigation.
- Verified that LazyGiving offers Browse Projects and Start a Project; Aligning offers Explore Causes and delegation hand-offs; Tally offers Start Signing; Content Funding offers Browse Content and Start a Contract; Civility offers Browse Content; and CSM offers concrete Tally, Aligning, bridge, and nudger paths.

## Attempts to break it
- Avoided repository search when first identifying product destinations and used the rendered navigation as a newcomer would.
- Tried inferred product hostnames and found that `lazy-giving` and `csm` do not resolve; canonical UI links use `lazygiving` and `common-sense-majority`.
- Looked for unexplained old Alignment branding and for landing pages lacking a concrete next action.

## Highest-severity finding
The product map is understandable from the Commonality shell, but hostname naming is not safely guessable. This is low severity because normal users receive canonical links; it would become more serious if docs or external copy ask users to type or infer subdomains.

## Other findings
The landing pages now provide unusually explicit explanations and next actions. The breadth of seven sites is still cognitively heavy, but Commonality's participation entry point and product labels provide a viable orientation path.

## Where I used insider knowledge or gave benefit of the doubt
After the inferred hostnames failed, I used links from the rendered Commonality shell. I did not create a fresh wallet identity or attempt every write flow, so this is a touched-surface newcomer report rather than a complete first-use study.

## Confidence: low / medium / high
medium

## Recommended follow-up tests or automation
Run a true external-user session with no persistent wallet profile and ask the tester to choose one participation path without repository access. Automatically check that every hostname printed in newcomer-facing docs matches the generated domain manifest.
