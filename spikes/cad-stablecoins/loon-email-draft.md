# Draft email to Loon (CADC issuer) — blacklist process & escrow questions

Drafted 2026-07-14 for Adam to review, edit, and send. Contact found on
loon.finance: `partners@loon.finance`.

Context: Commonality would hold pooled contributor funds in a smart-contract
escrow denominated in CADC. CADC uses the Circle/Centre FiatToken contract, so
the `blacklister` role can freeze any address, including a contract holding
other people's money. Before adopting CADC we need to know whether a wrongful
freeze is a recoverable incident or a total-loss scenario. (See README.md
"Escrow safety questions", items 5–6.)

---

**To:** partners@loon.finance
**Subject:** CADC integration question: compliance process for smart-contract addresses

Hi,

I'm building Commonality, a crowdfunding platform on Base, and I'm evaluating
CADC as our Canadian-dollar settlement currency. Contributions would be pooled
in an on-chain escrow contract until a campaign completes, so a single contract
address could hold funds belonging to many ordinary Canadians at once.

Since CADC uses the standard Circle-style FiatToken contract with a blacklist
capability, I'd like to understand your compliance operations before we commit:

1. What is your process and criteria for blacklisting an address? Is it
   triggered manually, by a third-party analytics provider (e.g. Chainalysis,
   TRM), or both?

2. If an address is blacklisted in error — for example, a contract flagged
   because a sanctioned wallet interacted with it, rather than because the
   contract itself did anything wrong — what is the review/appeal process, who
   adjudicates it, and what's the typical turnaround time?

3. Is there a way to proactively register or allowlist a known-good smart
   contract (audited escrow, published source, identified operator) so it's
   less likely to be caught by automated flagging in the first place?

4. Has any address ever been blacklisted or paused on CADC to date? If so, how
   was it resolved?

5. If the contract were ever frozen while holding third-party funds, would you
   be able to coordinate with us on remediation (e.g. unfreeze after review),
   or is freezing effectively irreversible in practice?

Also, one smaller question: we've confirmed the Base contract address
(0x043eb4b75d0805c43d7c834902e335621983cf03) from loon.finance — is there a
canonical docs page listing official addresses per network that we should
treat as the source of truth going forward?

Thanks — happy to get on a call if that's easier. CADC's Interac onramp via
Paytrie and its USDC-identical contract semantics make it our leading
candidate, so I'm hoping the compliance story is workable too.

Best,
Adam Spitz
adam@acspitz.xyz

---

## If we later revisit CADD (Tetra)

Same questions apply to Tetra Digital Group (`tetradg.com`), plus two extra:

- Their contract can *seize* (`recoverTokens`) balances from access-revoked
  accounts, not just freeze them — what governs use of RECOVERY_ROLE?
- They do not publish contract addresses on their site at all; ask for a
  canonical address list (we've only confirmed
  0x16f93ebc5320c89efc8701577efe49d14a276a06 via Basescan/CoinGecko).
