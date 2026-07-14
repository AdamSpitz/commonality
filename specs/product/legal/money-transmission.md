# Money transmission — mostly solved, keep it that way

[bridges.md](/specs/tech/bridges.md) is the best legal thinking in the repo: the embedded-wallet + plain-on-ramp + sponsored-gas design keeps us out of MSB/MTL territory, and the refund analysis is honest about the structural consequences. Two additions:

- **Canada:** FINTRAC's MSB definition ("dealing in virtual currency") is broader than FinCEN's framework. The same non-custodial architecture should keep us out, but when we get counsel, have them check the Canadian side specifically — the bridges.md analysis is entirely US-framed.
- **Fees:** if we ever take a platform fee *on fund flows* (the [fees doc](/specs/product/fees.md) is still undecided), that strengthens both money-transmission and dealer/broker characterizations. Funding infrastructure via a LazyGiving project instead of skimming flows is legally cleaner as well as philosophically cleaner.

**Ongoing discipline:** never touch funds.
