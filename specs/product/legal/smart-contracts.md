# Publishing the smart contracts (low risk)

Some of the smart contracts (like FreeERC1155, PremintingERC1155, AssuranceContract, ERC1155PrimaryMarket, and ERC1155SecondaryMarket) seem so simple and generic that they're basically tutorial-level exercises. So the suspicion is that publishing those smart contracts themselves isn't a legal risk (there's gotta be many smart contracts exactly like them already onchain). It's more about how they're all put together and how they're described in the UI/documentation/marketing.

DelegatableNotes feels a bit riskier, but again it's a pure financial primitive. (We've taken out the old idea of "here's the statementId that this note is intended to be put towards"; we'll implement that using separate attestations.)

The general picture: the legally-scarier pieces are the UIs and (especially) the *story*, not the smart contracts. Case law backs the split: *Van Loon* (5th Cir. 2024) protected Tornado Cash's immutable contracts themselves, while the prosecutions targeted the ancillary services the developers *operated*. Publishing generic code is well protected; operating services around it is where liability lives. See [operator-posture.md](operator-posture.md).

Decoupling supports this: pare the token contract code down to something very generic and innocuous, and publish the contracts separately from the indexer+UI. See [decoupling.md](/specs/tech/shared/decoupling.md).
