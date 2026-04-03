# Channel Escrow

A holding contract that receives funds on behalf of creators who haven't verified their identity yet. Simple by design: it maps channel IDs to balances and releases funds to whoever successfully verifies that channel.

Each platform deployment has its own ChannelEscrow paired with its own ChannelRegistry (see [per-platform deployment](README.md#per-platform-deployment)). The escrow reads the verified owner from its paired ChannelRegistry.

## Why a separate contract

The escrow exists because of a timing gap: a fan can create and fund a contract for a creator who doesn't have a wallet yet and doesn't know this system exists. The assurance contract needs a payout target at creation time; the escrow is that target for unclaimed channels.

Once a channel is verified (state 2 — see [channel-claiming.md](channel-claiming.md)), the creator can withdraw from the escrow. Newly created contracts for an already-verified channel can pay the creator's address directly, but the escrow remains available for any third-party contracts still in flight.

## Interface

```solidity
interface IChannelEscrow {
    /// @notice Deposit funds for a channel. Called by successful assurance contracts.
    /// @param channelId The canonical channel ID hash (keccak256 of e.g. "twitter:uid:44196397")
    function deposit(bytes32 channelId) external payable;

    /// @notice Withdraw all escrowed funds for a channel. Only callable by the verified owner.
    /// @param channelId The canonical channel ID hash
    function withdraw(bytes32 channelId) external;

    /// @notice Check the escrowed balance for a channel.
    /// @param channelId The canonical channel ID hash
    function balance(bytes32 channelId) external view returns (uint256);
}
```

## Storage

```
mapping(bytes32 channelId => uint256 amount)
```

That's it. The escrow doesn't need to know about content items, assurance contracts, or token mechanics. It just holds ETH keyed by channel ID.

## Authorization

The escrow needs to know who the verified owner of a channel is. It reads this from the channel registry (the same contract that handles channel state transitions in [channel-claiming.md](channel-claiming.md)). `withdraw` checks that `msg.sender` is the verified address for that channel ID.

The escrow does **not** restrict who can call `deposit`. Any contract or address can deposit funds for any channel. This keeps the interface between assurance contracts and the escrow minimal — the assurance contract just sends ETH to `deposit(channelId)` when it succeeds.

## Events

```solidity
event Deposited(bytes32 indexed channelId, address indexed from, uint256 amount);
event Withdrawn(bytes32 indexed channelId, address indexed to, uint256 amount);
```

## What it doesn't do

- **No partial withdrawals.** The creator withdraws the full balance. Simplifies accounting and matches the expected usage: creator shows up, claims everything, leaves.
- **No fund locking or vesting.** Funds are immediately available once the channel is verified.
- **No token mechanics.** The escrow deals in ETH (or eventually stablecoins — see the denomination note in [channel-claiming.md](channel-claiming.md)). Tokens live in the assurance contracts.
- **No knowledge of content items.** The escrow is per-channel, not per-content-item. Which specific content items generated the funds is tracked by the assurance contracts and their events, not by the escrow.

## Relationship to other contracts

```
AssuranceContract (succeeds) ──deposit(channelId)──→ ChannelEscrow
                                                          │
Creator (verified) ──withdraw(channelId)──────────────────┘
                                                          │
ChannelEscrow ──reads verified owner from──→ ChannelRegistry
```
