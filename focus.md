# Current focus

High-level work we are actually concentrating on right now. Not a to-do list — those live in [TODO.md](./TODO.md), [causestarter/TODO.md](./causestarter/TODO.md), and the [testnet working plan](./workflow/testnet-working-plan.md). At most three items. Keep this file current.

## 1. Fund now, beneficiary claims later

Generalize unclaimed-channel escrow so a third party can pool money for a public identity (MVP: a website; also today's X/YouTube/Substack channels) before the beneficiary is on the system. The third party cannot take the funds; we are not the intermediary.

Refactor existing `ChannelRegistry` / `ChannelEscrow` onto this primitive (no users to keep compatible). Content occupancy and creator veto stay content-only.

Product: [`specs/product/fund-now-claim-later.md`](./specs/product/fund-now-claim-later.md). Tech: [`specs/tech/subsystems/claimable-beneficiaries.md`](./specs/tech/subsystems/claimable-beneficiaries.md). Adoption story: [`claiming-an-org.md`](./docs/end-user/commonality/vision-and-strategy/ease-of-adoption/claiming-an-org.md).

## 2. Alignment attestation as scouting

After the beneficiary primitive works, treat project-alignment attestation as a real job, not the project creator’s last form field.

Third-party funding for orgs that do not know about Commonality means people (or bots) go *looking* for aligned public identities, open not-affiliated projects, and vouch that those identities belong on statements S. The trust graph becomes the reason a listing is worth seeing, not a light anti-spam stamp. Scout and attester are separable; self-attestation of your own scouted project is the spam case.

Do not start this UX while item 1 is still the contract work. Write-up: [`specs/product/alignment-scouting.md`](./specs/product/alignment-scouting.md).
