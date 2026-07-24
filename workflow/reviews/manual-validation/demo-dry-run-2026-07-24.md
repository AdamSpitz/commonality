# Demo dry-run report — 2026-07-24 — deployed Base Sepolia sites

## Scope actually covered
A short whole-product narrative: introduce Commonality, show the public-goods thesis, move into LazyGiving, explain delegation through Aligning, show statements in Tally, then show the Content Funding, Civility, and Common Sense Majority specializations.

## Evidence I used the system / inspected the code or docs
- Ran the narrative in Chromium against all seven deployed testnet origins.
- Every origin returned HTTP 200 and rendered the expected branded landing page.
- Verified visible cross-product language: Aligning delegates through LazyGiving and references Tally; Content Funding and Civility reference Tally; CSM links its mission to Tally, Aligning, bridges, nudgers, and Civility.
- Checked the current verifier narrative with `npm run verifier:report` before assessing demo readiness.

## Attempts to break it
- Loaded each product directly in a fresh tab to expose DNS, TLS, asset, or app-shell failures.
- Watched page errors and failed requests during settling.
- Tested whether the narrative could be understood from visible copy instead of relying on presenter-only explanations.
- Compared the successful visual smoke with the retained verifier root rather than treating a polished landing page as proof of system readiness.

## Highest-severity finding
The current verifier root is **fail** and explicitly says the product is not ready to show publicly: product messaging has a confirmed crypto-first concern, while functionality and security also contain failures or uncertainty. A controlled internal demo of landing pages is viable; an external transactional demo is not cleared by this run.

## Other findings
The conceptual story hangs together better than the seven-site count suggests because cross-domain links explain the hand-offs. No page JavaScript errors were observed. This run did not exercise contribution, signing, creator, bridge, or indexing mutation flows.

## Where I used insider knowledge or gave benefit of the doubt
I knew the intended sequence and used existing product terminology. I gave the system credit for transaction flows based only on their visible entry points, not execution, and therefore explicitly excluded them from demo readiness.

## Confidence: low / medium / high
medium

## Recommended follow-up tests or automation
Before an external demo, obtain a fresh passing guarded journey for the exact scripted mutation path, rehearse with a clean wallet, and resolve or explicitly waive each current root failure. Add a one-command deployed demo smoke that follows the same canonical cross-domain links.
