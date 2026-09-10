# Current focus

High-level work we are actually concentrating on right now. Not a to-do list — those live in [TODO.md](./TODO.md), [causestarter/TODO.md](./causestarter/TODO.md), and the [testnet working plan](./workflow/testnet-working-plan.md). At most three items. Keep this file current.

## 1. Fund now, beneficiary claims later

Generalize unclaimed-channel escrow so a third party can pool money for a public identity (MVP: a website; also today's X/YouTube/Substack channels) before the beneficiary is on the system. The third party cannot take the funds; we are not the intermediary.

Refactor existing `ChannelRegistry` / `ChannelEscrow` onto this primitive (no users to keep compatible). Content occupancy and creator veto stay content-only.

Product: [`specs/product/fund-now-claim-later.md`](./specs/product/fund-now-claim-later.md). Tech: [`specs/tech/subsystems/claimable-beneficiaries.md`](./specs/tech/subsystems/claimable-beneficiaries.md). Adoption story: [`claiming-an-org.md`](./docs/end-user/commonality/vision-and-strategy/ease-of-adoption/claiming-an-org.md).
