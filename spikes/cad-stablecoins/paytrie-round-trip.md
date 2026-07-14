# Runbook: real-money CADC round trip (Paytrie → Base → offramp)

The last hands-on check before adopting CADC (see README.md "Still open").
Goal: prove an ordinary Canadian can get CADC onto Base and back to a bank
account, and measure the true cost/latency. Budget: ~C$60–110 total, expect to
lose only fees/spread (a few dollars).

Record everything in a `paytrie-round-trip-results.md` as you go: timestamps,
fees, tx hashes, screenshots of quotes.

## Setup (once)

1. **Paytrie account + KYC** — sign up at paytrie.com with a Canadian bank
   account that can send/receive Interac e-Transfer. Complete identity
   verification. *Record: how long KYC took, what documents were needed.*
2. **Fresh Base wallet** — create a brand-new wallet (fresh = clean test of the
   new-user path, and keeps this experiment separate from your other funds).
   Any EOA wallet works (Rabby/MetaMask/Coinbase Wallet); save the seed phrase
   offline. *Record: the address.*
3. **Gas money** — send ~US$2–3 of ETH on **Base** to the fresh wallet from an
   existing wallet or CEX. A fresh wallet has no ETH, and step "Transfer"
   below needs gas. *Record whether Paytrie itself offers any gas assistance —
   if not, that's a real onboarding gap our UX would have to cover (or
   sponsored gas handles it).*

## The round trip

4. **Onramp: buy ~C$50–100 of CADC** on Paytrie via Interac e-Transfer,
   selecting the **Base** network and pasting the fresh wallet address.
   *Record: quoted rate vs 1 CADC = C$1, all fees, stated minimum/maximum,
   time from e-Transfer sent → tokens visible on Base, and the tx hash.*
5. **Verify the token contract** — in the wallet / on Basescan, confirm the
   token received is `0x043eb4b75d0805c43d7c834902e335621983cf03` (the
   issuer-confirmed CADC address), not just something labeled "CADC". Confirm
   the amount displays correctly (CADC is 18 decimals).
6. **Transfer leg** — send half the CADC to a second address you control
   (simulates a contribution flow). *Record: gas cost in ETH and USD,
   confirmation time, that the full amount arrives (no fee-on-transfer).*
7. **(Optional but useful) Tiny DEX swap** — swap ~C$10 of CADC → USDC on
   Aerodrome (loon.finance links the pool directly). Compare the realized rate
   with what `node quote-swaps.mjs` predicts — validates our depth-quote
   methodology.
8. **Offramp: sell the CADC back** on Paytrie from the Base wallet to Interac
   e-Transfer. *Record: minimum sell amount, rate/fees, whether they accept
   funds from an arbitrary self-custody wallet, time until CAD lands in the
   bank account.*

## What decides the outcome

- **Total round-trip cost %** (all fees + spread + gas, as a fraction of the
  amount) — is it acceptable for a contributor putting in C$25–500?
- **End-to-end latency** each direction (minutes? hours? business days?).
- **Friction inventory**: KYC effort, gas bootstrapping, minimums, anything
  that would confuse a non-crypto Canadian.
- Any surprise (wrong contract, network options missing, support needed) is a
  finding — write it down even if resolved.

When done: summarize results in this directory, update README.md "Still open",
and update the TODO.md item.
