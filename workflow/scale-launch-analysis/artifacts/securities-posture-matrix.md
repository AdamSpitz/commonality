# Securities posture comparison matrix

**Not legal advice.** Comparison of four postures from `specs/product/legal/securities.md` and `retroactive-funding-redesign.md`, scored against current code/copy baseline.

| Dimension | A. Donation-first | B. Reimbursement-capped (on-chain) | C. Waterfall, no market | D. Own it + formal opinion |
|-----------|-------------------|------------------------------------|-------------------------|----------------------------|
| **Product core** | Assurance contracts + receipts; market off or opt-in rare | Retro funding via buyback ≤ cost | Non-transferable receipts; pro-rata cost reimbursement; reputation/delegation reward | Full scout profit + uncapped market |
| **Current code fit** | Needs UI/copy + feature flags; contract market exists | **Needs contract change** — `ERC1155SecondaryMarket` has **no** price cap (`pricePerToken > 0` only) | Needs contract redesign + remove/disable market UI | Matches current mechanism + current end-user narrative |
| **Howey / Pacific Coast profit prong** | Low if no appreciation story | Collapses if strict ≤ primary price + no sweeteners | Lowest (no transferable upside instrument) | High — marketing already recites profit expectation |
| **Exchange / CTP (CSA SN 21-329) risk** | Low if no trading UI | Reduced if no markup possible | Lowest | High if operator runs market UI |
| **Scout incentive** | Weak (altruism + reputation only) | Medium (capital velocity + reputation) | Medium (reimbursement + reputation + delegated budget) | Strong (profit) |
| **Eng cost** | Low–Med (flags, scrub, defaults) | Med (cap logic, UI, tests) | High (waterfall, NFT non-transfer, docs) | Low eng / **High legal** (formal opinion pre-mainnet) |
| **GTM story clarity** | Strong (Kickstarter-like) | Good if explained | Good if explained carefully | Strong but regulatory-gated |
| **Community UI safety** | Safer to encourage | Safer | Safest | **Do not encourage** until cleared |
| **Residual trap** | Third-party markup venues + old docs as intent evidence | Third-party uncapped markets; reward-indexing traps | Expectation rebuilt via promoted per-dollar “tips” | Opinion wrong / jurisdiction shopping fails |
| **Recommended for scale launch (this analysis)** | **Default if speed + low legal spend** | **Best if retro must survive without full opinion** | Best long-term securities hygiene for retro | Only with budgeted counsel + possible sandbox |

## Current baseline reality

| Element | Status |
|---------|--------|
| Uncapped secondary market contract | **Shipped** — `hardhat/contracts/marketplace/ERC1155SecondaryMarket.sol` |
| Profit narrative in end-user docs | **Shipped** — e.g. `docs/end-user/lazyGiving/retroactive-funding.md` (“make a profit”) |
| Legal strategy warning | **Shipped** — `specs/product/legal/securities.md` flags middle path as unsafe |
| Donation-first UI reframe | **Partial / planned** — `workflow/donation-first-reframe-plan-2026-06-22.md` |
| Reimbursement waterfall redesign | **Spec only** — `specs/product/legal/retroactive-funding-redesign.md` |

**Launch decision implication:** shipping mainnet with market UI + current end-user docs is **Posture D without the opinion** — the worst of all worlds. Choose A, B, or C *and implement it*, or fund D properly before mainnet.
