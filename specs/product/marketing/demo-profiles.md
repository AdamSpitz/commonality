# Demo profiles for friend walkthroughs

Curated fake-user profiles in the v2 campaign, marked with ★ in the admin page. Use these when showing testnet to friends—each represents a different archetype you might encounter.

## How to find them

1. Run the v2 campaign locally or on testnet
2. Open the test-data admin page (URL printed after execution)
3. Click "Show curated only" to list every profiled user. Kurt, Fred, and Sean are first. The eight archetypes are below.
4. Browse bios and interests to pick the right one for your friend

## Grey County walkthrough profiles

The stable descriptions are in [demo-profile-briefs.md](./demo-profile-briefs.md). This table is only the current wiring. These three are pinned to the top of the test-data admin list (`spotlightOrder`). "Show curated only" still includes every profiled user; Kurt, Fred, and Sean come first.

| Profile | Slot | Boards they join | Notes |
|---|---|---|---|
| **Kurt** | trusted delegate (`user-083`) | Car repair, gluten-free cooking, video games, open music learning | Church stays in the bio. Fred's congregational-music pledges are separate, so Kurt's guitar shows up as the theory tool and the county songbook. |
| **Fred** | regular supporter (`user-029`) | Video games, small trades, congregational music | Game notes go to Kurt. His own pledges are the trade projects and the church-music projects. |
| **Sean** | trusted delegate (`user-084`) | Local food, staying productive under strain | Local food is cold storage, a variety trial, and a shared implement. Strain is a published work-rest trial and a shared quiet morning. |

A delegate slot joins the delegation graph. It does not guarantee that Kurt or Sean personally sign alignment attestations.

## The eight archetypes

| Profile | Role | Best for showing... | Favorite cause |
|---|---|---|---|
| **Sam (casual donor)** | regular-supporter | Hands-off giving: "$20/month without research" | Local food systems |
| **Alex (community organizer)** | community-organizer | Coordinating volunteers without founding an org | Education and literacy |
| **Jordan (expert scout)** | project-builder | Technical evaluation before recommending funding | Open-source infrastructure |
| **Taylor (project founder)** | project-builder | Building public goods that need sustainable funding | Open science |
| **Casey (trusted delegate)** | trusted-delegate | Delegation: "friends ask me to pick good projects" | Digital rights |
| **Riley (multi-cause supporter)** | trusted-delegate | Supporting multiple related causes (music + cars) | Music learning |
| **Drew (bridge mediator)** | bridge-mediator | Finding common ground on polarized issues | Abortion common ground |
| **Quinn (power user)** | power-user | Deep engagement: funds, delegates, and vouches | Environmental resilience |

## Existing hobby profiles (also curated)

The v2 campaign also includes 16 hobby-cause profiles for music learning, car repair, gluten-free cooking, and game commons. These are organized as:

- **Organizers** (users 055–058): Talia, Owen, Priya, Kit — run informal meetups
- **Builders** (users 069–072): Noah, Leah, Avery, Morgan — create open resources
- **Learners/Users** (users 001–004, 025–028): Mira, Eli, Jo, Nico, Anika, Beth, Dev, Rae — consume and share

These are great for showing specific verticals but less useful for demonstrating the full range of roles.

## Using profiles in walkthroughs

From [friend-walkthroughs.md](./friend-walkthroughs.md):

1. **Before the screen:** Ask what cause they care about
2. **Pick a matching profile:** Choose the demo user whose favorite cause aligns
3. **Connect as that user:** Show their home page with personalized content
4. **Map roles:** "You'd be like Sam (just donate) or Alex (organize)?"
5. **Show mechanisms:** One at a time, based on their interest

Don't show all eight profiles in one session. Pick one that matches their cause and role inclination.

## Adding new profiles

To add more demo profiles:

1. Edit `fake-data-generation/campaigns/medium-realistic-v2.json`
2. Add entries to the `userProfiles` array with unique userIds
3. Ensure the userId falls in the right persona range:
   - 1–24: quiet-neighbor (lurker/supporter)
   - 25–54: regular-supporter
   - 55–68: community-organizer
   - 69–82: project-builder
   - 83–90: trusted-delegate
   - 91–96: bridge-mediator
   - 97–100: power-user
4. Re-run the campaign planner: `npm run gen:campaign:plan --workspace=fake-data-generation`
5. Execute locally to update test data artifacts

The ★ marker is automatic—any user with a profile gets it in the admin page.
