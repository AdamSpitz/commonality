# Current focus

High-level work we are actually concentrating on right now. Not a to-do list — those live in [TODO.md](./TODO.md), [commonality/TODO.md](./commonality/TODO.md), and the [testnet working plan](./workflow/testnet-working-plan.md). At most three items. Keep this file current.

- [Browser-first statement-set reads](./specs/tech/indexer/statement-set-reads-plan.md): preserve the thin raw-event cache and static-site vertical model. Make exact SDK reads efficient through shared dependencies, browser persistence, and incremental fetching; measure before adding raw-event partitions or budgeted progressive indirect support. Defer a separate counts service.
