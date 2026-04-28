# Continuity notes for ephemeral AI instances

## 2026-04-27 — Steps 0 and 1 of before-testnet review completed

The local stack is up and all four domain SPAs are live. Full continuity detail is in `workflow/reviews/before-testnet.md`.

**Where we are:** Steps 0 and 1 done; Step 2 (Commonality domain review) is next.

**Stack URLs:**
- commonality: `http://localhost:8080/ipfs/Qmaki9PKAh5V1qutTq1CyeutyQJ8Fua81S2QhWvgknheNE/commonality-ui/#/`
- content-funding: `http://localhost:8080/ipfs/QmWVxipcPBjSs5D1he1ySEtaQ1ogxQ5VuFwCyKurcbp9CV/content-funding-ui/#/`
- noninflammatory: `http://localhost:8080/ipfs/QmUUZHxn9zst4oc9zJYMfH8pmj9PCWaxF5r6gMoHoKPz5C/noninflammatory-ui/#/`
- movement: `http://localhost:8080/ipfs/QmPNZNgf7nR7xwBbHhCA9R9HNdADx5fwt5tT2cyWjc5eNU/movement-ui/#/`

**Seed data:** `data.sh --seed` was run and made partial progress (50 users funded, 90 statements uploaded, 3 simulation rounds) but timed out — may still be processing or may need a re-run.

**Key fix:** `ui/Dockerfile` now copies `turbo.json` and grants `chmod -R a+rwX /workspace` so the non-root container user can write turbo's cache.
