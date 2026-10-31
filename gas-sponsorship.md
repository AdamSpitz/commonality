# My question

We now have a gas-sponsorship "gas tank" thing for both statements and projects, where we run it but we don't put money into it; others can put money in for whatever statements/projects they want to make easier.

But IIRC we chose a particular gas-sponsorship system (I forget what it is and what the proper term for that kind of thing is) that works with Privy wallets, and now I'm thinking we might want to abandon Privy and just suggest that our users use Coinbase Smart Wallet or something else like that. (The goal is something like: ease-of-use for normies, while still making it possible to use a single Ethereum account across many sites, not just a Commonality-specific account.)

Can you tell me more about this? What are our options?


# AI response

The piece you are remembering is an **ERC-4337 paymaster**: a contract that pays gas for someone else's transaction. Yours is a custom one, with a tank per statement and per project that anyone can fund. Privy is only the login and key-custody layer in front of that. Dropping Privy does not throw away the tanks.

## What you actually built

Three separate jobs got bundled together:

| Job | What you picked | Proper name |
| --- | --- | --- |
| Who pays gas | Your own `CreatorGasTank` / statement tank. Commonality runs the service and does not fund it. Anyone can deposit for a statement or project. | **Paymaster** (ERC-4337). The HTTP shape is **ERC-7677** (`pm_getPaymasterStubData` / `pm_getPaymasterData`), served at `POST /sponsored-gas/paymaster`. |
| How the transaction is submitted | **Pimlico** | **Bundler**. It takes a **UserOperation** and puts it on-chain through the shared EntryPoint. |
| The user's account | **Privy** email login creates an embedded key, which owns a **Kernel** smart account (`smartWalletType: kernel`). | **ERC-4337 smart account**. Kernel is ZeroDev's account implementation. |

Recorded in [ADR 0001](specs/decisions/0001-custom-onchain-paymaster.md) and [specs/tech/sponsored-gas.md](specs/tech/sponsored-gas.md). The market contracts do not know gas was sponsored. The paymaster only allows contribution and refund calls (`buyERC1155`, USDC `approve`, `setApprovalForAll`, `refundERC1155`).

Kernel was chosen on purpose. The paymaster decodes that account's `execute` / `executeBatch` calldata to see which statement or project the call is for. A different account bytecode means a new decoder. Pimlico was chosen because it will submit a UserOperation that names your paymaster, instead of forcing its own hosted balance.

## Why Privy fights the "one account, many sites" goal

Privy's embedded wallet is created inside **your** Privy app. Another site does not see it. Key export exists, and was treated as the escape hatch, but the thing other sites would have to understand is "this Privy EOA owns this Kernel account." Almost none of them will.

The gas tank can already sponsor any Kernel account that goes through your paymaster URL. It is not married to Privy. It is married to Kernel's calldata layout, and to the app telling the wallet "use this paymaster for this action."

## Options that keep a portable Ethereum account

**Base Account (formerly Coinbase Smart Wallet).** This is the product that matches the goal. Passkey, user-owned, same address on every site that connects Base Account / Coinbase Wallet. It is an ERC-4337 account, so in principle it can use an ERC-7677 paymaster URL. You would rewrite the tank's calldata decoder for Base Account's execute format, and confirm a connected Base Account will actually attach your paymaster instead of only Coinbase's. Fiat on-ramp can stay the Coinbase Onramp path you already have.

**Coinbase CDP Embedded Wallet.** This is Privy with Coinbase branding: email or social login, keys held in Coinbase's systems, an account that exists for your app. Their smart accounts do accept `paymasterUrl` for any ERC-7677 paymaster (or their own Base paymaster). Same portability problem as Privy. Skip this if the point of leaving Privy is a single account across sites.

**Plain wallet connect (MetaMask, Rabby, Coinbase Wallet extension, WalletConnect).** You already have this via ConnectKit. Maximally portable. The user pays gas unless you add **EIP-7702**, which lets that same EOA run smart-account code and use a paymaster without a new address. Pectra shipped 7702 in May 2025. You deferred it because support was uneven and the tank assumes 4337. Worth a fresh look in late 2026, but passkeys still beat an extension install for normies.

**Your own passkey smart account on a public factory (Kernel, Safe, or similar) with no embedded-wallet vendor.** The address is determined by the passkey and a well-known factory, so any site that supports that factory can use it. Closest to "standards-pure and portable." You own the whole login UX. Kernel would let the current tank decoder stay. In practice, "any site" means sites that integrated that factory, which today is a much smaller set than Base Account.

**Stay on Privy + Kernel.** Best normie onboarding you already integrated, tank decoder already matches, and the account is Commonality-shaped unless the user exports a key. The cost to revisit before mainnet is still Privy monthly active users plus Pimlico per UserOperation.

## What would actually have to change

The tanks, the "we run it, others fund it" policy, and Pimlico can all stay. The swap is the account implementation and the signer:

- New execute-calldata decoder in the paymaster (unless you stay on Kernel).
- UI connect path: Base Account connector, or a passkey Kernel signer, instead of Privy's smart-wallet mode.
- Sponsorship still only happens when **your app** attaches your paymaster URL. Other sites will not drain a Commonality tank unless they also point at your paymaster and the tank's policy allows the call. The account is global; the gas budget stays per statement and per project.

Base is also moving toward **native account abstraction (EIP-8130)**, which makes sponsorship and batching a chain feature instead of an ERC-4337 UserOperation. That is early (announced for Base's Cobalt upgrade). It is a reason not to dig a deeper Kernel-specific hole, and not a reason to rewrite the tanks this month.