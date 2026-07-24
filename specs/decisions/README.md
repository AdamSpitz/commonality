# Architecture Decision Records (ADRs)

An **immutable, append-only** log of consequential, non-obvious decisions and *why*
we made them — including the alternatives we rejected and what would make us revisit.

## Note on the (nearly) empty log

We adopted ADRs many months into the project, well after most of the big architectural
decisions had already been made and recorded in the mutable specs. So this directory is
**intentionally sparse** — it is not a sign that few decisions have been made. We did
**not** retroactively write ADRs for past decisions (see the forward-only rule below);
the log starts near-empty and grows only as *new* consequential decisions arise, or as
old ones get re-litigated enough to be worth freezing. An empty-looking directory here
is expected, not a gap to backfill.

## Why this exists (read this if you're a fresh LLM)

Specs under [`specs/`](../) describe *what the system should be*. They are mutable and
get rewritten to reflect current intent — which means they **erase the rationale** as
they change. Git records *what* changed but is poor at *why* and *what-was-rejected*.

ADRs fill that gap. Before you "fix" or reverse something that looks wrong, **grep this
directory** — the decision may have been made deliberately, with the alternative you're
about to propose already considered and rejected. That's the single question a fresh
instance most needs answered and can't get anywhere else.

## Rules

1. **Immutable.** Never edit the substance of an accepted ADR. To change a decision,
   write a *new* ADR and set the old one's status to `Superseded by NNNN`.
2. **One decision per file**, numbered `NNNN-kebab-title.md`, monotonically increasing.
3. **Only consequential, non-obvious decisions** — things a smart newcomer would
   plausibly want to reverse. "We use TypeScript" is not an ADR. "We run our own
   onchain paymaster instead of a vendor's" is.
4. **Forward-only by default.** We do not retroactively document old decisions as an
   archaeology project. Backfill *lazily*: when you notice a decision getting
   re-litigated, that's the signal to write the one ADR that stops it recurring.

## Process

1. Copy [`0000-template.md`](./0000-template.md) to the next number.
2. Fill it in. Keep it short — Context / Decision / Alternatives / Consequences.
3. Link the relevant spec to the ADR (a footer line in the spec), and the ADR back to
   the spec. The spec stays the living "what"; the ADR is the frozen "why".
4. Set `Status: Accepted` once ratified. Until then, `Proposed`.

## Index

| # | Title | Status |
| --- | --- | --- |
| [0001](./0001-custom-onchain-paymaster.md) | Custom onchain paymaster with per-creator gas tanks | Accepted |
