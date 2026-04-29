# Big Test Of Everything

## High-Level Test Report — Commonality Platform

### What I tested

Tested the read-only browsing experience across both the **Commonality** and **Content Funding** domains using a fresh browser session. No wallet connected (write flows were out of scope for this pass).

---

### What's working well

**Home pages**: Both domains load cleanly with clear value propositions and obvious next steps. The "Start Here" / Docs page has well-written walkthroughs. Good first-run experience.

**Browse Statements**: Seeded statements appear, sorted correctly. Statement detail pages show believers, indirect supporter count, metadata, and a working "View Funding Portal" link.

**Funding Portal**: Loads with working sort/filter controls (Latest, Deadline, Most Funded, Closest to Goal; All/Funding/Succeeded/Refunding; All/Direct/Indirect). No seeded projects are showing as aligned with statements yet (which is fine — alignment attestations aren't set up in the test data for those statements).

**Browse Projects**: Seeded projects appear with funding status, amounts, and deadlines. Project detail pages show contributor leaderboards and linked content items.

**Browse Creators (content-funding domain)**: All three platforms work — Twitter, YouTube, Substack. Creator detail pages show contracts, content items, and funding totals.

**Profile (no wallet)**: Correctly prompts to connect wallet rather than breaking.

---

### Problems found

**1. Silent 404 — blank pages for undefined routes** (Medium)

Navigating to an undefined route (e.g., `#/creators`, `#/nonexistent-route`) renders a completely blank page — just the nav bar and footer, no content, no error message. A user who ends up at a wrong URL gets no signal about what happened. The app needs a "Page not found" fallback.

The `#/creators` route in particular is one a user might reasonably guess at on the Commonality domain (the nav actually goes to `#/content` which is correct, but the blank-on-unknown-route behavior is still bad).

**2. Project names are hex addresses** (Medium)

Projects display as `Project 0x5c2D64...` in both browse and detail views. This is a pretty bad UX — it's not clear if this is because the fake data seeder didn't assign names, or because the system genuinely has no name field for projects. If projects can have names, the seed data should use them. If they can't, this is a product gap that should be fixed before testnet.

**3. Creator identifiers are technical, not human-readable** (Low-Medium)

- Twitter creator shows `@111111111` and `twitter:uid:111111111` — a numeric UID, not a username. No `@handle` is resolved.
- YouTube shows `UCaaaaaaaaaaaaaaaaaaaaaaaa` — raw channel ID with no channel name.
- Substack shows `smartwriter` — readable.

The Twitter/YouTube cases would be confusing to real users. Again this may be a fake-data limitation (the seed data uses stub IDs), but the UI should at least not expose the raw `twitter:uid:` prefix.

**4. Funding portal leaderboard shows zero contributions** (Low — probably expected)

The cause leaderboard says "No contributions yet" even though projects have been funded. This is probably because the leaderboard tracks delegated contributions specifically, not direct project funding — but it's worth confirming this is the intended behavior rather than a data flow bug.

**5. Fake-data metadata generates a 400 IPFS error** (Low — not a production issue)

On the project detail page, the browser logs `Failed to load resource: 400 Bad Request` for `http://localhost:8080/ipfs/fake-metadata-substack:smartwriter`. The fake data generator created an invalid IPFS URL as metadata. Not a production concern but it does clutter the console and may mask real errors.

---

### Overall assessment

The core read-only flows are basically working. A new user can land on the home page, read docs, browse statements, browse projects, navigate to a funding portal, and browse creator channels — without hitting anything broken. That's a decent baseline.

The two things I'd want resolved before testnet:

1. **Project names** — "Project 0x..." is not acceptable in a public testnet context. Either seed proper names or confirm there's a name field and fix the seeder.
2. **Silent 404s** — a completely blank page for undefined routes needs at minimum a "Page not found" message.

The creator identifier display issue (showing raw UIDs/channel IDs) is lower priority but would look rough to anyone evaluating the testnet. The leaderboard behavior should be confirmed as intentional.

---

### Follow-up fixes implemented

- Added a real React Router catch-all fallback in `ui/src/App.tsx` with `ui/src/shared/components/NotFoundPage.tsx`, so undefined routes like `#/creators` or `#/nonexistent-route` now show a clear "Page not found" message with links back into the app instead of an empty shell.
- Added `ui/src/App.notfound.test.tsx` to assert unknown routes render the not-found page, preventing this from needing another expensive browser pass to catch.
- Changed Pubstarter fake-data project creation to upload actual project metadata to IPFS with human-readable seed names/descriptions instead of fake CIDs that force the UI to fall back to `Project 0x...`.
- Changed content-funding fake-data contracts to upload actual metadata to IPFS instead of using strings like `fake-metadata-substack:smartwriter`, removing the expected local IPFS 400s for those project detail pages.
- Added `fake-data-generation/test/seedMetadata.test.ts` to cover human-readable seed metadata and to guard against reintroducing fake metadata IDs.

Validation run:

- `npm run test:vitest --workspace=ui -- App.notfound.test.tsx App.test.tsx`
- `npm test --workspace=fake-data-generation`
- `npm run typecheck --workspace=ui && npm run typecheck --workspace=fake-data-generation`
- `npm run lint --workspace=ui && npm run lint --workspace=fake-data-generation`
- `npm run build --workspace=ui` (passed; emitted existing third-party Rollup annotation/chunk-size warnings)

Remaining notes were moved to `TODO.md` as proper follow-up items.
