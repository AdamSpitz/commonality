# CSM mediator

The Common Sense Majority mediator is an opinionated bridge-creator service. It looks for statements that people on opposing sides could plausibly sign without feeling misrepresented, then publishes those suggested bridges as nudges.

It is not a neutral authority and it does not speak for users. Users choose whether to trust a mediator, inspect its prompt and history, and sign or ignore any suggested statement.

## Why this exists

Polarized systems reward statements that distinguish tribes. CSM needs infrastructure that rewards statements that reveal hidden agreement. The mediator's job is to keep proposing concrete, signable common-ground formulations so the quiet middle has something visible to coordinate around.

## Trust model

- The mediator is identified by an on-chain nudger address.
- Its nudge batches are public and auditable.
- Clients can subscribe to or ignore it.
- Signing remains a user action; the mediator can suggest wording but cannot create durable support on anyone's behalf.

The mechanism-level product spec lives in the repository at `specs/product/bridge-creator.md`.
