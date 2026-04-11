# What currencies do we support?

The code is currently written to support only ETH. (All the assurance contracts expect ETH, etc.)

I'm generally a fan of ETH and I'd like to see it flourish, but the Commonality project in general is probably better served by using stablecoins, or at least having one stablecoin as an option (and it should be the default option).

The problem isn't exactly "ETH is weird and unfamiliar to normies"; we could get around that by auto-converting. The problem is that the assurance contracts and delegatable notes are going to be escrowing funds, potentially for quite a while, and so ETH's volatility is a problem.

If we're going to use a stablecoin, I'd prefer it to be something more like DAI rather than USDC; it's actually important for Commonality that it be censorship-resistant.

Ideally I'd prefer an ETH-backed stablecoin like RAI or HAI, but IIUC those projects aren't doing well and don't have much liquidity.

Maybe DAI is the best we can do at the moment?

Should we just straight-up *convert* to *only* using the stablecoin, or should we offer each assurance contract the ability to choose which token it wants to use? (That'd probably be a lot more complicated, but in a sense feels cleaner and more in line with the philosophy of the project: the assurance contracts are meant to be separate things, a contract between the participants; it's not really anyone else's business what currency they want to use. But still, it's more complex to code and probably opens up more security worries and it's also an extra choice that the users would have to think about, although having sane defaults might make that livable.)

One thought about DAI vs USDC: if the long-term plan (post MVP) is to offer the ability for each assurance contract to choose, then we don't actually need to worry so much about whether the one token that we choose for now is censorship-resistant or not. Just use USDC if that's easier, and later on we can open it up so that contracts that care about censorship-resistance can use DAI or ETH or whatever they want.

Okay, let's try:
  - Generalize the smart contracts so that they can work with any arbitrary ERC-20 token, but make each assurance contract specify in the constructor which particular token to accept. (What's the standard way of doing ETH? Do we do wETH so that it's all ERC-20, or do we special-case the code to use ETH directly?)
  - For now we can at least make our queries and so on be explicit about which currency, rather than assuming ETH. (If you need to make a sum of X ETH + Y USDC, just store that as "X ETH and Y USDC"; maybe we'll find an exchange rate and convert to a single scalar at the very end for display if necessary.)
  - For MVP production, USDC only.
  - For MVP dev/testing, using ETH is fine for ease of testing.
  - Post-MVP: let each assurance contract choose which token.
