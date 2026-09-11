# Current focus

High-level work we are actually concentrating on right now. Not a to-do list — those live in [TODO.md](./TODO.md), [causestarter/TODO.md](./causestarter/TODO.md), and the [testnet working plan](./workflow/testnet-working-plan.md). At most three items. Keep this file current.

## 1. Third-party project proposals and alignment

Let someone propose a clearly unaffiliated project for a claimable beneficiary, starting either from the beneficiary or from a cause statement. Gently surface reusable projects for the same beneficiary and optional statement; otherwise create a new project and let the proposer attest its alignment with one or more statements.

Alignment remains a claim about a particular project, never about every activity of a beneficiary. The beneficiary may restrict future proposals to itself, reopen them later, or explicitly disavow a particular proposal; none of those actions rewrites the historical authorship or escrow rights of an existing project.

Make the multi-transaction flow resumable from onchain state. Current-scale advisory lookup is enough for now; durable indexed beneficiary lookup can wait for mainnet or meaningful volume. Write-up: [`specs/product/third-party-project-proposals-and-alignment.md`](./specs/product/third-party-project-proposals-and-alignment.md).
