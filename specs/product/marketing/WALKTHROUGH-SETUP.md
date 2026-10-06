# Friend walkthrough setup — quick start

This document covers the immediate setup for showing testnet to friends using curated demo profiles.

## What changed

1. **Campaign execution now writes users to test data** — The admin page shows all 100 campaign users with their display names, bios, interests, and favorite causes.

2. **Curated profiles are marked with ★** — Every profiled user is highlighted: the eight archetypes in [demo-profiles.md](./demo-profiles.md), the hobby-cause profiles, and Kurt, Fred, and Sean.

3. **Filter toggle** — "Show curated only (N) ★" lists every profiled user, with Kurt, Fred, and Sean first. "Show all users (N)" browses the whole run. Both counts come from that run.

4. **Enhanced user table** — Shows engagement, bio and favorite cause together, and interests.

## Quick test (local)

```bash
cd /home/adam/Projects/commonality/fake-data-generation

# Re-plan with new profiles (if you modified the manifest)
npm run gen:campaign:plan --workspace=fake-data-generation

# Execute locally (fast, ~3 minutes)
npm run gen:campaign:execute --workspace=fake-data-generation -- --mode local

# Note the admin URL printed at the end, e.g.:
# Admin: http://commonality.localhost:8088/#/admin/test-data?key=...
```

Then:
1. Open the admin URL
2. Select the latest run
3. Click "Show curated only"
4. Kurt, Fred, and Sean are listed first. The eight archetypes are in [demo-profiles.md](./demo-profiles.md)
5. Pick one and click "Connect as selected user"
6. Navigate to see their personalized view

## Demo profile quick reference

See [demo-profiles.md](./demo-profiles.md) for the full list. Quick picks:

- **Friend who donates but doesn't organize:** Sam (casual donor)
- **Friend who runs a club/meetup:** Alex (community organizer)
- **Friend who evaluates tech/projects:** Jordan (expert scout)
- **Friend building something public:** Taylor (project founder)
- **Friend others trust for recommendations:** Casey (trusted delegate)
- **Friend interested in multiple areas:** Riley (multi-cause supporter)
- **Friend who bridges divides:** Drew (bridge mediator)
- **Deeply engaged friend:** Quinn (power user)

## Before scheduling sessions

From [PLAN.md](./PLAN.md) Phase 0:

- [ ] Pick the walkthrough URL (Commonality/Civility/CSM testnet)
- [ ] Write the 90-second story for that URL
- [ ] Decide guest path (you drive browser vs sponsored login)

Once those are set, you're ready to use these profiles in actual friend sessions.

## Troubleshooting

**No users showing in admin page?**
- Make sure you ran `gen:campaign:execute` (not just `gen:campaign:plan`)
- Check that the network is 'local' or 'testnet' (mainnet disables test data)

**Profiles not marked with ★?**
- Verify the userId exists in the `userProfiles` array in the manifest
- Re-run the campaign execution to regenerate test data artifacts

**Can't connect as a user?**
- Ensure the Vite dev server is running against the same chain
- Check that wallet provisioning succeeded (look for funding-ledger.json)
